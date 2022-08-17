import $l7i9T$puppeteer from "puppeteer";
import {normalize as $l7i9T$normalize} from "path";



var // networkidle0 - consider navigation to be finished when there are no more than 0 network connections for at least 500 ms
// networkidle2 - consider navigation to be finished when there are no more than 2 network connections for at least 500 ms.
/**
 * Generate the report.
 * @param {string} reportName The name of the report.
 * @returns The promise of the report file.
 */ $0e022d1b047ab8cc$export$2e2bcd8739ae039 = (url, outputFile, outputType = "pdf")=>{
    return new Promise(async (resolve, reject)=>{
        outputFile = (0, $l7i9T$normalize)(outputFile);
        const browser = await (0, $l7i9T$puppeteer).launch({
            headless: true
        });
        const page = await browser.newPage();
        const res = await page.goto(url, {
            waitUntil: "networkidle2"
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


const $cf838c15c8b009ba$export$472aaf7a87fdeecf = (0, $0e022d1b047ab8cc$export$2e2bcd8739ae039);


export {$cf838c15c8b009ba$export$472aaf7a87fdeecf as printWeb};
//# sourceMappingURL=index.js.map
