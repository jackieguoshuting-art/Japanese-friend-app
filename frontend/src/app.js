import { go } from './core/router.js';
import { appState } from './core/state.js';
import { getDailyTopic } from './features/topics.js';
import { appendMemory, getCharacterMemory } from './features/memory.js';
import { yukiConfig } from './characters/yuki/yuki.config.js';
import { renConfig } from './characters/ren/ren.config.js';
import { hanaConfig } from './characters/hana/hana.config.js';
import { getClaudeReply } from './services/claude.service.js';
import { getRandomFallbackReply } from './features/chat.js';
import { save, load } from './core/storage.js';

const characterMap = {
  yuki: yukiConfig,
  ren:  renConfig,
  hana: hanaConfig,
  mio:  yukiConfig,
};

// Tracks messages for the current call session
const conversationHistory = [];
window._convHistory = conversationHistory;

// moved to frontend/src/features/ui.js: spawnStars

// moved to frontend/src/features/ui.js: animateVoiceBars

// moved to frontend/src/features/ui.js: initWordTooltips

// moved to frontend/src/features/character.js: setActiveCharacter

function bindCharacterButtons() {
  // Handled by inline onclick in index.html
}

function seedInitialMemory() {
  // Seed removed — memory card now shows real AI-generated memories only
}

function appendChatMessage(role, ja, en, id) {
  const list = document.getElementById('chat-list');
  if (!list) return;
  const msg = document.createElement('div');
  msg.className = `chat-msg chat-msg-${role === 'user' ? 'user' : 'yuki'}`;
  if (id) msg.id = id;
  if (role === 'user') {
    msg.innerHTML = `<div class="chat-bubble"><div class="chat-ja">${ja}</div></div>`;
  } else {
    msg.innerHTML = `<div class="chat-dot"></div><div class="chat-bubble"><div class="chat-ja">${ja}</div>${en ? `<div class="chat-en">${en}</div>` : ''}</div>`;
  }
  list.appendChild(msg);
  list.scrollTop = list.scrollHeight;
}

async function triggerOpeningMessage() {
  const characterId = appState.activeCharacter || 'yuki';
  const character = characterMap[characterId] || yukiConfig;

  if (characterId === 'yuki') {
    const yukiOpenings = [
      { ja: 'よ、ちょうどコーヒー淹れてたとこ。どした？', en: 'Yo, just making coffee. What\'s up?' },
      { ja: 'おう、今帰ってきたとこ。なんか用？', en: 'Hey, just got back. Need something?' },
      { ja: 'yo、下北ぶらついてたんだけど。どうした', en: 'Yo, was wandering Shimokitazawa. What\'s up?' },
      { ja: 'おー、ちょうど音楽聴いてた。なんか用？', en: 'Oh, was just listening to music. What\'s up?' },
      { ja: 'どした、急に', en: 'What\'s up, out of nowhere?' },
      { ja: '珍しいね、どうした', en: 'Rare to hear from you. What\'s going on?' },
      { ja: 'this is Yuki。なに？', en: 'This is Yuki. What?' },
      { ja: 'yo、なに？', en: 'Yo, what?' },
      { ja: '……なに？', en: '...what?' },
      { ja: 'あ、電話か。どした', en: 'Oh, a call. What\'s up?' },
      { ja: 'おう、生きてるよ。なんか用？', en: 'Yeah, still alive. Need something?' },
      { ja: 'hey、休憩しようとしてたとこ。どした？', en: 'Hey, was about to take a break. What\'s up?' },
      { ja: 'あ来た。さっきまで作業してた。どうした？', en: 'Oh hey. Was just working on something. What\'s up?' },
      { ja: 'おう、展示見てきたとこ。なんか用？', en: 'Hey, just came from an exhibit. Need something?' },
      { ja: '今日暇なの？なんか用？', en: 'You free today? What\'s up?' },
      { ja: 'なんで急に？どうした', en: 'Out of the blue. What\'s going on?' },
      { ja: '久しぶりじゃん。どうした', en: 'Been a while. What\'s up?' },
      { ja: 'はい、悠生です。どした？', en: 'Yeah, it\'s Yuki. What\'s up?' },
      { ja: 'あ、うん。どした', en: 'Oh, yeah. What\'s up?' },
      { ja: 'ん、どした', en: 'Mm, what\'s up?' },
      { ja: 'ちょうど古着漁ってたとこ。なんか用？', en: 'Was just digging through vintage clothes. Need something?' },
      { ja: 'おー、珍しい。どした？', en: 'Oh, unusual. What\'s going on?' },
      { ja: 'よ。なんか用？', en: 'Yo. Need something?' },
      { ja: 'ん？どした急に', en: 'Hm? What\'s up all of a sudden?' },
      { ja: 'あーちょうどよかった。どした？', en: 'Oh good timing. What\'s up?' },
      { ja: 'さっきまで昼寝してた。どした？', en: 'Was napping just now. What\'s up?' },
      { ja: 'ちょうど外出ようとしてたとこ。どした？', en: 'Was just about to head out. What\'s up?' },
      { ja: 'おう、なんか用？', en: 'Hey, need something?' },
      { ja: 'よ、生きてた？どした', en: 'Yo, you alive? What\'s up?' },
      { ja: 'あ、タイミングいいね。どした？', en: 'Oh, good timing. What\'s going on?' },
    ];
    const YUKI_OPENING_HISTORY_KEY = 'yukiOpeningHistory';
    const recentHistory = JSON.parse(localStorage.getItem(YUKI_OPENING_HISTORY_KEY) || '[]');
    const available = yukiOpenings.map((_, i) => i).filter(i => !recentHistory.includes(i));
    const pool = available.length > 0 ? available : yukiOpenings.map((_, i) => i);
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    const recentUpdated = [...recentHistory, chosen].slice(-7);
    localStorage.setItem(YUKI_OPENING_HISTORY_KEY, JSON.stringify(recentUpdated));
    const randomOpening = yukiOpenings[chosen];
    appendChatMessage('yuki', randomOpening.ja, randomOpening.en);
    conversationHistory.push({ role: 'yuki', text: randomOpening.ja });
    return;
  }

  const fixedOpenings = {
    ren: { ja: '1', en: '1' },
    hana: { ja: '2', en: '2' },
    mio: { ja: '3', en: '3' },
  };

  if (fixedOpenings[characterId]) {
    const o = fixedOpenings[characterId];
    appendChatMessage('yuki', o.ja, o.en);
    conversationHistory.push({ role: 'yuki', text: o.ja });
    return;
  }

  appendChatMessage('yuki', '……', '', 'chat-loading');
  try {
    const reply = await getClaudeReply({
      character,
      topic:   getDailyTopic(new Date(), characterId),
      memory:  getCharacterMemory(characterId),
      history: [],
      userText: '[START]',
    });
    document.getElementById('chat-loading')?.remove();
    const replyJa = reply.replyJa || 'よ';
    appendChatMessage('yuki', replyJa, reply.replyEn || '');
    conversationHistory.push({ role: 'yuki', text: replyJa });
  } catch {
    document.getElementById('chat-loading')?.remove();
    appendChatMessage('yuki', 'よ', 'Hey');
    conversationHistory.push({ role: 'yuki', text: 'よ' });
  }
}

function initCallInput() {
  const input = document.getElementById('call-text-input');
  const btn   = document.getElementById('call-send-btn');
  if (!input || !btn) return;

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    btn.disabled = true;

    const characterId = appState.activeCharacter || 'yuki';
    const character   = characterMap[characterId] || yukiConfig;

    conversationHistory.push({ role: 'user', text });
    appendChatMessage('user', text, '');
    appendChatMessage('yuki', '……', '', 'chat-loading');

    try {
      const reply = await getClaudeReply({
        character,
        topic:    getDailyTopic(new Date(), characterId),
        memory:   getCharacterMemory(characterId),
        history:  [],
        userText: text,
      });
      document.getElementById('chat-loading')?.remove();
      const replyJa = reply.replyJa || '……';
      appendChatMessage('yuki', replyJa, reply.replyEn || '');
      conversationHistory.push({ role: 'yuki', text: replyJa });
      if (reply.memoryCandidate) {
        appendMemory(characterId, { factJa: reply.memoryCandidate, source: 'conversation' });
        save('yukiMemory', reply.memoryCandidate);
      }
    } catch {
      document.getElementById('chat-loading')?.remove();
      const fallback = getRandomFallbackReply();
      appendChatMessage('yuki', fallback.replyJa, fallback.replyEn);
      conversationHistory.push({ role: 'yuki', text: fallback.replyJa });
    } finally {
      btn.disabled = false;
      input.focus();
    }
  }

  btn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });
}

function renderConversationSummary() {
  const recap = document.getElementById('conv-recap');
  if (!recap) return;
  const history = load('lastConversation', []);
  if (!history.length) { recap.hidden = true; return; }

  const characterId = appState.activeCharacter || 'yuki';
  const charName = (characterMap[characterId] || yukiConfig).name;

  recap.hidden = false;
  const content = document.getElementById('conv-recap-content');
  if (content) {
    content.innerHTML = `
      <div class="conv-recap-inner">
        ${history.map((m) => `
          <div class="conv-msg ${m.role === 'user' ? 'conv-msg-user' : 'conv-msg-yuki'}">
            <div class="conv-speaker">${m.role === 'user' ? 'あなた' : charName}</div>
            <div class="conv-text">${m.text}</div>
          </div>
        `).join('')}
      </div>
    `;
  }
  // Reset toggle state each time
  const btn = document.getElementById('conv-toggle-btn');
  if (btn) btn.textContent = '今日の会話を見る 📖';
}

function renderMemoryCard() {
  const memText  = document.querySelector('.memory-card .mem-text');
  const memEn    = document.querySelector('.memory-card .mem-en');
  const memTitle = document.querySelector('.memory-card .mem-title');
  if (!memText) return;

  const characterId = appState.activeCharacter || 'yuki';
  const charName    = (characterMap[characterId] || yukiConfig).name;
  if (memTitle) memTitle.textContent = `${charName} の記憶 · ${charName} will remember this`;

  const yukiMemory = load('yukiMemory', null);
  if (yukiMemory) {
    memText.textContent = `「${yukiMemory}」`;
    if (memEn) memEn.textContent = `Saved to ${charName}'s memory ✦`;
  } else {
    memText.textContent = '「まだ何も覚えていないよ」';
    if (memEn) memEn.textContent = 'No memories yet from this session.';
  }
}

function initBottomNav() {
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      const page = item.dataset.nav;
      if (page) go(page);
    });
  });
}

window.toggleConvRecap = function () {
  const content = document.getElementById('conv-recap-content');
  const btn     = document.getElementById('conv-toggle-btn');
  if (!content || !btn) return;
  const isOpen = !content.classList.contains('conv-recap-collapsed');
  content.classList.toggle('conv-recap-collapsed', isOpen);
  btn.textContent = isOpen ? '今日の会話を見る 📖' : '閉じる ✕';
};

function init() {
  ['sl-home', 'sl-friends', 'sl-call', 'sl-summary'].forEach(id => window.spawnStars?.(id));
  window.animateVoiceBars?.();
  seedInitialMemory();
  window.setActiveCharacter?.('yuki');
  bindCharacterButtons();
  initCallInput();
  initBottomNav();
  window.initWordTooltips?.();

  document.querySelector('.btn-return')?.addEventListener('click', () => go('friends'));
  document.querySelector('.btn-end-top')?.addEventListener('click', () => go('friends'));
  document.querySelector('.ctrl .end-call')?.parentElement?.addEventListener('click', () => {
    save('lastConversation', conversationHistory);
    renderConversationSummary();
    renderMemoryCard();
    go('summary');
  });

  document.querySelector('.back-btn')?.addEventListener('click', () => go('home'));
  document.querySelector('.nav-item:nth-child(2)')?.setAttribute('data-nav', 'friends');
  document.querySelector('.nav-item:nth-child(1)')?.setAttribute('data-nav', 'home');
  document.querySelector('.nav-item:nth-child(3)')?.setAttribute('data-nav', 'home');
  document.querySelector('.nav-item:nth-child(4)')?.setAttribute('data-nav', 'home');

  go('home');
}

init();

// moved to frontend/src/features/ui.js: injectIdolDecorations
// moved to frontend/src/features/character.js: CHARS, charIndex, drawPixelChar, updateCharDisplay, prevChar, nextChar, openModeModal, closeModeModal

window.YUKI_SYSTEM_PROMPT = yukiConfig.systemPrompt;

function initTextPage() {
  const list = document.getElementById('text-chat-list');
  const input = document.getElementById('text-input');
  const btn = document.getElementById('text-send-btn');
  if (!list || !input || !btn) return;
  const textHistory = [];

  function addMsg(role, text, furigana) {
    const now = new Date();
    const ts = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    const row = document.createElement('div');
    row.className = 'text-msg-row ' + role;
    if (role === 'yuki') {
      const initials = { yuki: '悠', ren: '蓮', hana: '花', mio: '緒' }[appState.activeCharacter] || '悠';
      const msgId = 'msg-' + Date.now();
      row.innerHTML = `
        <div class="text-mini-avatar">${initials}</div>
        <div>
          <div class="text-bubble yuki" id="${msgId}" onclick="toggleTranslation('${msgId}')" style="cursor:pointer;">
            ${parseVocabMarkup(text)}
            <div class="msg-translation" id="tr-${msgId}" style="display:none;">
              <div class="translation-divider"></div>
              <div class="translation-text">${furigana || ''}</div>
            </div>
          </div>
          <div class="tap-hint">TAP TO TRANSLATE</div>
        </div>
        <span class="text-timestamp">${ts}</span>`;
    } else {
      row.innerHTML = `
        <span class="text-timestamp">${ts}</span>
        <div class="text-bubble user">${text}</div>`;
    }
    list.appendChild(row);
    list.scrollTop = list.scrollHeight;
  }

  function addTyping() {
    const row = document.createElement('div');
    row.className = 'text-msg-row yuki'; row.id = 'text-typing';
    row.innerHTML = '<div class="text-mini-avatar">悠</div><div class="text-bubble yuki text-typing"><div class="text-dot"></div><div class="text-dot"></div><div class="text-dot"></div></div>';
    list.appendChild(row); list.scrollTop = list.scrollHeight;
  }

  function removeTyping() {
    const el = document.getElementById('text-typing'); if (el) el.remove();
  }

  async function send() {
    const msg = input.value.trim(); if (!msg) return;
    input.value = '';
    addMsg('user', msg);
    textHistory.push({ role: 'user', content: msg });
    addTyping();
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ messages: textHistory, systemPrompt: window.YUKI_SYSTEM_PROMPT || 'You are Yuki, a friendly Japanese friend. Reply in Japanese with short casual sentences.' })
      });
      const data = await res.json();
      removeTyping();
      const replyJa = data.replyJa || data.text || '...';
      addMsg('yuki', replyJa, data.replyEn || '');
      textHistory.push({ role: 'assistant', content: replyJa });
    } catch(e) {
      removeTyping();
      addMsg('yuki', 'ごめん、ちょっと待って…', 'Sorry, one moment...');
    }
  }

  btn.addEventListener('click', send);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

  if (list.children.length === 0) {
    addMsg('yuki', 'あ、来てくれた！元気だった？', 'Ah, you came! How have you been?');
    textHistory.push({ role: 'assistant', content: 'あ、来てくれた！元気だった？' });
  }
}

initTextPage();

async function initTextPageForChar() {
  const list = document.getElementById('text-chat-list');
  if (!list) return;
  list.innerHTML = '';
  conversationHistory.length = 0;

  const characterId = appState.activeCharacter || 'yuki';
  const character = characterMap[characterId] || yukiConfig;

  const fixedOpenings = {
    ren:  { ja: 'よ。', en: 'Hey.' },
    hana: { ja: 'きたきた！', en: 'You came!' },
    mio:  { ja: 'あ、来てくれたんだ。', en: 'Oh, you came.' },
  };

  const now = new Date();
  const ts = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');

  function addTextMsg(ja, en) {
    const row = document.createElement('div');
    row.className = 'text-msg-row yuki';
    const initials = { yuki: '悠', ren: '蓮', hana: '花', mio: '緒' }[characterId] || '悠';
    const msgId = 'msg-' + Date.now();
    row.innerHTML = `
      <div class="text-mini-avatar">${initials}</div>
      <div>
        <div class="text-bubble yuki" id="${msgId}" onclick="toggleTranslation('${msgId}')" style="cursor:pointer;">
          ${parseVocabMarkup(ja)}
          <div class="msg-translation" id="tr-${msgId}" style="display:none;">
            <div class="translation-divider"></div>
            <div class="translation-text">${en || ''}</div>
          </div>
        </div>
        <div class="tap-hint">TAP TO TRANSLATE</div>
      </div>
      <span class="text-timestamp">${ts}</span>`;
    list.appendChild(row);
    list.scrollTop = list.scrollHeight;
  }

  if (fixedOpenings[characterId]) {
    const o = fixedOpenings[characterId];
    addTextMsg(o.ja, o.en);
    conversationHistory.push({ role: 'yuki', text: o.ja });
    return;
  }

  // yuki (and fallback): call Claude
  const typingRow = document.createElement('div');
  typingRow.className = 'text-msg-row yuki'; typingRow.id = 'text-typing-open';
  typingRow.innerHTML = '<div class="text-mini-avatar">悠</div><div class="text-bubble yuki text-typing"><div class="text-dot"></div><div class="text-dot"></div><div class="text-dot"></div></div>';
  list.appendChild(typingRow); list.scrollTop = list.scrollHeight;

  try {
    const reply = await getClaudeReply({
      character,
      topic:   getDailyTopic(new Date(), characterId),
      memory:  getCharacterMemory(characterId),
      history: [],
      userText: '[START]',
    });
    document.getElementById('text-typing-open')?.remove();
    const replyJa = reply.replyJa || 'よ';
    addTextMsg(replyJa, reply.replyEn || '');
    conversationHistory.push({ role: 'yuki', text: replyJa });
  } catch {
    document.getElementById('text-typing-open')?.remove();
    addTextMsg('よ', 'Hey');
    conversationHistory.push({ role: 'yuki', text: 'よ' });
  }
}

window.initTextPageForChar = initTextPageForChar;
window.triggerOpeningMessage = triggerOpeningMessage;

// moved to frontend/src/features/vocab.js
