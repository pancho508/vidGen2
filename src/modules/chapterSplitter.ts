import { Chapter } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ChapterSplitter');

/**
 * Split book text into chapters and clean content
 */
export class ChapterSplitter {
  private readonly minChapterSize = 500; // Minimum words per chapter
  private readonly maxChapterSize = 3000; // Maximum words per chapter

  /**
   * Split text into chapters based on common chapter markers
   */
  splitChapters(text: string): Chapter[] {
    logger.info('Splitting chapters...');

    try {
      // First, clean the text
      const cleanedText = this.cleanText(text);

      // Find chapter boundaries
      const chapterBoundaries = this.findChapterBoundaries(cleanedText);

      // Extract chapters
      const chapters = this.extractChapters(cleanedText, chapterBoundaries);

      logger.info({ chapterCount: chapters.length }, 'Chapters split successfully');

      return chapters;
    } catch (error) {
      logger.error({ error }, 'Failed to split chapters');
      throw error;
    }
  }

  /**
   * Clean text: remove extra whitespace, normalize encoding
   */
  private cleanText(text: string): string {
    return (
      text
        // Normalize line endings
        .replace(/\r\n/g, '\n')
        // Remove multiple blank lines
        .replace(/\n\n\n+/g, '\n\n')
        // Remove leading/trailing whitespace
        .trim()
    );
  }

  /**
   * Find chapter boundaries using common patterns
   */
  private findChapterBoundaries(text: string): Array<{ index: number; title?: string }> {
    const boundaries: Array<{ index: number; title?: string }> = [];
    boundaries.push({ index: 0, title: 'Beginning' }); // Always start at 0

    const lines = text.split('\n');
    let currentIndex = 0;

    // Common chapter markers
    const chapterPatterns = [
      /^chapter\s+\d+\s*[\s:—-]*/i, // Chapter 1, Chapter 1:, etc.
      /^part\s+\d+\s*[\s:—-]*/i, // Part 1, Part 2, etc.
      /^book\s+\d+\s*[\s:—-]*/i, // Book 1, Book 2, etc.
      /^section\s+\d+\s*[\s:—-]*/i, // Section 1, Section 2, etc.
      /^[ivxlcdm]+\s*[\s:—-]*/i, // Roman numerals
      /^\.{3,}\s*$/, // Separator dots
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) continue;

      // Check if line matches chapter pattern
      for (const pattern of chapterPatterns) {
        if (pattern.test(line)) {
          // Count characters up to this line
          currentIndex = lines.slice(0, i).join('\n').length;

          const title = line.length > 100 ? line.substring(0, 100) : line;
          boundaries.push({ index: currentIndex, title });
          break;
        }
      }
    }

    return boundaries;
  }

  /**
   * Extract chapters from text using boundaries
   */
  private extractChapters(text: string, boundaries: Array<{ index: number; title?: string }>): Chapter[] {
    const chapters: Chapter[] = [];

    for (let i = 0; i < boundaries.length; i++) {
      const startIdx = boundaries[i].index;
      const endIdx = i + 1 < boundaries.length ? boundaries[i + 1].index : text.length;

      const content = text.substring(startIdx, endIdx).trim();

      // Skip very short content
      if (content.length < 50) {
        logger.debug({ chapter: i + 1 }, 'Skipping very short chapter');
        continue;
      }

      const wordCount = this.countWords(content);

      // Skip chapters thatare too short
      if (wordCount < this.minChapterSize) {
        logger.debug({ chapter: i + 1, wordCount }, 'Skipping short chapter');
        continue;
      }

      const chapter: Chapter = {
        number: chapters.length + 1,
        title: boundaries[i].title,
        content,
        wordCount,
      };

      chapters.push(chapter);
    }

    // If no chapters found or only 1, split by word count
    if (chapters.length <= 1) {
      return this.splitByWordCount(text);
    }

    return chapters;
  }

  /**
   * Split text into chapters by word count when chapter markers not found
   */
  private splitByWordCount(text: string): Chapter[] {
    const chapters: Chapter[] = [];
    const targetSize = 1500; // Target words per chapter
    const words = text.split(/\s+/);

    let currentChapter = '';
    let currentWordCount = 0;

    for (const word of words) {
      currentChapter += word + ' ';
      currentWordCount++;

      // Start a new chapter when reaching target size
      if (currentWordCount >= targetSize) {
        // Find nearest sentence boundary
        const lastPeriod = currentChapter.lastIndexOf('.');
        if (lastPeriod > -1) {
          const chapterText = currentChapter.substring(0, lastPeriod + 1).trim();
          if (chapterText.length > 0) {
            chapters.push({
              number: chapters.length + 1,
              content: chapterText,
              wordCount: this.countWords(chapterText),
            });
          }
          currentChapter = currentChapter.substring(lastPeriod + 1).trim();
          currentWordCount = this.countWords(currentChapter);
        }
      }
    }

    // Add remaining content as final chapter
    if (currentChapter.trim().length > 0) {
      const wordCount = this.countWords(currentChapter);
      if (wordCount > this.minChapterSize) {
        chapters.push({
          number: chapters.length + 1,
          content: currentChapter.trim(),
          wordCount,
        });
      }
    }

    return chapters;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
  }
}

export default ChapterSplitter;
