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
  // Do not set nav items 3–4 here: index.html assigns Shadow/Listen targets; overwriting
  // data-nav broke Shadow on Home (listener ran after onclick and called go('home')).

  go('home');
}

init();

// moved to frontend/src/features/ui.js: injectIdolDecorations
// moved to frontend/src/features/character.js: CHARS, charIndex, drawPixelChar, updateCharDisplay, prevChar, nextChar, openModeModal, closeModeModal

window.YUKI_SYSTEM_PROMPT = yukiConfig.systemPrompt;

// moved to frontend/src/pages/Text/Text.js: initTextPage
window.initTextPage?.();

// moved to frontend/src/pages/Text/Text.js: initTextPageForChar

// moved to frontend/src/features/vocab.js
