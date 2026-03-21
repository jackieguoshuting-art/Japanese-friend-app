export function estimateDifficulty(text = '') {
  const length = text.trim().length;
  if (length < 12) return 'easy';
  if (/[けど|から|ので|と思う]/.test(text)) return 'medium';
  return 'adaptive';
}
