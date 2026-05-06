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
import {MiMoConfig, TestTemplate, TTSRequest} from '../types';

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
};

type StatusType = 'idle' | 'loading' | 'success' | 'error';

export default function HomeScreen({navigation}: any) {
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
  const [synthesizing, setSynthesizing] = useState(false);
  const [lastRequestJson, setLastRequestJson] = useState('');

  const assistantInputRef = useRef<TextInput>(null);
  const [cursorPos, setCursorPos] = useState(0);
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [assistantFocused, setAssistantFocused] = useState(false);

  useEffect(() => {
    loadConfig();
    loadLastInput();
    const unsubscribe = navigation.addListener('focus', loadConfig);
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    saveLastInput();
  }, [assistantText, userPrompt, customStyles, selectedStyles, selectedTemplateId]);

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

      const ext = config.audioFormat.toLowerCase();
      const filePath = `${RNFS.CachesDirectoryPath}/mimo-tts-output.${ext}`;

      await RNFS.writeFile(filePath, result.audioBase64, 'base64');

      setAudioPath(filePath);
      setStatus('success');
      setStatusText('合成成功');
      setResponseMeta(
        JSON.stringify(
          {
            id: result.meta.id,
            created: result.meta.created,
            voice: result.meta.voice,
            format: result.meta.format,
            savedTo: filePath,
          },
          null,
          2,
        ),
      );
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

  const finalContent = buildFinalContent();
  const canPlay = status === 'success' && !!audioPath;
  const isAudioActive = playbackState !== 'idle';

  return (
    <View style={styles.root}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Template Selector */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>测试模板</Text>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => navigation.navigate('Settings')}>
              <Icon name="settings" size={22} color="#c75d2c" />
            </TouchableOpacity>
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
              <Icon name="label" size={16} color="#c75d2c" />
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
                  <Icon name="close" size={24} color="#6b5646" />
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
          <View style={{height: 140}} />
        </View>
      </ScrollView>

      {/* 固定右下角 FAB 按钮 */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, styles.fabSynthesize, synthesizing && styles.fabDisabled]}
          onPress={handleSynthesize}
          disabled={synthesizing}>
          {synthesizing ? (
            <ActivityIndicator color="#fff8ef" size="small" />
          ) : (
            <Icon name="send" size={24} color="#fff8ef" />
          )}
        </TouchableOpacity>

        {/* 播放中：停止 + 暂停；暂停中：停止 + 继续；空闲：播放 */}
        {isAudioActive ? (
          <View style={styles.fabRow}>
            <TouchableOpacity
              style={[styles.fab, styles.fabStop]}
              onPress={handleStopAudio}>
              <Icon name="stop" size={24} color="#fff8ef" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fab, styles.fabPause]}
              onPress={playbackState === 'paused' ? handleResumeAudio : handlePauseAudio}>
              <Icon
                name={playbackState === 'paused' ? 'play-arrow' : 'pause'}
                size={24}
                color="#fff8ef"
              />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.fab, styles.fabPlay, !canPlay && styles.fabDisabled]}
            onPress={handlePlayAudio}
            disabled={!canPlay}>
            <Icon
              name="play-arrow"
              size={28}
              color={canPlay ? '#fff8ef' : 'rgba(255,248,239,0.4)'}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const FAB_SIZE_SYNTH = 52;
const FAB_SIZE_PLAY = 60;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f7f0e6',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 250, 244, 0.92)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(63, 45, 28, 0.12)',
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
    color: '#24170e',
    marginBottom: 4,
  },
  settingsBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(199, 93, 44, 0.08)',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: 'rgba(63, 45, 28, 0.22)',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 252, 248, 0.92)',
    overflow: 'hidden',
  },
  quickInfo: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(199, 93, 44, 0.06)',
  },
  quickInfoText: {
    fontSize: 13,
    color: '#6b5646',
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    color: '#6b5646',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(63, 45, 28, 0.22)',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    backgroundColor: 'rgba(255, 252, 248, 0.92)',
    color: '#24170e',
  },
  textarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  textareaFocused: {
    borderColor: 'rgba(199, 93, 44, 0.6)',
    borderWidth: 2,
  },
  tip: {
    fontSize: 12,
    color: '#6b5646',
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
    borderColor: 'rgba(173, 102, 54, 0.24)',
    backgroundColor: 'rgba(255, 245, 235, 0.95)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: '#c75d2c',
    borderColor: 'transparent',
  },
  chipText: {
    fontSize: 13,
    color: '#24170e',
  },
  chipTextActive: {
    color: '#fff6ef',
  },
  ghostBtnText: {
    fontSize: 13,
    color: '#9f3e17',
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
    backgroundColor: 'rgba(199, 93, 44, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(199, 93, 44, 0.16)',
  },
  insertTagBtnText: {
    fontSize: 13,
    color: '#c75d2c',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(36, 23, 14, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff8ef',
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
    borderBottomColor: 'rgba(63, 45, 28, 0.1)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#24170e',
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
    borderColor: 'rgba(173, 102, 54, 0.24)',
    backgroundColor: 'rgba(255, 245, 235, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalChipText: {
    fontSize: 14,
    color: '#24170e',
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
    color: '#f9e9d5',
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
    backgroundColor: '#9f3e17',
  },
  fabPlay: {
    width: FAB_SIZE_PLAY,
    height: FAB_SIZE_PLAY,
    backgroundColor: '#c75d2c',
  },
  fabDisabled: {
    backgroundColor: 'rgba(159, 62, 23, 0.35)',
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
});
