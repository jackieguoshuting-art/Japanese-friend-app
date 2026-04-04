import { buildPrompt } from '../features/chat.js';

const EMOTION_INSTRUCTION = '\n\nJSONの"emotion"フィールドに必ず以下のどれか一つを入れること："idle"|"happy"|"smile"|"surprised"|"lean-smile"。選択基準：happy=開心/興奮/良いニュース、smile=温柔/軽い正向/普通の会話、surprised=驚き/予想外、lean-smile=特に親しみ/おちゃめ/俏皮、idle=普通/落ち着き/デフォルト。';

export async function getClaudeReply({ apiUrl = '/api/chat', character, topic, memory, history, userText }) {
  const prompt = buildPrompt({ character, topic, memory, history, userText });
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, systemPrompt: (character.systemPrompt || '') + EMOTION_INSTRUCTION, characterId: character.id, topicId: topic?.id })
  });
  if (!response.ok) {
    throw new Error(`Claude API request failed: ${response.status}`);
  }
  return response.json();
}
