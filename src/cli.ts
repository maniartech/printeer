#!/usr/bin/env node

import printeer from "./printeer";
import printUsage from "./usage";

/**
 * Main entry point of the print-web command!
 */
(async function main() {

  // First argument is the URL that should be used to generate the PDF.
  // Second argument is the output file name.
  const url = process.argv[2];
  const outputFile = process.argv[3];

  // If url or outputFile is not provided, print usage and exit.
  if (!url || !outputFile) {
    printUsage();
    process.exit(1);
  }

  // Wait for the printeer to finish.
  try {
    await printeer(url, outputFile);
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
})();
