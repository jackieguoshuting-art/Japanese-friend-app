import { TABS, FOOD_ITEMS, DRINK_ITEMS, SNACK_ITEMS, TASK_ITEM_IDS, ALL_ITEMS } from './data.js';
import { go } from '../../core/router.js';

const STAGES = ['shopping', 'checkout', 'summary'];
let _state = null;
let _toastTimer = null;

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandomIds(items, n) {
  const shuffled = shuffle(items);
  return shuffled.slice(0, Math.min(n, shuffled.length)).map(it => it.id);
}

function ensureTabInitialized(tabKey) {
  if (!_state.shuffledByTab[tabKey] || _state.shuffledByTab[tabKey].length === 0) {
    const sourceMap = { food: FOOD_ITEMS, drink: DRINK_ITEMS, snack: SNACK_ITEMS };
    const source = sourceMap[tabKey] || [];
    _state.shuffledByTab[tabKey] = shuffle(source);
    const soldOutCount = Math.random() < 0.5 ? 1 : 2;
    // 品切れ 不包括任务商品(否则用户无法完成任务)
    const eligible = source.filter(it => !TASK_ITEM_IDS.includes(it.id));
    _state.soldOutIdsByTab[tabKey] = pickRandomIds(eligible, soldOutCount);
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
  ensureTabInitialized(_state.activeTab);
}

function findItemById(id) {
  return ALL_ITEMS.find(it => it.id === id);
}

function calcCartTotal() {
  return _state.cart.reduce((sum, id) => {
    const item = findItemById(id);
    return sum + (item ? item.price : 0);
  }, 0);
}

function isCheckoutReady() {
  return TASK_ITEM_IDS.every(id => _state.cart.includes(id));
}

function renderTaskItems() {
  return TASK_ITEM_IDS.map(id => {
    const item = findItemById(id);
    if (!item) return '';
    const inCart = _state.cart.includes(id);
    return `
      <div class="kb-task-item ${inCart ? 'kb-task-item-done' : ''}" data-id="${id}" role="button" tabindex="0">
        <span class="kb-task-emoji">${item.emoji}</span>
        <span class="kb-task-dot">${inCart ? '✓' : '○'}</span>
      </div>
    `;
  }).join('');
}

function setupGridSwipe() {
  const pg = document.getElementById('pg-konbini');
  if (!pg) return;
  const grid = pg.querySelector('.kb-grid');
  if (!grid) return;

  const SWIPE_THRESHOLD = 50;
  let startX = 0, startY = 0;
  let tracking = false;

  function onStart(e) {
    const pt = e.touches ? e.touches[0] : e;
    startX = pt.clientX;
    startY = pt.clientY;
    tracking = true;
  }

  function onEnd(e) {
    if (!tracking) return;
    tracking = false;
    const pt = e.changedTouches ? e.changedTouches[0] : e;
    const dx = pt.clientX - startX;
    const dy = pt.clientY - startY;

    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (Math.abs(dx) < Math.abs(dy)) return;

    const tabs = ['food', 'drink', 'snack'];
    const currentIdx = tabs.indexOf(_state.activeTab);
    let newIdx;
    if (dx < 0) {
      newIdx = (currentIdx + 1) % tabs.length;
    } else {
      newIdx = (currentIdx - 1 + tabs.length) % tabs.length;
    }
    _state.activeTab = tabs[newIdx];
    updateTabsUI();
    renderGrid();
  }

  grid.addEventListener('touchstart', onStart, { passive: true });
  grid.addEventListener('touchend', onEnd, { passive: true });
  grid.addEventListener('mousedown', onStart);
  grid.addEventListener('mouseup', onEnd);
}

function setupTasklistDrag() {
  const pg = document.getElementById('pg-konbini');
  if (!pg) return;
  const list = pg.querySelector('.kb-tasklist');
  const header = pg.querySelector('.kb-tasklist-header');
  if (!list || !header) return;

  let isDragging = false;
  let startX = 0, startY = 0;
  let origX = 0, origY = 0;

  function onDown(e) {
    if (e.target.closest('.kb-tasklist-toggle')) return;
    isDragging = true;
    const pt = e.touches ? e.touches[0] : e;
    startX = pt.clientX;
    startY = pt.clientY;
    const rect = list.getBoundingClientRect();
    const pgRect = pg.getBoundingClientRect();
    origX = rect.left - pgRect.left;
    origY = rect.top - pgRect.top;
    list.style.right = 'auto';
    list.style.left = origX + 'px';
    list.style.top = origY + 'px';
    list.classList.add('kb-tasklist-dragging');
    e.preventDefault();
  }

  function onMove(e) {
    if (!isDragging) return;
    const pt = e.touches ? e.touches[0] : e;
    const dx = pt.clientX - startX;
    const dy = pt.clientY - startY;
    const pgRect = pg.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();

    let newX = origX + dx;
    let newY = origY + dy;

    const maxX = pgRect.width - listRect.width;
    const maxY = pgRect.height - listRect.height;
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));

    list.style.left = newX + 'px';
    list.style.top = newY + 'px';
  }

  function onUp() {
    if (!isDragging) return;
    isDragging = false;
    list.classList.remove('kb-tasklist-dragging');

    // 强制吸附到距离更近的一边
    const pgRect = pg.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    const leftDist = listRect.left - pgRect.left;
    const rightDist = pgRect.right - listRect.right;

    if (leftDist <= rightDist) {
      list.style.left = '0px';
      list.dataset.side = 'left';
    } else {
      list.style.left = (pgRect.width - listRect.width) + 'px';
      list.dataset.side = 'right';
    }
  }

  header.addEventListener('mousedown', onDown);
  header.addEventListener('touchstart', onDown, { passive: false });
  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('mouseup', onUp);
  document.addEventListener('touchend', onUp);
}

function showTaskBubble(taskEl, item) {
  const pg = document.getElementById('pg-konbini');
  if (!pg) return;
  const existing = pg.querySelector('.kb-task-bubble');
  if (existing) existing.remove();

  // 判断任务条在左还是在右
  const tasklist = pg.querySelector('.kb-tasklist');
  const side = tasklist?.dataset.side || 'right';

  // 计算 taskEl 相对 pg 的位置
  const taskRect = taskEl.getBoundingClientRect();
  const pgRect = pg.getBoundingClientRect();
  const emojiCenterY = taskRect.top + taskRect.height / 2 - pgRect.top;

  const bubble = document.createElement('div');
  bubble.className = `kb-task-bubble kb-task-bubble-${side === 'right' ? 'left' : 'right'}`;
  bubble.innerHTML = `<span class="kb-task-bubble-kana">${item.kana}</span><span class="kb-task-bubble-en">${item.en}</span>`;

  // 位置:气泡 y 中心对齐 emoji 中心
  bubble.style.top = emojiCenterY + 'px';

  if (side === 'right') {
    // 任务条贴右 → 气泡向左弹,贴在 taskEl 左边
    const taskLeft = taskRect.left - pgRect.left;
    bubble.style.right = (pgRect.width - taskLeft + 8) + 'px';
    bubble.style.left = 'auto';
  } else {
    // 任务条贴左 → 气泡向右弹,贴在 taskEl 右边
    const taskRight = taskRect.right - pgRect.left;
    bubble.style.left = (taskRight + 8) + 'px';
    bubble.style.right = 'auto';
  }

  pg.appendChild(bubble);

  requestAnimationFrame(() => {
    bubble.classList.add('kb-task-bubble-show');
  });

  setTimeout(() => {
    bubble.classList.remove('kb-task-bubble-show');
    setTimeout(() => bubble.remove(), 250);
  }, 1500);
}

function subtagClass(subtag) {
  const map = {
    '温食': 'warm', 'パン': 'bread', '冷': 'cold', '酒': 'alcohol',
    '菓子': 'snack', '甘味': 'sweet', '生鮮': 'fresh', '雑貨': 'goods',
  };
  return map[subtag] || 'default';
}

function renderCard(item, soldOut) {
  const inCart = _state.cart.includes(item.id);
  const badgeHtml = item.badge
    ? `<span class="kb-badge kb-badge-${item.badge.toLowerCase()}">${item.badge}</span>`
    : '';
  const subtagHtml = `<span class="kb-subtag kb-subtag-${subtagClass(item.subtag)}">${item.subtag}</span>`;
  const soldOutOverlay = soldOut
    ? `<div class="kb-soldout-overlay"><div class="kb-soldout-stamp">品切れ</div></div>`
    : '';
  const checkMark = inCart ? `<span class="kb-card-check">✓</span>` : '';

  const classes = [
    'kb-card',
    soldOut ? 'kb-card-soldout' : '',
    inCart ? 'kb-card-selected' : '',
  ].filter(Boolean).join(' ');

  return `
    <div class="${classes}" data-id="${item.id}">
      ${subtagHtml}
      ${badgeHtml}
      ${checkMark}
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

function updateTabsUI() {
  const pg = document.getElementById('pg-konbini');
  if (!pg) return;
  pg.querySelectorAll('.kb-tab').forEach(btn => {
    btn.classList.toggle('kb-tab-active', btn.dataset.tab === _state.activeTab);
  });
}

function updateCartUI() {
  const pg = document.getElementById('pg-konbini');
  if (!pg) return;

  const count = _state.cart.length;
  const total = calcCartTotal();
  const ready = isCheckoutReady();

  const countEl = pg.querySelector('.kb-checkout-count');
  const totalEl = pg.querySelector('.kb-total-num');
  if (countEl) countEl.innerHTML = `📋 ${count} ITEMS`;
  if (totalEl) totalEl.textContent = `¥${total}`;

  const btn = pg.querySelector('.kb-checkout-btn');
  if (btn) {
    btn.classList.toggle('kb-checkout-btn-disabled', !ready);
    btn.disabled = !ready;
  }

  const badge = pg.querySelector('.kb-cart-badge');
  if (badge) badge.textContent = count;

  // 更新任务条
  const taskItems = pg.querySelectorAll('.kb-task-item');
  taskItems.forEach(el => {
    const id = el.dataset.id;
    const inCart = _state.cart.includes(id);
    el.classList.toggle('kb-task-item-done', inCart);
    const dot = el.querySelector('.kb-task-dot');
    if (dot) dot.textContent = inCart ? '✓' : '○';
  });

  // 3 件齐 → 触发灯光特效(只触发一次)
  const tasklist = pg.querySelector('.kb-tasklist');
  if (tasklist) {
    if (ready && !tasklist.classList.contains('kb-tasklist-ready')) {
      tasklist.classList.add('kb-tasklist-ready');
      setTimeout(() => {
        tasklist.classList.remove('kb-tasklist-pulse');
      }, 2000);
      tasklist.classList.add('kb-tasklist-pulse');
    } else if (!ready) {
      tasklist.classList.remove('kb-tasklist-ready', 'kb-tasklist-pulse');
    }
  }
}

function showToast(msg) {
  const pg = document.getElementById('pg-konbini');
  if (!pg) return;
  let toast = pg.querySelector('.kb-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'kb-toast';
    pg.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('kb-toast-show');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    toast.classList.remove('kb-toast-show');
  }, 2000);
}

function onTabClick(e) {
  const btn = e.target.closest('.kb-tab');
  if (!btn) return;
  const newTab = btn.dataset.tab;
  if (newTab === _state.activeTab) return;
  _state.activeTab = newTab;
  updateTabsUI();
  renderGrid();
}

function onCardClick(e) {
  const card = e.target.closest('.kb-card');
  if (!card) return;
  const id = card.dataset.id;
  if (!id) return;

  const soldOutIds = _state.soldOutIdsByTab[_state.activeTab] || [];
  if (soldOutIds.includes(id)) {
    showToast('売り切れました');
    return;
  }

  const idx = _state.cart.indexOf(id);
  if (idx >= 0) {
    // 移除已选商品(不受上限限制)
    _state.cart.splice(idx, 1);
    card.classList.remove('kb-card-selected');
    const check = card.querySelector('.kb-card-check');
    if (check) check.remove();
  } else {
    // 加入新商品:检查上限
    const CART_LIMIT = 10;
    if (_state.cart.length >= CART_LIMIT) {
      showToast('たくさん選びましたね!');
      return;
    }
    _state.cart.push(id);
    card.classList.add('kb-card-selected');
    if (!card.querySelector('.kb-card-check')) {
      const check = document.createElement('span');
      check.className = 'kb-card-check';
      check.textContent = '✓';
      card.appendChild(check);
    }
  }

  updateCartUI();
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

    <!-- 右侧任务条 -->
    <div class="kb-tasklist" data-collapsed="false" data-side="right">
      <div class="kb-tasklist-header">
        <span class="kb-tasklist-icon">📋</span>
        <button class="kb-tasklist-toggle" type="button" aria-label="toggle">⊖</button>
      </div>
      <div class="kb-tasklist-items">
        ${renderTaskItems()}
      </div>
      <div class="kb-tasklist-ready-badge">準備OK!</div>
    </div>

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

  const backBtn = pg.querySelector('.kb-back');
  if (backBtn) backBtn.addEventListener('click', () => go('scene'));

  const tabsContainer = pg.querySelector('.kb-tabs');
  if (tabsContainer) {
    tabsContainer.addEventListener('click', onTabClick);
  }
  const gridContainer = pg.querySelector('.kb-grid');
  if (gridContainer) {
    gridContainer.addEventListener('click', onCardClick);
  }

  const toggle = pg.querySelector('.kb-tasklist-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const list = pg.querySelector('.kb-tasklist');
      if (!list) return;
      const collapsed = list.dataset.collapsed === 'true';
      list.dataset.collapsed = collapsed ? 'false' : 'true';
      toggle.textContent = collapsed ? '⊖' : '⊕';
    });
  }

  // 拖动
  setupTasklistDrag();
  setupGridSwipe();

  // 点击 emoji 弹气泡
  const taskItemEls = pg.querySelectorAll('.kb-task-item');
  taskItemEls.forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      const item = findItemById(id);
      if (item) showTaskBubble(el, item);
    });
  });
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
