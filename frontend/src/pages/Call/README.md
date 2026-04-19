# Call 模块(视频通话)

## 功能
用户和 AI 角色(Yuki/Ren/Hana/Mio)进行视频通话式对话练习。
背景立绘、字幕条、语音输入、ElevenLabs TTS、情绪动画、图片发送。

## 文件结构
- `Call.js` — 主逻辑,约 300 行

## 对外入口(export)
通过 `bridge.js` 挂到 `window.*` 上供 HTML onclick 使用:
- `appendChatMessage(role, ja, en, id)` — 向字幕区追加一条消息
- `triggerOpeningMessage()` — 进入 Call 时触发角色开场白
- `initCallInput()` — 初始化输入框/发送按钮/语音按钮/图片按钮
- `applyCallCaptionMode()` — 应用当前字幕显示模式
- `getCallCaptionMode()` — 读取当前字幕模式
- `toggleCallCaptionMode()` — 切换 "日本語のみ" / "雙語"

## localStorage keys
- `callCaptionMode` — 字幕模式("bilingual" | "ja-only")
- `yukiOpeningHistory` — Yuki 最近 7 次开场白索引(避免重复)

⚠️ 这两个 key 不符合 NAMING.md 的 `<module>-<key>` 规范,未来迁移为 `call-caption-mode` / `call-yuki-opening-history`。

## 后端 API 调用
- `POST /api/chat` — 主对话
- `POST /api/tts`(通过 features/tts.js)— ElevenLabs 语音合成

## 依赖的 features/
- `tts.js` — speakJapanese / stopSpeaking
- `yukiAnimation.js` — initYukiAnimation / setEmotion / resetToIdle / onUserSpeak
- `voiceUI.js` — 长按录音
- `imageInput.js` — 图片发送
- `topics.js` — 每日话题
- `memory.js` — 角色记忆
- `chat.js` — buildPrompt / getRandomFallbackReply / resetSession

## 依赖的 services/
- `claude.service.js` — getClaudeReply

## 违规挂载(已知技术债)
以下三个函数挂在模块底部,不在 `bridge.js`,违反 NAMING.md 第 2.1 条:
- `window.stopSpeaking`
- `window.resetYukiToIdle`
- `window.getSessionMemory`

未来 app.js 大重构时一起清理。
