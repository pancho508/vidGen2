import fs from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger.js';
import { config, outputDirs } from '../config/index.js';
import { GeneratedThumbnail } from '../types/index.js';
import ImageGenerator from './imageGenerator.js';

const logger = createLogger('ThumbnailGenerator');

/**
 * Generate YouTube thumbnail
 */
export class ThumbnailGenerator {
  private imageGenerator: ImageGenerator;

  constructor(imageGenerator?: ImageGenerator) {
    this.imageGenerator = imageGenerator || new ImageGenerator();
  }

  /**
   * Generate thumbnail for YouTube
   */
  async generateThumbnail(bookTitle: string): Promise<GeneratedThumbnail> {
    logger.info({ bookTitle }, 'Generating thumbnail...');

    try {
      // Create output directory if needed
      if (!fs.existsSync(outputDirs.thumbnails)) {
        fs.mkdirSync(outputDirs.thumbnails, { recursive: true });
      }

      const outputPath = path.join(outputDirs.thumbnails, 'thumbnail.png');

      // Create the image prompt for thumbnail
      const prompt = `Create a YouTube thumbnail (1280x720) for a book summary video.
Book Title: "${bookTitle}"
Requirements:
- Bold, eye-catching typography with the book title
- High contrast colors (yellow, red, blue, or white backgrounds work well)
- Professional, clean educational design
- Minimal clutter, clear focal point
- Text should be readable at small sizes
- Include visual elements related to the book's theme if possible`;

      // Generate thumbnail image
      const generatedImage = await this.imageGenerator.generateImage(prompt, 0);

      // The generateImage already saves to the correct location, but let's ensure it's in thumbnails
      let finalPath = outputPath;
      if (generatedImage.path !== outputPath) {
        // Move file if it was saved elsewhere
        if (fs.existsSync(generatedImage.path)) {
          fs.copyFileSync(generatedImage.path, outputPath);
          logger.debug('Thumbnail moved to final location');
        }
      }

      const thumbnail: GeneratedThumbnail = {
        path: finalPath,
        width: 1280,
        height: 720,
        timestamp: new Date(),
      };

      logger.info({ outputPath }, 'Thumbnail generated successfully');
      return thumbnail;
    } catch (error) {
      logger.error({ bookTitle, error }, 'Failed to generate thumbnail');
      throw error;
    }
  }
}

export default ThumbnailGenerator;
