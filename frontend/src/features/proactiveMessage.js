const PROACTIVE_KEY_PREFIX = 'jfa-proactive-';
const INTERVAL_MS = 32 * 60 * 60 * 1000; // 32 hours

export function shouldSendProactive(characterId) {
  const key = PROACTIVE_KEY_PREFIX + characterId;
  const last = parseInt(localStorage.getItem(key) || '0');
  return Date.now() - last >= INTERVAL_MS;
}

export function markProactiveSent(characterId) {
  localStorage.setItem(PROACTIVE_KEY_PREFIX + characterId, String(Date.now()));
}

export async function generateProactiveMessage(character, memory) {
  const base = character.systemPrompt || '';
  const memBlock = (memory && memory.length)
    ? '\n\nユーザーについて覚えていること(会話で自然に活かすこと):\n' +
      memory.map(m => `- ${m.factJa || m.fact || m}`).join('\n')
    : '';
  const systemPrompt = base + memBlock;

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: '[PROACTIVE]' }],
      systemPrompt,
      isProactive: true,
    })
  });
  if (!res.ok) throw new Error('proactive chat failed: ' + res.status);
  return await res.json();
}
