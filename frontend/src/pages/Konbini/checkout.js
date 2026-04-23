import { buildTurns } from './checkout-data.js';

// ============================================
// 店员 葵 的 System Prompt(Checkout 专用)
// ============================================
const CLERK_SYSTEM_PROMPT_TEMPLATE = `
あなたはコンビニの店員「葵(あおい)」です。
丁寧な接客口調で話してください(です・ます調)。

ユーザーのかごの中身: __CART__
合計: ¥__TOTAL__

現在は第 __TURN__/__TURN_COUNT__ 轮。このターンのID: __TURN_ID__
このターンの指示: __INSTRUCTION__

厳守ルール:
- 一言のみ、短く(30字以内)。
- 指示された機能以外のことは話さない。
- ユーザーが雑談を振っても、礼儀正しくスルーして本題に戻る。
- 新しい話題を始めない。
- 個人的な話(名前、趣味、天気など)に触れない。
- ユーザーの日本語を褒めたり評価したりしない。
`.trim();

function buildClerkSystemPrompt(turn, current, cart, total) {
  const cartSummary = cart.map(i => `${i.ja} ¥${i.price}`).join('、');
  return CLERK_SYSTEM_PROMPT_TEMPLATE
    .replace('__CART__', cartSummary)
    .replace('__TOTAL__', total)
    .replace('__TURN__', String(turn.index + 1))
    .replace('__TURN_COUNT__', String(turn.total))
    .replace('__TURN_ID__', current.id)
    .replace('__INSTRUCTION__', current.instruction.replace('${total}', total));
}

// 剥离服务器自动添加的 [[word|reading|gloss]] 标记
function stripVocabMarkup(text) {
  if (!text) return '';
  return text.replace(/\[\[([^\]|]+)\|[^\]]*\]\]/g, '$1');
}

// ============================================
// 主渲染 + 状态机
// ============================================
export function renderCheckout(container, { cart, total }) {
  const turns = buildTurns(cart);
  console.log('[konbini-2b] buildTurns result:', turns);
  console.log('[konbini-2b] total turns:', turns.length);

  const state = {
    turnIndex: 0,
    turnCount: turns.length,
    history: [],
    loading: false,
    done: false,
  };

  container.innerHTML = `
    <div class="kb-checkout">

      <section class="kb-checkout-scene">
        <img
          class="kb-checkout-clerk-img"
          src="/frontend/public/assets/scenes/konbini/aoi.jpg"
          alt="店員 葵"
        />
        <div class="kb-checkout-bubble">
          <p class="kb-bubble-ja" data-role="bubble-ja">……</p>
          <p class="kb-bubble-en" data-role="bubble-en"></p>
          <span class="kb-bubble-tail" aria-hidden="true"></span>
        </div>
        <div class="kb-checkout-clerk-tag">店員「葵」</div>
      </section>

      <section class="kb-checkout-stream" data-role="stream"></section>

      <section class="kb-checkout-input-hub">
        <div class="kb-hint-row" data-role="hint-row">
          <button class="kb-hint-pill" type="button" data-hint-index="0" disabled></button>
          <button class="kb-mic-btn" type="button" disabled aria-label="語音入力(後続で有効化)">🎤</button>
          <button class="kb-hint-pill" type="button" data-hint-index="1" disabled></button>
        </div>

        <div class="kb-input-wrap">
          <span class="kb-input-label">TRANSCRIPTION INPUT</span>
          <div class="kb-input-line">
            <input
              type="text"
              class="kb-input-field"
              data-role="input"
              placeholder="Type your response here..."
              disabled
            />
            <button class="kb-input-send" type="button" data-role="send" disabled aria-label="送信">➤</button>
          </div>
        </div>
      </section>

    </div>
  `;

  const $bubbleJa = container.querySelector('[data-role="bubble-ja"]');
  const $bubbleEn = container.querySelector('[data-role="bubble-en"]');
  const $stream   = container.querySelector('[data-role="stream"]');
  const $hints    = container.querySelectorAll('[data-hint-index]');
  const $input    = container.querySelector('[data-role="input"]');
  const $send     = container.querySelector('[data-role="send"]');

  // ── UI helpers ──────────────────────────────
  function refreshHintsAndInput() {
    const current = turns[state.turnIndex];
    const hints = current?.hints || [];
    const disabled = state.loading || state.done;

    $hints.forEach((btn, idx) => {
      const txt = hints[idx];
      if (txt) {
        btn.textContent = txt;
        btn.disabled = disabled;
        btn.style.visibility = 'visible';
      } else {
        btn.textContent = '';
        btn.disabled = true;
        btn.style.visibility = 'hidden';
      }
    });

    $input.disabled = disabled;
    $send.disabled  = disabled;
    $input.placeholder = state.done ? '対話終了' : disabled ? '...' : 'Type your response here...';
  }

  function showBubble(ja, en) {
    $bubbleJa.textContent = ja || '';
    $bubbleEn.textContent = en || '';
  }

  function appendStream(role, ja, en) {
    const div = document.createElement('div');
    div.className = role === 'clerk' ? 'kb-msg kb-msg-clerk' : 'kb-msg kb-msg-user';
    div.innerHTML = `
      ${role === 'clerk' ? '<span class="kb-msg-tape" aria-hidden="true"></span>' : ''}
      <p class="kb-msg-meta">${role === 'clerk' ? 'CLERK' : 'YOU'}</p>
      <p class="kb-msg-text"></p>
      ${en ? '<p class="kb-msg-en"></p>' : ''}
    `;
    div.querySelector('.kb-msg-text').textContent = ja;
    if (en) div.querySelector('.kb-msg-en').textContent = en;
    $stream.appendChild(div);
    $stream.scrollTop = $stream.scrollHeight;
  }

  // ── API call ─────────────────────────────────
  async function callClerkAPI(userText) {
    const current = turns[state.turnIndex];
    const systemPrompt = buildClerkSystemPrompt(
      { index: state.turnIndex, total: state.turnCount },
      current, cart, total,
    );

    const messages = state.history.map(m => ({
      role: m.role === 'clerk' ? 'assistant' : 'user',
      content: m.ja,
    }));
    messages.push({ role: 'user', content: userText || '(入店)' });

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, systemPrompt, characterId: 'clerk' }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);

    const data = await res.json();
    // 服务器已解析 JSON，直接取字段；剥离 VOCAB_MARKUP
    return {
      replyJa: stripVocabMarkup(data.replyJa || ''),
      replyEn: data.replyEn || '',
      emotion: 'idle',
      memoryCandidate: '',
    };
  }

  // ── Turn state machine ────────────────────────
  async function advanceTurn(userText) {
    if (state.loading || state.done) return;
    state.loading = true;

    if (userText) {
      appendStream('user', userText, '');
      state.history.push({ role: 'user', ja: userText, en: '' });
    }

    showBubble('……', '');
    refreshHintsAndInput();

    let parsed;
    try {
      parsed = await callClerkAPI(userText);
    } catch (e) {
      console.error('[konbini-2b] API error:', e);
      parsed = { replyJa: 'すみません、もう一度お願いします', replyEn: 'Sorry, please try again', emotion: 'idle', memoryCandidate: '' };
    }

    console.log('[konbini-2b] turn', state.turnIndex + 1, '/', state.turnCount, 'reply:', parsed);

    showBubble(parsed.replyJa, parsed.replyEn);
    appendStream('clerk', parsed.replyJa, parsed.replyEn);
    state.history.push({ role: 'clerk', ja: parsed.replyJa, en: parsed.replyEn });

    if (state.turnIndex >= state.turnCount - 1) {
      state.done = true;
      state.loading = false;
      console.log('[konbini-2b] 対話終了 - turns:', state.turnCount, 'history:', state.history);
      refreshHintsAndInput();
      return;
    }

    state.turnIndex += 1;
    state.loading = false;

    const next = turns[state.turnIndex];
    if (next?.auto) {
      await advanceTurn(null);
    } else {
      refreshHintsAndInput();
    }
  }

  // ── Events ───────────────────────────────────
  $hints.forEach(btn => {
    btn.addEventListener('click', () => {
      const txt = btn.textContent.trim();
      if (!txt || btn.disabled) return;
      advanceTurn(txt);
    });
  });

  $input.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || state.loading || state.done) return;
    const txt = $input.value.trim();
    if (!txt) return;
    $input.value = '';
    advanceTurn(txt);
  });

  $send.addEventListener('click', () => {
    if (state.loading || state.done) return;
    const txt = $input.value.trim();
    if (!txt) return;
    $input.value = '';
    advanceTurn(txt);
  });

  // ── Boot ─────────────────────────────────────
  refreshHintsAndInput();
  advanceTurn(null);
}
