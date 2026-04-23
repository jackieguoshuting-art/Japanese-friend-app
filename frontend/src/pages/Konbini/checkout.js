import { buildTurns } from './checkout-data.js';

// 渲染 checkout stage 的完整 UI(2a: Stitch 视觉静态版, mock 数据)
// cart: [{ id, emoji, ja, en, price, needs }, ...]
// total: number
export function renderCheckout(container, { cart, total }) {
  const turns = buildTurns(cart);
  console.log('[konbini-2a] buildTurns result:', turns);
  console.log('[konbini-2a] total turns:', turns.length);

  container.innerHTML = `
    <div class="kb-checkout">

      <!-- 葵插画 + 气泡(气泡在右上,脸在左侧完全露出) -->
      <section class="kb-checkout-scene">
        <img
          class="kb-checkout-clerk-img"
          src="/assets/scenes/konbini/aoi.jpg"
          alt="店員 葵"
        />
        <div class="kb-checkout-bubble">
          <p class="kb-bubble-ja">いらっしゃいませ</p>
          <p class="kb-bubble-en">Welcome</p>
          <span class="kb-bubble-tail" aria-hidden="true"></span>
        </div>
        <div class="kb-checkout-clerk-tag">店員「葵」</div>
      </section>

      <!-- 最新 1 轮对话气泡(手账拼贴风) -->
      <section class="kb-checkout-stream">
        <div class="kb-msg kb-msg-clerk">
          <span class="kb-msg-tape" aria-hidden="true"></span>
          <p class="kb-msg-meta">CLERK</p>
          <p class="kb-msg-text">いらっしゃいませ</p>
        </div>
      </section>

      <!-- 底部交互区:两个 Hint + 中间麦克风 + 输入框 -->
      <section class="kb-checkout-input-hub">
        <div class="kb-hint-row">
          <button class="kb-hint-pill" type="button">
            はい、お願いします
          </button>
          <button class="kb-mic-btn" type="button" disabled aria-label="語音入力(2b 以降)">
            🎤
          </button>
          <button class="kb-hint-pill" type="button">
            いいえ、大丈夫です
          </button>
        </div>

        <div class="kb-input-wrap">
          <span class="kb-input-label">TRANSCRIPTION INPUT</span>
          <div class="kb-input-line">
            <input
              type="text"
              class="kb-input-field"
              placeholder="Type your response here..."
              disabled
            />
            <button class="kb-input-send" type="button" disabled aria-label="送信">➤</button>
          </div>
        </div>
      </section>

    </div>
  `;
}
