// frontend/src/app-namespace.js
// 全局命名空间入口。只有 bridge.js 可以 import 并调用 registerModule。
// 详见 docs/NAMING.md

if (!window.App) window.App = {};

export function registerModule(name, api) {
  window.App[name] = api;
}
