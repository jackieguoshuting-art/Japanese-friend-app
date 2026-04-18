# 命名规范(硬规矩)

本文档所有规则为强制规矩。新写代码必须遵守。

## 1. CSS 类名前缀

每个页面/模块用固定前缀,避免样式污染。

| 模块 | 前缀 |
|---|---|
| Home | `.hm-` |
| Friends | `.fr-` |
| Call(视频通话) | `.vc-` |
| Text(文字聊天) | `.txt-` |
| Shadow 主页 | `.sdw-` |
| Shadow Live | `.slv-` |
| Shadow Scenes | `.scs-` |
| Summary | `.sum-` |
| Listen | `.ls-` |
| Scene 地图 | `.scene-` |
| Konbini 便利店 | `.kb-` |
| Izakaya 居酒屋 | `.iz-` |
| Transit 地铁 | `.tr-` |

规则:
- 新模块 CSS 必须用专属前缀
- 同一模块内 CSS 只能写在 `frontend/src/styles/pages/<module>.css` 一个文件
- 禁止跨模块选择器

## 2. JavaScript 命名空间

### 2.1 全局挂载统一用 `window.App.<module>.<action>()`

HTML `onclick` 调用的函数,必须通过 bridge.js 调用 `registerModule()` 挂到 `window.App` 下。

严禁:
- 在模块文件里直接写 `window.xxx = ...`
- 在模块文件里 import registerModule(只有 bridge.js 可以 import)

正确流程:
1. 模块文件 export 函数
2. bridge.js import 这些函数
3. bridge.js 调用 `registerModule('konbini', { addToCart, ... })`
4. HTML 用 `onclick="App.konbini.addToCart('onigiri')"`

### 2.2 模块内函数一律 export

模块之间互调用 ES Module import/export,不走 window。

### 2.3 现有 `window.go()` 例外

路由函数历史遗留保留,新模块不要再新增根挂载。

## 3. localStorage key 前缀

所有 localStorage key 必须用 `<module>-<key>` 格式。

| 模块 | 示例 |
|---|---|
| Konbini | `konbini-points` |
| Izakaya | `izakaya-visits` |
| Transit | `transit-lines-learned` |
| Character memory | `character-memory-<charId>` (现有) |
| Text history | `text-history-<charId>` (现有) |

## 4. HTML onclick 规则

- 新写 HTML onclick 必须用 `App.xxx.yyy()`
- 旧 HTML onclick 见 README "已知技术债",后续统一清理
- 严禁写新的根挂载 onclick

## 5. 模块目录内必须有 README.md

**新建** `frontend/src/pages/<Module>/` 目录时必须同时创建 README.md,说明:

- 此模块做什么
- 文件结构及职责
- 对外暴露的入口(App.<module>.xxx)
- 使用的 localStorage key
- 使用的 Claude API 端点及自定义 system prompt

**现有老模块**(Call/Text/Shadow/Listen 等)的 README.md 属于技术债,
见 README "已知技术债" 章节,后续 Commit 3 补齐。
