# Japanese Friend App

## 当前状态（2026-03-26）
- Call 页面（`id="pg-call"`）✅ 按 Figma node 5:2 完整重建：街景全幅背景 + 毛玻璃 header + 像素角色画布 + 字幕三段切换（OFF / 日本語 / 双語）+ mute/mic/hangup 三键 + 胶囊输入栏
- Text 页面（`id="pg-text"`）✅ 手账拼贴风格重建：Briefing Bar header（#002FA7 蓝框圆角）+ 气泡错落微旋转 + SVG icon 输入栏（笑脸 + 相机）+ Response Hints 提示胶囊
- Summary 页面（`id="pg-summary"`）✅ 按 Figma 重建：会话回顾 + 记忆卡片 + 日记卡片
- 页面路由 ✅ CHAT WITH ME → mode modal → Video Chat（`go('call')`）/ Text Message（`go('text')`）
- 结束通话 ✅ hangup 按钮 → `endCall()` → save + renderConversationSummary + renderMemoryCard + go('summary')
- 页面显示/隐藏 ✅ 统一由 `.page { display:none }` / `.page.active { display:flex }` 控制（不再有硬编码 display:flex 覆盖）
- Yuki text message ✅ 有上下文，发消息用 Yuki prompt
- Ren / Hana / Mio text message ✅ 开场白显示（调试用 1/2/3），发消息用各自 prompt，标题/头像正确
- JSON 解析正常 ✅
- 词汇点击解析前端代码 ✅（server.js 词汇标记待做）
- Live Shadowing 模块 ✅（Library / Scene / VN / Analysis / Reward 五个视图）
- Immersive Listening 模块 ✅（Listen hub, 场景播放器）
- app.js 拆分完成 ✅（UI / character / Call / Text / Shadow / Listen 均已移到独立模块）
- Friends 页面（`id="pg-friends"`）✅ 按 Figma 重建：剪贴板风格角色卡片（叠放微旋转）+ 软木板装饰区 + Klein blue 波浪底部导航
- Shadow 库页面（`id="pg-shadow"`）✅ 按 Figma node 61:672 重建：Scrapbook Folder 风格 + 每日挑战卡片 + INDEX 标签作品列表
- Shadow 关卡页（`id="pg-shadow-scenes"`）✅ 按 Figma node 75:1268 重建：千と千尋の神隠し 四关卡列表 + 点击展开预览 + EPISODES/GALLERY/ARCHIVE/INFO 底部导航
- Shadow 路由 ✅ 作品卡片点击 → `go('shadow-scenes')`；关卡页返回 → `go('shadow')`

## 文件结构

### [活跃] 现在在用，改动要小心测试
- `index.html` — 主页面，所有页面都在这里
- `server.js` — Node.js 服务器，代理 Anthropic API
- `frontend/src/app.js` — 主逻辑入口；`endCall()` 在此挂载到 window
- `frontend/src/core/router.js` — 页面路由 `go()`
- `frontend/src/core/state.js` — 全局状态 appState
- `frontend/src/features/ui.js` — 星星动画、声波、词汇 tooltip、idol 装饰
- `frontend/src/features/character.js` — 角色切换、drawPixelChar、mode modal
- `frontend/src/features/vocab.js` — 词汇标记解析 parseVocabMarkup
- `frontend/src/pages/Call/Call.js` — 通话消息、开场白、输入绑定
- `frontend/src/pages/Text/Text.js` — 文字聊天 initTextPage / initTextPageForChar
- `frontend/src/pages/Shadow/Shadow.js` — Live Shadowing 完整模块
- `frontend/src/pages/Listen/Listen.js` — Immersive Listening 模块
- `frontend/src/characters/yuki/yuki.config.js` — Yuki 角色配置和 prompt
- `frontend/src/characters/ren/ren.config.js` — Ren 角色配置和 prompt
- `frontend/src/characters/hana/hana.config.js` — Hana 角色配置和 prompt
- `frontend/src/styles/idol-theme.css` — 全局主题样式
- `frontend/src/styles/pages/call.css` — Call 页 + Text 页样式（合并在一个文件）
- `frontend/src/styles/pages/summary.css` — Summary 页样式
- `frontend/src/styles/pages/home.css` — Home 页样式

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
- 跨模块共享状态用 `window.*` globals（避免 ES module 循环引用）
- 对话历史通过 `window._convHistory` 共享（app.js 里的 conversationHistory 同一引用）
- `#pg-call` 是唯一活跃通话页，`id="chat-list"` / `id="call-text-input"` / `id="call-send-btn"` 都在这里
- 页面显示隐藏不要在单独页面 CSS 里写 `display:flex`，统一靠 `.page.active`

## 今日新增功能（2026-04-03）

### Video Call 页 — 语音功能
- 新增 `frontend/src/features/tts.js`：Web Speech API 日语朗读，Yuki 每次回复自动开口说话
- 新增 `frontend/src/features/stt.js`：语音识别模块（continuous 模式，支持长句识别）
- 新增 `frontend/src/features/voiceUI.js`：微信式长按🎤录音 UI，支持波形动画、滑左取消、滑右转文字发送
- 新增 `/api/voice-format` 端点（Haiku）：语音转录后自动添加标点/emoji/语气词，使输入更自然
- 修复 `frontend/src/pages/Call/Call.js`：对话历史正确传递给 Claude API（之前每次都传空数组导致 Yuki 失去上下文）

### 底部导航栏
- 修复 Home 页导航栏样式与其他页面不一致的问题
- 修复 Home 页导航栏需要滚动才出现（改为 sticky 定位）

## 架构重构计划（按优先级 × 风险排序）

> 分三批执行，每批改完测试后再做下一批。window.* 全局挂载暂不动（HTML onclick 依赖），
> 但 bridge.js 会把它们集中到一处，消除散落各模块的问题。

### 第一批（极低风险，一次提交）
| # | 项目 | 说明 |
|---|------|------|
| 1 | `_callHistory` 切页清空 | 现在就在出 bug，快速导航会带着上次历史 |
| 2 | `characters/index.js` 统一 characterMap | 现在 Call.js / Text.js 各写一份，加新角色必须改两处 |
| 3 | `bridge.js` 集中 window.* 挂载 | 纯移动代码，10 行内，让 HTML↔JS 接缝一目了然 |
| 4 | `session.turnCount` 加 reset | Text/Call 共用同一计数器，新对话开始时应归零 |
| 5 | voiceUI overlay 重复 append 防护 | 加存在性检查，防止重复初始化时叠加 DOM |
| 6 | imageInput popup 改成独立实例 | 当前单例共享，三个以上按钮会竞态 |
| 7 | server.js route dispatcher | 纯整理，再加 2-3 个 API 端点前做 |

### 第二批（中风险，改完测所有导航栏页面）
| # | 项目 | 说明 |
|---|------|------|
| 8 | 底部导航 CSS 去重（5份→1份） | 已出过不同步 bug，各页面保留自己的弧度位置差异 |
| 9 | `initTextPage` / `initTextPageForChar` 合并 | 加 `reset` 参数区分，消除职责重叠 |

### 第三批（中高风险，单独提交，改完专测 Summary）
| # | 项目 | 说明 |
|---|------|------|
| 10 | `core/conversationStore.js` 统一三套历史 | **Summary 现在就是错的**：读 `_convHistory` 但 Call 存 `_callHistory`，两套互不通 |

> ⚠️ 第三批注意：三套格式不同（text/content 字段名、role 值 yuki vs assistant），
> 统一时需规范化。改完测试路径：打完电话 → 结束通话 → Summary 对话记录是否正确显示。

### 暂不动的（高风险低收益）
- `window.*` 全局挂载本身不移除——HTML `onclick="endCall()"` 等直接依赖，改了静默失效
- 用 `bridge.js` 集中管理代替彻底清除

---

## 待修复 / 待优化（功能层面）

## 对 Yuki 的待改进项

### 回复节奏 — Streaming 分句（待做）
现在 Yuki 每次回复是完整一句话，活人感不够强。
理想效果：像真实朋友发消息一样，边想边发，分多条短句出现，每条之间随机停顿。
实现方案：server.js 改成 streaming 响应，前端实时接收，遇到句号/换行立刻显示并朗读。
等 Text 页改造完成、功能稳定后再做。

### Prompt 待修复
1. 不要问用户具体地址或隐私信息（如"どこに住んでるの？"）
2. 用户为日语道歉或出错时，要鼓励而不是推脱（不要说"僕、先生じゃないから"）

### TTS 升级路线
- 当前：ElevenLabs v3 + 自建 Yuki 声音 ✅
- 待优化：Call 页考虑换 Flash v2.5（降低延迟），Text 页保留 v3（音质优先）

### 其他待做
- Summary 页面 UI
- Listen 页面 UI
- server.js 加词汇标记
- Ren / Hana / Mio 完整 prompt（开场白改回真实日语，当前调试用 1/2/3）
- Mio 角色 config（当前复用 yukiConfig）
- Yuki 动画（等立绘拆分）

## 稳定存档点（git commits）
- `de69454` — Text message 手账风格 + SVG icon 输入栏完整重建（当前最新）
- `3c5f4ff` — 修复结束按钮跳转 + text/call 页面显示冲突
- `5ead310` — 把新 video call UI 合并到 pg-call，删除多余的 pg-video-call
- `text-video-working` (tag) — text 和 video 均正常，JSON 解析正常
