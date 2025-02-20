/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */

import Request from "../../request";
import util from "./util";
import MeetingParser from "./meetingParser";
import { SectionSR } from "../../../types/scraperTypes";
import { Section } from "../../../types/types";

const requestObj = new Request("sectionParser");

class SectionParser {
  async parseSectionsOfClass(
    termId: string,
    subject: string,
    classId: string
  ): Promise<false | Section[]> {
    const cookiejar = await util.getCookiesForSearch(termId);
    const req = await requestObj.get({
      url: "https://bssstureg.wheaton.edu/StudentRegistrationSsb/ssb/searchResults/searchResults",
      qs: {
        txt_term: termId,
        txt_subject: subject,
        txt_courseNumber: classId,
        pageOffset: 0,
        pageMaxSize: 500,
      },
      jar: cookiejar,
      json: true,
    });

    if (req.body.success) {
      return req.body.data.map((sr) => {
        return this.parseSectionFromSearchResult(sr);
      });
    }
    return false;
  }

  /**
   * Search results already has all relevant section data
   * @param SR Section item from /searchResults
   */
  parseSectionFromSearchResult(SR: SectionSR): Section {
    return {
      host: "wheaton.edu",
      termId: SR.term,
      subject: SR.subject,
      classId: SR.courseNumber,
      crn: SR.courseReferenceNumber,
      seatsCapacity: SR.maximumEnrollment,
      seatsRemaining: SR.seatsAvailable,
      waitCapacity: SR.waitCapacity,
      waitRemaining: SR.waitAvailable,
      lastUpdateTime: Date.now(),
      classType: SR.scheduleTypeDescription,
      campus: SR.campusDescription,
      honors: SR.sectionAttributes.some((a) => {
        return a.description === "Honors";
      }),
      url:
        "https://bannerweb.wheaton.edu/db1/bwckschd.p_disp_detail_sched" +
        `?term_in=${SR.term}&crn_in=${SR.courseReferenceNumber}`,
      profs: SR.faculty.map(MeetingParser.profName),
      meetings: MeetingParser.parseMeetings(SR.meetingsFaculty),
    };
  }
}

export default new SectionParser();
