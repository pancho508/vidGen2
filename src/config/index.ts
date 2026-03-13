import dotenv from 'dotenv';
import path from 'path';
import { Config } from '../types/index.js';

// Load .env file
dotenv.config();

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): Config {
  return {
    ollama: {
      url: process.env.OLLAMA_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama3:8b',
    },
    comfyui: {
      url: process.env.COMFYUI_URL || 'http://localhost:8188',
    },
    xtts: {
      url: process.env.XTTS_URL || 'http://localhost:5000',
    },
    whisper: {
      path: process.env.WHISPER_PATH || '/usr/local/bin/whisper',
    },
    ffmpeg: {
      path: process.env.FFMPEG_PATH || '/usr/local/bin/ffmpeg',
    },
    scheduler: {
      time: process.env.SCHEDULE_TIME || '0 3 * * *',
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      dir: process.env.LOG_DIR || './logs',
    },
    video: {
      targetDuration: parseInt(process.env.TARGET_VIDEO_DURATION || '540', 10),
      targetSceneCount: parseInt(process.env.TARGET_SCENE_COUNT || '20', 10),
      targetScriptWordCount: parseInt(process.env.TARGET_SCRIPT_WORD_COUNT || '1400', 10),
    },
  };
}

/**
 * Get the root directory of the project
 */
export function getRootDir(): string {
  return path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../');
}

/**
 * Get output directories
 */
export function getOutputDirs() {
  const root = getRootDir();
  return {
    books: path.join(root, 'books'),
    audio: path.join(root, 'audio'),
    images: path.join(root, 'images'),
    videos: path.join(root, 'videos'),
    thumbnails: path.join(root, 'thumbnails'),
    subtitles: path.join(root, 'subtitles'),
    logs: path.join(root, 'logs'),
    models: path.join(root, 'models'),
  };
}

// Export singleton config instance
export const config = loadConfig();
export const outputDirs = getOutputDirs();
