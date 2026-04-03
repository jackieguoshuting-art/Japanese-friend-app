export function initVoiceInput({ onResult, onTranscript }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const recognition = new SpeechRecognition();
  recognition.lang = 'ja-JP';
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onresult = (e) => {
    let interim = '';
    let final = '';
    for (const r of e.results) {
      if (r.isFinal) final += r[0].transcript;
      else interim += r[0].transcript;
    }
    if (onTranscript) onTranscript(final || interim, !!final);
    if (final && onResult) onResult(final);
  };

  return recognition;
}
