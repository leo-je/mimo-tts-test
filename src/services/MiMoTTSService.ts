import {MiMoConfig, TTSRequest, TTSResponse} from '../types';

export function buildStylePrefix(styles: string[], customStyles: string = ''): string {
  const selectedStyles = [...styles];
  const custom = customStyles
    .split(/[、,\s]+/)
    .map(s => s.trim())
    .filter(Boolean);

  const allStyles = [...selectedStyles, ...custom];
  if (!allStyles.length) {
    return '';
  }

  if (allStyles.includes('唱歌')) {
    return '<style>唱歌</style>';
  }

  return `<style>${allStyles.join(' ')}</style>`;
}

export function buildAssistantContent(
  text: string,
  styles: string[],
  customStyles: string = '',
): string {
  const prefix = buildStylePrefix(styles, customStyles);
  return `${prefix}${text.trim()}`.trim();
}

export function buildRequestPayload(
  config: MiMoConfig,
  userPrompt: string,
  assistantContent: string,
): TTSRequest {
  const payload: TTSRequest = {
    model: config.model,
    messages: [],
    audio: {
      format: config.audioFormat,
      voice: config.voice,
    },
  };

  if (userPrompt.trim()) {
    payload.messages.push({
      role: 'user',
      content: userPrompt.trim(),
    });
  }

  payload.messages.push({
    role: 'assistant',
    content: assistantContent,
  });

  return payload;
}

export async function synthesize(
  config: MiMoConfig,
  payload: TTSRequest,
): Promise<{audioBase64: string; meta: any}> {
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.apiKey,
    },
    body: JSON.stringify(payload),
  });

  const json: TTSResponse = await response.json();

  if (!response.ok) {
    throw new Error(json?.error?.message || `HTTP ${response.status}`);
  }

  const audioData = json?.choices?.[0]?.message?.audio?.data;
  if (!audioData) {
    throw new Error('返回中未找到 choices[0].message.audio.data');
  }

  return {
    audioBase64: audioData,
    meta: {
      id: json.id,
      created: json.created,
      voice: payload.audio.voice,
      format: payload.audio.format,
    },
  };
}
