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
