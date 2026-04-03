import { appState } from '../../core/state.js';
import { getDailyTopic } from '../../features/topics.js';
import { getCharacterMemory } from '../../features/memory.js';
import { getClaudeReply } from '../../services/claude.service.js';
import { yukiConfig } from '../../characters/yuki/yuki.config.js';
import { renConfig } from '../../characters/ren/ren.config.js';
import { hanaConfig } from '../../characters/hana/hana.config.js';
import { initImageButton, compressImage } from '../../features/imageInput.js';

const characterMap = {
  yuki: yukiConfig,
  ren: renConfig,
  hana: hanaConfig,
  mio: yukiConfig,
};

let textHistory = [];
let _pendingImage = null; // { base64, mediaType, dataUrl }

function initTextPage() {
  const list = document.getElementById('text-chat-list');
  const input = document.getElementById('text-input');
  const btn = document.getElementById('text-send-btn');
  if (!list || !input || !btn) return;

  // ── Image preview area ──────────────────────────────
  function showImagePreview(dataUrl) {
    let preview = document.getElementById('text-image-preview');
    if (!preview) return;
    preview.style.display = 'flex';
    preview.innerHTML = `
      <img src="${dataUrl}" style="height:56px;border-radius:8px;object-fit:cover;">
      <button id="text-image-preview-remove" style="background:rgba(0,0,0,0.5);color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:12px;cursor:pointer;margin-left:6px;flex-shrink:0;">✕</button>`;
    document.getElementById('text-image-preview-remove')?.addEventListener('click', clearImagePreview);
  }

  function clearImagePreview() {
    _pendingImage = null;
    const preview = document.getElementById('text-image-preview');
    if (preview) { preview.innerHTML = ''; preview.style.display = 'none'; }
  }

  function addImageMsg(dataUrl, caption) {
    const now = new Date();
    const ts = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    const row = document.createElement('div');
    row.className = 'text-msg-row user';
    const safe = caption ? `<div style="margin-top:4px;font-size:12px;opacity:0.85;">${window.escapeHtml?.(caption) ?? caption}</div>` : '';
    row.innerHTML = `
      <span class="text-timestamp">${ts}</span>
      <div class="text-bubble user" style="padding:6px;">
        <img src="${dataUrl}" style="max-width:180px;border-radius:8px;display:block;">${safe}
      </div>`;
    list.appendChild(row);
    list.scrollTop = list.scrollHeight;
  }

  // ── Camera button ────────────────────────────────────
  initImageButton({
    btnId: 'text-camera-btn',
    onImage: (data) => {
      _pendingImage = data;
      showImagePreview(data.dataUrl);
      input.focus();
    }
  });

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
    const msg = input.value.trim();
    if (!msg && !_pendingImage) return;
    input.value = '';

    const characterId = appState.activeCharacter || 'yuki';
    const character = characterMap[characterId] || yukiConfig;

    if (_pendingImage) {
      const img = _pendingImage;
      _pendingImage = null;
      clearImagePreview();
      const caption = msg || 'この画像どう思う？';
      addImageMsg(img.dataUrl, msg || '');
      const userContent = [
        { type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.base64 } },
        { type: 'text', text: caption }
      ];
      // Build API messages: history (text-only) + current image turn
      const apiMessages = [
        ...textHistory.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userContent }
      ];
      textHistory.push({ role: 'user', content: caption });
      addTyping();
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ messages: apiMessages, systemPrompt: character.systemPrompt || window.YUKI_SYSTEM_PROMPT })
        });
        const data = await res.json();
        removeTyping();
        const replyJa = data.replyJa || data.text || '...';
        addMsg('yuki', replyJa, data.replyEn || '');
        textHistory.push({ role: 'assistant', content: replyJa });
      } catch {
        removeTyping();
        addMsg('yuki', 'ごめん、ちょっと待って…', 'Sorry, one moment...');
      }
      return;
    }

    addMsg('user', msg);
    textHistory.push({ role: 'user', content: msg });
    addTyping();
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ messages: textHistory, systemPrompt: character.systemPrompt || window.YUKI_SYSTEM_PROMPT })
      });
      const data = await res.json();
      removeTyping();
      const replyJa = data.replyJa || data.text || '...';
      addMsg('yuki', replyJa, data.replyEn || '');
      textHistory.push({ role: 'assistant', content: replyJa });
    } catch {
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

async function initTextPageForChar() {
  const list = document.getElementById('text-chat-list');
  if (!list) return;
  list.innerHTML = '';
  textHistory = [];
  if (window._convHistory) window._convHistory.length = 0;

  const characterId = appState.activeCharacter || 'yuki';
  const character = characterMap[characterId] || yukiConfig;

  const headerAvatar = document.querySelector('.text-avatar');
  const headerName = document.querySelector('.text-header-name');
  const headerSub = document.querySelector('.text-header-sub');
  const avatarText = { yuki: '悠生', ren: '蓮', hana: '花', mio: '緒' }[characterId] || '悠生';
  const fullName = { yuki: '凪原 悠生 — Yuki', ren: '蓮 — Ren', hana: '花 — Hana', mio: '緒 — Mio' }[characterId] || '凪原 悠生 — Yuki';
  const location = { yuki: '下北沢', ren: '大阪', hana: '京都', mio: '東京' }[characterId] || '下北沢';
  if (headerAvatar) headerAvatar.textContent = avatarText;
  if (headerName) headerName.textContent = fullName;
  if (headerSub) headerSub.innerHTML = `<span class="text-online-label">オンライン</span> · ${location}`;

  const fixedOpenings = {
    ren:  { ja: '1', en: '1' },
    hana: { ja: '2', en: '2' },
    mio:  { ja: '3', en: '3' },
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
