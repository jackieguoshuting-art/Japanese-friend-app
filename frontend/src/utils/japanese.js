export function tokenizeJapanese(text = '') {
  return text.split(/\s+/).filter(Boolean);
}
