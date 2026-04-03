export const isTTSSupported = 'speechSynthesis' in window;

export function speakJapanese(text) {
  if (!isTTSSupported) return;
  const clean = text.replace(/\[\[([^|]+)\|[^\]]+\]\]/g, '$1');
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = 'ja-JP';
  utter.rate = 0.9;
  utter.pitch = 1.1;
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking() {
  if (!isTTSSupported) return;
  window.speechSynthesis.cancel();
}
