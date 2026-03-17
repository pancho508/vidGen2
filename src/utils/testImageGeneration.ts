import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../utils/logger.js';
import { ScenePlanner } from '../modules/scenePlanner.js';
import { ImageGenerator } from '../services/imageGenerator.js';
import OllamaClient from '../services/ollamaClient.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger = createLogger('TestImageGeneration');

async function main() {
  const scriptFilePath = process.argv[2];

  if (!scriptFilePath) {
    console.error('Usage: npm run test:images -- <path-to-script-markdown>');
    process.exit(1);
  }

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎨 IMAGE GENERATION TEST');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📄 Script: ${scriptFilePath}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Read the script
    console.log('📖 Reading script file...');
    if (!fs.existsSync(scriptFilePath)) {
      console.error(`❌ Script file not found: ${scriptFilePath}`);
      process.exit(1);
    }

    const scriptContent = fs.readFileSync(scriptFilePath, 'utf-8');

    // Extract script text (remove markdown metadata)
    const lines = scriptContent.split('\n');
    const scriptStartIndex = lines.findIndex(l => l.includes('---') && lines.indexOf(l) > 0);
    const scriptText = scriptStartIndex > 0 ? lines.slice(scriptStartIndex + 1).join('\n') : scriptContent;

    console.log(`✅ Script loaded (${scriptText.length} characters)\n`);

    // Step 2: Plan scenes
    console.log('🎬 Planning scenes from script...');
    const startSceneTime = Date.now();
    
    const ollama = new OllamaClient();
    const scenePlanner = new ScenePlanner(ollama, 20, 600); // 20 scenes
    const scenePlan = await scenePlanner.planScenes(scriptText, []);

    const sceneTime = ((Date.now() - startSceneTime) / 1000).toFixed(1);
    console.log(`✅ Created ${scenePlan.scenes.length} scenes in ${sceneTime}s\n`);

    // Display first few scenes
    console.log('📋 First 3 Scene Prompts:');
    for (let i = 0; i < Math.min(3, scenePlan.scenes.length); i++) {
      const scene = scenePlan.scenes[i];
      console.log(`\n  Scene ${scene.number}:`);
      console.log(`    Duration: ${scene.estimatedDurationSeconds}s`);
      console.log(`    Prompt: ${scene.imagePrompt.substring(0, 100)}...`);
    }
    console.log('\n');

    // Step 3: Generate images
    console.log('🖼️  Generating images...');
    const startImageTime = Date.now();

    const imageGenerator = new ImageGenerator();
    const images = await imageGenerator.generateBatch(scenePlan.scenes);

    const imageTime = ((Date.now() - startImageTime) / 1000).toFixed(1);
    console.log(`✅ Generated ${images.length} images in ${imageTime}s\n`);

    // Display results
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 IMAGE GENERATION RESULTS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`Total Scenes: ${scenePlan.scenes.length}`);
    console.log(`Total Images Generated: ${images.length}`);
    console.log(`Generation Time: ${imageTime}s`);
    console.log(`Average Time per Image: ${(parseFloat(imageTime) / images.length).toFixed(2)}s\n`);

    // Check generated files
    const imagesDir = path.join(path.dirname(path.dirname(path.dirname(scriptFilePath))), 'images');
    if (fs.existsSync(imagesDir)) {
      const files = fs.readdirSync(imagesDir);
      console.log(`Images saved to: ${imagesDir}`);
      console.log(`Total files: ${files.length}\n`);

      // Show file sizes
      console.log('Image Files:');
      for (let i = 0; i < Math.min(5, files.length); i++) {
        const file = files[i];
        const filePath = path.join(imagesDir, file);
        const stats = fs.statSync(filePath);
        const sizeKB = (stats.size / 1024).toFixed(1);
        console.log(`  ${file} (${sizeKB} KB)`);
      }
      if (files.length > 5) {
        console.log(`  ... and ${files.length - 5} more files`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
