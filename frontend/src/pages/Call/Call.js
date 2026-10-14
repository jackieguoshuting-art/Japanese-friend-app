import { appState } from '../../core/state.js';
import { speakJapanese, stopSpeaking } from '../../features/tts.js';
import { initYukiAnimation, setEmotion, resetToIdle, onUserSpeak } from '../../features/yukiAnimation.js';
import { initVoiceButton } from '../../features/voiceUI.js';
import { initImageButton } from '../../features/imageInput.js';
import { getDailyTopic } from '../../features/topics.js';
import { getCharacterMemory, appendMemory } from '../../features/memory.js';
import { getClaudeReply } from '../../services/claude.service.js';
import { getRandomFallbackReply, resetSession } from '../../features/chat.js';
import { save } from '../../core/storage.js';
import { characterMap } from '../../characters/index.js';
import { yukiConfig } from '../../characters/yuki/yuki.config.js';
import {
  resetCallHistory,
  pushCallMessage,
  getCallApiHistory,
  getCallApiMessages,
} from '../../core/conversationStore.js';

const CALL_CAPTION_KEY = 'callCaptionMode';
const CALL_MODE_KEY = 'call-mode';
let sessionMemoryCandidate = null;

function getCallMode() {
  return localStorage.getItem(CALL_MODE_KEY) === 'teacher' ? 'teacher' : 'friend';
}

function applyCallMode() {
  const mode = getCallMode();
  const page = document.getElementById('pg-call');
  const button = document.getElementById('call-mode-btn');
  const title = document.getElementById('call-header-title');
  page?.classList.toggle('vc-teacher-mode', mode === 'teacher');
  if (button) {
    button.textContent = mode === 'teacher' ? '切回朋友' : '切换到老师';
    button.setAttribute('aria-pressed', mode === 'teacher' ? 'true' : 'false');
    button.setAttribute('aria-label', mode === 'teacher' ? '切换到朋友模式' : '切换到老师模式');
  }
  if (title) title.textContent = mode === 'teacher' ? 'TEACHER MODE' : 'ARCHIVE_01';
}

function speakCallReply(reply) {
  const ja = reply?.replyJa || '';
  const explanation = reply?.replyEn || '';
  speakJapanese(getCallMode() === 'teacher' && explanation ? `${ja}。${explanation}` : ja);
}

async function toggleCallMode() {
  if (document.getElementById('call-mode-btn')?.disabled) return;
  const next = getCallMode() === 'teacher' ? 'friend' : 'teacher';
  localStorage.setItem(CALL_MODE_KEY, next);
  applyCallMode();
  resetCallHistory();
  const list = document.getElementById('chat-list');
  if (list) list.replaceChildren();
  await triggerOpeningMessage();
}

function getCallCaptionMode() {
  return localStorage.getItem(CALL_CAPTION_KEY) || 'bilingual';
}

function applyCallCaptionMode() {
  const mode = getCallCaptionMode();
  const list = document.getElementById('chat-list');
  if (list) {
    list.classList.toggle('caption-mode-ja-only', mode === 'ja-only');
    list.classList.toggle('caption-mode-bilingual', mode === 'bilingual');
  }
  const bottomLbl = document.getElementById('call-caption-lbl');
  const headerBtn = document.getElementById('call-header-caption-btn');
  if (bottomLbl) {
    bottomLbl.textContent = mode === 'ja-only' ? '字幕 · 日本語のみ' : '字幕 · 日本語＋訳';
  }
  if (headerBtn) {
    headerBtn.textContent = mode === 'ja-only' ? '字幕 · 日本語' : '字幕 · 雙語';
    headerBtn.setAttribute('aria-pressed', mode === 'bilingual' ? 'true' : 'false');
  }
}

function toggleCallCaptionMode() {
  const next = getCallCaptionMode() === 'bilingual' ? 'ja-only' : 'bilingual';
  localStorage.setItem(CALL_CAPTION_KEY, next);
  applyCallCaptionMode();
}

/** Keyboard for bottom caption control (onclick is on HTML for reliability). */
function initCallCaptionControl() {
  applyCallCaptionMode();
  const toggle = document.getElementById('call-caption-toggle');
  if (!toggle || toggle.dataset.kbdCaption === '1') return;
  toggle.dataset.kbdCaption = '1';
  toggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleCallCaptionMode();
    }
  });
}

function appendChatMessage(role, ja, en, id) {
  const list = document.getElementById('chat-list');
  if (!list) return;
  const msg = document.createElement('div');
  msg.className = `chat-msg chat-msg-${role === 'user' ? 'user' : 'yuki'}`;
  if (id) msg.id = id;
  if (role === 'user') {
    const safe = window.escapeHtml?.(ja) ?? ja;
    msg.innerHTML = `<div class="chat-bubble"><div class="chat-ja">${safe}</div></div>`;
  } else {
    const jaHtml = window.parseVocabMarkup?.(ja) ?? (window.escapeHtml?.(ja) ?? ja);
    const enBlock =
      en != null && en !== ''
        ? `<div class="chat-en">${window.escapeHtml?.(en) ?? en}</div>`
        : '';
    msg.innerHTML = `<div class="chat-dot"></div><div class="chat-bubble"><div class="chat-ja">${jaHtml}</div>${enBlock}</div>`;
  }
  list.appendChild(msg);
  const captionArea = document.getElementById('call-caption-area');
  if (captionArea) captionArea.scrollTop = captionArea.scrollHeight;
  applyCallCaptionMode();
}

async function triggerOpeningMessage() {
  resetCallHistory();
  resetSession();
  sessionMemoryCandidate = null;
  const characterId = appState.activeCharacter || 'yuki';
  const videoEl = document.getElementById('yuki-animation');
  if (videoEl && characterId === 'yuki') initYukiAnimation(videoEl);
  const character = characterMap[characterId] || yukiConfig;

  if (getCallMode() === 'teacher') {
    const opening = { replyJa: 'N4の[[単語|たんご|vocabulary]]から始めましょう。', replyEn: '我们从 N4 单词开始，一次一道。请先用中文说说「約束（やくそく）」是什么意思，我等你回答后再讲解。' };
    appendChatMessage('yuki', opening.replyJa, opening.replyEn);
    speakCallReply(opening);
    pushCallMessage('yuki', `${opening.replyJa} ${opening.replyEn}`);
    return;
  }

  if (characterId === 'yuki') {
    const yukiOpenings = [
      { ja: 'よ、ちょうど[[コーヒー|こーひー|coffee]]淹れてたとこ。どした？', en: 'Yo, just making coffee. What\'s up?' },
      { ja: 'おう、今[[帰ってきた|かえってきた|came back]]とこ。なんか用？', en: 'Hey, just got back. Need something?' },
      { ja: 'yo、[[下北|しもきた|Shimokitazawa]]ぶらついてたんだけど。どうした', en: 'Yo, was wandering Shimokitazawa. What\'s up?' },
      { ja: 'おー、ちょうど[[音楽|おんがく|music]]聴いてた。なんか用？', en: 'Oh, was just listening to music. What\'s up?' },
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
    speakJapanese(randomOpening.ja);
    pushCallMessage('yuki', randomOpening.ja);
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
    speakJapanese(o.ja);
    pushCallMessage('yuki', o.ja);
    return;
  }

  appendChatMessage('yuki', '……', '', 'chat-loading');
  try {
    const reply = await getClaudeReply({
      character,
      topic:   getDailyTopic(new Date(), characterId),
      memory:  getCharacterMemory(characterId),
      history: getCallApiHistory().slice(-10),
      userText: '[START]',
      mode: getCallMode(),
    });
    document.getElementById('chat-loading')?.remove();
    const replyJa = reply.replyJa || 'よ';
    appendChatMessage('yuki', replyJa, reply.replyEn || '');
    speakCallReply(reply);
    pushCallMessage('yuki', replyJa);
  } catch {
    document.getElementById('chat-loading')?.remove();
    appendChatMessage('yuki', 'よ', 'Hey');
    speakJapanese('よ');
    pushCallMessage('yuki', 'よ');
  }
}

function initCallInput() {
  const input = document.getElementById('call-text-input');
  const btn   = document.getElementById('call-send-btn');
  if (!input || !btn) return;
  applyCallMode();
  const modeButton = document.getElementById('call-mode-btn');
  if (modeButton && modeButton.dataset.bound !== '1') {
    modeButton.dataset.bound = '1';
    modeButton.addEventListener('click', toggleCallMode);
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    btn.disabled = true;
    const modeButton = document.getElementById('call-mode-btn');
    if (modeButton) modeButton.disabled = true;
    onUserSpeak();
    resetToIdle();

    const characterId = appState.activeCharacter || 'yuki';
    const character   = characterMap[characterId] || yukiConfig;

    pushCallMessage('user', text);
    appendChatMessage('user', text, '');
    appendChatMessage('yuki', '……', '', 'chat-loading');

    try {
      const reply = await getClaudeReply({
        character,
        topic:    getDailyTopic(new Date(), characterId),
        memory:   getCharacterMemory(characterId),
        history:  getCallApiHistory().slice(-10),
        userText: text,
        mode: getCallMode(),
      });
      document.getElementById('chat-loading')?.remove();
      const replyJa = reply.replyJa || '……';
      appendChatMessage('yuki', replyJa, reply.replyEn || '');
      speakCallReply(reply);
      setEmotion(reply.emotion || 'idle');
      pushCallMessage('yuki', getCallMode() === 'teacher' ? `${replyJa} ${reply.replyEn || ''}`.trim() : replyJa);
      if (getCallMode() !== 'teacher' && reply.memoryCandidate && ((s) => { const jp = (s.match(/[\u3040-\u30ff\u4e00-\u9fff]/g)||[]).length; return jp >= 4 && jp/s.length > 0.3; })(reply.memoryCandidate)) {
        appendMemory(characterId, { factJa: reply.memoryCandidate, source: 'conversation' });
        sessionMemoryCandidate = reply.memoryCandidate;
      }
    } catch (e) {
      console.error('[Call] OpenAI API error:', e);
      document.getElementById('chat-loading')?.remove();
      const fallback = getCallMode() === 'teacher'
        ? { replyJa: '', replyEn: '刚才连接出了点问题，请再发一次。' }
        : getRandomFallbackReply();
      appendChatMessage('yuki', fallback.replyJa, fallback.replyEn);
      speakCallReply(fallback);
      pushCallMessage('yuki', `${fallback.replyJa} ${fallback.replyEn}`);
    } finally {
      btn.disabled = false;
      if (modeButton) modeButton.disabled = false;
      input.focus();
    }
  }

  btn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });
  initCallCaptionControl();
  window.addEventListener('beforeunload', stopSpeaking);
  window.addEventListener('pagehide', () => { resetCallHistory(); resetToIdle(); });

  initVoiceButton({
    voiceBtnId: 'call-voice-btn',
    getLanguage: () => getCallMode() === 'teacher' ? 'zh-CN' : 'ja-JP',
    onSend: (text, asText) => {
      input.value = text;
      sendMessage();
    },
    onCancel: () => {}
  });

  initImageButton({
    btnId: 'call-image-btn',
    onImage: async (img) => {
      // Show image bubble in chat
      const list = document.getElementById('chat-list');
      if (list) {
        const msg = document.createElement('div');
        msg.className = 'chat-msg chat-msg-user';
        msg.innerHTML = `<div class="chat-bubble"><img src="${img.dataUrl}" style="max-width:180px;border-radius:10px;display:block;"></div>`;
        list.appendChild(msg);
        list.scrollTop = list.scrollHeight;
      }
      const characterId = appState.activeCharacter || 'yuki';
      const character = characterMap[characterId] || yukiConfig;
      const caption = getCallMode() === 'teacher'
        ? '请用中文讲解图片中的日语内容，按N4学习者的程度说明。'
        : 'この画像どう思う？';
      pushCallMessage('user', caption);
      appendChatMessage('yuki', '……', '', 'chat-loading');
      try {
        const apiMessages = [
          ...getCallApiMessages({ excludeLast: 1 }),
          { role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.base64 } },
            { type: 'text', text: caption }
          ]}
        ];
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            mode: getCallMode(),
            systemPrompt: getCallMode() === 'teacher'
              ? `你是耐心清晰的日语教师，同时保留${character.jpName || character.name || 'Yuki'}的说话性格和情绪（${character.speakingStyle || '温和、自然、简洁'}）。用简体中文讲解图片中的日语，教学任务优先，不进行无关闲聊。`
              : character.systemPrompt,
          })
        });
        document.getElementById('chat-loading')?.remove();
        const data = await res.json();
        const replyJa = data.replyJa || '……';
        appendChatMessage('yuki', replyJa, data.replyEn || '');
        speakCallReply(data);
        pushCallMessage('yuki', replyJa);
      } catch {
        document.getElementById('chat-loading')?.remove();
        appendChatMessage('yuki', 'ちょっと待って', 'One sec...');
      }
    }
  });
}

export {
  appendChatMessage,
  triggerOpeningMessage,
  initCallInput,
  applyCallCaptionMode,
  getCallCaptionMode,
  toggleCallCaptionMode,
  getCallMode,
  applyCallMode,
  toggleCallMode,
};

window.stopSpeaking = stopSpeaking;
window.resetYukiToIdle = resetToIdle;
window.getSessionMemory = () => sessionMemoryCandidate;
