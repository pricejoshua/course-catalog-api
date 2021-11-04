/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */

import matchEmployees from "./employees/matchEmployees";
import macros from "../utils/macros";
import classes from "./classes/main";
import dumpProcessor from "../services/dumpProcessor";
import prisma from "../services/prisma";

// Main file for scraping
// Run this to run all the scrapers

class Main {
  async main() {
    macros.log("TEST Starting scrape of classes and employees");
    const classesPromise = classes.main(["neu"]);

    const promises = [classesPromise, matchEmployees.main()];

    try {
      const [termDump, mergedEmployees] = await Promise.all(promises);

      macros.log("TEST Finished scraping data for classes and employees");

      macros.log("TEST Starting insertion of scraped data");

      await dumpProcessor.main({
        termDump: termDump,
        profDump: mergedEmployees,
      });
    } catch (error) {
      console.log("TEST error occurred ");
      console.log(error);
    }

    macros.log("TEST Finished insertion of scraped data");
  }
}

const instance = new Main();

if (require.main === module) {
  instance
    .main()
    .then(() => prisma.$disconnect())
    .catch((err) => macros.error(JSON.stringify(err)));
}
