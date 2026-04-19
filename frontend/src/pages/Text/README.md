# Text 模块(文字聊天)

## 功能
用户和 AI 角色通过文字消息练习日语。类似 LINE/iMessage 风格。
持久化历史、话题按钮、角色主动消息、图片发送、词汇点击翻译。

## 文件结构
- `Text.js` — 主逻辑,约 324 行

## 对外入口(export)
通过 `bridge.js` 挂到 `window.*`:
- `initTextPage()` — 初始化输入框和发送逻辑
- `initTextPageForChar()` — 切换角色时重新初始化整个页面(头像、历史、主动消息)

## localStorage keys
不直接写,通过 `features/textHistory.js` 代理。

## 后端 API 调用
- `POST /api/chat` — 主对话(支持 image + text 多模态)

## 依赖的 features/
- `textHistory.js` — getTextHistory / appendTextHistory(对话历史持久化)
- `memory.js` — 角色记忆,注入 system prompt
- `proactiveMessage.js` — 32 小时未互动触发角色主动开口
- `badge.js` — hideTalkBadge(清除未读红点)
- `imageInput.js` — 图片发送
- `chat.js` — resetSession

## 违规挂载(已知技术债)
- `window._textSend` 挂在 initTextPage 末尾(第 229 行附近),违反 NAMING.md 第 2.1 条。

## 已知限制
- Topic 按钮用硬编码 15 条日语短句,未来可以和 `features/topics.js` 整合
