import fs from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger.js';
import { config, outputDirs } from '../config/index.js';
import { PipelineResult, PipelineStep } from '../types/index.js';

// Import all modules
import { BookParser } from '../modules/bookParser.js';
import { ChapterSplitter } from '../modules/chapterSplitter.js';
import { Summarizer } from '../modules/summarizer.js';
import { ScriptGenerator } from '../modules/scriptGenerator.js';
import { ScenePlanner } from '../modules/scenePlanner.js';
import OllamaClient from '../services/ollamaClient.js';
import { ImageGenerator } from '../services/imageGenerator.js';
import { VoiceGenerator } from '../services/voiceGenerator.js';
import { SubtitleGenerator } from '../services/subtitleGenerator.js';
import { VideoAssembler } from '../services/videoAssembler.js';
import { ThumbnailGenerator } from '../services/thumbnailGenerator.js';

const logger = createLogger('PipelineRunner');

/**
 * Orchestrate the entire video generation pipeline
 */
export class PipelineRunner {
  private bookParser: BookParser;
  private chapterSplitter: ChapterSplitter;
  private ollama: OllamaClient;
  private summarizer: Summarizer;
  private scriptGenerator: ScriptGenerator;
  private scenePlanner: ScenePlanner;
  private imageGenerator: ImageGenerator;
  private voiceGenerator: VoiceGenerator;
  private subtitleGenerator: SubtitleGenerator;
  private videoAssembler: VideoAssembler;
  private thumbnailGenerator: ThumbnailGenerator;
  private steps: PipelineStep[];

  constructor() {
    this.bookParser = new BookParser();
    this.chapterSplitter = new ChapterSplitter();
    this.ollama = new OllamaClient();
    this.summarizer = new Summarizer(this.ollama);
    this.scriptGenerator = new ScriptGenerator(this.ollama);
    this.scenePlanner = new ScenePlanner();
    this.imageGenerator = new ImageGenerator();
    this.voiceGenerator = new VoiceGenerator();
    this.subtitleGenerator = new SubtitleGenerator();
    this.videoAssembler = new VideoAssembler();
    this.thumbnailGenerator = new ThumbnailGenerator();
    this.steps = [];
  }

  /**
   * Run the complete pipeline
   */
  async runPipeline(bookPath: string): Promise<PipelineResult> {
    const startTime = new Date();
    this.steps = [];

    logger.info({ bookPath }, '═══════════════════════════════════════════');
    logger.info({ bookPath }, 'Starting VidGen2 Pipeline');
    logger.info({ bookPath }, '═══════════════════════════════════════════');

    try {
      // Step 1: Parse book
      const parsedBook = await this.executeStep('Parse Book', async () => {
        return await this.bookParser.parseBook(bookPath);
      });

      // Step 2: Split chapters
      const chapters = await this.executeStep('Split Chapters', async () => {
        return this.chapterSplitter.splitChapters(parsedBook.text);
      });

      // Step 3: Summarize book
      const summary = await this.executeStep('Summarize Book', async () => {
        return await this.summarizer.summarizeBook(chapters);
      });

      logger.info({ summary }, 'Book summary generated');

      // Step 4: Generate script
      const script = await this.executeStep('Generate Script', async () => {
        return await this.scriptGenerator.generateYoutubeScript(
          summary.bookSummary,
          parsedBook.metadata.title
        );
      });

      logger.info({ wordCount: script.wordCount, sections: script.sections.length }, 'Script generated');

      // Step 5: Plan scenes
      const scenePlan = await this.executeStep('Plan Scenes', async () => {
        return await this.scenePlanner.planScenes(script.fullScript, script.sections);
      });

      logger.info({ sceneCount: scenePlan.scenes.length }, 'Scenes planned');

      // Step 6-9: Parallel execution (image, voice, thumbnail generation)
      // For simplicity, we'll execute sequentially here, but this could be parallelized with Promise.all()

      // Step 6: Generate images
      const images = await this.executeStep('Generate Images', async () => {
        return await this.imageGenerator.generateBatch(scenePlan.scenes);
      });

      logger.info({ imageCount: images.length }, 'Images generated');

      // Step 7: Generate voice
      const audio = await this.executeStep('Generate Voice', async () => {
        return await this.voiceGenerator.generateNarration(script.fullScript);
      });

      logger.info({ audioPath: audio.path, duration: audio.durationSeconds }, 'Voice generated');

      // Step 8: Generate subtitles
      const subtitles = await this.executeStep('Generate Subtitles', async () => {
        return await this.subtitleGenerator.generateSubtitles(audio.path);
      });

      logger.info({ subtitlePath: subtitles.path, count: subtitles.count }, 'Subtitles generated');

      // Step 9: Generate thumbnail
      const thumbnail = await this.executeStep('Generate Thumbnail', async () => {
        return await this.thumbnailGenerator.generateThumbnail(parsedBook.metadata.title);
      });

      logger.info({ thumbnailPath: thumbnail.path }, 'Thumbnail generated');

      // Step 10: Assemble video
      const video = await this.executeStep('Assemble Video', async () => {
        const imagePaths = images.map((img) => img.path);
        return await this.videoAssembler.assembleVideo({
          imagePaths,
          audioPath: audio.path,
          subtitlePath: subtitles.path,
          targetDuration: config.video.targetDuration,
        });
      });

      logger.info({ videoPath: video.path, duration: video.durationSeconds }, 'Video assembled');

      const endTime = new Date();
      const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;

      const result: PipelineResult = {
        success: true,
        bookPath,
        startTime,
        endTime,
        durationSeconds,
        steps: this.steps,
        videoPath: video.path,
        errors: [],
      };

      logger.info(
        { durationSeconds, videoPath: video.path },
        '═══════════════════════════════════════════'
      );
      logger.info('Pipeline completed successfully!');
      logger.info(
        { durationSeconds, videoPath: video.path },
        '═══════════════════════════════════════════'
      );

      return result;
    } catch (error) {
      const endTime = new Date();
      const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error: errorMessage }, 'Pipeline failed');

      return {
        success: false,
        bookPath,
        startTime,
        endTime,
        durationSeconds,
        steps: this.steps,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Execute a pipeline step with error handling
   */
  private async executeStep<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const step: PipelineStep = {
      id: name.toLowerCase().replace(/\s+/g, '_'),
      name,
      status: 'running',
      startTime: new Date(),
    };

    this.steps.push(step);
    logger.info({ step: name }, `Executing: ${name}`);

    try {
      const result = await fn();
      step.status = 'success';
      step.endTime = new Date();
      step.durationSeconds = (step.endTime.getTime() - step.startTime!.getTime()) / 1000;
      logger.info({ step: name, duration: step.durationSeconds }, `✓ ${name} completed`);
      return result;
    } catch (error) {
      step.status = 'failed';
      step.endTime = new Date();
      step.error = error instanceof Error ? error.message : String(error);
      step.durationSeconds = (step.endTime.getTime() - step.startTime!.getTime()) / 1000;
      logger.error({ step: name, error: step.error }, `✗ ${name} failed`);
      throw error;
    }
  }

  /**
   * Save pipeline result to file
   */
  async savePipelineResult(result: PipelineResult, filename?: string): Promise<void> {
    try {
      if (!fs.existsSync(outputDirs.logs)) {
        fs.mkdirSync(outputDirs.logs, { recursive: true });
      }

      const reportName = filename || `pipeline_${Date.now()}.json`;
      const reportPath = path.join(outputDirs.logs, reportName);

      fs.writeFileSync(reportPath, JSON.stringify(result, null, 2), 'utf-8');
      logger.info({ reportPath }, 'Pipeline result saved');
    } catch (error) {
      logger.error({ error }, 'Failed to save pipeline result');
    }
  }
}

export default PipelineRunner;
