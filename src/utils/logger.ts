import pino from 'pino';
import path from 'path';
import { config, outputDirs } from '../config/index.js';

// Create logs directory if it doesn't exist
import fs from 'fs';
if (!fs.existsSync(outputDirs.logs)) {
  fs.mkdirSync(outputDirs.logs, { recursive: true });
}

const logDir = config.logging.dir;
const logLevel = config.logging.level;

/**
 * Main pipeline logger
 */
export const pipelineLogger = pino(
  {
    level: logLevel,
    transport: {
      targets: [
        // Console output
        {
          level: logLevel,
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
        // File output - all logs
        {
          level: 'debug',
          target: 'pino/file',
          options: { destination: path.join(logDir, 'pipeline.log') },
        },
        // File output - errors only
        {
          level: 'error',
          target: 'pino/file',
          options: { destination: path.join(logDir, 'errors.log') },
        },
      ],
    },
  },
  pino.multistream(
    [
      { level: logLevel, stream: process.stdout },
      { level: 'debug', stream: fs.createWriteStream(path.join(logDir, 'pipeline.log'), { flags: 'a' }) },
      { level: 'error', stream: fs.createWriteStream(path.join(logDir, 'errors.log'), { flags: 'a' }) },
    ],
    { dedupe: true }
  )
);

/**
 * Create a child logger for a specific component
 */
export function createLogger(component: string) {
  return pipelineLogger.child({ component });
}

export default pipelineLogger;
