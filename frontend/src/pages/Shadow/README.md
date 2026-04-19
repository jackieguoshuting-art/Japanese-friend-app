# Shadow 模块(影视跟读)

## 功能
用户看动画/日剧片段,跟着录音练发音,对比原声做"回声式"跟读。
三层结构:故事列表 → 关卡选择(scenes)→ 跟读实况(live)。

## 文件结构
- `Shadow.js` — 主列表页 + 关卡选择,约 544 行
- `ShadowLive.js` — 跟读实况页(视频+录音+KTV字幕),约 528 行

## 对外入口(通过挂 window.*)
Shadow.js 挂了 11 个:
- `window.shadowStartDaily` — 启动每日挑战
- `window.shadowRetry` — 重录一次
- `window.shadowResume` — 继续上次未完成
- `window.shadowPlaySlow` — 慢速播放示范
- `window.shadowPlayLine` — 播放单行台词
- `window.shadowToggleRecord` — 开始/结束录音
- `window.shadowNextScene` — 下一幕
- `window.shadowContinueScene` — 继续当前幕
- `window.shadowGoLib` — 返回故事列表
- `window.shadowRewardPlay` — 奖励页播放
- `window.shadowOpenStory(storyId)` — 进入某个故事

ShadowLive.js 挂了 1 个:
- `window.shadowJumpToLine(lineIndex)` — 跳到某行台词

## localStorage keys
- `shadowProgress` — 每个故事/关卡完成状态 JSON

⚠️ key 建议改为 `shadow-progress`,NAMING.md 推荐短横线格式,但不紧急。

## 后端 API 调用
无。Shadow 是**纯前端功能**,不调 `/api/chat`。视频和音频资源是静态文件(在 `frontend/public/assets/shadow/` 下)。

## 依赖的 features/
无 import。Shadow 完全自包含。

## 违规挂载(已知技术债)
12 个 `window.shadow*` 函数全部挂在模块底部,违反 NAMING.md 第 2.1 条。
由于这些被 `index.html` 里的 onclick 大量使用,迁移到 `window.App.shadow.*` 需要同时改 HTML。
计划在"旧 HTML onclick → App namespace 统一迁移"时一起处理。

## 已知限制
- KTV 字幕同步不完美(见 README 主"Shadow 跟读页 - 待做优化")
- 音轨未分离(对话+BGM 混合,导致用户录音叠在 BGM 上)
- 未支持白天/黑夜模式切换
