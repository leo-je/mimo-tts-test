import {MiMoConfig, TTSRequest, TTSResponse} from '../types';
import {API_TIMEOUT_MS} from '../constants/styles';

/**
 * 构建风格前缀，格式：(风格1 风格2)
 * v2.5 使用半角括号，如 (开心 变快)正文内容
 * 唱歌模式：(唱歌)歌词
 */
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

  return `(${allStyles.join(' ')})`;
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
  const isVoiceDesign = config.model === 'mimo-v2.5-tts-voicedesign';

  // voicedesign: audio 不含 voice（音色由 user 描述决定）
  // voicedesign 以外：userPrompt 非空时 voice 不发送（否则 user 风格指令失效）
  let audio: TTSRequest['audio'];
  if (isVoiceDesign) {
    audio = {format: config.audioFormat};
  } else if (userPrompt.trim()) {
    audio = {format: config.audioFormat};
  } else {
    audio = {format: config.audioFormat, voice: config.voice};
  }

  const payload: TTSRequest = {
    model: config.model,
    messages: [],
    audio,
  };

  // voicedesign: user 消息必填（音色描述）；其他模型：可选
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
): Promise<{audioBase64: string; meta: {id: string; created: number; voice?: string; format: string}}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

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
