# MiMo TTS Test

小米 MiMo TTS v2.5 移动端测试工具，基于 React Native 构建，可在 Android 设备上快速测试 MiMo 语音合成 API 的全部能力。

---

## 功能特性

- **三模型支持**：`mimo-v2.5-tts`（预置音色）、`mimo-v2.5-tts-voicedesign`（音色设计）、`mimo-v2.5-tts-voiceclone`（音色复刻）
- **9 种预置音色**：冰糖、茉莉、苏打、白桦、Mia、Chloe、Milo、Dean 等
- **28 种整体风格**：基础情绪、复合情绪、语调、音色定位、人设腔调、方言、角色扮演、唱歌
- **32 种细粒度音频标签**：语速节奏、情绪状态、语音特征、哭笑表达，支持光标位置精确插入
- **12 个测试模板**：覆盖发布会主持、角色扮演、方言播报、唱歌、导演模式、音色设计等场景
- **播放控制**：合成完成后支持播放 / 暂停 / 继续 / 停止，状态实时反馈
- **请求日志**：提交的完整 JSON 请求体可直接查看，方便调试
- **配置持久化**：API Key、模型、音色等设置通过 AsyncStorage 本地保存

---

## 项目结构

```
mimo-tts-test/
├── App.tsx                        # 入口，导航配置
├── src/
│   ├── types/index.ts             # TypeScript 类型定义
│   ├── constants/
│   │   ├── styles.ts              # 模型、音色、风格、标签选项
│   │   └── templates.ts           # 12 个测试模板
│   ├── services/
│   │   └── MiMoTTSService.ts      # API 请求构建与调用
│   └── screens/
│       ├── HomeScreen.tsx          # 主界面：输入、合成、播放
│       └── SettingsScreen.tsx      # 设置界面：API Key、模型、音色配置
├── android/
│   └── app/src/main/java/com/mimottstest/
│       ├── AudioPlayerModule.kt    # 原生音频播放模块（Android MediaPlayer）
│       └── AudioPlayerPackage.kt   # React Native 原生模块注册
└── package.json
```

---

## 快速开始

### 环境要求

- Node.js >= 20
- React Native CLI 环境（Android SDK、Gradle）
- Android 真机或模拟器

### 安装依赖

```bash
npm install
```

### 启动 Metro 并安装到设备

```bash
# 终端 1：启动 Metro
npx react-native start

# 终端 2：安装并运行
npx react-native run-android
```

### 配置 API Key

1. 打开应用，点击右上角齿轮图标进入设置
2. 填入 MiMo TTS API Key
3. 选择模型和音色，点击保存

---

## 使用说明

### 基本流程

1. 在设置页配置 API Key 和模型
2. 在主页选择测试模板，或手动输入文本
3. 可选：点击风格标签或插入音频标签
4. 点击「合成」按钮发起请求
5. 合成成功后使用底部播放按钮控制播放

### 风格标签

整体风格以 `（风格1 风格2）` 前缀拼接在正文开头，如：

```
(开心 温柔)各位来宾，晚上好……
```

### 细粒度音频标签

音频标签以 `[标签]` 格式插入正文任意位置，如：

```
[深呼吸]今天终于准备好了[激动]要跟大家见面了……
```

点击输入框中的文本定位光标，再点击「插入标签」按钮选择标签即可在光标处插入。

### Voice 与 User Prompt 互斥

当填写了「User 指令」（风格描述）时，系统会自动忽略预置音色字段，避免 API 冲突。`voicedesign` 模型同理。

---

## 音频播放实现

播放基于 Android 原生 `MediaPlayer`，通过 Kotlin 原生模块桥接到 React Native：

```
HomeScreen → NativeModules.AudioPlayer.play(path, promise)
                                      .pause(promise)
                                      .resume(promise)
                                      .stop(promise)
```

合成完成后 Base64 音频写入本地缓存文件，原生模块读取文件路径进行播放。

---

## API 请求格式

```json
{
  "model": "mimo-v2.5-tts",
  "messages": [
    {"role": "user", "content": "风格指令（可选）"},
    {"role": "assistant", "content": "(开心)[深呼吸]要合成的文本内容"}
  ],
  "audio": {
    "format": "wav",
    "voice": "冰糖"
  }
}
```

**注意事项**：

- `voice` 字段在 `voicedesign` 模型下不发送
- 当 `user` 消息非空时，`voice` 字段不发送（避免冲突）
- `format` 支持 `wav` 和 `pcm16`

---

## 技术栈

| 用途 | 技术 |
|------|------|
| 框架 | React Native 0.83.1 |
| 语言 | TypeScript / Kotlin |
| 导航 | @react-navigation/stack |
| 状态持久化 | @react-native-async-storage |
| 文件系统 | react-native-fs |
| 音频播放 | Android MediaPlayer（原生模块） |
| 图标 | Material Icons |

---

## 相关文档

- [MiMo TTS v2.5 API 文档](https://platform.xiaomimimo.com/docs/zh-CN/usage-guide/speech-synthesis-v2.5)
- 本地文档：`2.5.md`

---

## 待实现功能

- [ ] 音色复刻（VoiceClone）：支持上传/录制音频样本进行音色克隆

## 致谢

项目部分元素内容参考了 [sonicmingit/xiaomitts](https://github.com/sonicmingit/xiaomitts)。

## License

MIT
