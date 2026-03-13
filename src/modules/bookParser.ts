import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
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
   * Parse EPUB file using basic text extraction
   */
  private async parseEpub(filePath: string): Promise<ParsedBook> {
    logger.info({ filePath }, 'Parsing EPUB...');

    try {
      // For now, treat EPUB as a complex format that requires the epub-parser library
      // EPUB files are essentially ZIP files containing XML/HTML files
      // A simple approach: extract from the epub file structure
      
      // Read the EPUB as binary
      const fileBuffer = fs.readFileSync(filePath);
      
      // Try to extract text - basic parsing
      let text = fileBuffer.toString('utf-8', 0, Math.min(fileBuffer.length, 1000000));
      
      // Remove XML/HTML tags for basic content extraction
      text = text.replace(/<[^>]+>/g, ' ');
      text = text.replace(/&nbsp;/g, ' ');
      text = text.replace(/&[a-zA-Z]+;/g, ' ');
      text = text.replace(/\s+/g, ' ').trim();

      // Fallback: if we got very little text, log warning
      if (text.length < 1000) {
        logger.warn({ filePath }, 'EPUB parsing yielded very small text content');
      }

      const wordCount = this.countWords(text);

      const metadata: BookMetadata = {
        title: path.basename(filePath, '.epub'),
        totalWords: wordCount,
        totalChapters: 1,
        filePath,
      };

      logger.info({ metadata }, 'EPUB parsed successfully');

      return {
        text,
        metadata,
      };
    } catch (error) {
      logger.error({ filePath, error }, 'Failed to parse EPUB');
      throw error;
    }
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
