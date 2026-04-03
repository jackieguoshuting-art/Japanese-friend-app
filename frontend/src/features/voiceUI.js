import { initVoiceInput } from './stt.js';
import { stopSpeaking } from './tts.js';

async function naturalizeVoiceText(text) {
  try {
    const res = await fetch('/api/voice-format', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!res.ok) return text;
    const data = await res.json();
    return data.formatted || text;
  } catch {
    return text;
  }
}

export function initVoiceButton({ voiceBtnId, onSend, onCancel }) {
  const btn = document.getElementById(voiceBtnId);
  if (!btn) return;
  if (btn.dataset.voiceInit) return;
  btn.dataset.voiceInit = '1';

  // ── 覆盖层 ──────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'voice-overlay';
  overlay.innerHTML = `
    <div id="voice-bubble">
      <canvas id="voice-wave" width="220" height="60"></canvas>
      <div id="voice-hint">录音中…</div>
    </div>
    <div id="voice-actions">
      <button id="voice-cancel">取消</button>
      <button id="voice-send">发送</button>
      <button id="voice-to-text">转文字</button>
    </div>
  `;
  overlay.style.cssText = `
    display:none;position:fixed;inset:0;z-index:9999;
    background:rgba(0,0,0,0.60);flex-direction:column;
    align-items:center;justify-content:center;gap:28px;
  `;
  document.body.appendChild(overlay);

  // ── 波形 ────────────────────────────────────────────────
  const canvas = overlay.querySelector('#voice-wave');
  const ctx = canvas ? canvas.getContext('2d') : null;
  let animFrame, analyser, dataArray, audioCtx, micStream;
  let waveMode = 'idle';

  function drawWave() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#4cd964';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (waveMode === 'recording' && analyser) {
      analyser.getByteTimeDomainData(dataArray);
      const sliceWidth = canvas.width / dataArray.length;
      let x = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceWidth;
      }
    } else {
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
    }
    ctx.stroke();
    animFrame = requestAnimationFrame(drawWave);
  }

  async function startMicVisualizer() {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx = new AudioContext();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      audioCtx.createMediaStreamSource(micStream).connect(analyser);
    } catch {}
  }

  function stopMicVisualizer() {
    micStream?.getTracks().forEach(t => t.stop());
    audioCtx?.close();
    analyser = null;
  }

  // ── 语音识别 ─────────────────────────────────────────────
  let lastTranscript = '';

  const recognition = initVoiceInput({
    onTranscript: (text) => {
      lastTranscript = text;
      const hint = overlay.querySelector('#voice-hint');
      if (hint) hint.textContent = text || '录音中…';
    },
    onResult: () => {}
  });

  // 浏览器有时会因超时策略自动停止 continuous 模式，检测到时重启
  if (recognition) {
    recognition.onend = () => {
      if (recording) {
        try { recognition.start(); } catch {}
      }
    };
  }

  // ── 开始 / 停止 ──────────────────────────────────────────
  let recording = false;

  function startRecording() {
    if (recording) return;
    recording = true;
    btn.classList.add('recording');
    lastTranscript = '';
    overlay.style.display = 'flex';
    const hint = overlay.querySelector('#voice-hint');
    if (hint) hint.textContent = '录音中…';
    waveMode = 'recording';
    drawWave();
    startMicVisualizer();
    stopSpeaking();
    try { recognition?.start(); } catch {}
  }

  function stopRecording(action = 'send') {
    if (!recording) return;
    recording = false;
    btn.classList.remove('recording');
    waveMode = 'idle';
    cancelAnimationFrame(animFrame);
    stopMicVisualizer();
    overlay.style.display = 'none';
    try { recognition?.stop(); } catch {}

    if ((action === 'send' || action === 'toText') && lastTranscript) {
      const isText = action === 'toText';
      const hint = overlay.querySelector('#voice-hint');
      if (hint) hint.textContent = '处理中…';
      overlay.style.display = 'flex'; // 短暂保留覆盖层显示进度
      naturalizeVoiceText(lastTranscript).then(formatted => {
        overlay.style.display = 'none';
        onSend(formatted, isText);
      });
    } else if (action === 'cancel') {
      onCancel?.();
    }
  }

  // ── 主按钮：点击切换（桌面）/ 长按（移动端）────────────
  let touchStartX = 0;
  let touchMoved = false;

  // 桌面端：点击开始，再次点击 = 不需要（用覆盖层按钮结束）
  btn.addEventListener('click', (e) => {
    // 触摸设备上 click 由 touchend 处理，这里只处理纯鼠标点击
    if (e.sourceCapabilities?.firesTouchEvents) return;
    if (recording) return; // 桌面端开始后由覆盖层按钮结束
    startRecording();
  });

  // 移动端：touchstart → 立刻开始录音并显示覆盖层
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchMoved = false;
    startRecording();
  }, { passive: false });

  btn.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const dx = e.touches[0].clientX - touchStartX;
    touchMoved = true;
    const hint = overlay.querySelector('#voice-hint');
    if (!hint) return;
    if (dx < -60) hint.textContent = '← 取消';
    else if (dx > 60) hint.textContent = '转文字 →';
    else hint.textContent = lastTranscript || '录音中…';
  }, { passive: false });

  btn.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!recording) return;
    if (touchMoved) {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (dx < -60) { stopRecording('cancel'); return; }
      if (dx > 60) { stopRecording('toText'); return; }
    }
    stopRecording('send');
  });

  // ── 覆盖层按钮 ───────────────────────────────────────────
  overlay.querySelector('#voice-cancel').addEventListener('click', () => stopRecording('cancel'));
  overlay.querySelector('#voice-send').addEventListener('click', () => stopRecording('send'));
  overlay.querySelector('#voice-to-text').addEventListener('click', () => stopRecording('toText'));

  // 不支持则隐藏
  if (!recognition) btn.style.display = 'none';
}
