import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../utils/logger.js';
import PipelineRunner from '../pipeline/pipelineRunner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger = createLogger('TestFullPipeline');

async function main() {
  const bookPath = process.argv[2];

  if (!bookPath) {
    console.error('Usage: npm run test:pipeline -- <path-to-book>');
    process.exit(1);
  }

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎬 VidGen2 FULL PIPELINE TEST');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📚 Book: ${bookPath}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const startTime = new Date();

  try {
    const runner = new PipelineRunner();
    const result = await runner.runPipeline(bookPath);

    const endTime = new Date();
    const totalSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60);

    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 PIPELINE RESULTS');
    console.log('═══════════════════════════════════════════════════════════════');

    if (result.success) {
      console.log('✅ Pipeline completed successfully!\n');
      console.log(`📽️  Output Video: ${result.videoPath}`);
      console.log(`⏱️  Total Time: ${minutes}m ${seconds}s\n`);

      console.log('📋 Step Breakdown:');
      for (const step of result.steps) {
        const duration = step.durationSeconds ? `${step.durationSeconds.toFixed(1)}s` : 'N/A';
        const status = step.status === 'success' ? '✓' : '✗';
        console.log(`  ${status} ${step.name.padEnd(25)} ${duration}`);
      }
    } else {
      console.log('❌ Pipeline failed!\n');
      console.log('Errors:');
      for (const error of result.errors) {
        console.log(`  - ${error}`);
      }

      console.log('\n📋 Step Breakdown:');
      for (const step of result.steps) {
        const duration = step.durationSeconds ? `${step.durationSeconds.toFixed(1)}s` : 'N/A';
        const status = step.status === 'success' ? '✓' : step.status === 'failed' ? '✗' : '⏳';
        console.log(`  ${status} ${step.name.padEnd(25)} ${duration}`);
        if (step.error) {
          console.log(`     Error: ${step.error}`);
        }
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════\n');

    // Save result
    await runner.savePipelineResult(result, `full_pipeline_${Date.now()}.json`);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
