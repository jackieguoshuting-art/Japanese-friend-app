import { buildPrompt } from '../features/chat.js';

export async function getClaudeReply({ apiUrl = '/api/chat', character, topic, memory, history, userText }) {
  const prompt = buildPrompt({ character, topic, memory, history, userText });
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, systemPrompt: character.systemPrompt, characterId: character.id, topicId: topic?.id })
  });
  if (!response.ok) {
    throw new Error(`Claude API request failed: ${response.status}`);
  }
  return response.json();
}
