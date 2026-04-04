import { estimateDifficulty } from './difficulty.js';
import { shouldUseMemory } from '../store/memory.store.js';

// ── Session tracking ──
export const session = {
  turnCount: 0,
  startedAt: Date.now()
};

// ── Usage limits (enforcement optional via isLimitEnabled) ──
export const limits = {
  freeTurns: 20,
  maxSessionMinutes: 5,
  isLimitEnabled: false
};

// ── Fallback replies for API failures ──
export const fallbackReplies = [
  { replyJa: "ごめん、ちょっと聞こえなかった！もう一回言って？", replyEn: "Sorry, I didn't catch that! Can you say it again?", memoryCandidate: "" },
  { replyJa: "あれ、なんかうまく繋がらなかったみたい。もう一度！", replyEn: "Hmm, something went wrong on my end. Try again!", memoryCandidate: "" },
  { replyJa: "ちょっと待って、今なんか変だった気がする…もう一回！", replyEn: "Wait, something felt off just now… one more time!", memoryCandidate: "" },
  { replyJa: "ごめん、[[聞き取れ|ききとれ|couldn't hear]]なかった。[[もう一回|もういっかい|one more time]]言って？", replyEn: "Sorry, I couldn't catch that—can you say it once more?", memoryCandidate: "" }
];

export function getRandomFallbackReply() {
  return fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
}

// ── Trim conversation history to last 5 turns ──
export function trimHistory(history) {
  return history.slice(-5);
}

export function buildPrompt({ character, topic, memory, history, userText }) {
  session.turnCount += 1;
  console.log('user_sent_message', { turn: session.turnCount, character: character?.id });

  const difficulty = estimateDifficulty(userText);
  const trimmedHistory = trimHistory(history || []);
  const useMemory = shouldUseMemory();

  const memoryBlock = useMemory && memory?.length
    ? memory.map((item) => `- ${item.factJa || item.fact || item}`).join('\n')
    : 'None';

  return `
You are ${character.name}, a Japanese AI friend.
Personality: ${character.personality}
Style: ${character.speakingStyle}

Rules:
- Speak like a close friend, not a teacher.
- Be warm, natural, slightly playful.
- Keep replies short to medium.
- Adapt naturally to the user's level.
- Occasionally reference memory if relevant.
- Use emoji (😂✨😅🤔💬 etc.) and casual filler sounds (えー、うーん、あー、笑、なー、ね〜) naturally to match spoken/texting tone.
- Use natural pauses (……、—、〜) when the mood calls for it.

Today's topic:
${topic?.openerJa || ''}

Memory:
${memoryBlock}

History:
${trimmedHistory.map((item) => `${item.role}: ${item.text}`).join('\n') || ''}

User just said:
${userText}

Return JSON with:
{
  "replyJa": "...",
  "replyEn": "...",
  "memoryCandidate": "ユーザーが明かした具体的な個人情報（趣味・仕事・住んでいる場所・好き嫌いなど）を短い日本語で。新情報がなければ空文字"
}
In replyJa, mark vocabulary DENSELY for the app UI: wrap almost EVERY noun and EVERY lexical verb (and meaningful い/な adjective predicates) as [[surface|ひらがな|English gloss]] — no spaces inside brackets.
Skip ONLY particles (は を に が の と も や か ね よ さ へ で から まで より って), empty fillers, and bare です／ます／だ with no new lemma. Mark whole inflected verb forms as one span when one lemma. Compound nouns = one span. Aim for ~80%+ of nouns/verbs marked, not just one or two.
Example: 週末に[[映画館|えいがかん|movie theater]]で[[映画|えいが|movie]]を[[見た|みた|watched]]。
Difficulty: ${difficulty}
`.trim();
}

export function resetSession() {
  session.turnCount = 0;
  session.startedAt = Date.now();
}

export function endSession() {
  console.log('session_end', { turnCount: session.turnCount });
}
