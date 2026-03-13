import { Chapter, SummaryResult } from '../types/index.js';
import { createLogger } from '../utils/logger.js';
import OllamaClient from '../services/ollamaClient.js';

const logger = createLogger('Summarizer');

/**
 * Summarize book content using local LLM
 */
export class Summarizer {
  private ollama: OllamaClient;

  constructor(ollama?: OllamaClient) {
    this.ollama = ollama || new OllamaClient();
  }

  /**
   * Summarize a single chapter
   */
  async summarizeChapter(chapter: Chapter): Promise<string> {
    logger.info({ chapterNumber: chapter.number, wordCount: chapter.wordCount }, 'Summarizing chapter...');

    try {
      const prompt = `Summarize the following chapter in 2-3 sentences, focusing on the main ideas and key takeaways:

Chapter ${chapter.number}${chapter.title ? ': ' + chapter.title : ''}
${'-'.repeat(50)}

${chapter.content.substring(0, 2000)}${chapter.content.length > 2000 ? '...' : ''}

Summary:`;

      const summary = await this.ollama.generate(prompt, {
        temperature: 0.5, // Lower temperature for more focused summaries
      });

      logger.debug({ chapterNumber: chapter.number }, 'Chapter summary generated');

      return summary.trim();
    } catch (error) {
      logger.error({ chapterNumber: chapter.number, error }, 'Failed to summarize chapter');
      throw error;
    }
  }

  /**
   * Summarize all chapters into a comprehensive book summary
   */
  async summarizeBook(chapters: Chapter[]): Promise<SummaryResult> {
    logger.info({ chapterCount: chapters.length }, 'Summarizing entire book...');

    try {
      // Summarize individual chapters
      const chapterSummaries: string[] = [];
      const keyPoints: string[] = [];

      for (const chapter of chapters) {
        try {
          const summary = await this.summarizeChapter(chapter);
          chapterSummaries.push(summary);
        } catch (error) {
          logger.warn({ chapterNumber: chapter.number, error }, 'Failed to summarize individual chapter, continuing...');
          chapterSummaries.push(chapter.content.substring(0, 500) + '...');
        }
      }

      // Generate overall book summary from chapter summaries
      const chapterSummariesText = chapterSummaries
        .map((s, i) => `Chapter ${i + 1}: ${s}`)
        .join('\n\n');

      const bookSummaryPrompt = `Based on the following chapter summaries, create a comprehensive 300-400 word summary of the entire book. Focus on:
1. The main theme or purpose of the book
2. Key concepts and ideas
3. Important lessons or takeaways
4. The book's overall impact or message

Chapter Summaries:
${'-'.repeat(50)}
${chapterSummariesText}

Book Summary:`;

      const bookSummary = await this.ollama.generate(bookSummaryPrompt, {
        temperature: 0.5,
        numContext: 3000,
      });

      // Extract key points from summary
      const keyPointsPrompt = `From the following book summary, extract 5-7 key points or main ideas as a numbered list. Be concise, each point should be 1-2 sentences:

${bookSummary}

Key Points:`;

      const keyPointsText = await this.ollama.generate(keyPointsPrompt, {
        temperature: 0.5,
      });

      // Parse key points
      const parsedKeyPoints = keyPointsText
        .split(/\n/)
        .filter((line) => line.trim().match(/^\d+\./))
        .map((line) => line.replace(/^\d+\.\s*/, '').trim())
        .filter((point) => point.length > 0);

      logger.info({ keyPointsCount: parsedKeyPoints.length }, 'Book summary completed');

      return {
        chapterSummaries,
        bookSummary: bookSummary.trim(),
        keyPoints: parsedKeyPoints,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to summarize book');
      throw error;
    }
  }

  /**
   * Quick summary for testing/debugging
   */
  async quickSummary(text: string, maxWords: number = 100): Promise<string> {
    const prompt = `Summarize the following text in approximately ${maxWords} words:

${text.substring(0, 1000)}

Summary:`;

    return this.ollama.generate(prompt, {
      temperature: 0.5,
    });
  }
}

export default Summarizer;
