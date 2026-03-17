import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import { execSync } from 'child_process';
import { createLogger } from '../utils/logger.js';
import { ParsedBook, BookMetadata, Chapter } from '../types/index.js';

const logger = createLogger('BookParser');

/**
 * Parse books from various formats (EPUB, PDF, TXT)
 */
export class BookParser {
  /**
   * Parse a book file from the given path
   */
  async parseBook(filePath: string): Promise<ParsedBook> {
    logger.info({ filePath }, 'Parsing book...');

    if (!fs.existsSync(filePath)) {
      const error = `File not found: ${filePath}`;
      logger.error({ filePath }, error);
      throw new Error(error);
    }

    const ext = path.extname(filePath).toLowerCase();

    try {
      switch (ext) {
        case '.pdf':
          return await this.parsePdf(filePath);
        case '.epub':
          return await this.parseEpub(filePath);
        case '.txt':
          return this.parseTxt(filePath);
        default:
          throw new Error(`Unsupported file format: ${ext}`);
      }
    } catch (error) {
      logger.error({ filePath, error }, 'Failed to parse book');
      throw error;
    }
  }

  /**
   * Parse PDF file
   */
  private async parsePdf(filePath: string): Promise<ParsedBook> {
    logger.info({ filePath }, 'Parsing PDF...');

    try {
      const fileBuffer = fs.readFileSync(filePath);
      const data = await pdf(fileBuffer);

      const text = data.text;
      const wordCount = this.countWords(text);

      const metadata: BookMetadata = {
        title: path.basename(filePath, '.pdf'),
        author: data.info?.Author || undefined,
        totalWords: wordCount,
        totalChapters: 1, // PDFs don't have structured chapters
        filePath,
      };

      logger.info({ metadata }, 'PDF parsed successfully');

      return {
        text,
        metadata,
      };
    } catch (error) {
      logger.error({ filePath, error }, 'Failed to parse PDF');
      throw error;
    }
  }

  /**
   * Parse EPUB file by extracting from ZIP archive using unzip command
   */
  private async parseEpub(filePath: string): Promise<ParsedBook> {
    logger.info({ filePath }, 'Parsing EPUB...');

    try {
      const tempDir = `/tmp/epub_${Date.now()}`;
      const fullText: string[] = [];

      try {
        // Extract EPUB using unzip command (available on macOS/Linux)
        execSync(`mkdir -p "${tempDir}" && unzip -q "${filePath}" -d "${tempDir}"`);

        // Find all XHTML and HTML files
        try {
          const findCmd = `find "${tempDir}" -type f \\( -name "*.xhtml" -o -name "*.html" -o -name "*.htm" \\) | sort`;
          const files = execSync(findCmd).toString().trim().split('\n').filter(f => f);

          // Read each file
          for (const file of files) {
            try {
              const content = fs.readFileSync(file, 'utf-8');
              const sanitized = this.sanitizeHtmlText(content);
              if (sanitized.length > 10) {
                fullText.push(sanitized);
              }
            } catch (readErr) {
              logger.warn({ file, error: readErr }, 'Could not read file');
            }
          }
        } catch (findErr) {
          logger.warn({ error: findErr }, 'Could not find XHTML files, trying alternative method');
        }

        // Combine all text
        const finalText = fullText.join('\n\n').replace(/\s+/g, ' ').trim();

        logger.info({ length: finalText.length }, 'EPUB extracted successfully');

        const wordCount = this.countWords(finalText);
        const bookMetadata: BookMetadata = {
          title: path.basename(filePath, '.epub'),
          totalWords: wordCount,
          totalChapters: Math.max(1, fullText.length),
          filePath,
        };

        return {
          text: finalText,
          metadata: bookMetadata,
        };
      } finally {
        // Cleanup temp directory
        try {
          execSync(`rm -rf "${tempDir}"`);
        } catch (cleanErr) {
          logger.warn({ error: cleanErr }, 'Could not cleanup temp directory');
        }
      }
    } catch (error) {
      logger.error({ filePath, error }, 'Failed to parse EPUB');
      throw error;
    }
  }

  /**
   * Sanitize HTML/XML content to plain text
   */
  private sanitizeHtmlText(htmlText: string): string {
    if (!htmlText || typeof htmlText !== 'string') {
      return '';
    }
    // Remove HTML/XML tags
    let text = htmlText.replace(/<[^>]+>/g, ' ');
    // Remove HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#?[a-zA-Z0-9]+;/g, ' ');
    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  }

  /**
   * Parse TXT file
   */
  private parseTxt(filePath: string): ParsedBook {
    logger.info({ filePath }, 'Parsing TXT...');

    try {
      const text = fs.readFileSync(filePath, 'utf-8');
      const wordCount = this.countWords(text);

      const metadata: BookMetadata = {
        title: path.basename(filePath, '.txt'),
        totalWords: wordCount,
        totalChapters: 1,
        filePath,
      };

      logger.info({ metadata }, 'TXT parsed successfully');

      return {
        text,
        metadata,
      };
    } catch (error) {
      logger.error({ filePath, error }, 'Failed to parse TXT');
      throw error;
    }
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }
}

export default BookParser;
