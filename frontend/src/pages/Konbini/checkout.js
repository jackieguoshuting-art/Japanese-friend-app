import { buildTurns } from './checkout-data.js';

export function renderCheckout(container, { cart, total }) {
  const turns = buildTurns(cart);
  console.log('[konbini-2a] buildTurns result:', turns);
  console.log('[konbini-2a] total turns:', turns.length);

  container.innerHTML = `
    <div class="kb-checkout">
      <div class="kb-checkout-clerk">
        <div class="kb-clerk-avatar">👨‍💼</div>
        <div class="kb-clerk-label">店員「葵」</div>
      </div>
      <div class="kb-checkout-subtitle">
        <div class="kb-sub-ja">いらっしゃいませ</div>
        <div class="kb-sub-en">Welcome</div>
      </div>
      <div class="kb-checkout-hints">
        <button class="kb-hint-pill" type="button">
          <span class="kb-hint-icon">🔊</span>
          <span class="kb-hint-text">はい、お願いします</span>
        </button>
        <button class="kb-hint-pill" type="button">
          <span class="kb-hint-icon">🔊</span>
          <span class="kb-hint-text">いいえ、大丈夫です</span>
        </button>
      </div>
      <div class="kb-checkout-input">
        <input type="text" class="kb-input-field" placeholder="🎤 キーボードで入力(2b で有効化)" disabled />
      </div>
    </div>
  `;
}
