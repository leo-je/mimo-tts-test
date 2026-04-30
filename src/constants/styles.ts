// ── 模型列表 ─────────────────────────────────────────────────────────────────
export const MODEL_OPTIONS = [
  {label: 'MiMo-V2.5-TTS (预置音色)', value: 'mimo-v2.5-tts'},
  {label: 'MiMo-V2.5-TTS-VoiceDesign (音色设计)', value: 'mimo-v2.5-tts-voicedesign'},
  {label: 'MiMo-V2.5-TTS-VoiceClone (音色复刻)', value: 'mimo-v2.5-tts-voiceclone'},
];

// ── 预置音色列表 (mimo-v2.5-tts) ─────────────────────────────────────────────
export const VOICE_OPTIONS = [
  {label: '默认 (冰糖) · mimo_default', value: 'mimo_default'},
  {label: '冰糖 · 中文女声', value: '冰糖'},
  {label: '茉莉 · 中文女声', value: '茉莉'},
  {label: '苏打 · 中文男声', value: '苏打'},
  {label: '白桦 · 中文男声', value: '白桦'},
  {label: 'Mia · 英文女声', value: 'Mia'},
  {label: 'Chloe · 英文女声', value: 'Chloe'},
  {label: 'Milo · 英文男声', value: 'Milo'},
  {label: 'Dean · 英文男声', value: 'Dean'},
];

export const AUDIO_FORMAT_OPTIONS = [
  {label: 'WAV', value: 'wav'},
  {label: 'PCM16 (流式推荐)', value: 'pcm16'},
];

// ── 整体风格标签 (放在 assistant content 开头) ───────────────────────────────
// 格式：(风格1 风格2)待合成内容
export const STYLE_OPTIONS: string[] = [
  // 基础情绪
  '开心', '悲伤', '愤怒', '恐惧', '惊讶', '兴奋', '委屈', '平静', '冷漠',
  // 复合情绪
  '怅然', '欣慰', '无奈', '愧疚', '释然', '嫉妒', '厌倦', '忐忑', '动情',
  // 整体语调
  '温柔', '高冷', '活泼', '严肃', '慵懒', '俏皮', '深沉', '干练', '凌厉',
  // 音色定位
  '磁性', '醇厚', '清亮', '空灵', '稚嫩', '苍老', '甜美', '沙哑', '醇雅',
  // 人设腔调
  '夹子音', '御姐音', '正太音', '大叔音', '台湾腔',
  // 方言
  '东北话', '四川话', '河南话', '粤语',
  // 角色扮演
  '孙悟空', '林黛玉',
  // 唱歌
  '唱歌',
];

// ── 细粒度音频标签 (插入 assistant content 任意位置) ─────────────────────────
// 格式：[标签]  或  （标签）
export const AUDIO_TAG_OPTIONS: string[] = [
  // 语速与节奏
  '[吸气]', '[深呼吸]', '[叹气]', '[长叹一口气]', '[喘息]', '[屏息]',
  // 情绪状态
  '[紧张]', '[害怕]', '[激动]', '[疲惫]', '[委屈]', '[撒娇]', '[心虚]', '[震惊]', '[不耐烦]',
  // 语音特征
  '[颤抖]', '[声音颤抖]', '[变调]', '[破音]', '[鼻音]', '[气声]', '[沙哑]',
  // 哭笑表达
  '[笑]', '[轻笑]', '[大笑]', '[冷笑]', '[抽泣]', '[呜咽]', '[哽咽]', '[嚎啕大哭]',
];

export const DEFAULT_CONFIG = {
  endpoint: 'https://api.xiaomimimo.com/v1/chat/completions',
  model: 'mimo-v2.5-tts',
  audioFormat: 'wav',
  voice: 'mimo_default',
};
