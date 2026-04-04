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
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      character,
      memory,
      history: [],
      userText: '[PROACTIVE]',
      isProactive: true,
    })
  });
  const data = await res.json();
  return data;
}
