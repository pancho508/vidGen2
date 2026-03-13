#!/usr/bin/env node

import { createLogger } from './utils/logger.js';
import { config, outputDirs } from './config/index.js';
import PipelineRunner from './pipeline/pipelineRunner.js';
import PipelineScheduler from './services/scheduler.js';
import fs from 'fs';

const logger = createLogger('cli');

/**
 * CLI Entry Point
 */
async function main() {
  const command = process.argv[2];

  logger.info({ command }, 'VidGen2 - Local AI Video Factory started');

  if (!command) {
    printHelp();
    return;
  }

  switch (command) {
    case 'process': {
      const bookPath = process.argv[3];
      if (!bookPath) {
        logger.error('Book path required: npm run process <path-to-book>');
        process.exit(1);
      }
      await processBook(bookPath);
      break;
    }

    case 'schedule': {
      const bookPath = process.argv[3] || outputDirs.books;
      const scheduleTime = process.argv[4] || config.scheduler.time;
      await scheduleProcessing(bookPath, scheduleTime);
      break;
    }

    case 'logs': {
      const type = process.argv[3] || 'all';
      viewLogs(type);
      break;
    }

    default:
      logger.error({ command }, 'Unknown command');
      printHelp();
      process.exit(1);
  }
}

/**
 * Process a single book
 */
async function processBook(bookPath: string): Promise<void> {
  logger.info({ bookPath }, 'Processing book...');

  try {
    // Validate file exists
    if (!fs.existsSync(bookPath)) {
      throw new Error(`Book file not found: ${bookPath}`);
    }

    const runner = new PipelineRunner();
    const result = await runner.runPipeline(bookPath);

    // Save result
    await runner.savePipelineResult(result, `result_${Date.now()}.json`);

    if (result.success) {
      logger.info(
        { videoPath: result.videoPath, duration: result.durationSeconds },
        '✓ Video generated successfully!'
      );
      process.exit(0);
    } else {
      logger.error({ errors: result.errors }, '✗ Pipeline failed');
      process.exit(1);
    }
  } catch (error) {
    logger.error({ error }, 'Failed to process book');
    process.exit(1);
  }
}

/**
 * Schedule pipeline execution
 */
async function scheduleProcessing(bookPathOrFolder: string, scheduleTime: string): Promise<void> {
  logger.info({ bookPathOrFolder, scheduleTime }, 'Starting scheduler...');

  try {
    const scheduler = new PipelineScheduler();

    // Check if it's a folder or single file
    if (fs.statSync(bookPathOrFolder).isDirectory()) {
      scheduler.scheduleBooksFromFolder(bookPathOrFolder, scheduleTime);
    } else {
      scheduler.scheduleDaily(bookPathOrFolder, scheduleTime);
    }

    const tasks = scheduler.getScheduledTasks();
    logger.info({ taskCount: tasks.length }, `✓ Scheduler started with ${tasks.length} task(s)`);

    scheduler.start();

    // Keep process alive
    process.on('SIGINT', () => {
      logger.info('Shutting down scheduler...');
      scheduler.stop();
      process.exit(0);
    });

    // Log periodic status
    setInterval(() => {
      const activeTasks = scheduler.getScheduledTasks();
      logger.info({ activeTaskCount: activeTasks.length }, 'Scheduler status');
    }, 60000); // Every minute
  } catch (error) {
    logger.error({ error }, 'Failed to start scheduler');
    process.exit(1);
  }
}

/**
 * View logs
 */
function viewLogs(type: string): void {
  try {
    const logsDir = outputDirs.logs;

    if (!fs.existsSync(logsDir)) {
      logger.info('No logs directory found yet');
      return;
    }

    let files: string[] = [];

    switch (type.toLowerCase()) {
      case 'all':
        files = fs.readdirSync(logsDir).filter((f) => f.endsWith('.log'));
        break;
      case 'pipeline':
        files = ['pipeline.log'];
        break;
      case 'errors':
        files = ['errors.log'];
        break;
      default:
        logger.error({ type }, 'Unknown log type');
        return;
    }

    for (const file of files) {
      const filepath = `${logsDir}/${file}`;
      if (fs.existsSync(filepath)) {
        logger.info(`\n═══ ${file} ═══`);
        const content = fs.readFileSync(filepath, 'utf-8');
        console.log(content);
      }
    }
  } catch (error) {
    logger.error({ error }, 'Failed to view logs');
  }
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
VidGen2 - Local AI Video Factory
================================

Usage:
  npm run process <book-path>      Convert a book to a video
  npm run schedule [folder] [time] Start scheduler (runs daily at specified time)
  npm run logs [type]              View logs (all|pipeline|errors)

Examples:
  npm run process ./books/atomic-habits.epub
  npm run schedule ./books                  # Process all books in folder daily at 3 AM
  npm run schedule ./books/book.pdf "0 10 * * *"  # Daily at 10 AM
  npm run logs pipeline

Configuration:
  Copy .env.example to .env and configure:
  - OLLAMA_URL: Local Ollama instance (default: http://localhost:11434)
  - COMFYUI_URL: ComfyUI for image generation (default: http://localhost:8188)
  - XTTS_URL: XTTS for voice generation (default: http://localhost:5000)
  - WHISPER_PATH: Path to Whisper binary
  - FFMPEG_PATH: Path to FFmpeg binary
  - SCHEDULE_TIME: Cron expression for daily runs (default: 0 3 * * *)

Performance:
  Typical video generation: ~5 minutes
  Output: MP4 video, WAV audio, PNG images, SRT subtitles, PNG thumbnail

Directories:
  books/       - Input book files (EPUB, PDF, TXT)
  videos/      - Generated video files
  audio/       - Generated audio narration
  images/      - Generated scene images
  subtitles/   - Generated subtitle files
  thumbnails/  - Generated thumbnails
  logs/        - Pipeline execution logs
`);
}

main().catch((error) => {
  logger.error(error, 'Fatal error');
  process.exit(1);
});
