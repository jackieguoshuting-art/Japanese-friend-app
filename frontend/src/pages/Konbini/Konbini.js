import { TABS, FOOD_ITEMS, DRINK_ITEMS, SNACK_ITEMS, TASK_ITEM_IDS } from './data.js';

const STAGES = ['shopping', 'checkout', 'summary'];
let _state = null;

// === 工具:洗牌(Fisher-Yates)===
function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// === 工具:从数组里随机选 N 个 id ===
function pickRandomIds(items, n) {
  const shuffled = shuffle(items);
  return shuffled.slice(0, Math.min(n, shuffled.length)).map(it => it.id);
}

// === 确保 Tab 已初始化(第一次访问时洗牌 + 随机品切れ)===
function ensureTabInitialized(tabKey) {
  if (!_state.shuffledByTab[tabKey] || _state.shuffledByTab[tabKey].length === 0) {
    const sourceMap = { food: FOOD_ITEMS, drink: DRINK_ITEMS, snack: SNACK_ITEMS };
    const source = sourceMap[tabKey] || [];
    _state.shuffledByTab[tabKey] = shuffle(source);
    const soldOutCount = Math.random() < 0.5 ? 1 : 2;
    _state.soldOutIdsByTab[tabKey] = pickRandomIds(source, soldOutCount);
  }
}

function resetState() {
  _state = {
    stage: 'shopping',
    cart: [],
    activeTab: 'food',
    shuffledByTab: { food: [], drink: [], snack: [] },
    soldOutIdsByTab: { food: [], drink: [], snack: [] },
    sessionStart: Date.now(),
    dialogHistory: [],
  };
  // 进店立即初始化默认 Tab
  ensureTabInitialized(_state.activeTab);
}

// === 渲染卡片(静态,不能点击) ===
function renderCard(item, soldOut) {
  const badgeHtml = item.badge
    ? `<span class="kb-badge kb-badge-${item.badge.toLowerCase()}">${item.badge}</span>`
    : '';
  const subtagHtml = `<span class="kb-subtag kb-subtag-${subtagClass(item.subtag)}">${item.subtag}</span>`;
  const soldOutOverlay = soldOut
    ? `<div class="kb-soldout-overlay"><div class="kb-soldout-stamp">品切れ</div></div>`
    : '';
  return `
    <div class="kb-card ${soldOut ? 'kb-card-soldout' : ''}" data-id="${item.id}">
      ${subtagHtml}
      ${badgeHtml}
      ${soldOutOverlay}
      <div class="kb-card-emoji">${item.emoji}</div>
      <div class="kb-card-body">
        <span class="kb-card-kana">${item.kana}</span>
        <h3 class="kb-card-en">${item.en}</h3>
      </div>
      <div class="kb-card-price">¥${item.price}</div>
    </div>
  `;
}

function subtagClass(subtag) {
  const map = {
    '温食': 'warm',
    'パン': 'bread',
    '冷': 'cold',
    '酒': 'alcohol',
    '菓子': 'snack',
    '甘味': 'sweet',
    '生鮮': 'fresh',
    '雑貨': 'goods',
  };
  return map[subtag] || 'default';
}

// === 只重新渲染货架区(Tab 切换时调用) ===
function renderGrid() {
  const pg = document.getElementById('pg-konbini');
  if (!pg) return;
  const grid = pg.querySelector('.kb-grid');
  if (!grid) return;

  ensureTabInitialized(_state.activeTab);
  const items = _state.shuffledByTab[_state.activeTab];
  const soldOutIds = _state.soldOutIdsByTab[_state.activeTab];
  grid.innerHTML = items.map(it => renderCard(it, soldOutIds.includes(it.id))).join('');
}

// === 更新 Tab 选中状态 ===
function updateTabsUI() {
  const pg = document.getElementById('pg-konbini');
  if (!pg) return;
  pg.querySelectorAll('.kb-tab').forEach(btn => {
    btn.classList.toggle('kb-tab-active', btn.dataset.tab === _state.activeTab);
  });
}

// === Tab 点击 handler ===
function onTabClick(e) {
  const btn = e.target.closest('.kb-tab');
  if (!btn) return;
  const newTab = btn.dataset.tab;
  if (newTab === _state.activeTab) return;
  _state.activeTab = newTab;
  updateTabsUI();
  renderGrid();
}

// === 主渲染 ===
function renderShopping() {
  const tabs = TABS.map(t => `
    <button class="kb-tab ${_state.activeTab === t.key ? 'kb-tab-active' : ''}" data-tab="${t.key}">
      ${t.emoji} ${t.label}
    </button>
  `).join('');

  const items = _state.shuffledByTab[_state.activeTab] || [];
  const soldOutIds = _state.soldOutIdsByTab[_state.activeTab] || [];
  const cards = items.map(it => renderCard(it, soldOutIds.includes(it.id))).join('');

  return `
    <div class="kb-deco-fresh">FRESH!</div>
    <div class="kb-deco-new">NEW</div>
    <div class="kb-deco-sticker kb-sticker-1">🍙</div>
    <div class="kb-deco-sticker kb-sticker-2">🥤</div>
    <div class="kb-deco-sticker kb-sticker-3">✨</div>

    <header class="kb-header">
      <button class="kb-back">
        <span class="kb-back-arrow">←</span>
      </button>
      <h1 class="kb-header-title">コンビニ</h1>
      <div class="kb-cart-icon">
        🛒
        <span class="kb-cart-badge">0</span>
      </div>
    </header>

    <div class="kb-step-capsule">
      <span class="kb-step-text">STEP 1/3</span>
      <div class="kb-step-bar"><div class="kb-step-bar-fill" style="width:33%"></div></div>
    </div>

    <main class="kb-main">
      <div class="kb-title-section">
        <div class="kb-title-sticker">NEW TRAINING</div>
        <h2 class="kb-title-main">コンビニ練習</h2>
        <p class="kb-title-sub">A compact archive of daily Japanese essentials.</p>
      </div>

      <div class="kb-tabs">
        ${tabs}
      </div>

      <div class="kb-grid">
        ${cards}
      </div>
    </main>

    <div class="kb-checkout-bar">
      <div class="kb-checkout-info">
        <span class="kb-checkout-count">📋 0 ITEMS</span>
        <span class="kb-checkout-total">TOTAL <span class="kb-total-num">¥0</span></span>
      </div>
      <button class="kb-checkout-btn kb-checkout-btn-disabled" disabled>
        レジへ行く 🛒
      </button>
    </div>
  `;
}

function initKonbini() {
  const pg = document.getElementById('pg-konbini');
  if (!pg) return;
  resetState();
  pg.dataset.stage = _state.stage;
  pg.innerHTML = renderShopping();

  // 绑定 Tab 点击事件(事件委托)
  const tabsContainer = pg.querySelector('.kb-tabs');
  if (tabsContainer) {
    tabsContainer.addEventListener('click', onTabClick);
  }
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
