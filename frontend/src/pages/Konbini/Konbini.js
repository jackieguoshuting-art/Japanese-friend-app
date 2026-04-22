// Konbini(便利店)主入口
// 状态机:shopping / checkout / summary 三个 stage
// 各 stage 详情由对应文件负责,这里只管状态和 stage 切换

const STAGES = ['shopping', 'checkout', 'summary'];
let _state = null;

function resetState() {
  _state = {
    stage: 'shopping',
    cart: [],
    activeTab: 'food',   // 默认选中 フード Tab
    shuffledByTab: {},   // { food: [...], drink: [...], snack: [...] }
    soldOutIdsByTab: {}, // 同上,每个 tab 随机 1-2 件品切れ
    sessionStart: Date.now(),
    dialogHistory: [],
  };
}

function initKonbini() {
  const pg = document.getElementById('pg-konbini');
  if (!pg) return;
  resetState();
  pg.dataset.stage = _state.stage;
  pg.innerHTML = '<div style="padding:40px;text-align:center;color:var(--kb-muted);font-family:var(--kb-font);">Konbini — 里程碑 1a 架子已就位<br><small>data.js 包含 27 件商品</small></div>';
}

function setStage(newStage) {
  if (!STAGES.includes(newStage)) return;
  _state.stage = newStage;
  const pg = document.getElementById('pg-konbini');
  if (pg) pg.dataset.stage = newStage;
}

function getState() {
  return _state;
}

window.addEventListener('page:enter', (e) => {
  if (e.detail?.pageName === 'konbini') {
    initKonbini();
  }
});

export { initKonbini, setStage, getState };
