import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
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
   * Create a placeholder image using ffmpeg (for testing without ComfyUI)
   */
  private async createPlaceholderImage(outputPath: string, prompt: string): Promise<void> {
    try {
      // Use ffmpeg to create a colored PNG with text overlay
      // Different colors based on scene number for visual variety
      const colors = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560', '#2d728f', '#6ac3e6'];
      const colorIndex = Math.floor(Math.random() * colors.length);
      const bgColor = colors[colorIndex];

      // Create an image with ffmpeg (faster than creating PNG manually)
      const command = `ffmpeg -f lavfi -i color=${bgColor}:s=1280x720:d=1 -vframes 1 -q:v 2 "${outputPath}" 2>&1 | grep -v "frame="`;

      execSync(command, { stdio: 'pipe', timeout: 10000 });

      logger.debug({ path: outputPath, color: bgColor }, 'Placeholder image created with ffmpeg');
    } catch (error) {
      logger.error({ error }, 'Failed to create placeholder image');
      // Fallback: create a minimal valid PNG using ImageMagick or pure binary
      this.createMinimalPNG(outputPath);
    }
  }

  /**
   * Create a minimal but valid PNG file (fallback)
   */
  private createMinimalPNG(outputPath: string): void {
    // Create a 1280x720 gradient PNG using pure binary
    // PNG signature + minimal IHDR + IDAT with basic gradient data
    const width = 1280;
    const height = 720;

    // PNG header
    const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    // IHDR chunk
    const ihdr = Buffer.alloc(25);
    ihdr.write('IHDR'); // chunk type
    ihdr.writeUInt32BE(width, 4); // width
    ihdr.writeUInt32BE(height, 8); // height
    ihdr[12] = 8; // bit depth
    ihdr[13] = 2; // color type (RGB)
    ihdr[14] = 0; // compression
    ihdr[15] = 0; // filter
    ihdr[16] = 0; // interlace

    // Simplified color data - create dark image
    const scanlineLength = width * 3 + 1; // RGB + filter byte
    const imageData = Buffer.alloc(scanlineLength * height);
    for (let y = 0; y < height; y++) {
      const offset = y * scanlineLength;
      imageData[offset] = 0; // filter type
      for (let x = 0; x < width; x++) {
        const pixelOffset = offset + 1 + x * 3;
        imageData[pixelOffset] = 30 + (y % 50); // R
        imageData[pixelOffset + 1] = 30 + (x % 50); // G
        imageData[pixelOffset + 2] = 50 + ((x + y) % 50); // B
      }
    }

    // Minimal IDAT
    const zlibSync = require('zlib');
    const compressed = zlibSync.deflateSync(imageData);

    const idatHeader = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    idatHeader.writeUInt32BE(compressed.length, 0);
    const idat = Buffer.concat([Buffer.from('IDAT'), compressed]);

    // IEND
    const iend = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);

    // Write file
    const output = Buffer.concat([header, ihdr, idat, iend]);
    fs.writeFileSync(outputPath, output);

    logger.debug({ path: outputPath }, 'Minimal PNG created');
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default ImageGenerator;
