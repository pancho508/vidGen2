import { ScriptSection, Scene, ScenePlan } from '../types/index.js';
import { createLogger } from '../utils/logger.js';
import OllamaClient from '../services/ollamaClient.js';

const logger = createLogger('ScenePlanner');

/**
 * Plan visual scenes for YouTube script
 */
export class ScenePlanner {
  private ollama: OllamaClient;
  private targetSceneCount: number;
  private estimatedSceneDuration: number;

  constructor(ollama?: OllamaClient, targetSceneCount: number = 20, videoTargetDuration: number = 540) {
    this.ollama = ollama || new OllamaClient();
    this.targetSceneCount = targetSceneCount;
    this.estimatedSceneDuration = videoTargetDuration / targetSceneCount; // seconds per scene
  }

  /**
   * Create visual scene plan from script
   */
  async planScenes(script: string, sections: ScriptSection[]): Promise<ScenePlan> {
    logger.info({ targetScenes: this.targetSceneCount }, 'Planning scenes...');

    try {
      // Divide script into segments (roughly 1 scene per segment)
      const scriptSegments = this.divideScriptIntoSegments(script, this.targetSceneCount);

      const scenes: Scene[] = [];

      for (let i = 0; i < scriptSegments.length; i++) {
        const segment = scriptSegments[i];

        logger.debug({ scene: i + 1 }, 'Generating scene prompt...');

        const scene = await this.generateScene(
          i + 1,
          segment,
          script,
          this.estimatedSceneDuration
        );

        scenes.push(scene);
      }

      const totalDuration = scenes.reduce((sum, s) => sum + s.estimatedDurationSeconds, 0);

      logger.info(
        { sceneCount: scenes.length, totalDuration },
        'Scenes planned successfully'
      );

      return {
        scenes,
        totalDuration,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to plan scenes');
      throw error;
    }
  }

  /**
   * Divide script into roughly equal segments
   */
  private divideScriptIntoSegments(script: string, segmentCount: number): string[] {
    const segments: string[] = [];
    const words = script.split(/\s+/);
    const wordsPerSegment = Math.ceil(words.length / segmentCount);

    for (let i = 0; i < segmentCount; i++) {
      const start = i * wordsPerSegment;
      const end = Math.min(start + wordsPerSegment, words.length);
      const segment = words.slice(start, end).join(' ');

      if (segment.trim().length > 0) {
        segments.push(segment);
      }
    }

    return segments;
  }

  /**
   * Generate image prompt for a scene
   */
  private async generateScene(
    sceneNumber: number,
    scriptSegment: string,
    fullScript: string,
    estimatedDuration: number
  ): Promise<Scene> {
    const prompt = `Based on the following script excerpt from a YouTube educational video, 
create an image prompt for an AI image generator (Stable Diffusion).

The prompt should:
1. Be visually descriptive
2. Convey the main concept/idea from the text
3. Be suitable for an educational YouTube video
4. Use style: "clean, minimalist illustration, educational, white or light background"
5. Be specific and creative
6. Be 1-2 sentences maximum

Script excerpt:
"${scriptSegment}"

Generate ONLY the image prompt, nothing else:`;

    try {
      const imagePrompt = await this.ollama.generate(prompt, {
        temperature: 0.8,
        numContext: 1024,
      });

      // Clean up the prompt - remove quotes and extra whitespace
      let cleanPrompt = imagePrompt.trim();
      if (cleanPrompt.startsWith('"')) cleanPrompt = cleanPrompt.substring(1);
      if (cleanPrompt.endsWith('"')) cleanPrompt = cleanPrompt.slice(0, -1);

      const scene: Scene = {
        number: sceneNumber,
        scriptExcerpt: scriptSegment.substring(0, 200),
        imagePrompt: cleanPrompt,
        estimatedDurationSeconds: Math.round(estimatedDuration),
        style: 'minimalist illustration, educational',
      };

      logger.debug({ sceneNumber, promptLength: cleanPrompt.length }, 'Scene prompt generated');

      return scene;
    } catch (error) {
      logger.error({ sceneNumber, error }, 'Failed to generate scene prompt');
      throw error;
    }
  }
}

export default ScenePlanner;
