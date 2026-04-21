const HISTORY_KEY_PREFIX = 'jfa-text-history-';

export function getTextHistory(characterId) {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY_PREFIX + characterId) || '[]');
  } catch { return []; }
}

export function saveTextHistory(characterId, history) {
  localStorage.setItem(HISTORY_KEY_PREFIX + characterId, JSON.stringify(history));
}

export function appendTextHistory(characterId, role, content, replyEn) {
  const history = getTextHistory(characterId);
  const entry = { role, content, timestamp: Date.now() };
  if (replyEn) entry.replyEn = replyEn;
  history.push(entry);
  saveTextHistory(characterId, history);
  return history;
}

export function clearTextHistory(characterId) {
  localStorage.removeItem(HISTORY_KEY_PREFIX + characterId);
}
