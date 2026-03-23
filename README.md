# Japanese Friend App

## 当前状态
- Yuki video call ✅ 有上下文
- Yuki text message ✅ 有上下文
- JSON 解析正常 ✅
- 蓝白黑主题 idol-theme.css ✅
- 词汇点击解析前端代码 ✅（server.js 词汇标记待做）

## 文件结构

### [活跃] 现在在用，改动要小心测试
- `index.html` — 主页面，所有页面都在这里
- `server.js` — Node.js 服务器，代理 Anthropic API
- `frontend/src/app.js` — 主逻辑，目前所有功能都在这里
- `frontend/src/characters/yuki/yuki.config.js` — Yuki 角色配置和 prompt
- `frontend/src/styles/idol-theme.css` — 蓝白黑主题样式

### [预留] 将来会用，现在不要动
- `frontend/src/pages/` — 第二步拆 app.js 时用
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

## 待做
- server.js 加词汇标记指令
- Ren/Hana/Mio 完整 prompt
- 图片/语音功能
- 第二步：把 app.js 按功能拆分到 pages/ 和 services/

## 稳定存档点
- `text-video-working` — text 和 video 均正常，JSON 解析正常
