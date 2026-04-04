const HISTORY_KEY_PREFIX = 'jfa-text-history-';

export function getTextHistory(characterId) {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY_PREFIX + characterId) || '[]');
  } catch { return []; }
}

export function saveTextHistory(characterId, history) {
  localStorage.setItem(HISTORY_KEY_PREFIX + characterId, JSON.stringify(history));
}

export function appendTextHistory(characterId, role, content) {
  const history = getTextHistory(characterId);
  history.push({ role, content, timestamp: Date.now() });
  saveTextHistory(characterId, history);
  return history;
}

export function clearTextHistory(characterId) {
  localStorage.removeItem(HISTORY_KEY_PREFIX + characterId);
}
