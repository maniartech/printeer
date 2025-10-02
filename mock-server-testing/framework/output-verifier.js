import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

/**
 * Output file verification utilities
 */
export class OutputVerifier {
  constructor(config = {}) {
    this.config = {
      minPdfSize: 1000,      // Minimum PDF size in bytes
      minImageSize: 500,     // Minimum image size in bytes
      maxFileAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      ...config
    };
  }

  /**
   * Verify a generated output file
   */
  async verifyOutput(filePath, expectedType = 'pdf') {
    const verification = {
      exists: false,
      size: 0,
      valid: false,
      type: null,
      hash: null,
      created: null,
      errors: []
    };

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        verification.errors.push('File does not exist');
        return verification;
      }

      verification.exists = true;

      // Get file stats
      const stats = fs.statSync(filePath);
      verification.size = stats.size;
      verification.created = stats.birthtime;

      // Check file age
      const fileAge = Date.now() - stats.birthtime.getTime();
      if (fileAge > this.config.maxFileAge) {
        verification.errors.push(`File is too old (${Math.round(fileAge / 1000 / 60)} minutes)`);
      }

      // Determine file type
      const ext = path.extname(filePath).toLowerCase();
      verification.type = ext.slice(1);

      // Type-specific validation
      verification.valid = this.validateFileType(filePath, expectedType, verification);

      // Generate file hash for comparison
      if (verification.exists) {
        verification.hash = this.generateFileHash(filePath);
      }

    } catch (error) {
      verification.errors.push(`Verification error: ${error.message}`);
    }

    return verification;
  }

  validateFileType(filePath, expectedType, verification) {
    const ext = path.extname(filePath).toLowerCase();
    const size = verification.size;

    switch (expectedType.toLowerCase()) {
      case 'pdf':
        if (ext !== '.pdf') {
          verification.errors.push(`Expected PDF but got ${ext}`);
          return false;
        }
        if (size < this.config.minPdfSize) {
          verification.errors.push(`PDF too small: ${size} bytes (min: ${this.config.minPdfSize})`);
          return false;
        }
        // Check PDF header
        return this.validatePdfHeader(filePath, verification);

      case 'png':
      case 'jpg':
      case 'jpeg':
        const validImageExts = ['.png', '.jpg', '.jpeg'];
        if (!validImageExts.includes(ext)) {
          verification.errors.push(`Expected image but got ${ext}`);
          return false;
        }
        if (size < this.config.minImageSize) {
          verification.errors.push(`Image too small: ${size} bytes (min: ${this.config.minImageSize})`);
          return false;
        }
        return this.validateImageHeader(filePath, verification);

      default:
        verification.errors.push(`Unknown expected type: ${expectedType}`);
        return false;
    }
  }

  validatePdfHeader(filePath, verification) {
    try {
      const buffer = Buffer.alloc(8);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, 8, 0);
      fs.closeSync(fd);

      const header = buffer.toString('ascii', 0, 4);
      if (header !== '%PDF') {
        verification.errors.push('Invalid PDF header');
        return false;
      }
      return true;
    } catch (error) {
      verification.errors.push(`PDF header check failed: ${error.message}`);
      return false;
    }
  }

  validateImageHeader(filePath, verification) {
    try {
      const buffer = Buffer.alloc(8);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, 8, 0);
      fs.closeSync(fd);

      const ext = path.extname(filePath).toLowerCase();

      if (ext === '.png') {
        // PNG signature: 89 50 4E 47 0D 0A 1A 0A
        const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        if (!buffer.equals(pngSignature)) {
          verification.errors.push('Invalid PNG signature');
          return false;
        }
      } else if (ext === '.jpg' || ext === '.jpeg') {
        // JPEG signature: FF D8 FF
        if (buffer[0] !== 0xFF || buffer[1] !== 0xD8 || buffer[2] !== 0xFF) {
          verification.errors.push('Invalid JPEG signature');
          return false;
        }
      }

      return true;
    } catch (error) {
      verification.errors.push(`Image header check failed: ${error.message}`);
      return false;
    }
  }

  generateFileHash(filePath) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      return createHash('sha256').update(fileBuffer).digest('hex').substring(0, 16);
    } catch (error) {
      return null;
    }
  }

  /**
   * Clean up old output files
   */
  async cleanupOldFiles(outputDir, maxAge = this.config.maxFileAge) {
    const cleaned = [];
    const cutoffTime = Date.now() - maxAge;

    try {
      await this.cleanupDirectory(outputDir, cutoffTime, cleaned);
    } catch (error) {
      console.error(`Cleanup error: ${error.message}`);
    }

    return cleaned;
  }

  async cleanupDirectory(dir, cutoffTime, cleaned) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        await this.cleanupDirectory(itemPath, cutoffTime, cleaned);
      } else if (item.isFile()) {
        const stats = fs.statSync(itemPath);
        if (stats.birthtime.getTime() < cutoffTime) {
          try {
            fs.unlinkSync(itemPath);
            cleaned.push(itemPath);
          } catch (error) {
            console.warn(`Failed to delete ${itemPath}: ${error.message}`);
          }
        }
      }
    }
  }

  /**
   * Compare two output files
   */
  async compareOutputs(filePath1, filePath2) {
    const comparison = {
      identical: false,
      sizeDifference: 0,
      hash1: null,
      hash2: null,
      errors: []
    };

    try {
      if (!fs.existsSync(filePath1)) {
        comparison.errors.push('First file does not exist');
        return comparison;
      }

      if (!fs.existsSync(filePath2)) {
        comparison.errors.push('Second file does not exist');
        return comparison;
      }

      const stats1 = fs.statSync(filePath1);
      const stats2 = fs.statSync(filePath2);

      comparison.sizeDifference = Math.abs(stats1.size - stats2.size);

      comparison.hash1 = this.generateFileHash(filePath1);
      comparison.hash2 = this.generateFileHash(filePath2);

      comparison.identical = comparison.hash1 === comparison.hash2;

    } catch (error) {
      comparison.errors.push(`Comparison error: ${error.message}`);
    }

    return comparison;
  }
}