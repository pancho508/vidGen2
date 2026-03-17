import { YouTubeScript, ScriptSection } from '../types/index.js';
import { createLogger } from '../utils/logger.js';
import { config, outputDirs } from '../config/index.js';
import OllamaClient from '../services/ollamaClient.js';
import fs from 'fs';
import path from 'path';

const logger = createLogger('ScriptGenerator');

/**
 * Generate YouTube script from book summary
 */
export class ScriptGenerator {
  private ollama: OllamaClient;
  private targetWordCount: number;
  private estimatedWPM: number = 140; // YouTube speaking rate

  constructor(ollama?: OllamaClient, targetWordCount: number = 1400) {
    this.ollama = ollama || new OllamaClient();
    this.targetWordCount = targetWordCount;
  }

  /**
   * Generate a complete YouTube script from book summary
   */
  async generateYoutubeScript(bookSummary: string, bookTitle: string): Promise<YouTubeScript> {
    logger.info({ bookTitle, targetWords: this.targetWordCount }, 'Generating YouTube script...');

    try {
      // Define section structure
      const sectionTargets = [
        { name: 'HOOK' as const, targetWords: 50 },
        { name: 'INTRO' as const, targetWords: 100 },
        { name: 'IDEA_1' as const, targetWords: 350 },
        { name: 'IDEA_2' as const, targetWords: 350 },
        { name: 'IDEA_3' as const, targetWords: 350 },
        { name: 'LESSONS' as const, targetWords: 150 },
        { name: 'CONCLUSION' as const, targetWords: 50 },
      ];

      // Generate each section
      const generatedSections: ScriptSection[] = [];

      for (const section of sectionTargets) {
        logger.debug({ section: section.name, targetWords: section.targetWords }, 'Generating section...');

        const sectionContent = await this.generateSection(
          section.name,
          bookSummary,
          bookTitle,
          section.targetWords
        );

        const wordCount = this.countWords(sectionContent);

        const scriptSection: ScriptSection = {
          name: section.name,
          content: sectionContent,
          wordCount,
          estimatedDurationSeconds: this.wordsToSeconds(wordCount),
        };

        generatedSections.push(scriptSection);
      }

      // Combine all sections into full script
      const fullScript = generatedSections.map((s) => s.content).join('\n\n');
      const totalWords = generatedSections.reduce((sum, s) => sum + s.wordCount, 0);
      const totalDuration = generatedSections.reduce((sum, s) => sum + s.estimatedDurationSeconds, 0);

      logger.info(
        { totalWords, sections: generatedSections.length, durationSeconds: totalDuration },
        'YouTube script generated successfully'
      );

      // Save script to disk
      const scriptPath = await this.saveScript(fullScript, generatedSections, bookTitle, totalWords, totalDuration);

      return {
        fullScript,
        wordCount: totalWords,
        sections: generatedSections,
        estimatedTotalDuration: totalDuration,
        scriptPath,
      };
    } catch (error) {
      logger.error({ bookTitle, error }, 'Failed to generate YouTube script');
      throw error;
    }
  }

  /**
   * Generate individual script section
   */
  private async generateSection(
    sectionName: string,
    bookSummary: string,
    bookTitle: string,
    targetWords: number
  ): Promise<string> {
    const prompts: Record<string, string> = {
      HOOK:
        `Create a HOOK (opening/attention-grabber) for a YouTube video about "${bookTitle}". 
         This should be 1-2 sentences that makes viewers want to watch.
         Make it intriguing and relevant to the book's main theme.
         Target: ~${targetWords} words.
         
         Book Summary: ${bookSummary.substring(0, 500)}
         
         Hook:`,

      INTRO:
        `Create an INTRO section for a YouTube video about "${bookTitle}".
         This should introduce the topic and tell viewers what they'll learn.
         Target: ~${targetWords} words.
         
         Book Summary: ${bookSummary.substring(0, 500)}
         
         Introduction:`,

      IDEA_1:
        `Based on this book summary, explain the FIRST main idea or concept in detail.
         This should be engaging and educational, suitable for a YouTube audience.
         Focus on practical relevance and interesting details.
         Target: ~${targetWords} words.
         
         Book: "${bookTitle}"
         Summary: ${bookSummary.substring(0, 800)}
         
         First Main Idea:`,

      IDEA_2:
        `Based on this book summary, explain the SECOND main idea or concept in detail.
         This should complement the first idea and add new value.
         Make it engaging and clear.
         Target: ~${targetWords} words.
         
         Book: "${bookTitle}"
         Summary: ${bookSummary.substring(0, 800)}
         
         Second Main Idea:`,

      IDEA_3:
        `Based on this book summary, explain the THIRD main idea or concept in detail.
         This should be a strong point that reinforces the video's message.
         Make it memorable and impactful.
         Target: ~${targetWords} words.
         
         Book: "${bookTitle}"
         Summary: ${bookSummary.substring(0, 800)}
         
         Third Main Idea:`,

      LESSONS:
        `From "${bookTitle}", what are the KEY LESSONS or TAKEAWAYS?
         Summarize the main lessons viewers should remember.
         Make it actionable and valuable.
         Target: ~${targetWords} words.
         
         Book Summary: ${bookSummary.substring(0, 500)}
         
         Key Lessons:`,

      CONCLUSION:
        `Write a CONCLUSION for a YouTube video about "${bookTitle}".
         Wrap up the content, remind viewers of the main point, and include a call-to-action.
         Target: ~${targetWords} words.
         
         Book Summary: ${bookSummary.substring(0, 500)}
         
         Conclusion:`,
    };

    const prompt = prompts[sectionName] || prompts.INTRO;

    try {
      const content = await this.ollama.generate(prompt, {
        temperature: 0.7,
        numContext: 2048,
      });

      return content.trim();
    } catch (error) {
      logger.error({ section: sectionName, error }, 'Failed to generate section');
      throw error;
    }
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
  }

  /**
   * Convert word count to estimated speaking duration (seconds)
   */
  private wordsToSeconds(wordCount: number): number {
    return Math.round((wordCount / this.estimatedWPM) * 60);
  }

  /**
   * Save script to disk as markdown file
   */
  private async saveScript(
    fullScript: string,
    sections: ScriptSection[],
    bookTitle: string,
    totalWords: number,
    totalDuration: number
  ): Promise<string> {
    try {
      // Create scripts directory if it doesn't exist
      if (!fs.existsSync(outputDirs.scripts)) {
        fs.mkdirSync(outputDirs.scripts, { recursive: true });
      }

      // Create metadata header
      const timestamp = new Date().toISOString();
      const filename = `${bookTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.md`;
      const filepath = path.join(outputDirs.scripts, filename);

      // Build markdown content
      let markdown = `# ${bookTitle} - YouTube Script\n\n`;
      markdown += `**Generated:** ${timestamp}\n`;
      markdown += `**Total Words:** ${totalWords}\n`;
      markdown += `**Estimated Duration:** ${totalDuration} seconds (${Math.round(totalDuration / 60)} minutes)\n`;
      markdown += `**Sections:** ${sections.length}\n\n`;

      // Add each section
      for (const section of sections) {
        markdown += `## ${section.name}\n\n`;
        markdown += `*Words: ${section.wordCount} | Duration: ${section.estimatedDurationSeconds}s*\n\n`;
        markdown += section.content + '\n\n';
      }

      // Write to file
      fs.writeFileSync(filepath, markdown, 'utf-8');

      logger.info({ filePath: filepath }, 'Script saved to disk');
      return filepath;
    } catch (error) {
      logger.error({ error }, 'Failed to save script');
      throw error;
    }
  }
}

export default ScriptGenerator;
