// Konbini Summary 页渲染
// 接收参数: { cart, total, history }

function extractExpressions(history) {
  const clerkLines = history
    .filter(m => m.role === 'clerk')
    .map(m => m.ja)
    .filter(Boolean);
  const unique = [...new Set(clerkLines)];
  const excludePatterns = [
    'ではこちらでよろしいでしょうか',
    'かしこまりました、どうぞごゆっくり',
  ];
  const filtered = unique.filter(line => {
    if (line.length < 8) return false;
    if (excludePatterns.some(p => line.includes(p))) return false;
    return true;
  });
  return filtered.slice(0, 3);
}

const EXPRESSION_TRANSLATIONS = {
  'いらっしゃいませ': 'Welcome to the store',
  '温めますか': 'Would you like it heated?',
  'おつけしますか': 'Would you like it added?',
  '袋はご利用': 'Do you need a bag?',
  'ポイントカード': 'Do you have a point card?',
  'お会計': 'Your total is',
  'ありがとうございました': 'Thank you, please come again',
  '以上でよろしい': 'Is that everything?',
  'お支払い方法': 'How will you pay?',
};

function getRoughTranslation(ja) {
  for (const [key, val] of Object.entries(EXPRESSION_TRANSLATIONS)) {
    if (ja.includes(key)) return val;
  }
  return '';
}

function renderItemIcon(item) {
  if (item.imageUrl) {
    return `<img src="${item.imageUrl}" alt="${item.ja}" class="kb-receipt-item-img" />`;
  }
  return `<span class="kb-receipt-item-emoji">${item.emoji || '🍱'}</span>`;
}

export function renderSummary(container, { cart, total, history }) {
  console.log('[konbini-2d] renderSummary:', { cartLength: cart.length, total });

  const earnedPts = 20;
  const storageKey = 'konbini-points';
  const currentBalance = parseInt(localStorage.getItem(storageKey) || '0', 10);
  const newBalance = currentBalance + earnedPts;
  localStorage.setItem(storageKey, String(newBalance));
  console.log('[konbini-2d] Points:', { earned: earnedPts, balance: newBalance });

  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

  const expressions = extractExpressions(history || []);

  const itemsHTML = cart.map(item => `
    <div class="kb-receipt-item">
      <div class="kb-receipt-item-left">
        <div class="kb-receipt-item-icon-wrap">
          ${renderItemIcon(item)}
        </div>
        <span class="kb-receipt-item-name">${item.ja}</span>
      </div>
      <span class="kb-receipt-item-price">¥${item.price}</span>
    </div>
  `).join('');

  const expressionsHTML = expressions.length > 0
    ? expressions.map(ja => `
        <li class="kb-expr-item">
          <span class="kb-expr-dot">●</span>
          <div>
            <p class="kb-expr-ja">${ja}</p>
            ${getRoughTranslation(ja) ? `<p class="kb-expr-en">${getRoughTranslation(ja)}</p>` : ''}
          </div>
        </li>
      `).join('')
    : `<li class="kb-expr-item"><span class="kb-expr-dot">●</span><div><p class="kb-expr-ja">いらっしゃいませ</p><p class="kb-expr-en">Welcome to the store</p></div></li>`;

  container.innerHTML = `
    <div class="kb-summary">
      <section class="kb-summary-hero">
        <div class="kb-hero-confetti kb-hero-confetti-1"></div>
        <div class="kb-hero-confetti kb-hero-confetti-2"></div>
        <div class="kb-hero-confetti kb-hero-confetti-3"></div>
        <h2 class="kb-summary-title">Practice Success</h2>
        <p class="kb-summary-subtitle">Lesson Complete: Convenience Store</p>
      </section>

      <div class="kb-summary-collage">

        <div class="kb-receipt-card">
          <div class="kb-receipt-header">
            <span class="kb-receipt-label">Receipt #KONBINI</span>
            <span class="kb-receipt-date">${dateStr}</span>
          </div>
          <div class="kb-receipt-items">
            ${itemsHTML}
          </div>
          <div class="kb-receipt-total">
            <span class="kb-receipt-total-label">TOTAL</span>
            <span class="kb-receipt-total-value">¥${total}</span>
          </div>
          <div class="kb-sticker-good">Good!</div>
        </div>

        <div class="kb-reward-card">
          <div class="kb-reward-main">
            <div class="kb-reward-icon">⭐</div>
            <div>
              <h3 class="kb-reward-label">Reward Earned</h3>
              <p class="kb-reward-value">+${earnedPts} <span class="kb-reward-pts">pts</span></p>
            </div>
          </div>
          <div class="kb-reward-balance">
            <span>Current Balance</span>
            <span>${newBalance.toLocaleString()} PTS</span>
          </div>
          <span class="kb-reward-spark">✨</span>
        </div>

        <div class="kb-expr-card">
          <div class="kb-expr-tape"></div>
          <h3 class="kb-expr-title">Today's Expressions</h3>
          <ul class="kb-expr-list">
            ${expressionsHTML}
          </ul>
        </div>

      </div>

      <div class="kb-sticker-great">GREAT!</div>

      <div class="kb-summary-actions">
        <button class="kb-summary-btn kb-summary-btn-primary" type="button" data-action="return-map">
          地図に戻る
        </button>
        <button class="kb-summary-btn kb-summary-btn-ghost" type="button" data-action="try-again">
          もう一度
        </button>
      </div>

    </div>
  `;

  container.querySelector('[data-action="return-map"]')?.addEventListener('click', () => {
    console.log('[konbini-2d] Return to map clicked');
    document.getElementById('pg-konbini')?.dispatchEvent(
      new CustomEvent('konbini-return-to-scene', { bubbles: true })
    );
  });

  container.querySelector('[data-action="try-again"]')?.addEventListener('click', () => {
    console.log('[konbini-2d] Try again clicked');
    document.getElementById('pg-konbini')?.dispatchEvent(
      new CustomEvent('konbini-try-again', { bubbles: true })
    );
  });
}
