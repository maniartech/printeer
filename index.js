// src/printeer.ts
import puppeteer from "puppeteer";
import { normalize } from "path";

// src/utils.ts
var isCurrentUserRoot = function() {
  if (process && process.getuid) {
    return process.getuid() == 0;
  }
  return false;
};

// src/printeer.ts
var printeer_default = async (url, outputFile, outputType = null) => {
  getPackageJson();
  return new Promise(async (resolve, reject) => {
    outputFile = normalize(outputFile);
    if (!url.startsWith("http")) {
      reject("URL must start with http or https");
    }
    const launchOptions = {
      headless: true,
      args: isCurrentUserRoot() ? ["--no-sandbox", "--disable-setuid-sandbox"] : []
    };
    const exePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (exePath) {
      launchOptions.executablePath = exePath;
    }
    const browser = await puppeteer.launch(launchOptions);
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
