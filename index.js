// src/printeer.ts
import puppeteer from "puppeteer";
import { normalize } from "path";
var printeer_default = async (url, outputFile, outputType = null) => {
  getPackageJson();
  return new Promise(async (resolve, reject) => {
    outputFile = normalize(outputFile);
    if (!url.startsWith("http")) {
      reject("URL must start with http or https");
    }
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const res = await page.goto(url, { waitUntil: "networkidle0" });
    if (!res) {
      return reject(new Error("Could not load the page."));
    }
    outputType = detectOutputType(outputFile, outputType);
    if (res.status() !== 200) {
      reject(`Error: ${res.status()}: ${res.statusText()}`);
    } else {
      if (outputType === "png") {
        await page.screenshot({ path: outputFile });
      } else {
        await page.pdf({ format: "A4", path: outputFile });
      }
      outputFile = normalize(outputFile);
      resolve(outputFile);
    }
    return await browser.close();
  });
};
function getPackageJson() {
  console.log("Process exec path", process.execPath);
}
function detectOutputType(fname, outputType) {
  const validOutputTypes = ["pdf", "png"];
  if (!outputType) {
    const ext = fname.split(".").pop();
    if (!ext) {
      return "pdf";
    }
    if (validOutputTypes.includes(ext)) {
      return ext;
    }
    return "pdf";
  }
  if (!validOutputTypes.includes(outputType)) {
    return "pdf";
  }
  return outputType;
}

// src/index.ts
var src_default = printeer_default;
export {
  src_default as default
};
//# sourceMappingURL=index.js.map
