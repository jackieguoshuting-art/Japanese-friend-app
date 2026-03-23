import { appState } from '../../core/state.js';
import { getDailyTopic } from '../../features/topics.js';
import { getCharacterMemory, appendMemory } from '../../features/memory.js';
import { yukiConfig } from '../../characters/yuki/yuki.config.js';
import { renConfig } from '../../characters/ren/ren.config.js';
import { hanaConfig } from '../../characters/hana/hana.config.js';
import { getClaudeReply } from '../../services/claude.service.js';
import { getRandomFallbackReply } from '../../features/chat.js';
import { save } from '../../core/storage.js';

const characterMap = {
  yuki: yukiConfig,
  ren:  renConfig,
  hana: hanaConfig,
  mio:  yukiConfig,
};

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
    window._convHistory?.push({ role: 'yuki', text: randomOpening.ja });
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
    window._convHistory?.push({ role: 'yuki', text: o.ja });
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
    window._convHistory?.push({ role: 'yuki', text: replyJa });
  } catch {
    document.getElementById('chat-loading')?.remove();
    appendChatMessage('yuki', 'よ', 'Hey');
    window._convHistory?.push({ role: 'yuki', text: 'よ' });
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

    window._convHistory?.push({ role: 'user', text });
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
      window._convHistory?.push({ role: 'yuki', text: replyJa });
      if (reply.memoryCandidate) {
        appendMemory(characterId, { factJa: reply.memoryCandidate, source: 'conversation' });
        save('yukiMemory', reply.memoryCandidate);
      }
    } catch {
      document.getElementById('chat-loading')?.remove();
      const fallback = getRandomFallbackReply();
      appendChatMessage('yuki', fallback.replyJa, fallback.replyEn);
      window._convHistory?.push({ role: 'yuki', text: fallback.replyJa });
    } finally {
      btn.disabled = false;
      input.focus();
    }
  }

  btn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });
}

window.appendChatMessage = appendChatMessage;
window.triggerOpeningMessage = triggerOpeningMessage;
window.initCallInput = initCallInput;
