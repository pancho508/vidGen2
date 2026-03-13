import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger.js';
import { config, outputDirs } from '../config/index.js';
import { Scene, GeneratedImage } from '../types/index.js';

const logger = createLogger('ImageGenerator');

/**
 * Generate images from text prompts using Stable Diffusion via ComfyUI
 */
export class ImageGenerator {
  private comfyUIUrl: string;
  private retryAttempts: number = 3;
  private retryDelay: number = 2000; // ms

  constructor(comfyUIUrl: string = config.comfyui.url) {
    this.comfyUIUrl = comfyUIUrl;
  }

  /**
   * Generate a single image from a prompt
   */
  async generateImage(prompt: string, sceneNumber: number): Promise<GeneratedImage> {
    logger.info({ sceneNumber, promptLength: prompt.length }, 'Generating image...');

    try {
      // Create output filename
      const filename = `scene_${String(sceneNumber).padStart(3, '0')}.png`;
      const outputPath = path.join(outputDirs.images, filename);

      // Create images directory if it doesn't exist
      if (!fs.existsSync(outputDirs.images)) {
        fs.mkdirSync(outputDirs.images, { recursive: true });
      }

      // For now, create a placeholder image (in production, this would call ComfyUI API)
      // This allows testing without having ComfyUI running
      await this.createPlaceholderImage(outputPath, prompt);

      const image: GeneratedImage = {
        path: outputPath,
        sceneNumber,
        prompt,
        width: 1280,
        height: 720,
        timestamp: new Date(),
      };

      logger.info({ sceneNumber, outputPath }, 'Image generated successfully');
      return image;
    } catch (error) {
      logger.error({ sceneNumber, error }, 'Failed to generate image');
      throw error;
    }
  }

  /**
   * Generate batch of images
   */
  async generateBatch(scenes: Scene[]): Promise<GeneratedImage[]> {
    logger.info({ sceneCount: scenes.length }, 'Generating batch of images...');

    const images: GeneratedImage[] = [];

    for (const scene of scenes) {
      try {
        const image = await this.generateImage(scene.imagePrompt, scene.number);
        images.push(image);

        // Small delay between generations to avoid overwhelming the system
        await this.delay(500);
      } catch (error) {
        logger.warn({ sceneNumber: scene.number, error }, 'Skipping failed image generation');
      }
    }

    logger.info({ generatedCount: images.length, totalCount: scenes.length }, 'Batch generation completed');
    return images;
  }

  /**
   * Create a placeholder image (for testing without ComfyUI)
   */
  private async createPlaceholderImage(outputPath: string, prompt: string): Promise<void> {
    // Create a simple PNG placeholder using canvas-like approach
    // For production, implement actual ComfyUI API integration
    
    // Write a minimal valid PNG file
    // PNG header bytes for a 1x1 white pixel
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
      0x00, 0x00, 0x00, 0x0d, // IHDR chunk size
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x05, 0x00, // width: 1280
      0x00, 0x00, 0x02, 0xd0, // height: 720
      0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
      0x50, 0xe5, 0x9a, 0xd5, // CRC
      // ... IDAT chunk - simplified
      0x00, 0x00, 0x00, 0x19, // IDAT chunk size
      0x49, 0x44, 0x41, 0x54,
      0x78, 0x9c, 0x62, 0xf8, 0x0f, 0x00, 0x00, 0x01, 0x01, 0x01, 0x00,
      0x18, 0xdd, 0x8d, 0xb4, 0x7c, 0x33, 0x2d, 0xb6, 0x35, 0x3d, // CRC
      0x00, 0x00, 0x00, 0x00, // IEND chunk size
      0x49, 0x45, 0x4e, 0x44, // IEND
      0xae, 0x42, 0x60, 0x82, // CRC
    ]);

    fs.writeFileSync(outputPath, pngBuffer);
    logger.debug({ path: outputPath }, 'Placeholder image created');
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * ComfyUI API integration (for production use)
   */
  private async callComfyUIAPI(prompt: string): Promise<Buffer> {
    // This would call the actual ComfyUI API endpoint
    // Placeholder for proper implementation
    try {
      const response = await axios.post(
        `${this.comfyUIUrl}/api/prompt`,
        {
          client_id: 'vidgen2',
          prompt: {
            1: {
              inputs: {
                text: prompt,
              },
              class_type: 'CLIPTextEncode',
            },
          },
        },
        { timeout: 120000 }
      );

      logger.debug({ promptId: response.data.prompt_id }, 'ComfyUI prompt submitted');
      return response.data;
    } catch (error) {
      logger.error({ error }, 'Failed to call ComfyUI API');
      throw error;
    }
  }
}

export default ImageGenerator;
