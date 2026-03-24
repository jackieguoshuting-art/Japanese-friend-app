import { appState } from '../../core/state.js';
import { getDailyTopic } from '../../features/topics.js';
import { getCharacterMemory } from '../../features/memory.js';
import { getClaudeReply } from '../../services/claude.service.js';
import { yukiConfig } from '../../characters/yuki/yuki.config.js';
import { renConfig } from '../../characters/ren/ren.config.js';
import { hanaConfig } from '../../characters/hana/hana.config.js';

const characterMap = {
  yuki: yukiConfig,
  ren: renConfig,
  hana: hanaConfig,
  mio: yukiConfig,
};

let textHistory = [];

function initTextPage() {
  const list = document.getElementById('text-chat-list');
  const input = document.getElementById('text-input');
  const btn = document.getElementById('text-send-btn');
  if (!list || !input || !btn) return;

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
            ${window.parseVocabMarkup?.(text) ?? text}
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
      const characterId = appState.activeCharacter || 'yuki';
      const character = characterMap[characterId] || yukiConfig;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ messages: textHistory, systemPrompt: character.systemPrompt || window.YUKI_SYSTEM_PROMPT || 'You are a friendly Japanese AI friend. Reply only in JSON: {"replyJa":"...","replyEn":"...","memoryCandidate":""}' })
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

  btn.onclick = send;
  input.onkeydown = e => { if (e.key === 'Enter') send(); };

  if (list.children.length === 0) {
    addMsg('yuki', 'あ、来てくれた！元気だった？', 'Ah, you came! How have you been?');
    textHistory.push({ role: 'assistant', content: 'あ、来てくれた！元気だった？' });
  }
}

async function initTextPageForChar() {
  const list = document.getElementById('text-chat-list');
  if (!list) return;
  list.innerHTML = '';
  textHistory = [];
  if (window._convHistory) window._convHistory.length = 0;

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
          ${window.parseVocabMarkup?.(ja) ?? ja}
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
    window._convHistory?.push({ role: 'yuki', text: o.ja });
    initTextPage();
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
    window._convHistory?.push({ role: 'yuki', text: replyJa });
  } catch {
    document.getElementById('text-typing-open')?.remove();
    addTextMsg('よ', 'Hey');
    window._convHistory?.push({ role: 'yuki', text: 'よ' });
  }
}

window.initTextPage = initTextPage;
window.initTextPageForChar = initTextPageForChar;
