#!/usr/bin/env node

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
    const launchOptions = {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    };
    const exePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (exePath) {
      launchOptions.executablePath = exePath;
    }
    console.log("Launch Options:", launchOptions);
    let res = null;
    let page = null;
    let browser = null;
    try {
      browser = await puppeteer.launch(launchOptions);
      page = await browser.newPage();
      res = await page.goto(url, { waitUntil: "networkidle0" });
    } catch (err) {
      console.error("Browser Launch Error:", err);
      console.error("Browser Launch Options:", launchOptions);
      return reject(err);
    }
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

// src/usage.ts
var usage_default = () => {
  console.log("Usage: printeer <url> <outputFile>");
};

// src/cli.ts
(async function main() {
  const url = process.argv[2];
  const outputFile = process.argv[3];
  if (!url || !outputFile) {
    usage_default();
    process.exit(1);
  }
  try {
    await printeer_default(url, outputFile);
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
})();
//# sourceMappingURL=index.js.map
