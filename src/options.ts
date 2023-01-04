
const validOutputTypes = ['pdf', 'png'];

// Options is a class that holds the options required for puppeteer
// for generating the output.
class Options {
  constructor() {
    this.waitUntil = 'networkidle0';
    this.format = 'A4';
    this.outputType = null; // If null, it will be detected from the output file name.
    this.outputFile = null;
  }

  detectOutputType(fname, outputType) {
    if (!outputType) {
      const ext = fname.split('.').pop()
      if (validOutputTypes.includes(ext)) { return ext }
      return 'pdf'
    }

    if (!validOutputTypes.includes(outputType)) { return 'pdf' }
    return outputType
  }

}
