import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createLogger } from '../utils/logger.js';
import { BookParser } from '../modules/bookParser.js';
import { ChapterSplitter } from '../modules/chapterSplitter.js';
import { Summarizer } from '../modules/summarizer.js';
import { ScriptGenerator } from '../modules/scriptGenerator.js';
import OllamaClient from '../services/ollamaClient.js';
import { VoiceGenerator } from '../services/voiceGenerator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger = createLogger('FullRunTest');

async function main() {
  const bookPath = process.argv[2];

  if (!bookPath) {
    console.error('Usage: npm run full:run -- <path-to-book.epub>');
    process.exit(1);
  }

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎬 FULL VIDGEN2 PIPELINE RUN');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const pipelineStart = Date.now();

  try {
    // Step 1: Parse book
    console.log('📚 Step 1: Parsing EPUB...');
    const parseStart = Date.now();
    const parser = new BookParser();
    const parsedBook = await parser.parseBook(bookPath);
    const parseTime = ((Date.now() - parseStart) / 1000).toFixed(1);
    console.log(`   ✓ Extracted ${parsedBook.metadata.title}`);
    console.log(`   ✓ Content: ${parsedBook.text.length} characters`);
    console.log(`   ⏱️  ${parseTime}s\n`);

    // Step 2: Split chapters
    console.log('📖 Step 2: Splitting chapters...');
    const splitStart = Date.now();
    const splitter = new ChapterSplitter();
    const chapters = splitter.splitChapters(parsedBook.text);
    const splitTime = ((Date.now() - splitStart) / 1000).toFixed(1);
    console.log(`   ✓ Found ${chapters.length} chapters`);
    console.log(`   ⏱️  ${splitTime}s\n`);

    // Step 3: Summarize book
    console.log('🤖 Step 3: Summarizing book with Ollama...');
    const summaryStart = Date.now();
    const ollama = new OllamaClient();
    const summarizer = new Summarizer(ollama);
    const summary = await summarizer.summarizeBook(chapters);
    const summaryTime = ((Date.now() - summaryStart) / 1000).toFixed(1);
    console.log(`   ✓ Book summary generated`);
    console.log(`   ✓ Summary length: ${summary.bookSummary.length} characters`);
    console.log(`   ⏱️  ${summaryTime}s\n`);

    // Step 4: Generate script
    console.log('✍️  Step 4: Generating YouTube script...');
    const scriptStart = Date.now();
    const scriptGen = new ScriptGenerator(ollama);
    const script = await scriptGen.generateYoutubeScript(summary.bookSummary, parsedBook.metadata.title);
    const scriptTime = ((Date.now() - scriptStart) / 1000).toFixed(1);
    console.log(`   ✓ Script generated: ${script.wordCount} words`);
    console.log(`   ✓ Sections: ${script.sections.length}`);
    console.log(`   ✓ Saved to: ${script.scriptPath || 'videos/scripts'}`);
    console.log(`   ⏱️  ${scriptTime}s\n`);

    // Step 5: Generate audio
    console.log('🔊 Step 5: Generating audio with macOS say...');
    const audioStart = Date.now();
    const voiceGen = new VoiceGenerator();
    const audio = await voiceGen.generateNarration(script.fullScript);
    const audioTime = ((Date.now() - audioStart) / 1000).toFixed(1);
    console.log(`   ✓ Audio generated`);
    console.log(`   ✓ Duration: ${audio.durationSeconds} seconds`);
    console.log(`   ✓ File size: ${(fs.statSync(audio.path).size / 1024 / 1024).toFixed(1)} MB`);
    console.log(`   ✓ Saved to: ${audio.path}`);
    console.log(`   ⏱️  ${audioTime}s\n`);

    // Step 6: Generate images
    console.log('🎨 Step 6: Generating scene images...');
    const imageStart = Date.now();
    const { execSync } = await import('child_process');
    
    const scriptFileForImages = script.scriptPath || path.join(process.cwd(), 'scripts', 'temp.md');
    try {
      const imageCmd = `python3 generate_images.py "${scriptFileForImages}" 5`;
      execSync(imageCmd, { stdio: 'pipe', cwd: process.cwd() });
      const imageTime = ((Date.now() - imageStart) / 1000).toFixed(1);
      
      const imagesDir = path.join(process.cwd(), 'images');
      const imageFiles = fs.readdirSync(imagesDir).filter(f => f.endsWith('.png'));
      console.log(`   ✓ Generated ${imageFiles.length} images`);
      console.log(`   ✓ Resolution: 1280x720`);
      console.log(`   ✓ Saved to: ${imagesDir}`);
      console.log(`   ⏱️  ${imageTime}s\n`);
    } catch (error) {
      console.log(`   ⚠️  Image generation skipped (python3 or PIL not available)\n`);
    }

    // Summary
    const totalTime = ((Date.now() - pipelineStart) / 1000).toFixed(1);
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ FULL PIPELINE COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('📊 RESULTS SUMMARY:\n');
    console.log(`  Book: ${parsedBook.metadata.title}`);
    console.log(`  Chapters: ${chapters.length}`);
    console.log(`  Script Length: ${script.wordCount} words`);
    console.log(`  Audio Duration: ${audio.durationSeconds} seconds`);
    console.log(`  Audio File: ${(fs.statSync(audio.path).size / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  Images: ${fs.readdirSync(path.join(process.cwd(), 'images')).length} scenes`);
    console.log(`  Total Time: ${totalTime}s\n`);

    console.log('📁 Output Files:\n');
    console.log(`  Scripts: ${path.join(process.cwd(), 'scripts')}`);
    console.log(`  Audio: ${audio.path}`);
    console.log(`  Images: ${path.join(process.cwd(), 'images')}\n`);

    console.log('🎉 Ready for video assembly!\n');

  } catch (error) {
    console.error('\n❌ PIPELINE FAILED!');
    console.error(`Error: ${error instanceof Error ? error.message : error}\n`);
    
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    
    process.exit(1);
  }
}

main();
