export function initVoiceInput({ onResult, onTranscript }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const recognition = new SpeechRecognition();
  recognition.lang = 'ja-JP';
  recognition.continuous = true;      // 持续识别，不因停顿中断
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (e) => {
    // 累积所有已确认文字
    let allFinal = '';
    for (let i = 0; i < e.results.length; i++) {
      if (e.results[i].isFinal) allFinal += e.results[i][0].transcript;
    }
    // 当前临时文字（未确认部分）
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (!e.results[i].isFinal) interim += e.results[i][0].transcript;
    }
    const display = allFinal + interim;
    if (onTranscript) onTranscript(display, !!allFinal);
    if (allFinal && onResult) onResult(allFinal);
  };

  // 识别意外终止时（网络/浏览器策略）由 voiceUI 决定是否重启
  recognition.onerror = (e) => {
    if (e.error !== 'aborted' && e.error !== 'no-speech') {
      console.warn('STT error:', e.error);
    }
  };

  return recognition;
}
