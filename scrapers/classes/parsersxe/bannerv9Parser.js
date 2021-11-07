/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */

import _ from "lodash";
import pMap from "p-map";
import Request from "../../request";
import macros from "../../../utils/macros";
import TermListParser from "./termListParser";
import TermParser from "./termParser";
import ClassParser from "./classParser";
import SectionParser from "./sectionParser";
import filters from "../../filters";
import prisma from "../../../services/prisma";
import elastic from "../../../utils/elastic";
import classMap from "../classMapping.json";

// Only used to query the term IDs, so we never want to use a cached version
const request = new Request("bannerv9Parser", { cache: false });

/**
 * Top level parser. Exposes nice interface to rest of app.
 */
class Bannerv9Parser {
  async main(termsUrl) {
    const termIds = await this.getTermList(termsUrl);
    macros.log(termIds);
    this.updateTermIDs(termIds);
    macros.log(`scraping terms: ${termIds}`);
    macros.log(termsUrl);

    // If scrapers are simplified then this logic would ideally be moved closer to the scraper "entry-point"
    if (process.env.CUSTOM_SCRAPE && filters.truncate) {
      macros.log("Truncating courses and sections tables");
      const clearCourses = prisma.course.deleteMany({});
      const clearSections = prisma.section.deleteMany({});
      await prisma.$transaction([clearCourses, clearSections]);
      macros.log("Truncating elasticsearch classes index");
      await elastic.resetIndex(elastic.CLASS_INDEX, classMap);
    }
    return this.scrapeTerms(termIds);
  }

  /**
   * Get the list of all available terms given the starting url
   * @param termsUrl the starting url to find the terms with v9
   * @returns List of {termId, description}
   */
  async getTermList(termsUrl) {
    // Query the Banner URL to get a list of the terms & parse
    const bannerTerms = await request.get({
      url: termsUrl,
      json: true,
      cache: false,
    });
    const termList = TermListParser.serializeTermsList(bannerTerms.body);

    const termInfoList = termList
      // Sort by descending order (to get the most recent term IDs first)
      .sort((a, b) => b.termId - a.termId);

    return termInfoList;
  }

  filterTermIDs(termInfoList) {
    /*
    At most, there are 12 terms that we want to update. Say we're in the spring, and summer semesters have been posted 
    (so we want to update both)
    - Undergrad: 
      - Spring semester
      - Full summer
      - Summer I
      - Summer II
    - CPS
      - Spring semester
      - Spring quarter
      - Summer semester
      - Summer quarter
    - Law
      - Spring semester
      - Spring quarter
      - Summer semester
      - Summer quarter
    
    To be safe, we scrape the latest 12 terms. 
    */
    const termsInAYear = 12;

    return termInfoList.slice(0, termsInAYear);
  }

  /**
   * Given a list of TermIDs, it updates the term_info table
   * @param {*} fullTermInfoList A list of ALL term infos queried from Banner (ie. not filtered)
   */
  async updateTermIDs(fullTermInfoList) {
    // Get the termIDs which exist in the courses database
    let existingIds = await prisma.course.groupBy({ by: ["termId"] });
    existingIds = existingIds.map((t) => t["termId"]);

    // The termIDs which we're currently scraping (ie. ones which may not yet exist in the course database)
    const filterdTermInfos = this.filterTermIDs(fullTermInfoList);
    for (const termId of existingIds) {
      // Gets the TermInfo for this termID (ie. the college name and the term description)
      filterdTermInfos.push(fullTermInfoList[termId]);
    }


    const allIds = filterdTermInfos.map(termInfo => termInfo["termId"]);    
    // Delete the old terms (ie. any terms that aren't in the list we pass this function)
    await prisma.termInfo.deleteMany({
      where: {
        termId: { notIn: Array.from(allIds) },
      },
    });

    // Upsert new term IDs, along with their names and sub college
    for (const term of filterdTermInfos) {
      await prisma.termInfo.upsert({
        where: { termId: term.termId },
        update: {
          text: term.text,
          subCollege: term.subCollegeName,
        },
        create: {
          termId: term.termId,
          text: term.text,
          subCollege: term.subCollegeName,
        },
      });
    }
  }

  /**
   * Scrape all the class data in a set of terms
   * @param termIds array of terms to scrape in
   * @returns Object {classes, sections} where classes is a list of class data
   */
  async scrapeTerms(termIds) {
    const termData = await pMap(termIds, (p) => {
      return TermParser.parseTerm(p);
    });
    return _.mergeWith(...termData, (a, b) => {
      if (Array.isArray(a)) {
        return a.concat(b);
      }
      return { ...a, ...b };
    });
  }

  /**
   * Scrape all the details of a specific class and associated sections
   * @param termId termId the class is in
   * @param subject the subject of the class ("CS")
   * @param classId the course number of the class (2500)
   * @returns Object {classes, sections} where classes and sections are arrays,
   *          though classes should only have 1 element
   */
  async scrapeClass(termId, subject, courseNumber) {
    return {
      classes: [await ClassParser.parseClass(termId, subject, courseNumber)],
      sections: await SectionParser.parseSectionsOfClass(
        termId,
        subject,
        courseNumber
      ),
    };
  }

  // Just a convient test method, if you want to
  async test() {
    const numTerms = 20;
    const url = `https://nubanner.neu.edu/StudentRegistrationSsb/ssb/classSearch/getTerms?offset=1&max=${numTerms}&searchTerm=`;
    const output = await this.main(url);
    // eslint-disable-next-line global-require
    require("fs").writeFileSync(
      "parsersxe.json",
      JSON.stringify(output, null, 4)
    );
  }
}

Bannerv9Parser.prototype.Bannerv9Parser = Bannerv9Parser;
const instance = new Bannerv9Parser();

if (require.main === module) {
  instance.test();
}

export default instance;
