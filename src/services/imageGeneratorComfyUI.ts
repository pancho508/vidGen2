import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger.js';
import { config, outputDirs } from '../config/index.js';
import { Scene, GeneratedImage } from '../types/index.js';

const logger = createLogger('ImageGeneratorComfyUI');

/**
 * Generate real images using ComfyUI + Stable Diffusion
 */
export class ImageGeneratorComfyUI {
  private comfyUIUrl: string;
  private clientId: string = 'vidgen2-' + Math.random().toString(36).substring(7);

  constructor(comfyUIUrl: string = config.comfyui.url) {
    this.comfyUIUrl = comfyUIUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Generate a single image from a prompt using ComfyUI
   */
  async generateImage(prompt: string, sceneNumber: number, negativePrompt?: string): Promise<GeneratedImage> {
    logger.info({ sceneNumber, promptLength: prompt.length }, 'Generating image with ComfyUI...');

    try {
      // Create output filename
      const filename = `scene_${String(sceneNumber).padStart(3, '0')}.png`;
      const outputPath = path.join(outputDirs.images, filename);

      // Create images directory if it doesn't exist
      if (!fs.existsSync(outputDirs.images)) {
        fs.mkdirSync(outputDirs.images, { recursive: true });
      }

      // Create ComfyUI workflow for text-to-image
      const workflow = this.createStableDiffusionWorkflow(prompt, negativePrompt || '');

      // Submit prompt to ComfyUI
      logger.debug({ workflowKeys: Object.keys(workflow) }, 'Submitting workflow to ComfyUI...');
      const promptResponse = await axios.post(`${this.comfyUIUrl}/prompt`, {
        prompt: workflow,
        client_id: this.clientId,
      });

      const promptId = promptResponse.data.prompt_id;
      if (!promptId) {
        throw new Error('No prompt_id returned from ComfyUI');
      }

      logger.debug({ promptId }, 'Prompt submitted, waiting for generation...');

      // Poll for completion
      const imageData = await this.waitForCompletion(promptId);

      // Save image
      fs.writeFileSync(outputPath, imageData);

      const image: GeneratedImage = {
        path: outputPath,
        sceneNumber,
        prompt,
        width: 1280,
        height: 720,
        timestamp: new Date(),
      };

      logger.info({ sceneNumber, outputPath, promptId }, 'Image generated successfully with ComfyUI');
      return image;
    } catch (error) {
      logger.error({ sceneNumber, error }, 'Failed to generate image with ComfyUI');
      throw error;
    }
  }

  /**
   * Generate batch of images
   */
  async generateBatch(scenes: Scene[]): Promise<GeneratedImage[]> {
    logger.info({ sceneCount: scenes.length }, 'Generating batch of real images with ComfyUI...');

    const images: GeneratedImage[] = [];

    for (const scene of scenes) {
      try {
        const image = await this.generateImage(scene.imagePrompt, scene.number);
        images.push(image);
      } catch (error) {
        logger.warn({ sceneNumber: scene.number, error }, 'Skipping failed image generation');
      }
    }

    logger.info({ generatedCount: images.length, totalCount: scenes.length }, 'Batch generation completed');
    return images;
  }

  /**
   * Create Stable Diffusion workflow for ComfyUI
   */
  private createStableDiffusionWorkflow(prompt: string, negativePrompt: string): Record<string, any> {
    // ComfyUI workflow format for Stable Diffusion text-to-image
    return {
      1: {
        inputs: {
          seed: Math.floor(Math.random() * 1000000),
          steps: 20,
          cfg: 7.0,
          sampler_name: 'euler',
          scheduler: 'karras', // Match scheduler to sampler
          denoise: 1,
          model: 'sd15_model', // Update to your installed model
          positive: prompt,
          negative: negativePrompt || 'low quality, blurry, distorted',
          latent_image: ['3', 0],
        },
        class_type: 'KSampler',
      },
      2: {
        inputs: {
          conditioning: ['6', 0],
        },
        class_type: 'ConditioningCombine',
      },
      3: {
        inputs: {
          width: 1280,
          height: 720,
          length: 1,
          batch_size: 1,
        },
        class_type: 'EmptyLatentImage',
      },
      4: {
        inputs: {
          samples: ['1', 0],
          vae: ['7', 0],
        },
        class_type: 'VAEDecode',
      },
      5: {
        inputs: {
          filename_prefix: `scene_${Date.now()}`,
          images: ['4', 0],
        },
        class_type: 'SaveImage',
      },
      6: {
        inputs: {
          text: prompt,
          clip: ['7', 1],
        },
        class_type: 'CLIPTextEncode (Positive)',
      },
      7: {
        inputs: {
          text: negativePrompt || 'low quality, blurry',
          clip: ['7', 1],
        },
        class_type: 'CLIPTextEncode (Negative)',
      },
      8: {
        inputs: {
          ckpt_name: 'sd-v1-5-pruned-emaonly.safetensors', // Update to your model
        },
        class_type: 'CheckpointLoaderSimple',
      },
    };
  }

  /**
   * Wait for ComfyUI to complete image generation
   */
  private async waitForCompletion(promptId: string, timeoutSeconds: number = 300): Promise<Buffer> {
    const startTime = Date.now();
    const pollInterval = 1000; // 1 second

    while (Date.now() - startTime < timeoutSeconds * 1000) {
      try {
        const statusResponse = await axios.get(`${this.comfyUIUrl}/history/${promptId}`);
        const history = statusResponse.data[promptId];

        if (history && history.outputs) {
          // Find the image output
          for (const [nodeId, output] of Object.entries(history.outputs)) {
            const outputData = output as any;
            if (outputData.images && outputData.images.length > 0) {
              const imageFile = outputData.images[0];
              const imageUrl = `${this.comfyUIUrl}/view/${imageFile.filename}`;

              logger.debug({ imageUrl }, 'Downloading generated image...');
              const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
              return Buffer.from(imageResponse.data);
            }
          }
        }

        // Still processing
        logger.debug({ promptId, elapsed: Math.floor((Date.now() - startTime) / 1000) }, 'Waiting for image...');
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        logger.debug({ error }, 'Checking status...');
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    throw new Error(`Image generation timeout after ${timeoutSeconds} seconds`);
  }

  /**
   * Check ComfyUI connectivity
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.comfyUIUrl}/system_stats`, { timeout: 5000 });
      logger.info('ComfyUI is reachable');
      return true;
    } catch (error) {
      logger.error({ url: this.comfyUIUrl, error }, 'Cannot reach ComfyUI');
      return false;
    }
  }
}

export default ImageGeneratorComfyUI;
