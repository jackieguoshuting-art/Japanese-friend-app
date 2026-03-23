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
  const displayName = { yuki: 'Yuki', ren: 'Ren', hana: 'Hana', mio: 'Mio' }[characterId] || character.name;
  const memory = getCharacterMemory(characterId);
  const emoji = {
    yuki: '🌸',
    ren: '⚡',
    hana: '🌺',
    mio: '🌙'
  }[characterId] || '🌸';

  document.querySelector('.char-big').textContent = emoji;
  document.querySelector('.call-name').textContent = `✦ ${displayName} と通話中 ✦`;
  document.querySelector('.call-mood').textContent = `${characterId === 'ren' ? '😌 落ち着いた気分' : characterId === 'hana' ? '🤩 元気いっぱい' : '😊 楽しい気分'} · ${character.name} mood`;
  const chatList = document.getElementById('chat-list');
  if (chatList) chatList.innerHTML = '';
  document.querySelector('.summary-ava').textContent = emoji;
  document.querySelector('.mem-ava').textContent = emoji;
  document.querySelector('.memory-card .mem-text').textContent = memory[0]?.factJa || '「アメリカに住んでるって言ってたね」';
  document.querySelector('.memory-card .mem-en').textContent = memory[0]?.factEn || `"You mentioned you live in America" — saved to ${character.name}'s memory ✦`;
  initWordTooltips();
}

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

function injectIdolDecorations() {
  const configs = [
    { id:'sl-home',    items:[{top:'18%',left:'6%'},{top:'28%',right:'8%'},{top:'55%',left:'4%'},{bottom:'35%',right:'8%'}] },
    { id:'sl-friends', items:[{top:'12%',left:'5%'},{top:'45%',right:'5%'},{bottom:'30%',left:'8%'}] },
    { id:'sl-call',    items:[{top:'20%',left:'5%'},{top:'40%',right:'6%'}] },
    { id:'sl-summary', items:[{top:'10%',right:'8%'},{bottom:'40%',left:'6%'}] },
  ];
  const chars = ['✦','✧','★','◆','✶'];
  const beamColors = ['#ff60d0','#60b0ff','#ffe060','#c060ff'];
  const beamAngles = [-18,-6,8,20];

  configs.forEach(cfg => {
    const el = document.getElementById(cfg.id);
    if (!el) return;
    cfg.items.forEach((pos, i) => {
      const s = document.createElement('div');
      s.className = 'sparkle-deco';
      s.textContent = chars[i % chars.length];
      s.style.fontSize = (10 + (i%3)*3) + 'px';
      s.style.animationDelay = (i * 0.4) + 's';
      Object.assign(s.style, pos);
      el.appendChild(s);
    });
    beamColors.forEach((color, i) => {
      const b = document.createElement('div');
      b.className = 'light-beam';
      b.style.left = (i * 25) + '%';
      b.style.background = `linear-gradient(180deg,${color},transparent)`;
      b.style.transform = `rotate(${beamAngles[i]}deg)`;
      b.style.animationDelay = (i * 0.5) + 's';
      el.appendChild(b);
    });
  });
}
document.addEventListener('DOMContentLoaded', injectIdolDecorations);

const CHARS = [
  { name: 'YUKI · 悠生', bodyColor: '#1a3a7a', hairColor: '#2a2a4a', skinColor: '#d4b896', accentColor: '#3060cc' },
  { name: 'REN · 蓮',    bodyColor: '#0a1a2a', hairColor: '#1a1a2a', skinColor: '#c8a882', accentColor: '#204060' },
  { name: 'HANA · 花',   bodyColor: '#0a3040', hairColor: '#3a1a1a', skinColor: '#d8b898', accentColor: '#1a7080' },
  { name: 'MIO · 美緒',  bodyColor: '#0a2a1a', hairColor: '#1a1a10', skinColor: '#c8a878', accentColor: '#186040' },
];
let charIndex = 0;

function drawPixelChar(cfg) {
  const canvas = document.getElementById('home-char-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 72, 110);
  ctx.imageSmoothingEnabled = false;
  const S = 5;
  const rows = [
    [0,0,1,1,1,1,0,0],
    [0,1,2,2,2,2,1,0],
    [0,1,2,3,2,2,1,0],
    [0,1,2,2,2,2,1,0],
    [0,0,1,4,4,1,0,0],
    [1,5,5,5,5,5,5,1],
    [5,5,5,5,5,5,5,5],
    [5,5,5,5,5,5,5,5],
    [0,5,6,5,5,6,5,0],
    [0,0,6,6,6,6,0,0],
    [0,0,6,6,6,6,0,0],
    [0,0,6,0,0,6,0,0],
    [0,0,7,0,0,7,0,0],
    [0,0,7,0,0,7,0,0],
  ];
  const colorMap = {
    0: 'transparent',
    1: cfg.hairColor,
    2: cfg.skinColor,
    3: '#50a0e0',
    4: '#d06878',
    5: cfg.bodyColor,
    6: '#0a1428',
    7: cfg.accentColor,
  };
  const ox = (72 - 8 * S) / 2;
  rows.forEach((row, y) => {
    row.forEach((v, x) => {
      if (v === 0) return;
      ctx.fillStyle = colorMap[v];
      ctx.fillRect(ox + x * S, 8 + y * S, S, S);
    });
  });
}

function updateCharDisplay() {
  const cfg = CHARS[charIndex];
  const nameTag = document.getElementById('char-name-tag');
  if (nameTag) nameTag.textContent = cfg.name;
  drawPixelChar(cfg);
}

function prevChar() {
  charIndex = (charIndex - 1 + CHARS.length) % CHARS.length;
  updateCharDisplay();
}

function nextChar() {
  charIndex = (charIndex + 1) % CHARS.length;
  updateCharDisplay();
}

function openModeModal(skipCharSelect) {
  if (!skipCharSelect) {
    const charIdMap = ['yuki', 'ren', 'hana', 'mio'];
    const selectedId = charIdMap[charIndex] || 'yuki';
    setActiveCharacter(selectedId);
  }
  const m = document.getElementById('mode-modal');
  if (m) m.style.display = 'flex';
}

function closeModeModal() {
  const m = document.getElementById('mode-modal');
  if (m) m.style.display = 'none';
}

window.prevChar = prevChar;
window.nextChar = nextChar;
window.openModeModal = openModeModal;
window.setActiveCharacter = setActiveCharacter;
window.closeModeModal = closeModeModal;

updateCharDisplay();
const _modeOverlay = document.getElementById('mode-modal');
if (_modeOverlay) _modeOverlay.addEventListener('click', (e) => {
  if (e.target === _modeOverlay) closeModeModal();
});

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
