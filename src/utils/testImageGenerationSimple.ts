import fs from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger.js';
import { ImageGenerator } from '../services/imageGenerator.js';
import { Scene } from '../types/index.js';

const logger = createLogger('TestImageGenerationSimple');

async function main() {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎨 IMAGE GENERATION TEST (Simple Mock Scenes)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Create mock scenes (no Ollama calls needed)
    const mockScenes: Scene[] = [
      {
        number: 1,
        scriptExcerpt: 'Introduction to meaning',
        imagePrompt: 'Ancient library with golden light, philosophical books, intricate architecture, oil painting style',
        estimatedDurationSeconds: 30,
        style: 'realistic oil painting',
      },
      {
        number: 2,
        scriptExcerpt: 'The hero\'s journey',
        imagePrompt: 'A hero figure standing at a crossroads in misty mountains, dramatic lighting, fantasy art style',
        estimatedDurationSeconds: 30,
        style: 'fantasy art',
      },
      {
        number: 3,
        scriptExcerpt: 'Facing chaos',
        imagePrompt: 'Swirling chaos and order in balance, dark and light intertwining, abstract cosmic art',
        estimatedDurationSeconds: 30,
        style: 'abstract',
      },
      {
        number: 4,
        scriptExcerpt: 'Fighting the dragon',
        imagePrompt: 'A warrior battling a mythical dragon above stormy clouds, epic cinematic lighting',
        estimatedDurationSeconds: 30,
        style: 'cinematic',
      },
      {
        number: 5,
        scriptExcerpt: 'Resolution and meaning',
        imagePrompt: 'A serene dawn over mountains with a figure of enlightenment, warm golden hour light',
        estimatedDurationSeconds: 30,
        style: 'cinematic',
      },
    ];

    console.log(`📋 Created ${mockScenes.length} mock scenes\n`);

    // Display scenes
    console.log('Mock Scene Prompts:');
    for (const scene of mockScenes) {
      console.log(`  Scene ${scene.number}: ${scene.imagePrompt.substring(0, 60)}...`);
    }
    console.log('');

    // Generate images
    console.log('🖼️  Generating placeholder images...');
    const startTime = Date.now();

    const imageGenerator = new ImageGenerator();
    const images = await imageGenerator.generateBatch(mockScenes);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Generated ${images.length} images in ${duration}s\n`);

    // Check files
    const imagesDir = path.join(process.cwd(), 'images');
    if (fs.existsSync(imagesDir)) {
      const files = fs.readdirSync(imagesDir).sort();
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('📊 RESULTS');
      console.log('═══════════════════════════════════════════════════════════════\n');
      console.log(`Images saved to: ${imagesDir}`);
      console.log(`Total files: ${files.length}\n`);

      console.log('Generated Image Files:');
      for (const file of files) {
        const filePath = path.join(imagesDir, file);
        const stats = fs.statSync(filePath);
        const sizeKB = (stats.size / 1024).toFixed(1);
        console.log(`  ✓ ${file.padEnd(30)} (${sizeKB.padStart(6)} KB)`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════\n');
    console.log('✅ Image generation test completed successfully!');
    console.log('📌 Next: Integrate with ComfyUI for real image generation\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
