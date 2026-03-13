import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger.js';
import { config, outputDirs } from '../config/index.js';
import { GeneratedAudio } from '../types/index.js';

const logger = createLogger('VoiceGenerator');

/**
 * Generate voice narration using XTTS v2
 */
export class VoiceGenerator {
  private xttsUrl: string;
  private maxChunkSize: number = 500; // Characters per chunk

  constructor(xttsUrl: string = config.xtts.url) {
    this.xttsUrl = xttsUrl;
  }

  /**
   * Generate narration from script
   */
  async generateNarration(script: string): Promise<GeneratedAudio> {
    logger.info({ scriptLength: script.length }, 'Generating narration...');

    try {
      // Create output directory if needed
      if (!fs.existsSync(outputDirs.audio)) {
        fs.mkdirSync(outputDirs.audio, { recursive: true });
      }

      const outputPath = path.join(outputDirs.audio, 'narration.wav');

      // Split script into chunks
      const chunks = this.chunkText(script);
      logger.info({ chunkCount: chunks.length }, 'Script chunked for processing');

      // For testing, create a placeholder WAV file
      // In production, this would call XTTS API
      await this.createPlaceholderAudio(outputPath, script);

      const durationSeconds = Math.round((script.split(/\s+/).length / 140) * 60); // 140 WPM

      const audio: GeneratedAudio = {
        path: outputPath,
        durationSeconds,
        sampleRate: 44100,
        channels: 2,
        timestamp: new Date(),
      };

      logger.info({ outputPath, durationSeconds }, 'Narration generated successfully');
      return audio;
    } catch (error) {
      logger.error({ error }, 'Failed to generate narration');
      throw error;
    }
  }

  /**
   * Chunk text at sentence boundaries
   */
  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);

    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + ' ' + sentence).length > this.maxChunkSize) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Create a placeholder WAV file for testing
   */
  private async createPlaceholderAudio(outputPath: string, script: string): Promise<void> {
    // Create minimal valid WAV file
    // WAV format: RIFF header + fmt sub-chunk + data sub-chunk

    const sampleRate = 44100;
    const channels = 2;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * channels * bitsPerSample) / 8;
    const blockAlign = (channels * bitsPerSample) / 8;
    const scriptLength = script.split(/\s+/).length;
    const durationSeconds = Math.round((scriptLength / 140) * 60); // 140 WPM
    const numSamples = sampleRate * durationSeconds;
    const dataSize = numSamples * blockAlign;

    // Create WAV header
    const header = Buffer.alloc(44);
    header.write('RIFF');
    header.writeUInt32LE(36 + dataSize, 4); // File size - 8
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // Subchunk1Size
    header.writeUInt16LE(1, 20); // AudioFormat (PCM)
    header.writeUInt16LE(channels, 22); // NumChannels
    header.writeUInt32LE(sampleRate, 24); // SampleRate
    header.writeUInt32LE(byteRate, 28); // ByteRate
    header.writeUInt16LE(blockAlign, 32); // BlockAlign
    header.writeUInt16LE(bitsPerSample, 34); // BitsPerSample
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    // Write silence data
    const audioData = Buffer.alloc(dataSize, 0);

    // Combine and write
    const wavFile = Buffer.concat([header, audioData]);
    fs.writeFileSync(outputPath, wavFile);

    logger.debug({ path: outputPath, duration: durationSeconds }, 'Placeholder audio created');
  }

  /**
   * Call XTTS API for real voice generation (production)
   */
  private async callXTTSAPI(text: string): Promise<Buffer> {
    try {
      const response = await axios.post(
        `${this.xttsUrl}/tts_stream`,
        {
          text,
          speaker_wav: '/path/to/reference/voice.wav', // Would use default or provided voice sample
          language: 'en',
        },
        {
          responseType: 'arraybuffer',
          timeout: 60000,
        }
      );

      logger.debug('XTTS API call successful');
      return response.data as Buffer;
    } catch (error) {
      logger.error({ error }, 'Failed to call XTTS API');
      throw error;
    }
  }
}

export default VoiceGenerator;
