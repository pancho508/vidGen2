/**
 * Test utility to run only the script generation pipeline
 * Usage: npm run test:script -- <book-path>
 */

import { BookParser } from '../modules/bookParser.js';
import { ChapterSplitter } from '../modules/chapterSplitter.js';
import { Summarizer } from '../modules/summarizer.js';
import { ScriptGenerator } from '../modules/scriptGenerator.js';
import OllamaClient from '../services/ollamaClient.js';
import { createLogger } from './logger.js';

const logger = createLogger('TestScriptGeneration');

async function testScriptGeneration(bookPath: string): Promise<void> {
  logger.info({ bookPath }, '═══════════════════════════════════════════');
  logger.info({ bookPath }, 'Starting Script Generation Test');
  logger.info({ bookPath }, '═══════════════════════════════════════════');

  try {
    const startTime = Date.now();

    // Step 1: Parse book
    logger.info('Step 1/4: Parsing book...');
    const parser = new BookParser();
    const parsedBook = await parser.parseBook(bookPath);
    logger.info(
      { title: parsedBook.metadata.title, wordCount: parsedBook.metadata.totalWords },
      '✓ Book parsed'
    );

    // Step 2: Split chapters
    logger.info('Step 2/4: Splitting chapters...');
    const splitter = new ChapterSplitter();
    const chapters = splitter.splitChapters(parsedBook.text);
    logger.info({ chapterCount: chapters.length }, '✓ Chapters split');

    // Step 3: Summarize book
    logger.info('Step 3/4: Summarizing book...');
    const ollama = new OllamaClient();
    const summarizer = new Summarizer(ollama);
    const summary = await summarizer.summarizeBook(chapters);
    logger.info(
      { summaryLength: summary.bookSummary.length, keyPoints: summary.keyPoints.length },
      '✓ Book summarized'
    );

    // Step 4: Generate script
    logger.info('Step 4/4: Generating YouTube script...');
    const scriptGenerator = new ScriptGenerator(ollama);
    const script = await scriptGenerator.generateYoutubeScript(summary.bookSummary, parsedBook.metadata.title);

    const duration = (Date.now() - startTime) / 1000;

    logger.info(
      {
        scriptPath: script.scriptPath,
        wordCount: script.wordCount,
        sections: script.sections.length,
        durationSeconds: Math.round(duration),
      },
      '✓ Script generated and saved'
    );

    logger.info(
      { durationSeconds: duration },
      '═══════════════════════════════════════════'
    );
    logger.info('Script Generation Test Completed Successfully!');
    logger.info('═══════════════════════════════════════════');

    // Print script summary
    console.log('\n📝 SCRIPT SUMMARY:');
    console.log(`Title: ${parsedBook.metadata.title}`);
    console.log(`Saved to: ${script.scriptPath}`);
    console.log(`\n📊 Statistics:`);
    console.log(`  Total Words: ${script.wordCount}`);
    console.log(`  Estimated Duration: ${Math.round(script.estimatedTotalDuration)} seconds`);
    console.log(`  Sections: ${script.sections.length}`);
    console.log(`\n📑 Section Breakdown:`);
    for (const section of script.sections) {
      console.log(
        `  ${section.name.padEnd(12)} - ${section.wordCount} words (${section.estimatedDurationSeconds}s)`
      );
    }
    console.log(`\nTotal Pipeline Time: ${Math.round(duration)}s\n`);
  } catch (error) {
    logger.error({ error }, 'Script generation test failed');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Get book path from command line arguments
const bookPath = process.argv[2];
if (!bookPath) {
  console.error('Usage: npm run test:script -- <book-path>');
  console.error('Example: npm run test:script -- books/my-book.epub');
  process.exit(1);
}

testScriptGeneration(bookPath);
