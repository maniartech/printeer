// src/printeer.js
import puppeteer from "puppeteer";
import { normalize } from "path";
var printeer_default = (url, outputFile, outputType = null) => {
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
      resolve(outputFile);
    }
    return await browser.close();
  });
};
function detectOutputType(fname, outputType) {
  const validOutputTypes = ["pdf", "png"];
  if (!outputType) {
    const ext = fname.split(".").pop();
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

// src/usage.js
var usage_default = () => {
  console.log("Usage: printeer <url> <outputFile>");
};

// src/cli.js
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
