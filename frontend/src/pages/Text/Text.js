import { appState } from '../../core/state.js';
import { getCharacterMemory, appendMemory } from '../../features/memory.js';
import { save } from '../../core/storage.js';
import { yukiConfig } from '../../characters/yuki/yuki.config.js';
import { initImageButton } from '../../features/imageInput.js';
import { resetSession } from '../../features/chat.js';
import { characterMap } from '../../characters/index.js';
import {
  getTextHistory,
  appendTextHistory,
} from '../../features/textHistory.js';
import { hideTalkBadge, updateFriendBadge } from '../../features/badge.js';
import { markAllRead } from '../../features/unreadQueue.js';

const TOPICS = [
  'そういえば、最近どんな音楽聴いてる？',
  '今日なんか良いことあった？',
  '最近ハマってるものある？',
  'ねえ、休みの日って何してる？',
  '最近見た映画とかドラマある？',
  '今日のご飯なに食べた？',
  'そういえば、猫派？犬派？',
  '最近ちょっと疲れてない？',
  '行ってみたい場所ってある？',
  'もし明日休みだったら何する？',
  '最近読んだ本とかある？',
  'お気に入りのカフェとかある？',
  '最近なんかハッピーなことあった？',
  '冬と夏、どっちが好き？',
  'そういえば、趣味ってなんだっけ？',
];

let _pendingImage = null; // { base64, mediaType, dataUrl }

function pickTopics(count = 2) {
  const shuffled = [...TOPICS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function renderTopicBar(sendFn) {
  const bar = document.getElementById('txt-topic-bar');
  if (!bar) return;
  let current = pickTopics(2);

  function renderPills() {
    bar.innerHTML = '';
    current.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'txt-topic-pill';
      btn.textContent = t;
      btn.addEventListener('click', () => {
        const input = document.getElementById('text-input');
        if (input) input.value = t;
        sendFn();
      });
      bar.appendChild(btn);
    });
    const refresh = document.createElement('button');
    refresh.className = 'txt-topic-refresh';
    refresh.textContent = '↻';
    refresh.title = '別のトピック';
    refresh.addEventListener('click', () => {
      current = pickTopics(2);
      renderPills();
    });
    bar.appendChild(refresh);
  }

  renderPills();
}

function initTextPage() {
  const list = document.getElementById('text-chat-list');
  const input = document.getElementById('text-input');
  const btn = document.getElementById('text-send-btn');
  if (!list || !input || !btn) return;

  const characterId = appState.activeCharacter || 'yuki';
  const character = characterMap[characterId] || yukiConfig;
  const initials = { yuki: '悠', ren: '蓮', hana: '花', mio: '緒' }[characterId] || '悠';

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
    const ts = fmtTime(new Date());
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

  function fmtTime(date) {
    return date.getHours().toString().padStart(2,'0') + ':' + date.getMinutes().toString().padStart(2,'0');
  }

  function addMsg(role, text, furigana, timestamp) {
    const ts = timestamp ? fmtTime(new Date(timestamp)) : fmtTime(new Date());
    const row = document.createElement('div');
    row.className = 'text-msg-row ' + role;
    if (role === 'yuki') {
      const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2);
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
    row.innerHTML = `<div class="text-mini-avatar">${initials}</div><div class="text-bubble yuki text-typing"><div class="text-dot"></div><div class="text-dot"></div><div class="text-dot"></div></div>`;
    list.appendChild(row); list.scrollTop = list.scrollHeight;
  }

  function removeTyping() {
    const el = document.getElementById('text-typing'); if (el) el.remove();
  }

  function buildSystemPrompt() {
    const base = character.systemPrompt || window.YUKI_SYSTEM_PROMPT || '';
    const memory = getCharacterMemory(characterId);
    if (!memory.length) return base;
    const memBlock = memory.map(m => `- ${m.factJa || m.fact || m}`).join('\n');
    return base + '\n\nユーザーについて覚えていること（会話で自然に活かすこと）:\n' + memBlock;
  }

  function saveMemoryCandidate(data) {
    const candidate = data.memoryCandidate;
    const isPrimarilyJapanese = (s) => { const jp = (s.match(/[\u3040-\u30ff\u4e00-\u9fff]/g)||[]).length; return jp >= 4 && jp/s.length > 0.3; };
    if (candidate && isPrimarilyJapanese(candidate)) {
      appendMemory(characterId, { factJa: candidate, source: 'text' });
      save('yukiMemory', candidate);
    }
  }

  async function send() {
    const msg = input.value.trim();
    if (!msg && !_pendingImage) return;
    input.value = '';

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
      const history = getTextHistory(characterId);
      const apiMessages = [
        ...history.slice(-20).map(m => ({ role: m.role === 'yuki' ? 'assistant' : m.role, content: m.content })),
        { role: 'user', content: userContent }
      ];
      appendTextHistory(characterId, 'user', caption);
      addTyping();
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ messages: apiMessages, systemPrompt: buildSystemPrompt() })
        });
        const data = await res.json();
        removeTyping();
        const replyJa = data.replyJa || data.text || '...';
        addMsg('yuki', replyJa, data.replyEn || '');
        appendTextHistory(characterId, 'assistant', replyJa, data.replyEn || '');
        saveMemoryCandidate(data);
      } catch {
        removeTyping();
        addMsg('yuki', 'ごめん、ちょっと待って…', 'Sorry, one moment...');
      }
      return;
    }

    addMsg('user', msg);
    appendTextHistory(characterId, 'user', msg);
    addTyping();
    try {
      const history = getTextHistory(characterId);
      const apiMessages = history.slice(-20).map(m => ({
        role: m.role === 'yuki' ? 'assistant' : m.role,
        content: m.content,
      }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ messages: apiMessages, systemPrompt: buildSystemPrompt() })
      });
      const data = await res.json();
      removeTyping();
      const replyJa = data.replyJa || data.text || '...';
      addMsg('yuki', replyJa, data.replyEn || '');
      appendTextHistory(characterId, 'assistant', replyJa, data.replyEn || '');
      saveMemoryCandidate(data);
    } catch {
      removeTyping();
      addMsg('yuki', 'ごめん、ちょっと待って…', 'Sorry, one moment...');
    }
  }

  btn.addEventListener('click', send);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

  // Render topic bar
  renderTopicBar(send);

  // Expose send for programmatic use
  window._textSend = send;

  // Return addMsg so initTextPageForChar can use it for restoring history
  return { addMsg };
}

async function initTextPageForChar() {
  const list = document.getElementById('text-chat-list');
  if (!list) return;
  list.innerHTML = '';
  resetSession();

  const characterId = appState.activeCharacter || 'yuki';
  const character = characterMap[characterId] || yukiConfig;

  // Update header
  const headerAvatar = document.querySelector('.text-avatar');
  const headerName = document.querySelector('.text-header-name');
  const headerSub = document.querySelector('.text-header-sub');
  const avatarText = { yuki: '悠生', ren: '蓮', hana: '花', mio: '緒' }[characterId] || '悠生';
  const fullName = { yuki: '凪原 悠生 — Yuki', ren: '蓮 — Ren', hana: '花 — Hana', mio: '緒 — Mio' }[characterId] || '凪原 悠生 — Yuki';
  const location = { yuki: '下北沢', ren: '大阪', hana: '京都', mio: '東京' }[characterId] || '下北沢';
  if (headerAvatar) headerAvatar.textContent = avatarText;
  if (headerName) headerName.textContent = fullName;
  if (headerSub) headerSub.innerHTML = `<span class="text-online-label">オンライン</span> · ${location}`;

  // Clear unread for this character
  markAllRead(characterId);
  updateFriendBadge(characterId, 0);

  // Init input binding first to get addMsg
  const { addMsg } = initTextPage() || {};

  if (!addMsg) return;

  // Restore history from localStorage
  const history = getTextHistory(characterId);
  history.forEach(entry => {
    const role = entry.role === 'assistant' ? 'yuki' : entry.role;
    addMsg(role, entry.content, entry.replyEn || '', entry.timestamp);
  });

  list.scrollTop = list.scrollHeight;
}

export { initTextPage, initTextPageForChar };
