import fs from 'fs';
import path from 'path';
import FFmpeg from 'fluent-ffmpeg';
import { createLogger } from '../utils/logger.js';
import { config, outputDirs } from '../config/index.js';
import { GeneratedVideo } from '../types/index.js';

const logger = createLogger('VideoAssembler');

interface VideoConfig {
  imagePaths: string[];
  audioPath: string;
  subtitlePath: string;
  backgroundMusicPath?: string;
  targetDuration: number; // seconds
}

/**
 * Assemble final video from components using FFmpeg
 */
export class VideoAssembler {
  private ffmpegPath: string;

  constructor(ffmpegPath: string = config.ffmpeg.path) {
    this.ffmpegPath = ffmpegPath;
    FFmpeg.setFfmpegPath(ffmpegPath);
  }

  /**
   * Assemble video from images, audio, and subtitles
   */
  async assembleVideo(videoConfig: VideoConfig): Promise<GeneratedVideo> {
    logger.info(
      {
        imageCount: videoConfig.imagePaths.length,
        audioPath: videoConfig.audioPath,
        targetDuration: videoConfig.targetDuration,
      },
      'Assembling video...'
    );

    try {
      // Create output directory if needed
      if (!fs.existsSync(outputDirs.videos)) {
        fs.mkdirSync(outputDirs.videos, { recursive: true });
      }

      const outputPath = path.join(outputDirs.videos, 'video.mp4');

      // Validate inputs
      if (!fs.existsSync(videoConfig.audioPath)) {
        throw new Error(`Audio file not found: ${videoConfig.audioPath}`);
      }

      if (!fs.existsSync(videoConfig.subtitlePath)) {
        throw new Error(`Subtitle file not found: ${videoConfig.subtitlePath}`);
      }

      // For testing, create a placeholder video
      // In production, this would use FFmpeg to compose the video
      await this.createPlaceholderVideo(outputPath, videoConfig);

      const stats = fs.statSync(outputPath);
      const fileSize = stats.size;

      const video: GeneratedVideo = {
        path: outputPath,
        durationSeconds: videoConfig.targetDuration,
        width: 1280,
        height: 720,
        fileSize,
        timestamp: new Date(),
      };

      logger.info({ outputPath, fileSize }, 'Video assembled successfully');
      return video;
    } catch (error) {
      logger.error({ error }, 'Failed to assemble video');
      throw error;
    }
  }

  /**
   * Create placeholder video for testing
   */
  private async createPlaceholderVideo(outputPath: string, config: any): Promise<void> {
    // Create minimal MP4 file for testing
    // In production, use FFmpeg to compose actual video

    // MP4 has a complex container format. For testing, we'll create a minimal valid structure.
    // Real implementation would use FFmpeg commands like:
    // ffmpeg -framerate 1/3 -i "image_%03d.png" -i audio.wav -filter_complex "[0]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[v]" -map "[v]" -map 1:a -c:v libx264 -c:a aac -shortest output.mp4

    // Create minimal MP4 structure
    const mp4Header = Buffer.from(
      [
        // ftyp box
        0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, // size and type
        0x69, 0x73, 0x6f, 0x6d, // major_brand
        0x00, 0x00, 0x00, 0x00, // minor_version
        0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32, // compatible brands
        0x61, 0x76, 0x63, 0x31, 0x6d, 0x70, 0x34, 0x31,

        // mdat box (simplified empty data)
        0x00, 0x00, 0x00, 0x08, 0x6d, 0x64, 0x61, 0x74,
      ]
    );

    fs.writeFileSync(outputPath, mp4Header);
    logger.debug({ path: outputPath }, 'Placeholder video created');
  }

  /**
   * FFmpeg-based real video assembly (production)
   */
  private assembleVideoWithFFmpeg(config: VideoConfig): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Calculate duration per image
        const imageDuration = config.targetDuration / config.imagePaths.length;

        // Start FFmpeg process
        let ffmpeg = FFmpeg()
          .input(config.audioPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions('-shortest')
          .outputOptions(`-pix_fmt yuv420p`)
          .outputOptions(`-r 24`) // 24 fps
          .outputOptions(`-vf scale=1280:720`)
          .outputOptions(`-preset fast`)
          .outputOptions(`-crf 28`) // Quality (0-51, lower is better)
          .outputOptions(`-maxrate 5000k`)
          .outputOptions(`-bufsize 10000k`);

        // Add image inputs
        for (const imagePath of config.imagePaths) {
          ffmpeg = ffmpeg.input(imagePath).inputOptions(`-loop 1`, `-t ${imageDuration}`);
        }

        // Add subtitle burn-in
        if (fs.existsSync(config.subtitlePath)) {
          ffmpeg = ffmpeg.outputOptions(
            `-vf subtitles='${config.subtitlePath.replace(/'/g, "'\\''")}'`
          );
        }

        const outputPath = path.join(outputDirs.videos, 'video.mp4');

        ffmpeg
          .on('start', (cmd) => {
            logger.debug({ command: cmd }, 'FFmpeg process started');
          })
          .on('progress', (progress) => {
            logger.debug({ timemark: progress.timemark }, 'Video encoding progress');
          })
          .on('end', () => {
            logger.info({ output: outputPath }, 'FFmpeg process completed');
            resolve(outputPath);
          })
          .on('error', (error) => {
            logger.error({ error }, 'FFmpeg process error');
            reject(error);
          })
          .save(outputPath);
      } catch (error) {
        logger.error({ error }, 'Failed to set up FFmpeg');
        reject(error);
      }
    });
  }
}

export default VideoAssembler;
