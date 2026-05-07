export interface MiMoConfig {
  apiKey: string;
  endpoint: string;
  model: string;
  audioFormat: string;
  voice: string;
}

export interface TTSRequest {
  model: string;
  messages: Array<{role: string; content: string}>;
  audio: {
    format: string;
    voice?: string;
  };
}

export interface TTSResponse {
  id: string;
  created: number;
  choices: Array<{
    message: {
      audio: {
        data: string;
      };
    };
  }>;
  error?: {
    message: string;
  };
}

export interface TestTemplate {
  id: string;
  name: string;
  summary: string;
  model?: string;
  voice: string;
  format: string;
  styles: string[];
  tags: string[];
  userPrompt: string;
  assistantText: string;
}

export interface SynthesisRecord {
  id: string;
  timestamp: number;
  text: string;
  styles: string[];
  customStyles: string;
  userPrompt: string;
  templateId: string;
  audioPath: string;
  model: string;
  voice: string;
  format: string;
}

export interface AudioPlayerModule {
  play(path: string): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seekTo(position: number): void;
  setSpeed(speed: number): void;
  getDuration(): Promise<number>;
  getCurrentPosition(): Promise<number>;
}

export interface NavigationProp {
  navigate(name: string, params?: object): void;
  addListener(event: string, callback: () => void): () => void;
  goBack(): void;
}
