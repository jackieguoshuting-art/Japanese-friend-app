export const isTTSSupported = 'speechSynthesis' in window;

let _currentAbortController = null;

async function speakWithElevenLabs(text, signal) {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal,
  });
  if (!res.ok) throw new Error('TTS request failed');
  const blob = await res.blob();
  // If aborted while reading blob, bail out
  if (signal.aborted) return;
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

  // Abort any in-flight ElevenLabs request
  if (_currentAbortController) _currentAbortController.abort();
  _currentAbortController = new AbortController();

  speakWithElevenLabs(clean, _currentAbortController.signal).catch((err) => {
    if (err.name === 'AbortError') return;
    if (!isTTSSupported) return;
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = 'ja-JP';
    utter.rate = 0.9;
    utter.pitch = 1.1;
    window.speechSynthesis.speak(utter);
  });
}

export function stopSpeaking() {
  if (_currentAbortController) {
    _currentAbortController.abort();
    _currentAbortController = null;
  }
  if (window._currentAudio) {
    window._currentAudio.pause();
    window._currentAudio = null;
  }
  if (isTTSSupported) window.speechSynthesis.cancel();
}
