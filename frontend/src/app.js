import { go } from './core/router.js';
import { appState } from './core/state.js';
import { getCallHistory } from './core/conversationStore.js';
import { getDailyTopic } from './features/topics.js';
import { appendMemory, getCharacterMemory } from './features/memory.js';
import { yukiConfig } from './characters/yuki/yuki.config.js';
import { renConfig } from './characters/ren/ren.config.js';
import { hanaConfig } from './characters/hana/hana.config.js';
import { getClaudeReply } from './services/claude.service.js';
import { getRandomFallbackReply } from './features/chat.js';
import { save, load } from './core/storage.js';
import { shouldSendProactive, markProactiveSent, generateProactiveMessage } from './features/proactiveMessage.js';
import { showInAppNotification } from './features/inAppNotification.js';
import { showTalkBadge } from './features/badge.js';
import { addUnread, getUnreadCount, getTotalUnread, markAllRead } from './features/unreadQueue.js';
import { updateFriendBadge, refreshAllFriendBadges } from './features/badge.js';
import { appendTextHistory } from './features/textHistory.js';

// 去除 VOCAB_MARKUP 标记,用于纯文本显示场景(通知条、Summary 等)
function stripVocabMarkup(text) {
  return (text || '').replace(/\[\[([^|[\]]+)\|[^\]]+\]\]/g, '$1');
}

const characterMap = {
  yuki: yukiConfig,
  ren:  renConfig,
  hana: hanaConfig,
  mio:  yukiConfig,
};

// Call conversation history is now managed by core/conversationStore.js

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
            <div class="conv-text">${m.role === 'user' ? (window.escapeHtml?.(m.text) ?? m.text) : stripVocabMarkup(m.text)}</div>
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

  const isPrimarilyJapanese = (s) => {
    if (!s) return false;
    const jp = (s.match(/[\u3040-\u30ff\u4e00-\u9fff]/g) || []).length;
    return jp >= 4 && jp / s.length > 0.3;
  };
  const sessionMemory = window.getSessionMemory?.() || null;
  if (sessionMemory && isPrimarilyJapanese(sessionMemory)) {
    memText.textContent = `「${sessionMemory}」`;
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

window.endCall = function () {
  try { window.stopSpeaking?.(); } catch (e) { /* ignore */ }
  try { window.resetYukiToIdle?.(); } catch (e) { /* ignore */ }
  try { save('lastConversation', getCallHistory()); } catch (e) { console.warn('endCall save:', e); }
  try { renderConversationSummary(); } catch (e) { console.warn('endCall renderSummary:', e); }
  try { renderMemoryCard(); } catch (e) { console.warn('endCall renderMemory:', e); }
  go('summary');
};

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
  document.querySelector('.btn-end-top')?.addEventListener('click', () => { window.stopSpeaking?.(); go('friends'); });
  document.querySelector('.ctrl .end-call')?.parentElement?.addEventListener('click', () => {
    window.stopSpeaking?.();
    save('lastConversation', getCallHistory());
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

// moved to frontend/src/pages/Text/Text.js: initTextPage + initTextPageForChar
// (initTextPage is called internally by initTextPageForChar — no standalone call needed)

// moved to frontend/src/features/vocab.js

// ── Proactive message check on page:enter event ──
let _proactiveTimer = null;
window.addEventListener('page:enter', (e) => {
  const pageName = e.detail?.pageName;
  if (pageName === 'text') return;
  clearTimeout(_proactiveTimer);
  _proactiveTimer = setTimeout(async () => {
    const characterId = appState.activeCharacter || 'yuki';
    if (!shouldSendProactive(characterId)) return;
    const character = characterMap[characterId] || yukiConfig;
    const memory = getCharacterMemory(characterId);
    try {
      markProactiveSent(characterId);
      const data = await generateProactiveMessage(character, memory);
      const replyJa = data.replyJa || data.text || '';
      if (!replyJa) return;
      appendTextHistory(characterId, 'assistant', replyJa);
      addUnread(characterId);
      updateFriendBadge(characterId, getUnreadCount(characterId));
      showInAppNotification({
        characterName: character.name || characterId,
        messageJa: stripVocabMarkup(replyJa),
        messageEn: stripVocabMarkup(data.replyEn || ''),
        avatarSrc: character.photoSrc || `/frontend/public/assets/characters/${characterId}/${characterId}-photo.jpg`,
        onClick: () => {
          appState.activeCharacter = characterId;
          go('friends');
          setTimeout(() => {
            go('text');
            window.initTextPageForChar?.();
          }, 300);
        },
      });
    } catch { /* ignore */ }
  }, 3000);
});

// ── App 启动时:读取已有未读,更新红点,如有则弹汇总通知 ──
(function onAppStart() {
  const characterIds = ['yuki', 'ren', 'hana', 'mio'];
  refreshAllFriendBadges(characterIds, getUnreadCount);
  const total = getTotalUnread(characterIds);
  if (total > 0) {
    const firstWithUnread = characterIds.find(id => getUnreadCount(id) > 0);
    const character = characterMap[firstWithUnread] || yukiConfig;
    showInAppNotification({
      characterName: character.name || firstWithUnread,
      messageJa: `未読メッセージ ${total} 件`,
      messageEn: `${total} unread message${total > 1 ? 's' : ''}`,
      avatarSrc: character.photoSrc || `/frontend/public/assets/characters/${firstWithUnread}/${firstWithUnread}-photo.jpg`,
      onClick: () => {
        appState.activeCharacter = firstWithUnread;
        go('friends');
        setTimeout(() => {
          go('text');
          window.initTextPageForChar?.();
        }, 300);
      },
    });
  }
})();
