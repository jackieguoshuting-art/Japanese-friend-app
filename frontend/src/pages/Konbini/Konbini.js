import { TABS, FOOD_ITEMS, TASK_ITEM_IDS } from './data.js';

const STAGES = ['shopping', 'checkout', 'summary'];
let _state = null;

function resetState() {
  _state = {
    stage: 'shopping',
    cart: [],
    activeTab: 'food',
    shuffledByTab: {
      food: [...FOOD_ITEMS],   // 1b 先不洗牌,保持原顺序,1c 再洗
      drink: [],
      snack: [],
    },
    soldOutIdsByTab: {
      food: [],
      drink: [],
      snack: [],
    },
    sessionStart: Date.now(),
    dialogHistory: [],
  };
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
    <!-- 背景装饰水印 -->
    <div class="kb-deco-fresh">FRESH!</div>
    <div class="kb-deco-new">NEW</div>
    <div class="kb-deco-sticker kb-sticker-1">🍙</div>
    <div class="kb-deco-sticker kb-sticker-2">🥤</div>
    <div class="kb-deco-sticker kb-sticker-3">✨</div>

    <!-- 顶部区 -->
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

    <!-- STEP 胶囊 -->
    <div class="kb-step-capsule">
      <span class="kb-step-text">STEP 1/3</span>
      <div class="kb-step-bar"><div class="kb-step-bar-fill" style="width:33%"></div></div>
    </div>

    <!-- 主内容 -->
    <main class="kb-main">
      <!-- 标题区 -->
      <div class="kb-title-section">
        <div class="kb-title-sticker">NEW TRAINING</div>
        <h2 class="kb-title-main">コンビニ練習</h2>
        <p class="kb-title-sub">A compact archive of daily Japanese essentials.</p>
      </div>

      <!-- Tab -->
      <div class="kb-tabs">
        ${tabs}
      </div>

      <!-- 货架 -->
      <div class="kb-grid">
        ${cards}
      </div>
    </main>

    <!-- 底部 Checkout Bar -->
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
