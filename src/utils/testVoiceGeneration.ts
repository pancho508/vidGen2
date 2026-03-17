/**
 * Test utility to test ONLY voice generation from a script
 * Usage: npm run test:voice -- <script-file-path>
 */

import fs from 'fs';
import path from 'path';
import { VoiceGenerator } from '../services/voiceGenerator.js';
import { createLogger } from './logger.js';

const logger = createLogger('TestVoiceGeneration');

async function testVoiceGeneration(scriptFilePath: string): Promise<void> {
  logger.info({ scriptFilePath }, '═══════════════════════════════════════════');
  logger.info({ scriptFilePath }, 'Starting Voice Generation Test');
  logger.info({ scriptFilePath }, '═══════════════════════════════════════════');

  try {
    if (!fs.existsSync(scriptFilePath)) {
      throw new Error(`Script file not found: ${scriptFilePath}`);
    }

    const startTime = Date.now();

    // Read the script
    logger.info('Reading script file...');
    const scriptContent = fs.readFileSync(scriptFilePath, 'utf-8');
    
    // Extract just the text content (remove markdown headers/metadata)
    const lines = scriptContent.split('\n');
    const textParts: string[] = [];
    let inContent = false;
    
    for (const line of lines) {
      // Skip metadata lines
      if (line.startsWith('**Generated:') || line.startsWith('**Total') || 
          line.startsWith('**Estimated') || line.startsWith('**Sections') ||
          line.startsWith('*Words:')) {
        continue;
      }
      
      // Skip headers and empty lines
      if (line.startsWith('#') || line.trim() === '') {
        inContent = true;
        continue;
      }
      
      // Collect content
      if (inContent) {
        textParts.push(line);
      }
    }
    
    const scriptText = textParts.join(' ').replace(/\s+/g, ' ').trim();
    const wordCount = scriptText.split(/\s+/).length;
    
    logger.info({ wordCount, charCount: scriptText.length }, 'Script extracted for voice synthesis');
    console.log(`\n📖 Script content: ${wordCount} words`);
    console.log(`Sample: "${scriptText.substring(0, 200)}..."\n`);

    // Generate voice
    logger.info('Calling VoiceGenerator.generateNarration()...');
    const voiceGenerator = new VoiceGenerator();
    const audio = await voiceGenerator.generateNarration(scriptText);

    const duration = (Date.now() - startTime) / 1000;

    logger.info(
      {
        audioPath: audio.path,
        durationSeconds: audio.durationSeconds,
        sampleRate: audio.sampleRate,
        channels: audio.channels,
        generationTime: Math.round(duration),
      },
      'Voice generation completed'
    );

    // Check file
    const stats = fs.statSync(audio.path);
    const fileSizeKB = Math.round(stats.size / 1024);

    logger.info(
      { durationSeconds: duration },
      '═══════════════════════════════════════════'
    );
    logger.info('Voice Generation Test Completed!');
    logger.info('═══════════════════════════════════════════');

    // Print results
    console.log('\n🔊 VOICE GENERATION RESULTS:');
    console.log(`Audio File: ${audio.path}`);
    console.log(`File Size: ${fileSizeKB} KB`);
    console.log(`\n📊 Audio Specifications:`);
    console.log(`  Sample Rate: ${audio.sampleRate} Hz`);
    console.log(`  Channels: ${audio.channels}`);
    console.log(`  Duration: ${audio.durationSeconds} seconds`);
    console.log(`  Format: WAV (PCM 16-bit)`);
    console.log(`\n⏱️  Generation Time: ${Math.round(duration)}s\n`);

    // Check if it's silence or real audio
    const audioBuffer = fs.readFileSync(audio.path);
    const dataStart = 44; // WAV header is 44 bytes
    let nonZeroCount = 0;
    for (let i = dataStart; i < Math.min(dataStart + 1000, audioBuffer.length); i++) {
      if (audioBuffer[i] !== 0) {
        nonZeroCount++;
      }
    }

    if (nonZeroCount > 100) {
      console.log('✅ Audio appears to contain real content! (non-zero bytes detected)');
    } else {
      console.log('⚠️  Audio appears to be silence (all zeros)');
    }
    console.log();
  } catch (error) {
    logger.error({ error }, 'Voice generation test failed');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Get script path from command line arguments
const scriptPath = process.argv[2];
if (!scriptPath) {
  console.error('Usage: npm run test:voice -- <script-file-path>');
  console.error('Example: npm run test:voice -- scripts/my_script.md');
  process.exit(1);
}

testVoiceGeneration(scriptPath);
