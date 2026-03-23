import { appState } from '../core/state.js';
import { getCharacterMemory } from './memory.js';
import { yukiConfig } from '../characters/yuki/yuki.config.js';
import { renConfig } from '../characters/ren/ren.config.js';
import { hanaConfig } from '../characters/hana/hana.config.js';

const characterMap = {
  yuki: yukiConfig,
  ren:  renConfig,
  hana: hanaConfig,
  mio:  yukiConfig,
};

const CHARS = [
  { name: 'YUKI · 悠生', bodyColor: '#1a3a7a', hairColor: '#2a2a4a', skinColor: '#d4b896', accentColor: '#3060cc' },
  { name: 'REN · 蓮',    bodyColor: '#0a1a2a', hairColor: '#1a1a2a', skinColor: '#c8a882', accentColor: '#204060' },
  { name: 'HANA · 花',   bodyColor: '#0a3040', hairColor: '#3a1a1a', skinColor: '#d8b898', accentColor: '#1a7080' },
  { name: 'MIO · 美緒',  bodyColor: '#0a2a1a', hairColor: '#1a1a10', skinColor: '#c8a878', accentColor: '#186040' },
];
let charIndex = 0;

function setActiveCharacter(characterId) {
  appState.activeCharacter = characterId;
  if (window._convHistory) window._convHistory.length = 0;
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
  window.initWordTooltips?.();
}

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

window.setActiveCharacter = setActiveCharacter;
window.drawPixelChar = drawPixelChar;
window.updateCharDisplay = updateCharDisplay;
window.prevChar = prevChar;
window.nextChar = nextChar;
window.openModeModal = openModeModal;
window.closeModeModal = closeModeModal;

updateCharDisplay();
const _modeOverlay = document.getElementById('mode-modal');
if (_modeOverlay) _modeOverlay.addEventListener('click', (e) => {
  if (e.target === _modeOverlay) closeModeModal();
});
