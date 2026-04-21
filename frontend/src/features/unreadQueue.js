const UNREAD_KEY_PREFIX = 'jfa-unread-';

export function addUnread(characterId) {
  const key = UNREAD_KEY_PREFIX + characterId;
  const count = parseInt(localStorage.getItem(key) || '0');
  localStorage.setItem(key, String(count + 1));
}

export function getUnreadCount(characterId) {
  const key = UNREAD_KEY_PREFIX + characterId;
  return parseInt(localStorage.getItem(key) || '0');
}

export function markAllRead(characterId) {
  const key = UNREAD_KEY_PREFIX + characterId;
  localStorage.removeItem(key);
}

export function getTotalUnread(characterIds) {
  return characterIds.reduce((sum, id) => sum + getUnreadCount(id), 0);
}
