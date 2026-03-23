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

// moved to frontend/src/pages/Call/Call.js: appendChatMessage

// moved to frontend/src/pages/Call/Call.js: triggerOpeningMessage

// moved to frontend/src/pages/Call/Call.js: initCallInput

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
  window.initCallInput?.();
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

// moved to frontend/src/features/vocab.js
