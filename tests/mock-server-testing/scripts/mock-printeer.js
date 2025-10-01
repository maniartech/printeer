#!/usr/bin/env node

/**
 * Mock Printeer CLI for testing the framework
 * This simulates the actual printeer command for demonstration
 */

import fs from 'fs';
import path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
let outputPath = null;

// Find the output file path
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--output' && i + 1 < args.length) {
    outputPath = args[i + 1];
    break;
  }
}

if (!outputPath) {
  console.error('Error: No output path specified');
  process.exit(1);
}

try {
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  fs.mkdirSync(dir, { recursive: true });

  // Determine file type based on extension
  const ext = path.extname(outputPath).toLowerCase();
  let content;

  if (ext === '.pdf') {
    // Create a proper minimal PDF file structure
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Resources <<
  /Font <<
    /F1 4 0 R
  >>
>>
/Contents 5 0 R
>>
endobj

4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

5 0 obj
<<
/Length 100
>>
stream
BT
/F1 12 Tf
50 750 Td
(Mock PDF - URL: ${args.find((arg, i) => args[i-1] === '--url') || 'unknown'}) Tj
0 -20 Td
(Format: ${args.find((arg, i) => args[i-1] === '--format') || 'A4'}) Tj
0 -20 Td
(Generated: ${new Date().toISOString()}) Tj
ET
endstream
endobj

xref
0 6
0000000000 65535 f
0000000015 00000 n
0000000068 00000 n
0000000125 00000 n
0000000281 00000 n
0000000348 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
500
%%EOF`;
    content = pdfContent;

  } else if (ext === '.png') {
    // Create a minimal PNG file (base64 decoded)
    const pngData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    // Pad to meet minimum size (500+ bytes)
    const padding = Buffer.alloc(600, 0);
    content = Buffer.concat([pngData, padding]);

  } else if (ext === '.jpg' || ext === '.jpeg') {
    // Create a minimal JPEG file
    const jpegData = Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A', 'base64');
    // Pad to meet minimum size (500+ bytes)
    const padding = Buffer.alloc(600, 0);
    content = Buffer.concat([jpegData, padding]);

  } else {
    // Default to PDF for unknown extensions
    content = '%PDF-1.4\nMock file\n' + 'A'.repeat(1200);
  }

  fs.writeFileSync(outputPath, content);
  const fileType = ext === '.pdf' ? 'PDF' : ext === '.png' ? 'PNG' : ext.includes('.jp') ? 'JPEG' : 'file';
  console.log(`✅ Mock ${fileType} generated: ${path.basename(outputPath)}`);
  process.exit(0);

} catch (error) {
  console.error(`❌ Error generating PDF: ${error.message}`);
  process.exit(1);
}