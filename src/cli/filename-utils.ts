/**
 * Filename Generation and Management Utilities
 * Intelligent filename generation with title extraction and conflict resolution
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { UrlOutputPair, CliOptions } from './types/cli.types';
import { SkipFileError } from './types/cli.types';

/**
 * Determine output filename for a URL-output pair
 */
export async function determineOutputFilename(
  pair: UrlOutputPair,
  options: CliOptions
): Promise<string> {
  // If explicit output provided, use it
  if (pair.output) {
    return options.outputDir
      ? path.join(options.outputDir, pair.output)
      : pair.output;
  }

  // Generate filename automatically
  let filename: string;

  if (options.outputPattern) {
    // Use custom pattern
    filename = await generateFilenameFromPattern(pair, options);
  } else if (options.titleFallback !== false) {
    // Default: try to get webpage title first
    filename = await generateFilenameFromTitle(pair.url, options);
  } else {
    // Use URL-based algorithm
    filename = generateFilenameFromUrl(pair.url, options);
  }

  return options.outputDir
    ? path.join(options.outputDir, filename)
    : filename;
}

/**
 * Generate filename from webpage title with fallback to URL
 */
export async function generateFilenameFromTitle(
  url: string,
  options: CliOptions
): Promise<string> {
  try {
    // Attempt to fetch webpage title
    const title = await fetchWebpageTitle(url, options);

    if (title && title.trim()) {
      // Clean title for filename use
      const cleanTitle = sanitizeFilename(title.trim());
      const extension = detectOutputExtension(options);
      return `${cleanTitle}.${extension}`;
    }
  } catch (error) {
    if (!options.quiet) {
      console.log(`⚠️  Could not fetch title for ${url}, using URL-based filename`);
    }
  }

  // Fallback to URL-based generation
  return generateFilenameFromUrl(url, options);
}

/**
 * Generate filename from URL structure
 */
export function generateFilenameFromUrl(url: string, options: CliOptions): string {
  const urlObj = new URL(url);
  const domain = urlObj.hostname.replace(/^www\./, '');
  const pathname = urlObj.pathname === '/' ? 'index' : urlObj.pathname.replace(/[^\w-]/g, '_');

  const extension = detectOutputExtension(options);
  const baseName = `${domain}${pathname}`;

  return `${baseName}.${extension}`;
}

/**
 * Generate filename from custom pattern
 */
export async function generateFilenameFromPattern(
  pair: UrlOutputPair,
  options: CliOptions
): Promise<string> {
  const urlObj = new URL(pair.url);
  const domain = urlObj.hostname.replace(/^www\./, '');
  const pathname = urlObj.pathname === '/' ? 'index' : urlObj.pathname.replace(/[^\w-]/g, '_');
  const extension = detectOutputExtension(options);

  // Try to get title for pattern
  let title = 'untitled';
  try {
    const pageTitle = await fetchWebpageTitle(pair.url, options, 5000);
    if (pageTitle && pageTitle.trim()) {
      title = sanitizeFilename(pageTitle.trim());
    }
  } catch (error) {
    // Use URL-based fallback
    title = `${domain}${pathname}`;
  }

  return (options.outputPattern || '{title}.{format}')
    .replace('{domain}', domain)
    .replace('{path}', pathname)
    .replace('{name}', `${domain}${pathname}`)
    .replace('{title}', title)
    .replace('{index}', String(pair.index + 1))
    .replace('{timestamp}', new Date().toISOString().replace(/[:.]/g, '-'))
    .replace('{format}', extension);
}

/**
 * Fetch webpage title using minimal browser instance
 */
export async function fetchWebpageTitle(
  url: string,
  options: CliOptions,
  timeout: number = 10000
): Promise<string | null> {
  // For now, return null to use URL fallback
  // This would be implemented with actual Puppeteer integration
  return null;
}

/**
 * Detect output file extension from options
 */
export function detectOutputExtension(options: CliOptions): string {
  // Check explicit image type first
  if (options.imageType) {
    return options.imageType;
  }

  // Check format option
  if (options.format && ['png', 'jpg', 'jpeg', 'webp'].includes(options.format.toLowerCase())) {
    return options.format.toLowerCase();
  }

  // Default to PDF
  return 'pdf';
}

/**
 * Sanitize filename by removing invalid characters
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid chars
    .replace(/\s+/g, '_')          // Replace spaces with underscores
    .replace(/-+/g, '-')           // Collapse multiple dashes
    .replace(/_+/g, '_')           // Collapse multiple underscores
    .replace(/^[-_]+|[-_]+$/g, '') // Remove leading/trailing dashes and underscores
    .substring(0, 100);            // Limit length
}

/**
 * Handle output file conflicts based on strategy
 */
export async function handleOutputConflicts(
  filename: string,
  options: CliOptions,
  existingFilenames?: Set<string>
): Promise<string> {
  const parsedPath = path.parse(filename);

  // Check for conflicts in current batch
  if (existingFilenames?.has(path.basename(filename))) {
    return await findUniqueFilename(parsedPath, path.dirname(filename), options, existingFilenames);
  }

  // Check for existing files on disk
  let fileExists = false;
  try {
    await fs.access(filename);
    fileExists = true;
  } catch {
    fileExists = false;
  }

  if (!fileExists) {
    return filename;
  }

  // Handle existing file based on conflict strategy
  switch (options.outputConflict) {
    case 'override':
      if (!options.quiet) {
        console.log(`⚠️  Overriding existing file: ${filename}`);
      }
      return filename;

    case 'skip':
      console.log(`⏭️  Skipping existing file: ${filename}`);
      throw new SkipFileError(`File already exists: ${filename}`);

    case 'prompt':
      // Interactive prompt (would need readline implementation)
      // For now, fallback to copy behavior
      console.log(`📝 File exists, generating unique name: ${filename}`);
      return await findUniqueFilename(parsedPath, path.dirname(filename), options, existingFilenames);

    case 'copy':
    default:
      if (!options.quiet) {
        console.log(`📝 File exists, generating unique name: ${filename}`);
      }
      return await findUniqueFilename(parsedPath, path.dirname(filename), options, existingFilenames);
  }
}

/**
 * Find unique filename by appending counter or timestamp
 */
export async function findUniqueFilename(
  parsedPath: path.ParsedPath,
  outputDir?: string,
  options?: CliOptions,
  existingFilenames?: Set<string>
): Promise<string> {
  let counter = 1;
  let uniqueFilename: string;

  do {
    const suffix = `_${counter}`;

    uniqueFilename = `${parsedPath.name}${suffix}${parsedPath.ext}`;
    const fullPath = outputDir ? path.join(outputDir, uniqueFilename) : uniqueFilename;

    // Check both in-memory tracking and disk
    const inMemoryConflict = existingFilenames?.has(uniqueFilename);
    
    let diskConflict = false;
    try {
      await fs.access(fullPath);
      diskConflict = true;
    } catch {
      diskConflict = false;
    }

    if (!inMemoryConflict && !diskConflict) {
      break;
    }

    counter++;

    // Prevent infinite loops
    if (counter > 1000) {
      throw new Error(`Unable to generate unique filename after 1000 attempts for: ${parsedPath.name}`);
    }

  } while (true);

  return uniqueFilename;
}

/**
 * Create URL-output pairs from arrays
 */
export async function createUrlOutputPairs(
  urls: string[],
  outputs: string[],
  options: CliOptions
): Promise<UrlOutputPair[]> {
  const pairs: UrlOutputPair[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const explicitOutput = outputs[i]; // May be undefined

    pairs.push({
      url,
      output: explicitOutput,
      index: i
    });
  }

  return pairs;
}