import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createLogger } from '../utils/logger.js';
import { config, outputDirs } from '../config/index.js';
import { GeneratedAudio } from '../types/index.js';

const logger = createLogger('VoiceGenerator');

/**
 * Generate voice narration using macOS built-in text-to-speech
 */
export class VoiceGenerator {
  private voice: string;

  constructor(voice: string = 'Daniel') {
    // Daniel: Professional masculine voice (en_GB)
    // Moira: High quality feminine voice (en_IE)
    // Victoria: Clear feminine voice (en_AU)
    this.voice = voice;
  }

  /**
   * Generate narration from script using macOS say command
   */
  async generateNarration(script: string): Promise<GeneratedAudio> {
    logger.info({ scriptLength: script.length, voice: this.voice }, 'Generating narration...');

    try {
      // Create output directory if needed
      if (!fs.existsSync(outputDirs.audio)) {
        fs.mkdirSync(outputDirs.audio, { recursive: true });
      }

      // Use temporary files for AIFF conversion
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vidgen-'));
      const aiffPath = path.join(tempDir, 'narration.aiff');
      const outputPath = path.join(outputDirs.audio, 'narration.wav');

      // Clean up temporary files
      const cleanup = () => {
        try {
          if (fs.existsSync(aiffPath)) fs.unlinkSync(aiffPath);
          if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
        } catch (e) {
          logger.debug('Temp file cleanup skipped');
        }
      };

      try {
        // Generate AIFF using macOS say command
        logger.debug({ scriptLength: script.length }, 'Executing say command...');
        const escapedScript = script.replace(/"/g, '\\"').replace(/\$/g, '\\$');
        execSync(`say -v "${this.voice}" "${escapedScript}" -o "${aiffPath}"`, {
          timeout: 120000,
          stdio: 'pipe',
        });

        logger.debug({ aiffPath }, 'AIFF generated successfully');

        // Convert AIFF to WAV using ffmpeg
        logger.debug('Converting AIFF to WAV...');
        execSync(`ffmpeg -i "${aiffPath}" "${outputPath}" -y 2>&1 | grep -v "frame="`, {
          stdio: 'pipe',
        });

        logger.debug({ outputPath }, 'WAV conversion completed');

        // Calculate duration
        const wordCount = script.split(/\s+/).length;
        const durationSeconds = Math.round((wordCount / 140) * 60); // 140 WPM

        const audio: GeneratedAudio = {
          path: outputPath,
          durationSeconds,
          sampleRate: 44100,
          channels: 2,
          timestamp: new Date(),
        };

        logger.info({ outputPath, durationSeconds, voice: this.voice }, 'Narration generated successfully');
        cleanup();
        return audio;
      } catch (error) {
        cleanup();
        throw error;
      }
    } catch (error) {
      logger.error({ error }, 'Failed to generate narration');
      throw error;
    }
  }

}

export default VoiceGenerator;
