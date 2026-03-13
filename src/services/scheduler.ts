import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger.js';
import { config, outputDirs } from '../config/index.js';
import PipelineRunner from '../pipeline/pipelineRunner.js';

const logger = createLogger('PipelineScheduler');

/**
 * Schedule and manage pipeline execution
 */
export class PipelineScheduler {
  private runners: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Schedule daily pipeline execution
   */
  scheduleDaily(bookPath: string, time: string = config.scheduler.time): void {
    logger.info({ bookPath, time }, `Scheduling book processing for ${time}`);

    try {
      const taskId = `book_${Date.now()}`;

      const task = cron.schedule(time, async () => {
        logger.info({ bookPath }, '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        logger.info({ bookPath }, 'Scheduled pipeline execution started');
        logger.info({ bookPath }, '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        try {
          const runner = new PipelineRunner();
          const result = await runner.runPipeline(bookPath);
          await runner.savePipelineResult(result, `scheduled_${Date.now()}.json`);

          if (result.success) {
            logger.info({ videoPath: result.videoPath }, 'Scheduled execution completed successfully');
          } else {
            logger.error({ errors: result.errors }, 'Scheduled execution failed');
          }
        } catch (error) {
          logger.error({ error }, 'Error during scheduled execution');
        }
      });

      this.runners.set(taskId, task);
      logger.info({ taskId }, `✓ Scheduled task created: ${taskId}`);
    } catch (error) {
      logger.error({ error }, 'Failed to schedule daily execution');
      throw error;
    }
  }

  /**
   * Schedule multiple books from a folder
   */
  scheduleBooksFromFolder(folderPath: string, time: string = config.scheduler.time): void {
    logger.info({ folderPath, time }, 'Scheduling all books in folder');

    try {
      if (!fs.existsSync(folderPath)) {
        logger.warn({ folderPath }, 'Folder does not exist');
        return;
      }

      const files = fs.readdirSync(folderPath);
      const bookFiles = files.filter((f) => /\.(epub|pdf|txt)$/i.test(f));

      if (bookFiles.length === 0) {
        logger.warn({ folderPath }, 'No book files found in folder');
        return;
      }

      for (const bookFile of bookFiles) {
        const bookPath = path.join(folderPath, bookFile);
        this.scheduleDaily(bookPath, time);
      }

      logger.info({ count: bookFiles.length, folderPath }, `Scheduled ${bookFiles.length} books`);
    } catch (error) {
      logger.error({ folderPath, error }, 'Failed to schedule books from folder');
      throw error;
    }
  }

  /**
   * Get all scheduled tasks
   */
  getScheduledTasks(): Array<{ id: string; status: string }> {
    const tasks = Array.from(this.runners.entries()).map(([id, task]) => ({
      id,
      status: (task as any)._destroyed ? 'stopped' : 'running',
    }));

    return tasks;
  }

  /**
   * Start (validate) all scheduled tasks
   */
  start(): void {
    logger.info({ taskCount: this.runners.size }, 'Starting scheduler');

    for (const [id, task] of this.runners) {
      if (!(task as any)._destroyed) {
        logger.debug({ taskId: id }, 'Task is running');
      }
    }
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    logger.info({ taskCount: this.runners.size }, 'Stopping scheduler');

    for (const [id, task] of this.runners) {
      try {
        task.stop();
        logger.debug({ taskId: id }, 'Task stopped');
      } catch (error) {
        logger.warn({ taskId: id, error }, 'Error stopping task');
      }
    }

    this.runners.clear();
    logger.info('Scheduler stopped');
  }

  /**
   * Remove a specific scheduled task
   */
  removeTask(taskId: string): boolean {
    const task = this.runners.get(taskId);
    if (task) {
      task.stop();
      this.runners.delete(taskId);
      logger.info({ taskId }, 'Task removed');
      return true;
    }
    return false;
  }
}

export default PipelineScheduler;
