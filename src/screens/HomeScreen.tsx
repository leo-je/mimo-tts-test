import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  NativeModules,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import {Picker} from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  STYLE_OPTIONS,
  AUDIO_TAG_OPTIONS,
  DEFAULT_CONFIG,
} from '../constants/styles';
import {TEMPLATE_LIBRARY} from '../constants/templates';
import {
  buildAssistantContent,
  buildRequestPayload,
  synthesize,
} from '../services/MiMoTTSService';
import {MiMoConfig, TestTemplate, TTSRequest, SynthesisRecord} from '../types';
import {useTheme} from '../theme/ThemeContext';
import {AppTheme} from '../theme/themes';

const STORAGE_KEYS = {
  apiKey: 'mimo-tts-api-key',
  endpoint: 'mimo-tts-endpoint',
  format: 'mimo-tts-format',
  voice: 'mimo-tts-voice',
  model: 'mimo-tts-model',
  assistantText: 'mimo-tts-assistant-text',
  userPrompt: 'mimo-tts-user-prompt',
  customStyles: 'mimo-tts-custom-styles',
  selectedStyles: 'mimo-tts-selected-styles',
  selectedTemplateId: 'mimo-tts-template-id',
  history: 'mimo-tts-history',
};

type StatusType = 'idle' | 'loading' | 'success' | 'error';

/** 将 PCM16 原始 base64 数据包装为 WAV base64，使 MediaPlayer 可播放 */
function pcm16ToWavBase64(pcmBase64: string, sampleRate = 24000): string {
  // base64 decode
  const raw = atob(pcmBase64);
  const pcmLen = raw.length;
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  v.setUint32(4, 36 + pcmLen, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  writeStr(36, 'data');
  v.setUint32(40, pcmLen, true);

  // 合并 header + pcm 并 base64 encode
  const hdrBytes = new Uint8Array(header);
  const CHUNK = 8192;
  const parts: string[] = [];
  for (let i = 0; i < hdrBytes.length; i += CHUNK) {
    parts.push(String.fromCharCode(...hdrBytes.subarray(i, i + CHUNK)));
  }
  // raw 已经是 binary string，直接拼接
  parts.push(raw);
  return btoa(parts.join(''));
}

export default function HomeScreen({navigation}: any) {
  const theme = useTheme();
  const [config, setConfig] = useState<MiMoConfig>({
    apiKey: '',
    endpoint: DEFAULT_CONFIG.endpoint,
    model: DEFAULT_CONFIG.model,
    audioFormat: DEFAULT_CONFIG.audioFormat,
    voice: DEFAULT_CONFIG.voice,
  });

  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [customStyles, setCustomStyles] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [assistantText, setAssistantText] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATE_LIBRARY[0].id);

  const [status, setStatus] = useState<StatusType>('idle');
  const [statusText, setStatusText] = useState('待发起');
  const [responseMeta, setResponseMeta] = useState('');
  const [audioPath, setAudioPath] = useState('');
  const [playbackState, setPlaybackState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [synthesizing, setSynthesizing] = useState(false);
  const [lastRequestJson, setLastRequestJson] = useState('');
  const [history, setHistory] = useState<SynthesisRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const assistantInputRef = useRef<TextInput>(null);
  const [cursorPos, setCursorPos] = useState(0);
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [assistantFocused, setAssistantFocused] = useState(false);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    loadConfig();
    loadLastInput();
    loadHistory().then(records => {
      setHistory(records);
      if (records.length > 0) {
        loadRecord(records[0]);
      }
    });
    const unsubscribe = navigation.addListener('focus', loadConfig);
    return unsubscribe;
  }, [navigation]);

  function loadRecord(record: SynthesisRecord) {
    setAssistantText(record.text);
    setUserPrompt(record.userPrompt);
    setCustomStyles(record.customStyles);
    setSelectedStyles([...record.styles]);
    setSelectedTemplateId(record.templateId);
    setAudioPath(record.audioPath);
    setStatus('success');
    setStatusText('合成成功');
  }

  useEffect(() => {
    if (initialLoadDone.current) {
      saveLastInput();
    }
  }, [assistantText, userPrompt, customStyles, selectedStyles, selectedTemplateId]);

  const isAudioActive = playbackState !== 'idle';

  // Poll playback position
  useEffect(() => {
    if (!isAudioActive) return;
    const {AudioPlayer} = NativeModules;
    AudioPlayer.getDuration().then((d: number) => setPlaybackDuration(d));
    const id = setInterval(() => {
      AudioPlayer.getCurrentPosition().then((p: number) => setPlaybackPosition(p));
    }, 250);
    return () => clearInterval(id);
  }, [isAudioActive]);

  async function loadConfig() {
    const [apiKey, endpoint, format, voice, model] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.apiKey),
      AsyncStorage.getItem(STORAGE_KEYS.endpoint),
      AsyncStorage.getItem(STORAGE_KEYS.format),
      AsyncStorage.getItem(STORAGE_KEYS.voice),
      AsyncStorage.getItem(STORAGE_KEYS.model),
    ]);
    setConfig(prev => ({
      ...prev,
      apiKey: apiKey || '',
      endpoint: endpoint || DEFAULT_CONFIG.endpoint,
      audioFormat: format || DEFAULT_CONFIG.audioFormat,
      voice: voice || DEFAULT_CONFIG.voice,
      model: model || DEFAULT_CONFIG.model,
    }));
  }

  async function loadLastInput() {
    const [savedText, savedPrompt, savedCustom, savedStyles, savedTemplateId] =
      await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.assistantText),
        AsyncStorage.getItem(STORAGE_KEYS.userPrompt),
        AsyncStorage.getItem(STORAGE_KEYS.customStyles),
        AsyncStorage.getItem(STORAGE_KEYS.selectedStyles),
        AsyncStorage.getItem(STORAGE_KEYS.selectedTemplateId),
      ]);

    if (savedText !== null || savedPrompt !== null) {
      setAssistantText(savedText || '');
      setUserPrompt(savedPrompt || '');
      setCustomStyles(savedCustom || '');
      setSelectedStyles(savedStyles ? JSON.parse(savedStyles) : []);
      setSelectedTemplateId(savedTemplateId || TEMPLATE_LIBRARY[0].id);
    } else {
      applyTemplate(TEMPLATE_LIBRARY[0]);
    }
    initialLoadDone.current = true;
  }

  function saveLastInput() {
    AsyncStorage.multiSet([
      [STORAGE_KEYS.assistantText, assistantText],
      [STORAGE_KEYS.userPrompt, userPrompt],
      [STORAGE_KEYS.customStyles, customStyles],
      [STORAGE_KEYS.selectedStyles, JSON.stringify(selectedStyles)],
      [STORAGE_KEYS.selectedTemplateId, selectedTemplateId],
    ]);
  }

  // ── 记录管理 ──────────────────────────────────────────────────────
  const MAX_HISTORY = 20;

  async function loadHistory(): Promise<SynthesisRecord[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.history);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async function saveHistory(records: SynthesisRecord[]) {
    setHistory(records);
    await AsyncStorage.setItem(STORAGE_KEYS.history, JSON.stringify(records));
  }

  async function addRecord(record: SynthesisRecord) {
    const updated = [record, ...history].slice(0, MAX_HISTORY);
    // 删除超出限制的旧音频文件
    if (updated.length < history.length + 1) {
      const removed = history.slice(MAX_HISTORY - 1);
      for (const r of removed) {
        RNFS.exists(r.audioPath).then(exists => {
          if (exists) RNFS.unlink(r.audioPath);
        });
      }
    }
    await saveHistory(updated);
  }

  async function deleteRecord(id: string) {
    const target = history.find(r => r.id === id);
    const updated = history.filter(r => r.id !== id);
    await saveHistory(updated);
    if (target) {
      const exists = await RNFS.exists(target.audioPath);
      if (exists) await RNFS.unlink(target.audioPath);
    }
  }

  function applyTemplate(template: TestTemplate) {
    setSelectedStyles([...template.styles]);
    setCustomStyles('');
    setUserPrompt(template.userPrompt);
    setAssistantText(template.assistantText);
    setSelectedTemplateId(template.id);
    setConfig(prev => ({
      ...prev,
      ...(template.model ? {model: template.model} : {}),
      voice: template.voice,
      audioFormat: template.format,
    }));
  }

  function toggleStyle(style: string) {
    setSelectedStyles(prev =>
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style],
    );
  }

  function clearStyles() {
    setSelectedStyles([]);
    setCustomStyles('');
  }

  function insertTagAtCursor(tag: string) {
    const before = assistantText.slice(0, cursorPos);
    const after = assistantText.slice(cursorPos);
    const newText = before + tag + after;
    setAssistantText(newText);
    const newPos = cursorPos + tag.length;
    setCursorPos(newPos);
    setShowTagPanel(false);
    setTimeout(() => {
      assistantInputRef.current?.setNativeProps({
        selection: {start: newPos, end: newPos},
      });
    }, 50);
  }

  function handleAssistantSelectionChange(event: any) {
    const {selection} = event.nativeEvent;
    if (selection) {
      setCursorPos(selection.start ?? 0);
    }
  }

  function buildFinalContent(): string {
    return buildAssistantContent(assistantText, selectedStyles, customStyles);
  }

  async function handleSynthesize() {
    if (!config.apiKey.trim()) {
      Alert.alert('提示', '请先在设置页面填写 API Key', [
        {text: '去设置', onPress: () => navigation.navigate('Settings')},
        {text: '取消'},
      ]);
      return;
    }

    if (config.model === 'mimo-v2.5-tts-voicedesign' && !userPrompt.trim()) {
      Alert.alert('提示', '音色设计模式下，User 角色上下文（音色描述）为必填项');
      return;
    }

    const content = buildFinalContent();
    if (!content) {
      Alert.alert('提示', '请先输入待合成文本');
      return;
    }

    const payload = buildRequestPayload(config, userPrompt, content);
    setLastRequestJson(JSON.stringify(payload, null, 2));

    setSynthesizing(true);
    setStatus('loading');
    setStatusText('合成中');
    setResponseMeta('正在请求 Xiaomi MiMo API...');
    setAudioPath('');

    try {
      const result = await synthesize(config, payload);

      const isPcm = config.audioFormat.toLowerCase() === 'pcm16';
      const cachePath = `${RNFS.CachesDirectoryPath}/mimo-tts-output.wav`;
      const docsPath = `${RNFS.DocumentDirectoryPath}/mimo-tts-records`;
      const recordId = Date.now().toString();
      const recordPath = `${docsPath}/${recordId}.wav`;

      const dataToWrite = isPcm ? pcm16ToWavBase64(result.audioBase64) : result.audioBase64;
      await RNFS.writeFile(cachePath, dataToWrite, 'base64');

      // 确保目录存在，然后复制到持久目录
      await RNFS.mkdir(docsPath);
      await RNFS.copyFile(cachePath, recordPath);

      setAudioPath(recordPath);
      setStatus('success');
      setStatusText('合成成功');
      setResponseMeta(
        JSON.stringify(
          {
            id: result.meta.id,
            created: result.meta.created,
            voice: result.meta.voice,
            format: result.meta.format,
            savedTo: recordPath,
          },
          null,
          2,
        ),
      );

      // 保存记录
      const record: SynthesisRecord = {
        id: recordId,
        timestamp: Date.now(),
        text: assistantText,
        styles: [...selectedStyles],
        customStyles,
        userPrompt,
        templateId: selectedTemplateId,
        audioPath: recordPath,
        model: config.model,
        voice: config.voice,
        format: config.audioFormat,
      };
      addRecord(record);
    } catch (error: any) {
      setStatus('error');
      setStatusText('请求失败');
      setResponseMeta(error?.message || String(error));
    } finally {
      setSynthesizing(false);
    }
  }

  async function handlePlayAudio() {
    if (!audioPath) return;
    try {
      setPlaybackState('playing');
      const {AudioPlayer} = NativeModules;
      await AudioPlayer.play(audioPath);
      setPlaybackState('idle');
    } catch (error: any) {
      setPlaybackState('idle');
      Alert.alert('播放失败', error?.message || '音频播放出错');
    }
  }

  async function handleStopAudio() {
    try {
      const {AudioPlayer} = NativeModules;
      await AudioPlayer.stop();
      setPlaybackState('idle');
    } catch (error: any) {
      setPlaybackState('idle');
    }
  }

  async function handlePauseAudio() {
    try {
      setPlaybackState('paused');
      const {AudioPlayer} = NativeModules;
      AudioPlayer.pause(); // fire-and-forget
    } catch (error: any) {
      setPlaybackState('idle');
    }
  }

  async function handleResumeAudio() {
    try {
      setPlaybackState('playing');
      const {AudioPlayer} = NativeModules;
      AudioPlayer.resume(); // fire-and-forget，播放结束由 play() 的 Promise 决定
    } catch (error: any) {
      setPlaybackState('idle');
    }
  }

  function handleSeek(position: number) {
    setPlaybackPosition(position);
    NativeModules.AudioPlayer.seekTo(position);
  }

  function handleSpeedChange(speed: number) {
    setPlaybackSpeed(speed);
    NativeModules.AudioPlayer.setSpeed(speed);
  }

  function getStatusColor(): string {
    switch (status) {
      case 'loading': return '#8a4f18';
      case 'success': return '#1e7f53';
      case 'error': return '#b33535';
      default: return '#6b5646';
    }
  }

  function getStatusBgColor(): string {
    switch (status) {
      case 'loading': return 'rgba(244, 179, 112, 0.2)';
      case 'success': return 'rgba(30, 127, 83, 0.14)';
      case 'error': return 'rgba(179, 53, 53, 0.12)';
      default: return 'rgba(94, 70, 47, 0.08)';
    }
  }

  function Seekbar({value, max, onSeek}: {value: number; max: number; onSeek: (v: number) => void}) {
    const [trackWidth, setTrackWidth] = useState(0);
    const ratio = max > 0 ? value / max : 0;

    function handleTouch(e: any) {
      const x = Math.max(0, Math.min(e.nativeEvent.locationX, trackWidth));
      const newPos = (x / trackWidth) * max;
      onSeek(newPos);
    }

    return (
      <View
        style={seekbarStyles.trackWrapper}
        onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouch}>
        <View style={seekbarStyles.track}>
          <View style={[seekbarStyles.fill, {width: `${ratio * 100}%`}]} />
          <View style={[seekbarStyles.thumb, {left: `${ratio * 100}%`}]} />
        </View>
      </View>
    );
  }

  function formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  const styles = makeStyles(theme);
  const seekbarStyles = makeSeekbarStyles(theme);
  const finalContent = buildFinalContent();
  const canPlay = status === 'success' && !!audioPath;

  return (
    <View style={styles.root}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Template Selector */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>测试模板</Text>
          </View>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedTemplateId}
              onValueChange={value => {
                const template = TEMPLATE_LIBRARY.find(t => t.id === value);
                if (template) applyTemplate(template);
              }}>
              {TEMPLATE_LIBRARY.map(t => (
                <Picker.Item
                  key={t.id}
                  label={`${t.name} · ${t.summary}`}
                  value={t.id}
                />
              ))}
            </Picker>
          </View>
          <View style={styles.quickInfo}>
            <Text style={styles.quickInfoText}>
              模型: {config.model} | 音色: {config.voice} | 格式: {config.audioFormat}
            </Text>
          </View>
        </View>

        {/* Style Builder */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>整体风格控制</Text>
            <TouchableOpacity onPress={clearStyles}>
              <Text style={styles.ghostBtnText}>清空风格</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chipGrid}>
            {STYLE_OPTIONS.map(style => (
              <TouchableOpacity
                key={style}
                style={[
                  styles.chip,
                  selectedStyles.includes(style) && styles.chipActive,
                ]}
                onPress={() => toggleStyle(style)}>
                <Text
                  style={[
                    styles.chipText,
                    selectedStyles.includes(style) && styles.chipTextActive,
                  ]}>
                  {style}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>自定义风格</Text>
          <TextInput
            style={styles.input}
            value={customStyles}
            onChangeText={setCustomStyles}
            placeholder="例如：播音腔、温柔、悬疑、青春感"
          />
          <Text style={styles.tip}>
            已选风格将拼成 (风格1 风格2) 放在 assistant 文本开头。唱歌模式格式为 (唱歌)歌词。
          </Text>
        </View>

        {/* Text Input */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>文本输入</Text>

          <Text style={styles.label}>
            User 角色上下文{config.model === 'mimo-v2.5-tts-voicedesign' ? '（必填·音色描述）' : '（可选·风格指令）'}
          </Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={userPrompt}
            onChangeText={setUserPrompt}
            placeholder={config.model === 'mimo-v2.5-tts-voicedesign' ? '音色描述：如 A warm, mature female voice...' : '自然语言风格指令，如：用轻快上扬的语调...'}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={styles.assistantLabelRow}>
            <Text style={[styles.label, {marginTop: 0, marginBottom: 0}]}>Assistant 角色待合成文本</Text>
            <TouchableOpacity
              style={styles.insertTagBtn}
              onPress={() => setShowTagPanel(true)}>
              <Icon name="label" size={16} color={theme.accent} />
              <Text style={styles.insertTagBtnText}>插入标签</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            ref={assistantInputRef}
            style={[styles.input, styles.textarea, assistantFocused && styles.textareaFocused]}
            value={assistantText}
            onChangeText={setAssistantText}
            onSelectionChange={handleAssistantSelectionChange}
            onFocus={() => setAssistantFocused(true)}
            onBlur={() => setAssistantFocused(false)}
            placeholder="这里填写真正要转语音的文本"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* 标签选择弹窗 */}
        <Modal
          visible={showTagPanel}
          animationType="slide"
          transparent
          onRequestClose={() => setShowTagPanel(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>选择要插入的标签</Text>
                <TouchableOpacity onPress={() => setShowTagPanel(false)}>
                  <Icon name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalChipGrid}>
                {AUDIO_TAG_OPTIONS.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.modalChip}
                    onPress={() => insertTagAtCursor(tag)}>
                    <Text style={styles.modalChipText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Preview */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>最终待合成文本预览</Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>
              {finalContent || '等待输入待合成文本...'}
            </Text>
          </View>
        </View>

        {/* Request Info */}
        {lastRequestJson ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>请求信息</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.codeBlock}>
                <Text style={styles.codeText}>{lastRequestJson}</Text>
              </View>
            </ScrollView>
          </View>
        ) : null}

        {/* Response */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>返回音频</Text>
            <View style={[styles.statusBadge, {backgroundColor: getStatusBgColor()}]}>
              <Text style={[styles.statusText, {color: getStatusColor()}]}>
                {statusText}
              </Text>
            </View>
          </View>

          {responseMeta ? (
            <View style={[styles.codeBlock, styles.codeBlockSmall]}>
              <Text style={styles.codeText}>{responseMeta}</Text>
            </View>
          ) : null}

          {/* 底部留白，避免被 FAB 遮挡 */}
          <View style={{height: canPlay || isAudioActive ? 200 : 140}} />
        </View>
      </ScrollView>

      {/* 底部播放控制栏 */}
      {(canPlay || isAudioActive || history.length > 0) && (
        <View style={styles.bottomBar}>
          <View style={styles.speedRow}>
            <TouchableOpacity
              style={styles.historyBtn}
              onPress={() => setShowHistory(true)}>
              <Icon name="history" size={18} color={theme.textSecondary} />
              {history.length > 0 && (
                <View style={styles.historyBadge}>
                  <Text style={styles.historyBadgeText}>{history.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            {[0.5, 1.0, 1.5, 2.0].map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.speedBtn, playbackSpeed === s && styles.speedBtnActive]}
                onPress={() => handleSpeedChange(s)}>
                <Text style={[styles.speedBtnText, playbackSpeed === s && styles.speedBtnTextActive]}>
                  {s}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.playbackRow}>
            <Text style={styles.timeText}>{formatTime(playbackPosition)}</Text>
            <Seekbar value={playbackPosition} max={playbackDuration} onSeek={handleSeek} />
            <Text style={styles.timeText}>{formatTime(playbackDuration)}</Text>
            {isAudioActive ? (
              <>
                <TouchableOpacity
                  style={[styles.ctrlBtn, styles.ctrlBtnPause]}
                  onPress={playbackState === 'paused' ? handleResumeAudio : handlePauseAudio}>
                  <Icon
                    name={playbackState === 'paused' ? 'play-arrow' : 'pause'}
                    size={22}
                    color={theme.textOnPrimary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ctrlBtn, styles.ctrlBtnStop]}
                  onPress={handleStopAudio}>
                  <Icon name="stop" size={20} color={theme.textOnPrimary} />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.ctrlBtn, styles.ctrlBtnPlay]}
                onPress={handlePlayAudio}>
                <Icon name="play-arrow" size={24} color={theme.textOnPrimary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* 固定右下角 FAB 按钮 */}
      <View style={[styles.fabContainer, (canPlay || isAudioActive || history.length > 0) && {bottom: 100}]}>
        <TouchableOpacity
          style={[styles.fab, styles.fabSynthesize, synthesizing && styles.fabDisabled]}
          onPress={handleSynthesize}
          disabled={synthesizing}>
          {synthesizing ? (
            <ActivityIndicator color={theme.textOnPrimary} size="small" />
          ) : (
            <Icon name="send" size={24} color={theme.textOnPrimary} />
          )}
        </TouchableOpacity>
      </View>

      {/* 记录列表弹窗 */}
      <Modal visible={showHistory} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>合成记录 ({history.length})</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)}>
                <Icon name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.historyScroll}>
              {history.length === 0 ? (
                <Text style={styles.historyEmpty}>暂无记录</Text>
              ) : (
                history.map((record, index) => {
                  const date = new Date(record.timestamp);
                  const timeStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                  return (
                    <View key={record.id} style={styles.historyItem}>
                      <View style={styles.historyItemContent}>
                        <Text style={styles.historyItemTime}>{timeStr}</Text>
                        <Text style={styles.historyItemText} numberOfLines={2}>
                          {record.text}
                        </Text>
                        {record.styles.length > 0 && (
                          <Text style={styles.historyItemStyles}>
                            {record.styles.join(' · ')}
                          </Text>
                        )}
                      </View>
                      <View style={styles.historyItemActions}>
                        <TouchableOpacity
                          style={styles.historyPlayBtn}
                          onPress={() => {
                            loadRecord(record);
                            setShowHistory(false);
                          }}>
                          <Icon name="play-arrow" size={20} color={theme.textOnPrimary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.historyDeleteBtn}
                          onPress={() => deleteRecord(record.id)}>
                          <Icon name="delete" size={18} color={theme.textOnPrimary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const FAB_SIZE_SYNTH = 52;
const FAB_SIZE_PLAY = 60;

function makeStyles(theme: AppTheme) { return StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  settingsBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: theme.accentSubtle,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: theme.borderInput,
    borderRadius: 12,
    backgroundColor: theme.surfaceInput,
    overflow: 'hidden',
  },
  quickInfo: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: theme.accentSubtle,
  },
  quickInfoText: {
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    color: theme.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.borderInput,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    backgroundColor: theme.surfaceInput,
    color: theme.textPrimary,
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  textareaFocused: {
    borderColor: theme.borderFocus,
    borderWidth: 2,
  },
  tip: {
    fontSize: 12,
    color: theme.textSecondary,
    lineHeight: 18,
    marginTop: 10,
    opacity: 0.8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    borderWidth: 1,
    borderColor: theme.borderChip,
    backgroundColor: theme.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: theme.accent,
    borderColor: 'transparent',
  },
  chipText: {
    fontSize: 13,
    color: theme.textPrimary,
  },
  chipTextActive: {
    color: theme.textOnAccent,
  },
  ghostBtnText: {
    fontSize: 13,
    color: theme.accentDark,
    fontWeight: '600',
  },
  assistantLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  insertTagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
    backgroundColor: theme.accentSubtle,
    borderWidth: 1,
    borderColor: theme.borderChip,
  },
  insertTagBtnText: {
    fontSize: 13,
    color: theme.accent,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.modalBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  modalScroll: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  modalChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modalChip: {
    borderWidth: 1,
    borderColor: theme.borderChip,
    backgroundColor: theme.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalChipText: {
    fontSize: 14,
    color: theme.textPrimary,
  },
  codeBlock: {
    backgroundColor: '#261a11',
    borderRadius: 14,
    padding: 14,
    minHeight: 80,
    minWidth: 300,
  },
  codeBlockSmall: {
    minHeight: 60,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: theme.codeText,
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // ── 固定右下角 FAB ──────────────────────────────────────────────
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    alignItems: 'center',
    gap: 12,
  },
  fab: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  fabSynthesize: {
    width: FAB_SIZE_SYNTH,
    height: FAB_SIZE_SYNTH,
    backgroundColor: theme.accentDark,
  },
  fabPlay: {
    width: FAB_SIZE_PLAY,
    height: FAB_SIZE_PLAY,
    backgroundColor: theme.accent,
  },
  fabDisabled: {
    backgroundColor: theme.disabled,
  },
  fabRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fabStop: {
    width: 46,
    height: 46,
    backgroundColor: '#b33535',
  },
  fabPause: {
    width: 46,
    height: 46,
    backgroundColor: '#8a4f18',
  },
  // ── 底部播放控制栏 ──────────────────────────────────────────────
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.bg,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  speedRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  historyBtn: {
    width: 36,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.accentSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    position: 'relative',
  },
  historyBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: theme.accent,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  historyBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.textOnPrimary,
  },
  historyScroll: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  historyEmpty: {
    textAlign: 'center',
    color: theme.textSecondary,
    paddingVertical: 30,
    fontSize: 14,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  historyItemContent: {
    flex: 1,
    marginRight: 10,
  },
  historyItemTime: {
    fontSize: 11,
    color: theme.textSecondary,
    marginBottom: 2,
  },
  historyItemText: {
    fontSize: 14,
    color: theme.textPrimary,
    lineHeight: 20,
  },
  historyItemStyles: {
    fontSize: 11,
    color: theme.accent,
    marginTop: 3,
  },
  historyItemActions: {
    flexDirection: 'row',
    gap: 6,
  },
  historyPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#b33535',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: theme.accentSubtle,
  },
  speedBtnActive: {
    backgroundColor: theme.accent,
  },
  speedBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  speedBtnTextActive: {
    color: theme.textOnPrimary,
  },
  playbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 11,
    color: theme.textSecondary,
    width: 36,
    textAlign: 'center',
  },
  ctrlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlBtnPlay: {
    backgroundColor: theme.accent,
  },
  ctrlBtnPause: {
    backgroundColor: '#8a4f18',
  },
  ctrlBtnStop: {
    backgroundColor: '#b33535',
  },
}); }

function makeSeekbarStyles(theme: AppTheme) { return StyleSheet.create({
  trackWrapper: {
    flex: 1,
    height: 28,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border,
    overflow: 'visible',
  },
  fill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.accent,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  thumb: {
    position: 'absolute',
    top: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.accent,
    marginLeft: -7,
  },
}); }
