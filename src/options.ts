

// - Browser Launch Options (Headless, Args, Executable Path, Etc)
// - Page Print Options (Export Type, Page Size, Etc)
// - General Application Options (Verbose, Etc)

const validOutputTypes = ['pdf', 'png'];

// Options is a class that holds the options required for puppeteer
// for generating the output.
class Options {
  public waitUntil;
  public format;
  public outputType;
  public outputFile;

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
      throw new Error(`Invalid output file name: ${fname}`);
    }

    if (!validOutputTypes.includes(outputType)) {
      throw new Error(`Invalid output type: ${outputType}`);
    }

    return outputType
  }

}
