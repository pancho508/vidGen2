import axios, { AxiosInstance } from 'axios';
import { createLogger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { OllamaGenerateResponse } from '../types/index.js';

const logger = createLogger('OllamaClient');

/**
 * HTTP Client for local Ollama instance
 */
export class OllamaClient {
  private client: AxiosInstance;
  private model: string;
  private baseUrl: string;

  constructor(baseUrl: string = config.ollama.url, model: string = config.ollama.model) {
    this.baseUrl = baseUrl;
    this.model = model;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 300000, // 5 minutes
    });

    logger.info({ baseUrl, model }, 'OllamaClient initialized');
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    logger.debug('Listing available Ollama models...');

    try {
      const response = await this.client.get('/api/tags');
      const models = response.data.models?.map((m: any) => m.name) || [];

      logger.info({ modelCount: models.length }, 'Models retrieved');
      return models;
    } catch (error) {
      logger.error({ error }, 'Failed to list models');
      throw new Error(`Failed to connect to Ollama at ${this.baseUrl}`);
    }
  }

  /**
   * Generate text using the configured model
   */
  async generate(prompt: string, options?: { temperature?: number; topK?: number; numContext?: number }): Promise<string> {
    logger.debug({ model: this.model }, 'Generating text...');

    try {
      const response = await this.client.post<OllamaGenerateResponse>('/api/generate', {
        model: this.model,
        prompt,
        stream: false,
        temperature: options?.temperature ?? 0.7,
        top_k: options?.topK ?? 40,
        num_ctx: options?.numContext ?? 2048,
      });

      return response.data.response;
    } catch (error) {
      logger.error({ error }, 'Failed to generate text');
      throw new Error(`Ollama generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get specific generation with metadata
   */
  async generateWithMetadata(
    prompt: string,
    options?: { temperature?: number; topK?: number; numContext?: number }
  ): Promise<OllamaGenerateResponse> {
    logger.debug({ model: this.model }, 'Generating text with metadata...');

    try {
      const response = await this.client.post<OllamaGenerateResponse>('/api/generate', {
        model: this.model,
        prompt,
        stream: false,
        temperature: options?.temperature ?? 0.7,
        top_k: options?.topK ?? 40,
        num_ctx: options?.numContext ?? 2048,
      });

      return response.data;
    } catch (error) {
      logger.error({ error }, 'Failed to generate text with metadata');
      throw new Error(`Ollama generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Set model for subsequent requests
   */
  setModel(model: string): void {
    logger.debug({ model }, 'Setting model');
    this.model = model;
  }

  /**
   * Check if Ollama is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.client.get('/api/tags');
      return true;
    } catch {
      return false;
    }
  }
}

export default OllamaClient;
