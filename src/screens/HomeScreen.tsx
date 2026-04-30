import React, {useState, useEffect, useCallback} from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import {Picker} from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  STYLE_OPTIONS,
  AUDIO_TAG_OPTIONS,
  VOICE_OPTIONS,
  AUDIO_FORMAT_OPTIONS,
  DEFAULT_CONFIG,
} from '../constants/styles';
import {TEMPLATE_LIBRARY} from '../constants/templates';
import {
  buildAssistantContent,
  buildRequestPayload,
  synthesize,
} from '../services/MiMoTTSService';
import {MiMoConfig, TestTemplate} from '../types';

const STORAGE_KEYS = {
  apiKey: 'mimo-tts-api-key',
  endpoint: 'mimo-tts-endpoint',
  format: 'mimo-tts-format',
  voice: 'mimo-tts-voice',
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [userPrompt, setUserPrompt] = useState('');
  const [assistantText, setAssistantText] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(TEMPLATE_LIBRARY[0].id);

  const [status, setStatus] = useState<StatusType>('idle');
  const [statusText, setStatusText] = useState('待发起');
  const [responseMeta, setResponseMeta] = useState('');
  const [audioPath, setAudioPath] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);

  useEffect(() => {
    loadConfig();
    applyTemplate(TEMPLATE_LIBRARY[0]);
    const unsubscribe = navigation.addListener('focus', loadConfig);
    return unsubscribe;
  }, [navigation]);

  async function loadConfig() {
    const [apiKey, endpoint, format, voice] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.apiKey),
      AsyncStorage.getItem(STORAGE_KEYS.endpoint),
      AsyncStorage.getItem(STORAGE_KEYS.format),
      AsyncStorage.getItem(STORAGE_KEYS.voice),
    ]);
    setConfig(prev => ({
      ...prev,
      apiKey: apiKey || '',
      endpoint: endpoint || DEFAULT_CONFIG.endpoint,
      audioFormat: format || DEFAULT_CONFIG.audioFormat,
      voice: voice || DEFAULT_CONFIG.voice,
    }));
  }

  function applyTemplate(template: TestTemplate) {
    setSelectedStyles([...template.styles]);
    setSelectedTags([...template.tags]);
    setCustomStyles('');
    setUserPrompt(template.userPrompt);
    setAssistantText(template.assistantText);
    setSelectedTemplateId(template.id);
    setConfig(prev => ({
      ...prev,
      voice: template.voice,
      audioFormat: template.format,
    }));
  }

  function toggleStyle(style: string) {
    setSelectedStyles(prev =>
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style],
    );
  }

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
    );
  }

  function insertTags() {
    if (!selectedTags.length) return;
    const prefix = selectedTags.join('');
    setAssistantText(prev => (prev ? `${prefix}${prev}` : prefix));
  }

  function clearStyles() {
    setSelectedStyles([]);
    setCustomStyles('');
  }

  function buildFinalContent(): string {
    return buildAssistantContent(assistantText, selectedStyles, customStyles);
  }

  function buildPreviewJson(): string {
    const content = buildFinalContent();
    const payload = buildRequestPayload(config, userPrompt, content);
    return JSON.stringify(payload, null, 2);
  }

  async function handleSynthesize() {
    if (!config.apiKey.trim()) {
      Alert.alert('提示', '请先在设置页面填写 API Key', [
        {text: '去设置', onPress: () => navigation.navigate('Settings')},
        {text: '取消'},
      ]);
      return;
    }

    const content = buildFinalContent();
    if (!content) {
      Alert.alert('提示', '请先输入待合成文本');
      return;
    }

    setSynthesizing(true);
    setStatus('loading');
    setStatusText('合成中');
    setResponseMeta('正在请求 Xiaomi MiMo API...');
    setAudioPath('');

    try {
      const payload = buildRequestPayload(config, userPrompt, content);
      const result = await synthesize(config, payload);

      const ext = config.audioFormat.toLowerCase();
      const mimeMap: Record<string, string> = {
        mp3: 'audio/mpeg',
        pcm: 'audio/L16',
      };
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
      setIsPlaying(true);
      const {AudioPlayer} = NativeModules;
      await AudioPlayer.play(audioPath);
      setIsPlaying(false);
    } catch (error: any) {
      setIsPlaying(false);
      Alert.alert('播放失败', error?.message || '音频播放出错');
    }
  }

  function getStatusColor(): string {
    switch (status) {
      case 'loading':
        return '#8a4f18';
      case 'success':
        return '#1e7f53';
      case 'error':
        return '#b33535';
      default:
        return '#6b5646';
    }
  }

  function getStatusBgColor(): string {
    switch (status) {
      case 'loading':
        return 'rgba(244, 179, 112, 0.2)';
      case 'success':
        return 'rgba(30, 127, 83, 0.14)';
      case 'error':
        return 'rgba(179, 53, 53, 0.12)';
      default:
        return 'rgba(94, 70, 47, 0.08)';
    }
  }

  const finalContent = buildFinalContent();

  return (
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
              if (template) {
                applyTemplate(template);
              }
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
            音色: {config.voice} | 格式: {config.audioFormat}
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
          已选风格将拼成 {'<style>...</style>'} 放在文本开头。若包含"唱歌"，只保留"唱歌"。
        </Text>
      </View>

      {/* Audio Tags */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>细粒度音频标签</Text>
          <TouchableOpacity onPress={insertTags}>
            <Text style={styles.ghostBtnText}>插入到正文</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.chipGrid}>
          {AUDIO_TAG_OPTIONS.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[
                styles.chip,
                selectedTags.includes(tag) && styles.chipActive,
              ]}
              onPress={() => toggleTag(tag)}>
              <Text
                style={[
                  styles.chipText,
                  selectedTags.includes(tag) && styles.chipTextActive,
                ]}
                numberOfLines={1}>
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.tip}>
          这些标签将以中文括号形式插入正文，方便测试停顿、呼吸、情绪切换和节奏变化。
        </Text>
      </View>

      {/* Text Input */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>文本输入</Text>

        <Text style={styles.label}>User 角色上下文（可选）</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={userPrompt}
          onChangeText={setUserPrompt}
          placeholder="可选，用于给模型补充场景信息或语气要求"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Assistant 角色待合成文本</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={assistantText}
          onChangeText={setAssistantText}
          placeholder="这里填写真正要转语音的文本"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>

      {/* Preview */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>最终待合成文本预览</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>
            {finalContent || '等待输入待合成文本...'}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.primaryBtn, synthesizing && styles.btnDisabled]}
          onPress={handleSynthesize}
          disabled={synthesizing}>
          {synthesizing ? (
            <ActivityIndicator color="#fff8ef" size="small" />
          ) : (
            <Icon name="volume-up" size={20} color="#fff8ef" />
          )}
          <Text style={styles.primaryBtnText}>
            {synthesizing ? '合成中...' : '开始合成'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Status */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>返回音频</Text>
          <View style={[styles.statusBadge, {backgroundColor: getStatusBgColor()}]}>
            <Text style={[styles.statusText, {color: getStatusColor()}]}>
              {statusText}
            </Text>
          </View>
        </View>

        {audioPath ? (
          <View style={styles.audioActions}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handlePlayAudio}>
              <Icon
                name={isPlaying ? 'pause' : 'play-arrow'}
                size={20}
                color="#c75d2c"
              />
              <Text style={styles.secondaryBtnText}>
                {isPlaying ? '播放中...' : '播放音频'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {responseMeta ? (
          <View style={[styles.codeBlock, styles.codeBlockSmall]}>
            <Text style={styles.codeText}>{responseMeta}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f0e6',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
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
  codeBlock: {
    backgroundColor: '#261a11',
    borderRadius: 14,
    padding: 14,
    minHeight: 80,
  },
  codeBlockSmall: {
    minHeight: 60,
    marginTop: 12,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#f9e9d5',
    lineHeight: 18,
  },
  actionsRow: {
    marginBottom: 14,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#c75d2c',
    borderRadius: 999,
    padding: 16,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#fff8ef',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff8ef',
    borderRadius: 999,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(169, 96, 49, 0.18)',
  },
  secondaryBtnText: {
    color: '#24170e',
    fontSize: 14,
    fontWeight: '600',
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
  audioActions: {
    flexDirection: 'row',
    gap: 10,
  },
});
