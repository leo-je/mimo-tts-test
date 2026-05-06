import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Picker} from '@react-native-picker/picker';
import {
  MODEL_OPTIONS,
  VOICE_OPTIONS,
  AUDIO_FORMAT_OPTIONS,
  DEFAULT_CONFIG,
} from '../constants/styles';
import {MiMoConfig} from '../types';
import {useTheme, useThemeManager} from '../theme/ThemeContext';
import {AppTheme} from '../theme/themes';

const STORAGE_KEYS = {
  apiKey: 'mimo-tts-api-key',
  endpoint: 'mimo-tts-endpoint',
  format: 'mimo-tts-format',
  voice: 'mimo-tts-voice',
  model: 'mimo-tts-model',
};

export default function SettingsScreen({navigation}: any) {
  const theme = useTheme();
  const {themeId, setThemeId, presets} = useThemeManager();
  const [config, setConfig] = useState<MiMoConfig>({
    apiKey: '',
    endpoint: DEFAULT_CONFIG.endpoint,
    model: DEFAULT_CONFIG.model,
    audioFormat: DEFAULT_CONFIG.audioFormat,
    voice: DEFAULT_CONFIG.voice,
  });

  useEffect(() => {
    loadConfig();
  }, []);

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

  async function saveConfig() {
    if (!config.apiKey.trim()) {
      Alert.alert('提示', '请填写 API Key');
      return;
    }
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.apiKey, config.apiKey.trim()),
      AsyncStorage.setItem(STORAGE_KEYS.endpoint, config.endpoint.trim()),
      AsyncStorage.setItem(STORAGE_KEYS.format, config.audioFormat),
      AsyncStorage.setItem(STORAGE_KEYS.voice, config.voice),
      AsyncStorage.setItem(STORAGE_KEYS.model, config.model),
    ]);
    Alert.alert('成功', '配置已保存', [
      {text: '确定', onPress: () => navigation.goBack()},
    ]);
  }

  const isVoiceDesign = config.model === 'mimo-v2.5-tts-voicedesign';
  const isVoiceClone = config.model === 'mimo-v2.5-tts-voiceclone';
  const showPresetVoice = config.model === 'mimo-v2.5-tts';

  const styles = makeStyles(theme);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 外观设置 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>外观设置</Text>
        <Text style={styles.label}>配色方案</Text>
        <View style={styles.themeGrid}>
          {presets.map(preset => {
            const active = preset.id === themeId;
            return (
              <TouchableOpacity
                key={preset.id}
                style={[styles.themeItem, active && styles.themeItemActive]}
                onPress={() => setThemeId(preset.id)}>
                <View style={[styles.themeCircle, {backgroundColor: preset.preview}]}>
                  {active && <View style={styles.themeCheck} />}
                </View>
                <Text style={[styles.themeName, active && styles.themeNameActive]}>
                  {preset.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 模型选择 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>模型选择</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={config.model}
            onValueChange={value =>
              setConfig(prev => ({...prev, model: value}))
            }>
            {MODEL_OPTIONS.map(opt => (
              <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </Picker>
        </View>

        {isVoiceDesign && (
          <View style={styles.tipBox}>
            <Text style={styles.tipText}>
              音色设计模式：通过 user message 中的文本描述定制音色，无需预置音色或音频样本。不支持唱歌模式。
            </Text>
          </View>
        )}
        {isVoiceClone && (
          <View style={styles.tipBox}>
            <Text style={styles.tipText}>
              音色复刻模式：在 voice 字段传入 Base64 编码的音频样本（data:mime;base64,...）。不支持唱歌模式。
            </Text>
          </View>
        )}
      </View>

      {/* API 配置 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>API 配置</Text>

        <Text style={styles.label}>API Key</Text>
        <TextInput
          style={styles.input}
          value={config.apiKey}
          onChangeText={text => setConfig(prev => ({...prev, apiKey: text}))}
          placeholder="输入 MIMO_API_KEY"
          placeholderTextColor={theme.textSecondary}
          secureTextEntry
          autoCapitalize="none"
        />

        <Text style={styles.label}>接口地址</Text>
        <TextInput
          style={styles.input}
          value={config.endpoint}
          onChangeText={text => setConfig(prev => ({...prev, endpoint: text}))}
          placeholder="API Endpoint"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
        />
      </View>

      {/* 音频配置 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>音频配置</Text>

        {showPresetVoice && (
          <>
            <Text style={styles.label}>预置音色</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={config.voice}
                onValueChange={value =>
                  setConfig(prev => ({...prev, voice: value}))
                }>
                {VOICE_OPTIONS.map(opt => (
                  <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                ))}
              </Picker>
            </View>
          </>
        )}

        {isVoiceClone && (
          <>
            <Text style={styles.label}>音色样本 (Base64)</Text>
            <TextInput
              style={styles.input}
              value={config.voice}
              onChangeText={text => setConfig(prev => ({...prev, voice: text}))}
              placeholder="data:audio/mpeg;base64,..."
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
            />
          </>
        )}

        <Text style={styles.label}>音频格式</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={config.audioFormat}
            onValueChange={value =>
              setConfig(prev => ({...prev, audioFormat: value}))
            }>
            {AUDIO_FORMAT_OPTIONS.map(opt => (
              <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </Picker>
        </View>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={saveConfig}>
        <Text style={styles.saveBtnText}>保存配置</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    content: {
      padding: 16,
      paddingBottom: 40,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.textPrimary,
      marginBottom: 16,
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
    pickerWrapper: {
      borderWidth: 1,
      borderColor: theme.borderInput,
      borderRadius: 12,
      backgroundColor: theme.surfaceInput,
      overflow: 'hidden',
    },
    tipBox: {
      marginTop: 12,
      padding: 12,
      borderRadius: 10,
      backgroundColor: theme.accentSubtle,
    },
    tipText: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    saveBtn: {
      backgroundColor: theme.accent,
      borderRadius: 999,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    saveBtnText: {
      color: theme.textOnPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
    // ── 主题选择 ──────────────────────────────────────────────
    themeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    themeItem: {
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    themeItemActive: {
      borderColor: theme.accent,
      backgroundColor: theme.accentSubtle,
    },
    themeCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeCheck: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: '#fff',
    },
    themeName: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    themeNameActive: {
      color: theme.accent,
      fontWeight: '700',
    },
  });
}
