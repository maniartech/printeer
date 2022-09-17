import {argv as $eSn2T$argv, exit as $eSn2T$exit} from "process";
import $eSn2T$puppeteer from "puppeteer";
import {normalize as $eSn2T$normalize} from "path";



var // networkidle0 - consider navigation to be finished when there are no more than 0 network connections for at least 500 ms
// networkidle2 - consider navigation to be finished when there are no more than 2 network connections for at least 500 ms.
/**
 * Generate the report.
 * @param {string} reportName The name of the report.
 * @returns The promise of the report file.
 */ $173d6c6c8da44cf1$export$2e2bcd8739ae039 = (url, outputFile, outputType = "pdf")=>{
    return new Promise(async (resolve, reject)=>{
        outputFile = (0, $eSn2T$normalize)(outputFile);
        const browser = await (0, $eSn2T$puppeteer).launch({
            headless: true
        });
        const page = await browser.newPage();
        const res = await page.goto(url, {
            waitUntil: "networkidle0"
        });
        if (!res) return reject(new Error("Could not load the page."));
        if (res.status() !== 200) reject(`Error: ${res.status()}: ${res.statusText()}`);
        else {
            await page.pdf({
                format: "A4",
                path: outputFile
            });
            resolve(outputFile);
        }
        return await browser.close();
    });
};


var /**
 * Prints the usage of the command line tool.
 */ $ca8fa687ca32fe66$export$2e2bcd8739ae039 = ()=>{
    console.log("Usage: printeer <url> <outputFile>");
};



/**
 * Main entry point of the print-web command!
 */ (async function main() {
    // First argument is the URL that should be used to generate the PDF.
    // Second argument is the output file name.
    const url = $eSn2T$argv[2];
    const outputFile = $eSn2T$argv[3];
    // If url or outputFile is not provided, print usage and exit.
    if (!url || !outputFile) {
        (0, $ca8fa687ca32fe66$export$2e2bcd8739ae039)();
        $eSn2T$exit(1);
    }
    await (0, $173d6c6c8da44cf1$export$2e2bcd8739ae039)(url, outputFile);
})();


//# sourceMappingURL=index.js.map
