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
- 返答は短く、30字以内(多くても40字まで)。
- 必ず本ターンの質問(指示の内容)を含めて返答する。
- ユーザーの発言が本題から外れていても、まず一言温かく応答してから、
  同じ返事の中で必ず本題の質問に戻ること。
- 新しい話題を始めない、自分から追加の質問をしない。
- ユーザーの日本語を褒めたり評価したりしない。
- 個人情報(名前、趣味、天気、場所等)を尋ねない。
- 単語マークアップ記号 [[...]] は絶対に使わないでください。純粋な日本語テキストのみ。
- 語気助詞を自然に交えて接客らしさを出す(例: 句頭に「はい、」「えっと、」「そうですね〜」「あ、」など、文末に「〜ね」「〜よ」を時々)。ただし入れすぎず、1文に1〜2個まで。
- コンビニ店員らしい丁寧で親しみやすいトーン(固すぎず、砕けすぎず)。

例文比較(【悪い】冷たい / 【良い】自然):
- 【悪い】「鮭おにぎりは温めますか?」 【良い】「はい、鮭おにぎりは温めますね?」
- 【悪い】「袋はご利用になりますか?」 【良い】「えっと、袋はご利用になりますか?」
- 【悪い】「ありがとうございました」 【良い】「はい、ありがとうございました〜」

人情応答の例(このパターンに従うこと):
- ユーザー「はい」 → 「かしこまりました。【本題の質問】」
- ユーザー「わかりません」 → 「大丈夫ですよ。【本題の質問】」
- ユーザー「暑いですね」 → 「そうですね〜。【本題の質問】」
- ユーザー「トイレどこ?」 → 「奥にございます。【本題の質問】」
- ユーザー「この商品人気?」 → 「人気ですよ。【本題の質問】」
- ユーザー沈黙/無関係な発言 → 一言温かく + 【本題の質問】

※【本題の質問】の部分は、このターンの指示で指定された質問文を必ず含めること。

- 必ず以下の JSON 形式のみで返答し、他の文字を含めない:
  {"replyJa":"日本語の返答","replyEn":"English translation"__PROCEED_FIELD__}
__PROCEED_INSTRUCTION__`.trim();

function buildClerkSystemPrompt(turn, current, cart, total) {
  const cartSummary = cart.map(i => `${i.ja} ¥${i.price}`).join('、');
  const instructionText = typeof current.instruction === 'function'
    ? current.instruction(cart, total)
    : String(current.instruction).replace('${total}', total);

  let extraStrict = '';
  if (current.id === 'review') {
    const itemList = cart.map((i, idx) => `  ${idx + 1}. 「${i.ja}」 ¥${i.price}`).join('\n');
    const itemNamesOnly = cart.map(i => `「${i.ja}」`).join('、');
    extraStrict = `

━━━━━━━━━━━━━━━━━━━━
【最重要: 商品リスト厳守】
━━━━━━━━━━━━━━━━━━━━
お客様のかごに入っている商品は以下の ${cart.length} 品のみです:
${itemList}

復唱してよい商品名は次の${cart.length}つだけ: ${itemNamesOnly}

禁止事項(違反は重大):
✗ リストに無い商品名を発すること(例: 「コロッケ」「コーヒー」「サンドイッチ」「バナナ」等)
✗ 商品の追加・削除・置き換え
✗ 「~とか」「~など他にも」のように曖昧に他商品を示唆すること

必須事項:
✓ 復唱時は上記リストの商品名をそのまま使う
✓ 順序はリスト通り(1から順に)
${cart.length > 3 ? '✓ 3品を超える場合は最初の3品 + 「など」で省略してよい' : ''}

良い例:
  「${cart.slice(0, Math.min(3, cart.length)).map(i => i.ja).join('、')}${cart.length > 3 ? 'など' : ''}、以上でよろしいでしょうか?」

悪い例(絶対避けること):
  ✗ 「${cart[0]?.ja || '鮭おにぎり'}、コロッケ、${cart[1]?.ja || '生茶'}、以上で...」(コロッケはリストに無い)
  ✗ 「${cart[0]?.ja || '鮭おにぎり'}、コーヒー、...」(コーヒーはリストに無い)
  ✗ 「${cart[0]?.ja || '鮭おにぎり'}などで...」(曖昧な省略)

リストに無い商品名を1つでも発した場合、それは重大な違反です。
`;
  }

  const proceedField = current.id === 'review' ? ',"proceed":true' : '';
  const proceedInstruction = current.id === 'review'
    ? 'proceedフィールド: ユーザーが「はい」など確認したら true、「他にもあります」など否定・追加なら false。'
    : '';
  return CLERK_SYSTEM_PROMPT_TEMPLATE
    .replace('__CART__', cartSummary)
    .replace('__TOTAL__', total)
    .replace('__TURN__', String(turn.index + 1))
    .replace('__TURN_COUNT__', String(turn.total))
    .replace('__TURN_ID__', current.id)
    .replace('__INSTRUCTION__', instructionText + extraStrict)
    .replace('__PROCEED_FIELD__', proceedField)
    .replace('__PROCEED_INSTRUCTION__', proceedInstruction);
}

// 剥离 [[word|reading|gloss]] 或 [[word]] 格式的 vocab 标记
function stripVocabMarkup(text) {
  if (!text) return '';
  return text.replace(/\[\[([^\]|]+)[^\]]*\]\]/g, '$1');
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
    const inputDisabled = state.loading || state.done;

    console.log('[konbini-2b-fix2] refresh: turn=', state.turnIndex, 'id=', current?.id, 'hints=', hints);

    $hints.forEach((btn, idx) => {
      const txt = hints[idx];
      if (txt) {
        btn.textContent = txt;
        btn.disabled = inputDisabled;
        btn.style.visibility = 'visible';
      } else {
        btn.textContent = '';
        btn.disabled = true;
        btn.style.visibility = 'hidden';
      }
    });

    $input.disabled = inputDisabled;
    $send.disabled = inputDisabled;
    $input.placeholder = state.done ? '対話終了' : inputDisabled ? '...' : 'Type your response here...';
  }

  function showBubble(ja, en) {
    const cleanJa = stripVocabMarkup(ja || '');
    if (cleanJa === '……' || cleanJa === '...' || cleanJa === '…') {
      $bubbleJa.innerHTML = '<span class="kb-bubble-dots"><span></span><span></span><span></span></span>';
      $bubbleEn.textContent = '';
    } else {
      $bubbleJa.textContent = cleanJa;
      $bubbleEn.textContent = en || '';
    }
  }

  function appendStream(role, ja, en) {
    const cleanJa = stripVocabMarkup(ja || '');
    const cleanEn = en || '';
    const div = document.createElement('div');
    div.className = role === 'clerk' ? 'kb-msg kb-msg-clerk' : 'kb-msg kb-msg-user';
    div.innerHTML = `
      ${role === 'clerk' ? '<span class="kb-msg-tape" aria-hidden="true"></span>' : ''}
      <p class="kb-msg-meta">${role === 'clerk' ? 'CLERK' : 'YOU'}</p>
      <p class="kb-msg-text"></p>
      ${cleanEn ? '<p class="kb-msg-en"></p>' : ''}
    `;
    div.querySelector('.kb-msg-text').textContent = cleanJa;
    if (cleanEn) div.querySelector('.kb-msg-en').textContent = cleanEn;

    // 只保留最新 1 个同角色气泡
    $stream.querySelectorAll(role === 'clerk' ? '.kb-msg-clerk' : '.kb-msg-user')
      .forEach(el => el.remove());
    $stream.appendChild(div);
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
      proceed: data.proceed !== false,
      emotion: 'idle',
      memoryCandidate: '',
    };
  }

  // ── Turn state machine ────────────────────────
  async function advanceTurn(userText) {
    if (state.loading || state.done) return;

    const currentTurnId = turns[state.turnIndex]?.id;

    // ─── Review 否定分支检查 ───
    const currentTurn = turns[state.turnIndex];
    const lastTurn = state.turnIndex > 0 ? turns[state.turnIndex - 1] : null;
    // a) 正常流程: turnIndex 推进到 review 下一轮, lastTurn 是 review
    // b) fix5 回退流程: turnIndex 指向 review 本身, currentTurn 是 review
    const justAnsweredReview = userText && (
      lastTurn?.id === 'review' || currentTurn?.id === 'review'
    );

    if (justAnsweredReview) {
      const negativeKeywords = [
        '他に', 'ほかに', '他にも', 'ほかにも',
        'いいえ', 'no', 'NO',
        '違う', '違います', 'ちがう', 'ちがいます',
        'もう一つ', 'もう一個', 'もう一品',
        '追加', 'ついか',
        '間違', 'まちがい', 'まちがえ',
        '足り', 'たり',
      ];
      const isNegative = negativeKeywords.some(kw => userText.includes(kw));

      if (isNegative) {
        console.log('[konbini-2b-review-fix1] User negated review, showing modal. userText:', userText);
        appendStream('user', userText, '');
        state.history.push({ role: 'user', ja: userText, en: '' });
        showReviewCancelModal();
        return;
      }
    }

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
      parsed = { replyJa: 'すみません、もう一度お願いします', replyEn: 'Sorry, please try again', proceed: true, emotion: 'idle', memoryCandidate: '' };
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

    // 先刷新 hints(此时 turnIndex 还指向葵刚说完的那轮，hints 对应正确)
    state.loading = false;
    refreshHintsAndInput();

    // 记录刚完成的轮 id(必须在推进前读)
    const justFinishedId = turns[state.turnIndex]?.id;

    // 再推进到下一轮(为下次 advanceTurn 准备新轮的 prompt)
    state.turnIndex += 1;

    // 如果下一轮是 auto，自动推进
    const next = turns[state.turnIndex];
    if (next?.auto) {
      // greeting 结束后停顿 1.5 秒，让用户看清欢迎语
      if (justFinishedId === 'greeting') {
        console.log('[konbini-2b-review-fix2] pause 1500ms after greeting');
        await new Promise(r => setTimeout(r, 1500));
      }
      await advanceTurn(null);
    }
  }

  // ── Review modal helpers ─────────────────────
  function showReviewCancelModal() {
    const existing = container.querySelector('.kb-review-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'kb-review-modal';
    modal.innerHTML = `
      <div class="kb-review-modal-box">
        <p class="kb-review-modal-text">カートに戻りますか?</p>
        <div class="kb-review-modal-actions">
          <button class="kb-review-modal-btn kb-review-modal-back" type="button">戻る</button>
          <button class="kb-review-modal-btn kb-review-modal-cancel" type="button">キャンセル</button>
        </div>
      </div>
    `;

    modal.querySelector('.kb-review-modal-back').addEventListener('click', () => {
      modal.remove();
      triggerReturnToShopping();
    });

    modal.querySelector('.kb-review-modal-cancel').addEventListener('click', () => {
      modal.remove();
      console.log('[konbini-2b-review-fix5] modal dismissed, asking review again');
      state.loading = false;
      // 关键修复: 回退 turnIndex 到 review, 让 refreshHintsAndInput 取到 review 的 hints
      const reviewIndex = turns.findIndex(t => t.id === 'review');
      if (reviewIndex >= 0) state.turnIndex = reviewIndex;
      showBubble('ではこちらでよろしいでしょうか?', 'Then, is this all?');
      appendStream('clerk', 'ではこちらでよろしいでしょうか?', 'Then, is this all?');
      state.history.push({ role: 'clerk', ja: 'ではこちらでよろしいでしょうか?', en: 'Then, is this all?' });
      refreshHintsAndInput();
      console.log('[konbini-2b-review-fix5] turnIndex reset to review, hints:', turns[state.turnIndex]?.hints);
    });

    container.querySelector('.kb-checkout').appendChild(modal);
  }

  function triggerReturnToShopping() {
    const pg = document.getElementById('pg-konbini');
    if (!pg) return;
    container.classList.add('kb-checkout-slide-out');
    setTimeout(() => {
      pg.dispatchEvent(new CustomEvent('konbini-return-to-shopping'));
    }, 350);
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
