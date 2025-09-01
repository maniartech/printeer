
// - Browser Launch Options (Headless, Args, Executable Path, Etc)
// - Page Print Options (Export Type, Page Size, Etc)
// - General Application Options (Verbose, Etc)

const validOutputTypes = ['pdf', 'png'] as const;
type ValidOutputType = typeof validOutputTypes[number];

// Options is a class that holds the options required for puppeteer
// for generating the output.
export class Options {
  public waitUntil: string;
  public format: string;
  public outputType: ValidOutputType | null;
  public outputFile: string | null;

  constructor() {
    this.waitUntil = 'networkidle0';
    this.format = 'A4';
    this.outputType = null; // If null, it will be detected from the output file name.
    this.outputFile = null;
  }

  detectOutputType(fname: string, outputType?: ValidOutputType | null): ValidOutputType {
    if (!outputType) {
      const ext = fname.split('.').pop();
      if (ext && validOutputTypes.includes(ext as ValidOutputType)) {
        return ext as ValidOutputType;
      }
      throw new Error(`Invalid output file name: ${fname}`);
    }

    if (!validOutputTypes.includes(outputType)) {
      throw new Error(`Invalid output type: ${outputType}`);
    }

    return outputType;
  }
}
