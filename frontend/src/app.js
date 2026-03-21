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

const characterMap = { yuki: yukiConfig, ren: renConfig, hana: hanaConfig };

// Tracks messages for the current call session
const conversationHistory = [];

function spawnStars(layerId) {
  const layer = document.getElementById(layerId);
  if (!layer) return;
  const glyphs = ['✦', '✧', '⋆', '˚', '·', '★', '✩'];
  for (let i = 0; i < 22; i += 1) {
    const s = document.createElement('div');
    s.className = 'star';
    s.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
    s.style.left = `${Math.random() * 96}%`;
    s.style.top = `${Math.random() * 96}%`;
    s.style.fontSize = `${7 + Math.random() * 10}px`;
    s.style.opacity = (0.15 + Math.random() * 0.45).toFixed(2);
    s.style.animationDelay = `${Math.random() * 6}s`;
    s.style.animationDuration = `${4 + Math.random() * 5}s`;
    layer.appendChild(s);
  }
  for (let i = 0; i < 9; i += 1) {
    const d = document.createElement('div');
    d.className = 'diamond-shape';
    const size = 4 + Math.random() * 6;
    d.style.width = `${size}px`;
    d.style.height = `${size}px`;
    d.style.left = `${Math.random() * 96}%`;
    d.style.top = `${Math.random() * 96}%`;
    d.style.animationDelay = `${Math.random() * 7}s`;
    d.style.animationDuration = `${5 + Math.random() * 5}s`;
    layer.appendChild(d);
  }
}

function animateVoiceBars() {
  const bars = document.querySelectorAll('#wave-viz .wbar');
  setInterval(() => {
    bars.forEach((bar) => {
      const height = 10 + Math.random() * 36;
      bar.style.height = `${height}px`;
    });
  }, 180);
}

function initWordTooltips() {
  document.querySelectorAll('.word-link').forEach((word) => {
    word.addEventListener('click', (event) => {
      const tip = event.target.getAttribute('title');
      if (!tip) return;
      const bubble = document.createElement('div');
      bubble.textContent = tip;
      bubble.style.cssText = `
        position: fixed;
        background: rgba(20,18,50,0.95);
        border: 1px solid rgba(122,188,255,0.4);
        color: #7abcff;
        padding: 6px 14px;
        border-radius: 10px;
        font-size: 13px;
        z-index: 999;
        pointer-events: none;
        top: ${event.clientY - 44}px;
        left: ${Math.min(event.clientX - 40, 280)}px;
        font-family: 'Noto Sans JP', sans-serif;
      `;
      document.body.appendChild(bubble);
      setTimeout(() => bubble.remove(), 1800);
    });
  });
}

function setActiveCharacter(characterId) {
  appState.activeCharacter = characterId;
  conversationHistory.length = 0;
  const character = characterMap[characterId] || yukiConfig;
  const topic = getDailyTopic(new Date(), characterId);
  const memory = getCharacterMemory(characterId);
  const emoji = {
    yuki: '🌸',
    ren: '⚡',
    hana: '🌺'
  }[characterId] || '🌸';

  document.querySelector('.char-big').textContent = emoji;
  document.querySelector('.call-name').textContent = `✦ ${character.name} と通話中 ✦`;
  document.querySelector('.call-mood').textContent = `${characterId === 'ren' ? '😌 落ち着いた気分' : characterId === 'hana' ? '🤩 元気いっぱい' : '😊 楽しい気分'} · ${character.name} mood`;
  document.querySelector('.dlg-jp').innerHTML = `${topic.openerJa.replace('週末', '<span class="word-link" title="週末 = weekend">週末</span>').replace('映画', '<span class="word-link" title="映画 = movie">映画</span>')}`;
  document.querySelector('.dlg-en').textContent = `"${topic.openerEn}"`;
  document.querySelector('.summary-ava').textContent = emoji;
  document.querySelector('.mem-ava').textContent = emoji;
  document.querySelector('.memory-card .mem-text').textContent = memory[0]?.factJa || '「アメリカに住んでるって言ってたね」';
  document.querySelector('.memory-card .mem-en').textContent = memory[0]?.factEn || `"You mentioned you live in America" — saved to ${character.name}'s memory ✦`;
  initWordTooltips();
}

function bindCharacterButtons() {
  document.querySelector('.yuki-card')?.addEventListener('click', () => {
    setActiveCharacter('yuki');
    go('call');
  });

  const friendCards = [...document.querySelectorAll('.friend-sm:not(.offline)')];
  friendCards.forEach((card, index) => {
    const ids = ['ren', 'hana', 'mio']; // mio falls back later
    const id = ids[index];
    card.addEventListener('click', () => {
      setActiveCharacter(id === 'mio' ? 'yuki' : id);
      go('call');
    });
  });
}

function seedInitialMemory() {
  // Seed removed — memory card now shows real AI-generated memories only
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
    document.querySelector('.dlg-jp').textContent = '……';
    document.querySelector('.dlg-en').textContent = '';

    try {
      const reply = await getClaudeReply({
        character,
        topic:    getDailyTopic(new Date(), characterId),
        memory:   getCharacterMemory(characterId),
        history:  [],
        userText: text,
      });
      const replyJa = reply.replyJa || '……';
      document.querySelector('.dlg-jp').textContent = replyJa;
      document.querySelector('.dlg-en').textContent = reply.replyEn || '';
      conversationHistory.push({ role: 'yuki', text: replyJa });
      if (reply.memoryCandidate) {
        appendMemory(characterId, { factJa: reply.memoryCandidate, source: 'conversation' });
        save('yukiMemory', reply.memoryCandidate);
      }
    } catch {
      const fallback = getRandomFallbackReply();
      document.querySelector('.dlg-jp').textContent = fallback.replyJa;
      document.querySelector('.dlg-en').textContent = fallback.replyEn;
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
  ['sl-home', 'sl-friends', 'sl-call', 'sl-summary'].forEach(spawnStars);
  animateVoiceBars();
  seedInitialMemory();
  setActiveCharacter('yuki');
  bindCharacterButtons();
  initCallInput();
  initBottomNav();
  initWordTooltips();

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
