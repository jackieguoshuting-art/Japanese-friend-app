import { appState } from '../core/state.js';
import { getCharacterMemory } from './memory.js';
import { yukiConfig } from '../characters/yuki/yuki.config.js';
import { renConfig } from '../characters/ren/ren.config.js';
import { hanaConfig } from '../characters/hana/hana.config.js';
import { resetCallHistory } from '../core/conversationStore.js';

const characterMap = {
  yuki: yukiConfig,
  ren:  renConfig,
  hana: hanaConfig,
  mio:  yukiConfig,
};

const CHARS = [
  { name: 'YUKI · 悠生', nameEn: 'YUKI', nameJp: '凪原 悠生', bodyColor: '#1a3a7a', hairColor: '#2a2a4a', skinColor: '#d4b896', accentColor: '#3060cc' },
  { name: 'REN · 蓮',    nameEn: 'REN',  nameJp: '蓮',        bodyColor: '#0a1a2a', hairColor: '#1a1a2a', skinColor: '#c8a882', accentColor: '#204060' },
  { name: 'HANA · 花',   nameEn: 'HANA', nameJp: '花',        bodyColor: '#0a3040', hairColor: '#3a1a1a', skinColor: '#d8b898', accentColor: '#1a7080' },
  { name: 'MIO · 美緒',  nameEn: 'MIO',  nameJp: '美緒',      bodyColor: '#0a2a1a', hairColor: '#1a1a10', skinColor: '#c8a878', accentColor: '#186040' },
];
let charIndex = 0;

function setActiveCharacter(characterId) {
  appState.activeCharacter = characterId;
  resetCallHistory();
  const character = characterMap[characterId] || yukiConfig;
  const displayName = { yuki: 'Yuki', ren: 'Ren', hana: 'Hana', mio: 'Mio' }[characterId] || character.name;
  const memory = getCharacterMemory(characterId);
  const emoji = {
    yuki: '🌸',
    ren: '⚡',
    hana: '🌺',
    mio: '🌙'
  }[characterId] || '🌸';

  const charBig = document.querySelector('.char-big');
  if (charBig) charBig.textContent = emoji;
  const callName = document.querySelector('.call-name');
  if (callName) callName.textContent = `✦ ${displayName} と通話中 ✦`;
  const callMood = document.querySelector('.call-mood');
  if (callMood) callMood.textContent = `${characterId === 'ren' ? '😌 落ち着いた気分' : characterId === 'hana' ? '🤩 元気いっぱい' : '😊 楽しい気分'} · ${character.name} mood`;
  const chatList = document.getElementById('chat-list');
  if (chatList) chatList.innerHTML = '';
  const summaryAva = document.querySelector('.summary-ava');
  if (summaryAva) summaryAva.textContent = emoji;
  const memAva = document.querySelector('.mem-ava');
  if (memAva) memAva.textContent = emoji;
  const isPrimarilyJapanese = (s) => {
    if (!s) return false;
    const jp = (s.match(/[\u3040-\u30ff\u4e00-\u9fff]/g) || []).length;
    return jp >= 4 && jp / s.length > 0.3;
  };
  const validMemory = memory.find(m => isPrimarilyJapanese(m.factJa));
  const memText = document.querySelector('.memory-card .mem-text');
  if (memText) memText.textContent = validMemory ? `「${validMemory.factJa}」` : '「まだ何も覚えていないよ」';
  const memEn = document.querySelector('.memory-card .mem-en');
  if (memEn) memEn.textContent = validMemory ? `Saved to ${character.name}'s memory ✦` : 'No memories yet.';
  window.initWordTooltips?.();
}

function updateCharDisplay() {
  const cfg = CHARS[charIndex];
  const nameTag = document.getElementById('char-name-tag');
  if (nameTag) nameTag.innerHTML = `<span class="home-name-en">${cfg.nameEn || cfg.name}</span><span class="home-name-jp">${cfg.nameJp || ''}</span>`;
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
