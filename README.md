# AI Japanese Friend App — 开发文档

⚠️ 开发前必读:docs/NAMING.md — 命名规范(硬规矩)

## 项目概览
AI 日语学习陪伴 App，用户通过与 AI 角色对话练习日语。
- 位置：~/Desktop/japanese-friend-app
- 启动：npm run dev → http://localhost:3000
- 技术栈：Node.js/Express、原生 JS 前端、Anthropic Claude API、ElevenLabs TTS API、无框架

---

## 文件结构

```
frontend/src/
├── app-namespace.js          # 全局命名空间 window.App 入口
├── core/
│   ├── state.js              # 全局状态 appState
│   ├── storage.js            # 本地存储工具
│   ├── router.js             # 页面路由 go()
│   └── conversationStore.js  # 统一对话历史
├── services/
│   └── claude.service.js     # Claude API 调用（含 529 自动重试）
├── features/
│   ├── topics.js             # 每日话题
│   ├── memory.js             # 角色记忆（按角色分桶，最多12条）
│   ├── chat.js               # fallback 回复、resetSession
│   ├── vocab.js              # 词汇点击翻译
│   ├── tts.js                # ElevenLabs TTS（fallback Web Speech API）
│   ├── stt.js                # 语音识别
│   ├── voiceUI.js            # 微信式长按录音 UI
│   ├── yukiAnimation.js      # Yuki 动画控制（双缓冲，三种情绪模式）
│   ├── imageInput.js         # 图片发送
│   ├── badge.js              # 导航栏未读红点
│   ├── proactiveMessage.js   # 角色主动消息（32小时触发）
│   ├── inAppNotification.js  # App 内通知条
│   └── textHistory.js        # Text 页对话历史持久化
├── characters/
│   ├── index.js              # 统一 characterMap（加新角色只改这里）
│   ├── yuki/yuki.config.js   # Yuki prompt（含 emotion 字段）
│   ├── ren/ren.config.js
│   └── hana/hana.config.js
├── pages/
│   ├── Call/Call.js          # Video call 逻辑
│   ├── Text/Text.js          # Text message 逻辑
│   ├── Shadow/ShadowLive.js  # Shadow 跟读逻辑
│   └── Listen/Listen.js      # Listen 模块
├── bridge.js                 # 统一 window.* 全局接口（HTML onclick 专用）
└── styles/
    └── idol-theme.css        # 全局主题样式

frontend/public/assets/characters/yuki/
├── yuki-idle.png
├── yuki-bg.jpg
└── animations/
    ├── Yuki表情过渡/
    │   ├── idle.webm
    │   ├── happy.webm         # 普通→开心（一次性）
    │   ├── smile.webm         # 普通→微笑（一次性）
    │   ├── surprised.webm     # 普通→惊讶→回普通
    │   ├── shy.webm           # 普通→害羞→回普通
    │   └── lean-smile.webm    # 普通→凑近笑→回普通
    └── Yuki表情单一循环/
        ├── happy-loop.webm
        └── smile-loop.webm
```

---

## 页面状态

| 页面 | 路由 | 状态 |
|------|------|------|
| Home | #pg-home | ✅ 档案卡片，Yuki 证件照，剪贴感样式 |
| Friends/Talk | #pg-friends | ✅ 剪贴板风格，角色卡片 |
| Video Call | #pg-call | ✅ 立绘+背景，字幕，词汇，ElevenLabs TTS，语音输入，情绪动画 |
| Text Message | #pg-text | ✅ 持久化历史，Topic 按钮，主动消息，通知，未读红点 |
| Shadow 主页 | #pg-shadow | ✅ 作品列表，每日挑战 |
| Shadow 关卡 | #pg-shadow-scenes | ✅ 关卡选择 |
| Shadow 跟读 | #pg-shadow-live | ✅ Cinematic UI，视频+录音+KTV字幕 |
| Summary | #pg-summary | ✅ 会话回顾+记忆卡片 |
| Listen | #pg-listen | ⬜ 待做 |

---

## Yuki 动画系统

三种情绪类型：
- **loop**：idle 普通待机循环
- **in-loop**：过渡动画结束后切换循环（happy、smile）
- **once**：播放一次自动回 idle（surprised、shy、lean-smile）

emotion 触发标准（Claude API 返回 emotion 字段）：
- `idle`：默认/普通对话
- `happy`：开心、兴奋、好消息
- `smile`：温柔、轻松、正向
- `surprised`：惊讶、震惊
- `shy`：用户夸奖 Yuki、说喜欢 Yuki
- `lean-smile`：俏皮、撒娇、亲近

临时调试（上线前删除）：
```js
// TODO: remove before production
window.setYukiEmotion = setEmotion;
```

---

## API 接口

| 端点 | 用途 |
|------|------|
| POST /api/chat | Claude 对话（含 529 自动重试） |
| POST /api/tts | ElevenLabs TTS 语音合成 |
| POST /api/voice-format | 语音识别结果润色（Haiku） |

环境变量（.env）：
```
ANTHROPIC_API_KEY=
ELEVENLABS_API_KEY=
YUKI_VOICE_ID=
```

---

## 开发规则

1. 新功能 = 新文件，不碰 app.js
2. 新角色 → `characters/角色名/角色名.config.js`，注册到 `characters/index.js`
3. 禁止在模块文件里直接挂载 `window.*`，统一在 `bridge.js` 声明
4. 新功能禁止新增 `window.*` 挂载
5. 新页面禁止复制底部导航 CSS
6. 每条 Claude Code 指令前缀安全头：
   ```
   Do not rename existing exports, imports, or public function names...
   Keep all existing page behavior working.
   Please do not rewrite unrelated files. Make the smallest safe changes needed.
   ```
7. 改完必须 git commit，回滚用 `git revert HEAD`
8. Commit 信息用中文
9. CSS 前缀、JS 命名空间、localStorage key 前缀、onclick 写法必须遵守 docs/NAMING.md。旧代码后续清理，新代码立刻合规。
10. 新建 frontend/src/pages/<Module>/ 目录必须同时创建 README.md。老模块 README 补齐见"已知技术债"。

## 编码原则（Claude Code 必须遵守）

【架构原则】
- 模块化、组件化：每个功能独立文件，职责单一
- 高内聚低耦合：模块内部紧密，模块之间依赖最少
- 单一职责：一个函数/模块只做一件事

【代码质量】
- 简洁高效，可读性优先
- 禁止过度设计：不要为了"设计感"引入不必要的抽象层
- 禁止兜底代码：不写"万一出错"的冗余保护逻辑
- 禁止冗余代码：没有用到的变量、函数、注释一律不写
- 禁止猜测性代码：不清楚的字段名、接口结构，必须先问清楚再写
- 复杂逻辑必须提取成有意义命名的函数，禁止内联复杂表达式

【遇到不确定的地方】
- 不明白需求 → 先问，不要猜
- 不清楚接口字段 → 先问，不要写一堆猜测性的字段名
- 不确定影响范围 → 先问，不要擅自改动

## 已知技术债（大重构时处理）

【代码层面】
- Call.js 第214行：isJapaneseContent 内联函数可读性差，需提取成独立函数
- Call.js 底部：window.stopSpeaking / resetYukiToIdle / getSessionMemory 未统一到 bridge.js
- window.escapeHtml?.() 防御性调用过多，说明模块依赖关系不清晰，重构时理清

【架构层面】
- conversationStore 三套对话历史未统一（Call/Text/Scene 各自维护）
- Summary 页读不到 Call 历史
- 底部导航 CSS 五份重复，需合并
- window.* 全局挂载未完全统一到 bridge.js
- index.html 内联 onclick 未换成 addEventListener
- 老模块 README.md 未补齐（Call/Text/Shadow/Listen），Commit 3 统一处理
- localStorage key `jfa-memory` 不符合 NAMING.md 的 `<module>-<key>` 规范，应改为 `memory-<characterId>`（涉及老数据迁移，不急）

【上线前必须删除】
- yukiAnimation.js 末尾：window.setYukiEmotion = setEmotion（调试用）

【app.js 大重构专项】（计划在便利店/居酒屋/地铁/Listen 完成后执行）
- Friends/Home/Summary 页面逻辑散在 app.js 里（约 100+ 行），需拆到 pages/Friends/Friends.js、pages/Home/Home.js、pages/Summary/Summary.js
- window.go 被 app.js 底部 monkey patch 用于 proactive message 触发，应移到 router.js 用 lifecycle hook 替代
- window.endCall / window.toggleConvRecap / window.YUKI_SYSTEM_PROMPT 三处违规挂载，应通过 bridge.js 注册到 App namespace
- 10+ 处 window.xxx?.() 防御性调用（spawnStars/animateVoiceBars/setActiveCharacter 等），说明依赖关系不清晰，应改为 ES import

---

## Changelog

### 重构进度

#### 第一批 ✅ 完成（2026-04-03）
- [x] _callHistory 切页清空
- [x] characters/index.js 统一 characterMap
- [x] bridge.js 集中 window.* 挂载
- [x] session.turnCount 加 reset
- [x] voiceUI overlay 重复 append 防护
- [x] imageInput popup 独立实例
- [x] server.js route dispatcher

#### 第二批 ✅ 完成（2026-04-03）
- [x] 底部导航 CSS 去重
- [x] initTextPage 合并（自然解决）

#### 第三批 ⬜ 待做（功能稳定后）
- [ ] conversationStore 统一三套对话历史
- [ ] Summary 页正确读取 Call 历史

### 功能开发记录

| 日期 | 功能 | 状态 |
|------|------|------|
| 2026-04-03 | Video Call 语音输入（长按🎤）| ✅ |
| 2026-04-03 | Web Speech API TTS | ✅ |
| 2026-04-03 | 底部导航栏统一修复 | ✅ |
| 2026-04-04 | ElevenLabs TTS 接入（Yuki 真实声线）| ✅ |
| 2026-04-04 | Text 页完整改造（持久化/Topic/主动消息/通知/红点）| ✅ |
| 2026-04-04 | Home 页 Yuki 证件照 + 剪贴感样式 | ✅ |
| 2026-04-04 | 对话历史上下文修复 | ✅ |
| 2026-04-06 | Yuki 动画系统（双缓冲+三种情绪模式）| ✅ |
| 2026-04-06 | Yuki 视频透明底 MOV→WebM | ✅ |
| 2026-04-06 | emotion 字段接入 yuki.config.js | ✅ |
| 2026-04-13 | Shadow 页 Cinematic UI（Stitch 设计）| ✅ |
| 2026-04-13 | API 529 自动重试 | ✅ |
| 2026-04-14 | Yuki 动画竞态修复（操作队列）| ✅ |
| 2026-04-14 | Shadow Live CSS 冲突修复（旧规则覆盖新设计）| ✅ |
| 2026-04-15 | Shadow Live KTV 字幕重叠修复 + 空蓝框删除 | ✅ |

---

## 待做功能

### 功能层面
- [ ] Listen 页面 UI
- [ ] Onboarding / Profile / Settings 页面(未实现,占位目录已清理)
- [ ] server.js 加词汇标记
- [ ] Ren/Hana/Mio 完整 prompt（当前调试用 1/2/3）
- [ ] Mio 角色 config（当前复用 yukiConfig）
- [ ] Shadow 音轨分离（对话+背景音乐分开）
- [ ] Shadow 录音降噪
- [ ] ElevenLabs TTS 优化：Call 页换 Flash v2.5
- [ ] Yuki streaming 分句回复
- [ ] 图片发送完善

### Shadow 跟读页 — 待做优化
- [ ] KTV字幕蓝色高亮和浅灰色文字没对齐，有重影问题
- [ ] KTV字幕需要和台词同步播放完（真正的KTV逐字填充效果，字幕随时间进度填满）
- [ ] 音频视频背景音分离（对话音轨+背景音乐分开，用户声音完美嵌入）
- [ ] 按钮大小排版及动效优化（底部三键大小比例、录音键最大、点击动效）
- [ ] 右上角"1/4"按钮换成白天/黑夜模式切换按钮
  - 黑夜模式：现有深色风格（默认）
  - 白天模式：背景变白色，字幕变黑色，其余布局不变

### Yuki Prompt 待修复
- [ ] 不要问用户地址或隐私信息
- [ ] 用户日语出错时鼓励，不要推脱

### 画师素材待完成
- [ ] Yuki 情绪动画补全（happy-in、smile-in 过渡视频）
- [ ] Ren/Hana/Mio 立绘和动画

---

## 规划中的模块（未建，有需要再创建）

### 数据层 - store/
- 用户状态（user.store.js）— 登录、档案、streak
- 聊天状态（chat.store.js）— 统一对话历史（见已知技术债）
- 设置（settings.store.js）— 主题、语速、字幕开关

### 工具层 - utils/
- 日期格式化（date.js）
- 日语文本处理（japanese.js）— 假名/汉字/罗马字转换
- 日志（logger.js）— 统一打点
- 校验（validators.js）
- 动画工具（animations.js）
- 通用 helpers（helpers.js）

### 可复用组件 - components/
- CharacterCard — 角色卡片（Friends 页）
- SubtitleBar — 字幕条（Call 页）
- WaveVisualizer — 语音波形
- MemoryChip — 记忆胶囊（Summary 页）
- LoadingScreen — 加载页

### 主题系统 - styles/themes/
- default.css / dark.css 当前仅占位，未来接入主题切换时填充

---

## 重构计划（Listen 页做完后执行）

1. conversationStore 统一历史
2. 清理 `window.*` 挂载
3. 底部导航 CSS 合并
4. index.html 内联 onclick → addEventListener
5. server.js 路由层拆分
