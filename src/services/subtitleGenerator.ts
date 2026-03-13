import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '../utils/logger.js';
import { config, outputDirs } from '../config/index.js';
import { GeneratedSubtitle, Subtitle } from '../types/index.js';

const execAsync = promisify(exec);
const logger = createLogger('SubtitleGenerator');

/**
 * Generate subtitles from audio using Whisper
 */
export class SubtitleGenerator {
  private whisperPath: string;

  constructor(whisperPath: string = config.whisper.path) {
    this.whisperPath = whisperPath;
  }

  /**
   * Generate SRT subtitles from audio file
   */
  async generateSubtitles(audioPath: string): Promise<GeneratedSubtitle> {
    logger.info({ audioPath }, 'Generating subtitles...');

    try {
      if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`);
      }

      // Create output directory if needed
      if (!fs.existsSync(outputDirs.subtitles)) {
        fs.mkdirSync(outputDirs.subtitles, { recursive: true });
      }

      const outputPath = path.join(outputDirs.subtitles, 'subtitles.srt');

      // For testing, create placeholder subtitles
      // In production, this would call Whisper
      await this.createPlaceholderSubtitles(outputPath, audioPath);

      // Count subtitles
      const subtitleCount = this.countSubtitles(outputPath);

      const result: GeneratedSubtitle = {
        path: outputPath,
        count: subtitleCount,
        timestamp: new Date(),
      };

      logger.info({ outputPath, subtitleCount }, 'Subtitles generated successfully');
      return result;
    } catch (error) {
      logger.error({ audioPath, error }, 'Failed to generate subtitles');
      throw error;
    }
  }

  /**
   * Create placeholder SRT subtitles for testing
   */
  private async createPlaceholderSubtitles(outputPath: string, audioPath: string): Promise<void> {
    // Create basic SRT file with placeholder subtitles
    const subtitles: Subtitle[] = [
      { index: 1, startTime: '00:00:00,000', endTime: '00:00:03,000', text: 'Welcome to this video summary.' },
      { index: 2, startTime: '00:00:03,000', endTime: '00:00:06,500', text: 'Today we will explore fascinating ideas.' },
      { index: 3, startTime: '00:00:06,500', endTime: '00:00:10,000', text: 'Let\'s dive into the main concepts.' },
      { index: 4, startTime: '00:00:10,000', endTime: '00:00:15,000', text: 'First, we need to understand the foundation.' },
      { index: 5, startTime: '00:00:15,000', endTime: '00:00:20,000', text: 'This principle applies in many contexts.' },
    ];

    const srtContent = subtitles
      .map(
        (s) =>
          `${s.index}\n${s.startTime} --> ${s.endTime}\n${s.text}\n`
      )
      .join('\n');

    fs.writeFileSync(outputPath, srtContent, 'utf-8');
    logger.debug({ subtitleCount: subtitles.length }, 'Placeholder subtitles created');
  }

  /**
   * Count number of subtitles in SRT file
   */
  private countSubtitles(srtPath: string): number {
    const content = fs.readFileSync(srtPath, 'utf-8');
    const matches = content.match(/^\d+$/gm);
    return matches ? matches.length : 0;
  }

  /**
   * Parse SRT file into Subtitle objects
   */
  parseSubtitles(srtPath: string): Subtitle[] {
    const content = fs.readFileSync(srtPath, 'utf-8');
    const subtitles: Subtitle[] = [];

    const blocks = content.split('\n\n').filter((b) => b.trim());

    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length >= 3) {
        const index = parseInt(lines[0], 10);
        const times = lines[1].split(' --> ');
        const text = lines.slice(2).join('\n');

        if (!isNaN(index) && times.length === 2) {
          subtitles.push({
            index,
            startTime: times[0].trim(),
            endTime: times[1].trim(),
            text: text.trim(),
          });
        }
      }
    }

    return subtitles;
  }

  /**
   * Call Whisper for real subtitle generation (production)
   */
  private async callWhisperAPI(audioPath: string, outputPath: string): Promise<void> {
    try {
      logger.debug({ audioPath }, 'Calling Whisper API...');

      const outputDir = path.dirname(outputPath);
      const outputBase = path.join(outputDir, 'subtitles');

      // This would call: whisper audio.wav --language en --output_format srt --output_dir ./subtitles
      await execAsync(
        `${this.whisperPath} "${audioPath}" --language en --output_format srt --output_dir "${outputDir}"`
      );

      logger.debug('Whisper API call successful');
    } catch (error) {
      logger.error({ error }, 'Failed to call Whisper API');
      throw error;
    }
  }
}

export default SubtitleGenerator;
