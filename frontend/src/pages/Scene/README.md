# Scene 模块(场景地图)

## 功能
东京场景选择地图。用户在地图上看到三栋建筑贴纸(车站/居酒屋/便利店),
点击建筑或热点文字弹出 popup,点 "ENTER ARCHIVE" 进入对应的情境对话页。

## 文件结构
- `Scene.js` — 地图 + 可拖动平移 + 建筑贴纸定位 + popup 交互,约 302 行

样式在 `frontend/src/styles/pages/scene.css`(不在本目录)。

## 对外入口
无 export,无 window.* 挂载。
文件通过 `DOMContentLoaded` 自启,内部函数全部封装。
用户点 popup 的 "ENTER ARCHIVE" 按钮时调用全局 `go(route)` 跳转到场景页。

## 路由出口(三个)
- `go('transit')` — 地铁场景(未实现)
- `go('izakaya')` — 居酒屋场景(未实现)
- `go('konbini')` — 便利店场景(未实现,下一个要做的功能)

## localStorage keys
无。

## 后端 API 调用
无。Scene 只是地图入口,对话发生在下游 konbini/izakaya/transit 页。

## 依赖的 features/
无。完全自包含。

## 核心数据(硬编码在 Scene.js 顶部)
- `BUILDING_DEFS` — 三栋建筑在 5116×5120 地图底图上的像素坐标 + 显示尺寸
- `ORIG_W = 5116` / `ORIG_H = 5120` — 地图底图原始尺寸
- `SCENES` — 三个场景的元数据(titleJa / titleEn / desc / stars / route)

## 地图资源
- `frontend/public/assets/backgrounds/tokyo-scene-bg.jpg` — 东京地图底图
- `frontend/public/assets/backgrounds/station.png` — 车站建筑贴纸(带白描边)
- `frontend/public/assets/backgrounds/izakaya.png` — 居酒屋建筑贴纸
- `frontend/public/assets/backgrounds/minimart.png` — 便利店建筑贴纸

## 已知限制
- 三张贴纸 PNG 是 JPEG 伪装(无真正 alpha 通道),目前靠"贴纸本身画了白描边"掩盖,未来 Figma 源文件重新导出真 RGBA PNG 会更干净
- 源代码用 `var` 而非 `const`/`let`,未来可统一
