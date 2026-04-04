export const isTTSSupported = 'speechSynthesis' in window;

async function speakWithElevenLabs(text) {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('TTS request failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  if (window._currentAudio) {
    window._currentAudio.pause();
    window._currentAudio = null;
  }
  const audio = new Audio(url);
  window._currentAudio = audio;
  audio.play();
}

export function speakJapanese(text) {
  const clean = text.replace(/\[\[([^|]+)\|[^\]]+\]\]/g, '$1');
  if (isTTSSupported) window.speechSynthesis.cancel();
  if (window._currentAudio) { window._currentAudio.pause(); window._currentAudio = null; }

  speakWithElevenLabs(clean).catch(() => {
    if (!isTTSSupported) return;
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = 'ja-JP';
    utter.rate = 0.9;
    utter.pitch = 1.1;
    window.speechSynthesis.speak(utter);
  });
}

export function stopSpeaking() {
  if (window._currentAudio) {
    window._currentAudio.pause();
    window._currentAudio = null;
  }
  if (isTTSSupported) window.speechSynthesis.cancel();
}
