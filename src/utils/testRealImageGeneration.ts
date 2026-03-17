import { ImageGeneratorComfyUI } from '../services/imageGeneratorComfyUI.js';
import { Scene } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('TestRealImageGeneration');

async function main() {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎨 REAL IMAGE GENERATION TEST (ComfyUI + Stable Diffusion)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const imageGen = new ImageGeneratorComfyUI();

  // Step 1: Check if ComfyUI is running
  console.log('🔍 Checking ComfyUI connectivity...');
  const isConnected = await imageGen.checkConnectivity();

  if (!isConnected) {
    console.log('\n❌ ComfyUI is NOT running on http://localhost:8188\n');
    console.log('📋 HOW TO START ComfyUI:');
    console.log('');
    console.log('Option 1: If you have ComfyUI installed locally:');
    console.log('  cd ~/ComfyUI  # (or your ComfyUI directory)');
    console.log('  python main.py --listen 0.0.0.0 --port 8188');
    console.log('');
    console.log('Option 2: Using Docker:');
    console.log('  docker run -p 8188:8188 comfyui/comfyui');
    console.log('');
    console.log('Option 3: Using conda (if installed):');
    console.log('  conda activate comfyui');
    console.log('  cd ~/ComfyUI');
    console.log('  python main.py --listen 0.0.0.0 --port 8188');
    console.log('\n');
    process.exit(1);
  }

  console.log('✅ ComfyUI is running!\n');

  // Step 2: Create test scenes
  const testScenes: Scene[] = [
    {
      number: 1,
      scriptExcerpt: 'Ancient library',
      imagePrompt:
        'Ancient library with golden light, philosophical books on ornate shelves, intricate architecture, oil painting style, warm amber glow',
      estimatedDurationSeconds: 30,
      style: 'realistic oil painting',
    },
    {
      number: 2,
      scriptExcerpt: 'The hero\'s journey',
      imagePrompt:
        'A lone hero figure standing at a crossroads with misty mountains in background, dramatic lighting, fantasy art style, epic cinematic composition',
      estimatedDurationSeconds: 30,
      style: 'fantasy art',
    },
  ];

  console.log(`📋 Test Prompts to Generate:\n`);
  for (const scene of testScenes) {
    console.log(`Scene ${scene.number}: ${scene.imagePrompt.substring(0, 60)}...`);
  }
  console.log('');

  // Step 3: Generate images
  console.log('🖼️  Generating REAL images with Stable Diffusion via ComfyUI...\n');

  try {
    const images = await imageGen.generateBatch(testScenes);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ REAL IMAGE GENERATION SUCCESSFUL!');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`Generated ${images.length} real images:\n`);
    for (const img of images) {
      console.log(`  ✓ Scene ${img.sceneNumber}: ${img.path}`);
    }

    console.log('\n🎉 Images are ready for video assembly!\n');
  } catch (error) {
    console.error('\n❌ Error generating images:', error);
    console.log('\n📌 Troubleshooting:');
    console.log('  - Ensure ComfyUI is running on http://localhost:8188');
    console.log('  - Check that Stable Diffusion models are installed');
    console.log('  - Verify sufficient GPU/CPU resources available');
    process.exit(1);
  }
}

main();
