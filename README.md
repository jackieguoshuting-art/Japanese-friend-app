# Japanese Friend App

## 当前状态（2026-03-25）
- Yuki video call ✅ 有上下文
- Yuki text message ✅ 有上下文，发消息用 Yuki prompt
- Ren / Hana / Mio text message ✅ 开场白显示（调试用 1/2/3），发消息用各自 prompt，标题/头像正确
- JSON 解析正常 ✅
- 蓝白黑主题 idol-theme.css ✅
- 词汇点击解析前端代码 ✅（server.js 词汇标记待做）
- Live Shadowing 模块 ✅（Library / Scene / VN / Analysis / Reward 五个视图）
- Immersive Listening 模块 ✅（Listen hub, 场景播放器）
- app.js 拆分完成 ✅（UI / character / Call / Text / Shadow / Listen 均已移到独立模块）

## 文件结构

### [活跃] 现在在用，改动要小心测试
- `index.html` — 主页面，所有页面都在这里
- `server.js` — Node.js 服务器，代理 Anthropic API
- `frontend/src/app.js` — 主逻辑入口（功能已拆分，只保留初始化和路由）
- `frontend/src/core/router.js` — 页面路由 go()
- `frontend/src/core/state.js` — 全局状态 appState
- `frontend/src/features/ui.js` — 星星动画、声波、词汇 tooltip、idol 装饰
- `frontend/src/features/character.js` — 角色切换、drawPixelChar、mode modal
- `frontend/src/features/vocab.js` — 词汇标记解析 parseVocabMarkup
- `frontend/src/pages/Call/Call.js` — 语音通话消息、开场白、输入绑定
- `frontend/src/pages/Text/Text.js` — 文字聊天 initTextPage / initTextPageForChar
- `frontend/src/pages/Shadow/Shadow.js` — Live Shadowing 完整模块
- `frontend/src/pages/Listen/Listen.js` — Immersive Listening 模块
- `frontend/src/characters/yuki/yuki.config.js` — Yuki 角色配置和 prompt
- `frontend/src/characters/ren/ren.config.js` — Ren 角色配置和 prompt
- `frontend/src/characters/hana/hana.config.js` — Hana 角色配置和 prompt
- `frontend/src/styles/idol-theme.css` — 蓝白黑主题样式

### [预留] 将来会用，现在不要动
- `frontend/src/components/` — 以后加角色卡片、词汇卡片用
- `frontend/src/store/` — 以后多角色状态管理用
- `backend/` — 以后加用户系统、存档功能用

## 开发规则
- 新角色 → `frontend/src/characters/角色名/`
- 新页面逻辑 → `frontend/src/pages/页面名/`
- API 调用 → `frontend/src/services/`
- 样式 → `frontend/src/styles/pages/页面名.css`
- 不要再往 app.js 里加新功能，只修改现有功能
- server.js 只负责转发请求，不包含角色逻辑
- 角色 prompt 全部在各自的 config.js 里
- 每次改完必须 git commit
- 改一个功能测试一个功能，不要同时改多处
- 跨模块共享状态用 window.* globals（避免 ES module 循环引用）
- 对话历史通过 window._convHistory 共享（app.js 里的 conversationHistory 同一引用）

## 待做
- Ren/Hana/Mio 开场白改回真实日语（当前是调试用 1/2/3）
- server.js 加词汇标记指令
- Mio 角色 config（当前复用 yukiConfig）
- 图片/语音功能

## 稳定存档点
- `text-video-working` — text 和 video 均正常，JSON 解析正常
