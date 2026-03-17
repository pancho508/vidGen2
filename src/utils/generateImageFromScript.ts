import fs from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger.js';
import { ImageGeneratorComfyUI } from '../services/imageGeneratorComfyUI.js';

const logger = createLogger('GenerateImageFromScript');

async function main() {
  const scriptFilePath = process.argv[2];

  if (!scriptFilePath) {
    console.error('Usage: npm run generate:image -- <path-to-script-markdown>');
    process.exit(1);
  }

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎨 GENERATE REAL IMAGE FROM SCRIPT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Read the script
    console.log('📖 Reading script...');
    if (!fs.existsSync(scriptFilePath)) {
      console.error(`❌ Script file not found: ${scriptFilePath}`);
      process.exit(1);
    }

    const scriptContent = fs.readFileSync(scriptFilePath, 'utf-8');
    
    // Extract the main content (remove YAML frontmatter)
    const lines = scriptContent.split('\n');
    const scriptText = lines
      .slice(lines.findIndex(l => l.includes('---') && lines.indexOf(l) > 0) + 1)
      .join('\n')
      .substring(0, 1000); // First 1000 chars

    console.log(`✅ Script loaded\n`);

    // Step 2: Create an image prompt from the script hook
    const hookMatch = scriptText.match(/hook[:\s]*"?([^"\n]+)/i);
    const hookText = hookMatch ? hookMatch[1] : scriptText.substring(0, 100);

    const imagePrompt = `${hookText}, cinematic lighting, detailed, professional artwork, oil painting style, high quality`;

    console.log('📝 Image Prompt Generated:');
    console.log(`"${imagePrompt}"\n`);

    // Step 3: Initialize image generator and check ComfyUI
    console.log('🔍 Checking ComfyUI connectivity...');
    const imageGen = new ImageGeneratorComfyUI();
    const isConnected = await imageGen.checkConnectivity();

    if (!isConnected) {
      console.log('\n❌ ComfyUI is NOT running\n');
      console.log('📋 TO START COMFYUI:\n');
      console.log('  Terminal 1 - Start ComfyUI:');
      console.log('    cd ~/ComfyUI');
      console.log('    python main.py --listen 0.0.0.0 --port 8188\n');
      console.log('  Terminal 2 - Then run this test again:');
      console.log(`    npm run generate:image -- "${scriptFilePath}"\n`);
      process.exit(1);
    }

    console.log('✅ ComfyUI is running!\n');

    // Step 4: Generate the image
    console.log('🖼️  Generating real image with Stable Diffusion...');
    console.log('(This may take 30-60 seconds)\n');

    const image = await imageGen.generateImage(imagePrompt, 1);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ IMAGE GENERATED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`📸 Image saved to: ${image.path}`);
    console.log(`   Size: ${fs.statSync(image.path).size / 1024 / 1024}MB`);
    console.log(`   Resolution: ${image.width}x${image.height}`);
    console.log(`   Generated: ${image.timestamp.toLocaleTimeString()}\n`);

    // Open the image
    console.log('🎉 Opening image in viewer...\n');
    const { execSync } = require('child_process');
    execSync(`open "${image.path}"`);

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
