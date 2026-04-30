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
import {VOICE_OPTIONS, AUDIO_FORMAT_OPTIONS, DEFAULT_CONFIG} from '../constants/styles';
import {MiMoConfig} from '../types';

const STORAGE_KEYS = {
  apiKey: 'mimo-tts-api-key',
  endpoint: 'mimo-tts-endpoint',
  format: 'mimo-tts-format',
  voice: 'mimo-tts-voice',
};

export default function SettingsScreen({navigation}: any) {
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
    ]);
    Alert.alert('成功', '配置已保存', [
      {text: '确定', onPress: () => navigation.goBack()},
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>API 配置</Text>

        <Text style={styles.label}>API Key</Text>
        <TextInput
          style={styles.input}
          value={config.apiKey}
          onChangeText={text => setConfig(prev => ({...prev, apiKey: text}))}
          placeholder="输入 MIMO_API_KEY"
          secureTextEntry
          autoCapitalize="none"
        />

        <Text style={styles.label}>接口地址</Text>
        <TextInput
          style={styles.input}
          value={config.endpoint}
          onChangeText={text => setConfig(prev => ({...prev, endpoint: text}))}
          placeholder="API Endpoint"
          autoCapitalize="none"
        />

        <Text style={styles.label}>模型</Text>
        <TextInput
          style={[styles.input, styles.inputReadonly]}
          value={config.model}
          editable={false}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>音频配置</Text>

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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(63, 45, 28, 0.12)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#24170e',
    marginBottom: 16,
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
  inputReadonly: {
    backgroundColor: 'rgba(230, 220, 210, 0.5)',
    color: '#6b5646',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: 'rgba(63, 45, 28, 0.22)',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 252, 248, 0.92)',
    overflow: 'hidden',
  },
  saveBtn: {
    backgroundColor: '#c75d2c',
    borderRadius: 999,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#fff8ef',
    fontSize: 16,
    fontWeight: '700',
  },
});
