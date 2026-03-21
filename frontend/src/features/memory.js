import { storage } from '../core/storage.js';

const MEMORY_KEY = 'jfa-memory';

export function getCharacterMemory(characterId) {
  const all = storage.get(MEMORY_KEY, {});
  return all[characterId] || [];
}

export function saveCharacterMemory(characterId, memoryList) {
  const all = storage.get(MEMORY_KEY, {});
  all[characterId] = memoryList;
  storage.set(MEMORY_KEY, all);
}

export function appendMemory(characterId, item) {
  const current = getCharacterMemory(characterId);
  const next = [item, ...current].slice(0, 12);
  saveCharacterMemory(characterId, next);
  return next;
}
