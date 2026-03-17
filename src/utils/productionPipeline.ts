import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { BookParser } from '../modules/bookParser.js';
import { ChapterSplitter } from '../modules/chapterSplitter.js';
import { Summarizer } from '../modules/summarizer.js';
import { ScriptGenerator } from '../modules/scriptGenerator.js';
import OllamaClient from '../services/ollamaClient.js';
import { VoiceGenerator } from '../services/voiceGenerator.js';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runFullPipeline(bookPath: string) {
  const pipelineStart = Date.now();

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║        🎬 VID GEN2 FULL PRODUCTION PIPELINE 🎬          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    // STEP 1: PARSE EPUB
    console.log('📚 STEP 1: Parsing EPUB...');
    const step1Start = Date.now();
    const parser = new BookParser();
    const parsedBook = await parser.parseBook(bookPath);
    const step1Time = ((Date.now() - step1Start) / 1000).toFixed(2);
    console.log(`   ✅ Parsed: ${parsedBook.metadata.title.substring(0, 50)}...`);
    console.log(`   📊 Content: ${(parsedBook.text.length / 1024).toFixed(1)} KB`);
    console.log(`   ⏱️  ${step1Time}s\n`);

    // STEP 2: SPLIT CHAPTERS
    console.log('📖 STEP 2: Splitting into chapters...');
    const step2Start = Date.now();
    const splitter = new ChapterSplitter();
    const chapters = splitter.splitChapters(parsedBook.text);
    const step2Time = ((Date.now() - step2Start) / 1000).toFixed(2);
    console.log(`   ✅ Found: ${chapters.length} chapters`);
    console.log(`   📊 Average: ${Math.round(parsedBook.text.length / chapters.length)} chars/chapter`);
    console.log(`   ⏱️  ${step2Time}s\n`);

    // STEP 3: SUMMARIZE
    console.log('🤖 STEP 3: Summarizing with Ollama (this takes ~50 min)...');
    const step3Start = Date.now();
    const ollama = new OllamaClient();
    const summarizer = new Summarizer(ollama);
    const bookSummary = await summarizer.summarizeBook(chapters);
    const step3Time = ((Date.now() - step3Start) / 1000 / 60).toFixed(1);
    console.log(`   ✅ Summary generated: ${bookSummary.bookSummary.substring(0, 50)}...`);
    console.log(`   📊 Key points: ${bookSummary.keyPoints.length}`);
    console.log(`   ⏱️  ${step3Time} minutes\n`);

    // STEP 4: GENERATE SCRIPT
    console.log('✍️  STEP 4: Generating YouTube script...');
    const step4Start = Date.now();
    const scriptGen = new ScriptGenerator(ollama);
    const script = await scriptGen.generateYoutubeScript(bookSummary.bookSummary, parsedBook.metadata.title);
    const step4Time = ((Date.now() - step4Start) / 1000).toFixed(2);
    console.log(`   ✅ Script generated: ${script.wordCount} words`);
    console.log(`   📊 Sections: ${script.sections.length}`);
    console.log(`   📁 Saved: ${script.scriptPath}`);
    console.log(`   ⏱️  ${step4Time}s\n`);

    // Verify script file exists
    if (!script.scriptPath || !fs.existsSync(script.scriptPath)) {
      throw new Error(`Script file not found: ${script.scriptPath}`);
    }
    const scriptFileSize = fs.statSync(script.scriptPath).size;
    console.log(`   🔍 File verified: ${(scriptFileSize / 1024).toFixed(1)} KB\n`);

    // STEP 5: GENERATE VOICE NARRATION
    console.log('🔊 STEP 5: Generating voice narration...');
    const step5Start = Date.now();
    const voiceGen = new VoiceGenerator();
    const audioResult = await voiceGen.generateNarration(script.fullScript);
    const step5Time = ((Date.now() - step5Start) / 1000).toFixed(2);
    console.log(`   ✅ Audio generated: ${audioResult.durationSeconds}s`);
    console.log(`   🔍 File verified: ${(fs.statSync(audioResult.path).size / 1024 / 1024).toFixed(1)} MB`);
    console.log(`   📁 Saved: ${audioResult.path}`);
    console.log(`   ⏱️  ${step5Time}s\n`);

    // STEP 6: GENERATE IMAGES
    console.log('🎨 STEP 6: Generating scene images...');
    const step6Start = Date.now();
    try {
      const imageCmd = `python3 generate_images.py "${script.scriptPath}" 5`;
      execSync(imageCmd, { stdio: 'pipe', cwd: process.cwd() });
      const step6Time = ((Date.now() - step6Start) / 1000).toFixed(2);
      const imagesDir = path.join(process.cwd(), 'images');
      const imageFiles = fs.readdirSync(imagesDir).filter(f => f.endsWith('.png'));
      console.log(`   ✅ Generated: ${imageFiles.length} images`);
      console.log(`   📊 Resolution: 1280x720`);
      const totalImageSize = imageFiles.reduce((sum, f) => sum + fs.statSync(path.join(imagesDir, f)).size, 0);
      console.log(`   🔍 Total size: ${(totalImageSize / 1024).toFixed(1)} KB`);
      console.log(`   📁 Saved: ${imagesDir}`);
      console.log(`   ⏱️  ${step6Time}s\n`);
    } catch (error) {
      console.log(`   ⚠️  Image generation failed: ${error instanceof Error ? error.message : error}\n`);
    }

    // FINAL SUMMARY
    const totalTime = ((Date.now() - pipelineStart) / 1000 / 60).toFixed(1);
    
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                ✅ PIPELINE COMPLETED ✅                  ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log('📊 FINAL SUMMARY:');
    console.log(`  📖 Book: ${parsedBook.metadata.title}`);
    console.log(`  📄 Chapters: ${chapters.length}`);
    console.log(`  ✍️  Script Words: ${script.wordCount}`);
    console.log(`  🔊 Audio Duration: ${audioResult.durationSeconds}s`);
    console.log(`  🎨 Scene Images: ${fs.readdirSync(path.join(process.cwd(), 'images')).length}`);
    console.log(`  ⏱️  Total Time: ${totalTime} minutes\n`);

    console.log('📁 OUTPUT LOCATIONS:');
    console.log(`  Scripts: ./scripts/`);
    console.log(`  Audio: ./audio/`);
    console.log(`  Images: ./images/`);
    console.log(`  Logs: ./logs/\n`);

    console.log('🚀 NEXT STEPS:');
    console.log('  1. Review generated script in ./scripts/');
    console.log('  2. Listen to narration in ./audio/');
    console.log('  3. Check scene images in ./images/');
    console.log('  4. Run: npm run full:video to assemble final MP4\n');

  } catch (error) {
    console.error('\n╔═══════════════════════════════════════════════════════════╗');
    console.error('║               ❌ PIPELINE FAILED ❌                      ║');
    console.error('╚═══════════════════════════════════════════════════════════╝\n');
    
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${errorMsg}\n`);
    
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:');
      console.error(error.stack.split('\n').slice(0, 10).join('\n'));
      console.error();
    }
    
    process.exit(1);
  }
}

// Main entry point
const bookPath = process.argv[2];
if (!bookPath) {
  console.error('Usage: npm run production:run -- <path-to-book.epub>');
  process.exit(1);
}

runFullPipeline(bookPath);
