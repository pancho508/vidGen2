/**
 * Shared TypeScript interfaces for the entire pipeline
 */

// Book-related types
export interface Chapter {
  number: number;
  title?: string;
  content: string;
  wordCount: number;
}

export interface BookMetadata {
  title: string;
  author?: string;
  totalWords: number;
  totalChapters: number;
  filePath: string;
}

export interface ParsedBook {
  text: string;
  metadata: BookMetadata;
}

// Summarization types
export interface SummaryResult {
  chapterSummaries: string[];
  bookSummary: string;
  keyPoints: string[];
}

// Script generation types
export interface ScriptSection {
  name: 'HOOK' | 'INTRO' | 'IDEA_1' | 'IDEA_2' | 'IDEA_3' | 'LESSONS' | 'CONCLUSION';
  content: string;
  wordCount: number;
  estimatedDurationSeconds: number;
}

export interface YouTubeScript {
  fullScript: string;
  wordCount: number;
  sections: ScriptSection[];
  estimatedTotalDuration: number;
}

// Scene planning types
export interface Scene {
  number: number;
  scriptExcerpt: string;
  imagePrompt: string;
  estimatedDurationSeconds: number;
  style?: string;
}

export interface ScenePlan {
  scenes: Scene[];
  totalDuration: number;
}

// Media generation types
export interface GeneratedImage {
  path: string;
  sceneNumber: number;
  prompt: string;
  width: number;
  height: number;
  timestamp: Date;
}

export interface GeneratedAudio {
  path: string;
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  timestamp: Date;
}

export interface GeneratedSubtitle {
  path: string;
  count: number;
  timestamp: Date;
}

export interface Subtitle {
  index: number;
  startTime: string; // HH:MM:SS,mmm
  endTime: string;
  text: string;
}

export interface GeneratedThumbnail {
  path: string;
  width: number;
  height: number;
  timestamp: Date;
}

export interface GeneratedVideo {
  path: string;
  durationSeconds: number;
  width: number;
  height: number;
  fileSize: number;
  timestamp: Date;
}

// Pipeline types
export interface PipelineStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  durationSeconds?: number;
  error?: string;
  output?: any;
}

export interface PipelineResult {
  success: boolean;
  bookPath: string;
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  steps: PipelineStep[];
  videoPath?: string;
  errors: string[];
}

// API Response types
export interface OllamaGenerateResponse {
  response: string;
  context: number[];
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

export interface ComfyUIPromptResponse {
  prompt_id: string;
}

// Configuration types
export interface Config {
  ollama: {
    url: string;
    model: string;
  };
  comfyui: {
    url: string;
  };
  xtts: {
    url: string;
  };
  whisper: {
    path: string;
  };
  ffmpeg: {
    path: string;
  };
  scheduler: {
    time: string;
  };
  logging: {
    level: string;
    dir: string;
  };
  video: {
    targetDuration: number;
    targetSceneCount: number;
    targetScriptWordCount: number;
  };
}
