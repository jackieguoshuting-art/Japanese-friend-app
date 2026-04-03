// ShadowLive.js — Spirited Away shadowing player for pg-shadow-live

const TIMELINE = [
  { start: 3,  end: 6,  speaker: 'chihiro', ja: 'あーっ！お母さん、お花しおれちゃった。',               en: '啊！妈妈，花都蔫了。' },
  { start: 6,  end: 8,  speaker: 'other',   ja: 'あなた、ずっと握りしめてるんだもん。',                 en: '是你一直紧紧攥着它呀。' },
  { start: 8,  end: 12, speaker: 'other',   ja: 'おうちに着いたら水切りすれば大丈夫よ。',               en: '到家后在水里剪掉一截就没事了。' },
  { start: 12, end: 16, speaker: 'chihiro', ja: '初めてもらった花束が、お別れの花束なんて悲しい。',     en: '第一次收到的花束，竟然是离别的小花束，太伤心了。' },
  { start: 16, end: 20, speaker: 'other',   ja: 'あら、この前のお誕生日にバラの花をもらったじゃない。', en: '哎呀，上次生日不是还收到过玫瑰花吗。' },
  { start: 20, end: 23, speaker: 'chihiro', ja: '一本ね。一本じゃ花束って言えないわ。',                 en: '只有一朵。只有一朵不能被称为花束吧。' },
  { start: 23, end: 25, speaker: 'other',   ja: 'カードが落ちたわ。窓開けるわよ。',                     en: '卡片掉了。我要开窗户了。' },
  { start: 25, end: 29, speaker: 'other',   ja: 'もう、しゃんとしてちょうだい。今日は忙しいんだから。', en: '真是的，你打起精神来。今天有很多事情要忙呢。' },
];

const CHIHIRO_LINES = TIMELINE.filter(l => l.speaker === 'chihiro');

// ─── State ───────────────────────────────────────────────────────────────────
let currentIdx   = 0;   // index into CHIHIRO_LINES
let phase        = 'idle'; // 'demo' | 'await-record' | 'countdown' | 'recording' | 'after-record' | 'my-version'
let mediaRecorder = null;
let audioChunks  = [];
let recordings   = {};  // { chihiroIdx: Blob }
let userAudio    = null;
let myVersionCleanup = null;

// ─── DOM refs ─────────────────────────────────────────────────────────────────
let video, subtitleJa, subtitleEn;
let recordBtn, replayBtn, slowBtn, retryBtn, nextBtn;
let countdownEl, demoControls, finishedModal, playMyVersionBtn;

function initDOM() {
  video            = document.getElementById('shadow-video');
  subtitleJa       = document.getElementById('shadow-subtitle-ja');
  subtitleEn       = document.getElementById('shadow-subtitle-en');
  recordBtn        = document.getElementById('shadow-record-btn');
  replayBtn        = document.getElementById('shadow-replay-btn');
  slowBtn          = document.getElementById('shadow-slow-btn');
  retryBtn         = document.getElementById('shadow-retry-btn');
  nextBtn          = document.getElementById('shadow-next-btn');
  countdownEl      = document.getElementById('shadow-countdown');
  demoControls     = document.getElementById('shadow-demo-controls');
  finishedModal    = document.getElementById('shadow-finished-modal');
  playMyVersionBtn = document.getElementById('shadow-playmyversion-btn');
  // eslint-disable-next-line no-unused-vars
  const transcriptList = document.getElementById('shadow-transcript-list');
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
function setSubtitle(line, currentTime) {
  if (!line) {
    if (subtitleJa) subtitleJa.innerHTML = '';
    if (subtitleEn) subtitleEn.textContent = '';
    return;
  }

  // 英文字幕直接显示
  if (subtitleEn) subtitleEn.textContent = line.en;

  // 日文字幕逐字高亮
  const chars = line.ja.split('');
  const duration = line.end - line.start;
  const elapsed = (currentTime != null ? currentTime : line.start) - line.start;
  const progress = Math.min(elapsed / duration, 1);
  const highlightCount = Math.floor(chars.length * progress);

  const color = line.speaker === 'chihiro' ? '#002FA7' : '#888';
  const highlightColor = line.speaker === 'chihiro' ? '#FF8FAB' : '#aaa';

  subtitleJa.innerHTML = chars.map((char, i) =>
    `<span style="color:${i < highlightCount ? highlightColor : color};transition:color 0.1s;">${char}</span>`
  ).join('');
}

function show(el)  { if (el) el.style.display = ''; }
function hide(el)  { if (el) el.style.display = 'none'; }

function setPhaseUI(cfg) {
  // cfg: flags for which controls to show
  const playRecBtn = document.getElementById('shadow-play-recording-btn');
  if (playRecBtn && !cfg.retry) playRecBtn.style.display = 'none';
  if (demoControls) demoControls.style.display = cfg.demoRow ? '' : 'none';
  if (replayBtn)    replayBtn.style.display     = cfg.replay  ? '' : 'none';
  if (slowBtn)      slowBtn.style.display       = cfg.slow    ? '' : 'none';
  if (countdownEl)  countdownEl.style.display   = cfg.countdown ? '' : 'none';
  if (recordBtn)    recordBtn.style.display      = cfg.record  ? '' : 'none';
  if (retryBtn)     retryBtn.style.display       = cfg.retry   ? '' : 'none';
  if (nextBtn)      nextBtn.style.display        = cfg.next    ? '' : 'none';
}

// ─── Transcript ──────────────────────────────────────────────────────────────
function renderTranscript() {
  const list = document.getElementById('shadow-transcript-list');
  if (!list) return;
  list.innerHTML = TIMELINE.map((line, i) => `
    <div class="shadow-transcript-item ${line.speaker === 'chihiro' ? 'chihiro' : 'other'}"
         id="transcript-${i}"
         onclick="shadowJumpToLine(${i})">
      <span class="transcript-speaker">${line.speaker === 'chihiro' ? '千寻' : '妈妈'}</span>
      <span class="transcript-ja">${line.ja}</span>
      <span class="transcript-en">${line.en}</span>
    </div>
  `).join('');
}

window.shadowJumpToLine = function(timelineIdx) {
  const line = TIMELINE[timelineIdx];
  if (line.speaker !== 'chihiro') return;
  const chihiroIdx = CHIHIRO_LINES.findIndex(l => l.start === line.start);
  if (chihiroIdx === -1) return;
  if (userAudio) { userAudio.pause(); userAudio = null; }
  startDemo(chihiroIdx);
};

// ─── Demo (show chihiro line, muted) ─────────────────────────────────────────
function startDemo(idx) {
  currentIdx = idx;
  phase = 'demo';
  if (userAudio) { userAudio.pause(); userAudio = null; }

  setPhaseUI({ demoRow: false, replay: false, slow: false, countdown: false,
               record: false, retry: false, next: false });

  const line = CHIHIRO_LINES[idx];
  video.muted = false;
  video.playbackRate = 1;
  video.currentTime = line.start;
  video.play();
}

function onDemoDone() {
  if (phase !== 'demo' && phase !== 'awaiting-done') return;
  phase = 'await-record';
  const line = CHIHIRO_LINES[currentIdx];
  video.pause();
  video.currentTime = line.start; // rewind ready for user replay

  setPhaseUI({ demoRow: true, replay: true, slow: true, countdown: false,
               record: true, retry: false, next: false });
}

// ─── Countdown then record ────────────────────────────────────────────────────
function startCountdown() {
  phase = 'countdown';
  setPhaseUI({ demoRow: true, replay: false, slow: false, countdown: true,
               record: false, retry: false, next: false });

  let n = 3;
  countdownEl.textContent = n;
  const iv = setInterval(() => {
    n--;
    if (n > 0) {
      countdownEl.textContent = n;
    } else {
      clearInterval(iv);
      countdownEl.textContent = '';
      startRecording();
    }
  }, 1000);
}

async function startRecording() {
  phase = 'recording';
  setPhaseUI({ demoRow: false, replay: false, slow: false, countdown: false,
               record: false, retry: false, next: false });

  const line = CHIHIRO_LINES[currentIdx];
  video.muted = false;
  video.playbackRate = 1;
  video.currentTime = line.start;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      recordings[currentIdx] = blob;
      playUserRecording(blob);
    };
    mediaRecorder.start();
    video.play();
  } catch (err) {
    console.error('ShadowLive: microphone error', err);
    phase = 'await-record';
    setPhaseUI({ demoRow: true, replay: true, slow: true, countdown: false,
                 record: true, retry: false, next: false });
  }
}

function stopRecording() {
  video.pause();
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop(); // triggers onstop → playUserRecording
  }
}

// ─── Show user recording controls after recording ────────────────────────────
function playUserRecording(blob) {
  phase = 'after-record';
  const line = CHIHIRO_LINES[currentIdx];
  video.pause();
  video.currentTime = line.start;

  // 不自动播放，显示播放键让用户手动点
  setPhaseUI({ demoRow: false, replay: false, slow: false, countdown: false,
               record: false, retry: true, next: true });

  // 加一个播放录音按钮
  const playRecordingBtn = document.getElementById('shadow-play-recording-btn');
  if (playRecordingBtn) {
    playRecordingBtn.style.display = '';
    playRecordingBtn.onclick = () => {
      const url = URL.createObjectURL(blob);
      userAudio = new Audio(url);
      // 同时重播这句台词的画面
      video.currentTime = line.start;
      video.muted = true;
      video.play();
      userAudio.onended = () => {
        URL.revokeObjectURL(url);
        userAudio = null;
        video.pause();
        video.muted = false;
        video.currentTime = line.start;
      };
      userAudio.play();
    };
  }
}

// ─── Finished modal ───────────────────────────────────────────────────────────
function showFinished() {
  phase = 'idle';
  video.pause();
  if (finishedModal) finishedModal.style.display = 'flex';
}

// ─── Play My Version ──────────────────────────────────────────────────────────
function playMyVersion() {
  if (finishedModal) finishedModal.style.display = 'none';
  phase = 'my-version';
  setPhaseUI({ demoRow: false, replay: false, slow: false, countdown: false,
               record: false, retry: false, next: false });

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioContext();
  const played = new Set();

  async function checkMyVersion() {
    const t = video.currentTime;
    for (let i = 0; i < CHIHIRO_LINES.length; i++) {
      const line = CHIHIRO_LINES[i];
      if (!played.has(i) && t >= line.start && t < line.end && recordings[i]) {
        played.add(i);

        // 把用户录音解码
        const arrayBuffer = await recordings[i].arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        // 创建音源节点
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;

        // 降低视频原声音量（不完全静音，保留背景音）
        video.volume = 0.15;

        // 用户声音正常音量播放
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 1.2;
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        source.start(0);
        source.onended = () => {
          video.volume = 1.0;
        };
      }
    }
  }

  function onEnded() {
    video.removeEventListener('timeupdate', checkMyVersion);
    video.removeEventListener('ended', onEnded);
    video.volume = 1.0;
    audioCtx.close();
    if (finishedModal) finishedModal.style.display = 'flex';
    phase = 'idle';
  }

  myVersionCleanup = () => {
    video.removeEventListener('timeupdate', checkMyVersion);
    video.removeEventListener('ended', onEnded);
    video.volume = 1.0;
    audioCtx.close();
  };

  video.addEventListener('timeupdate', checkMyVersion);
  video.addEventListener('ended', onEnded);

  video.muted = false;
  video.volume = 1.0;
  video.playbackRate = 1;
  video.currentTime = 0;
  video.play();
}

// ─── Main timeupdate handler ──────────────────────────────────────────────────
function onTimeUpdate() {
  const t = video.currentTime;

  // Subtitle sync
  const active = TIMELINE.find(l => t >= l.start && t < l.end) || null;
  setSubtitle(active, t);

  // Transcript highlight + scroll
  const activeIdx = TIMELINE.findIndex(l => t >= l.start && t < l.end);
  if (activeIdx !== -1) {
    document.querySelectorAll('.shadow-transcript-item').forEach((el, i) => {
      el.classList.toggle('active', i === activeIdx);
    });
    const activeEl = document.getElementById('transcript-' + activeIdx);
    if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Phase triggers
  if (phase === 'demo') {
    const line = CHIHIRO_LINES[currentIdx];
    if (t >= line.end) {
      phase = 'awaiting-done';
      onDemoDone();
    }
  } else if (phase === 'recording') {
    const line = CHIHIRO_LINES[currentIdx];
    if (t >= line.end) stopRecording();
  }
}

// ─── Button wiring ────────────────────────────────────────────────────────────
function wireButtons() {
  // Clear before rebinding to prevent duplicate handlers across resets
  replayBtn.onclick = null;
  slowBtn.onclick = null;
  recordBtn.onclick = null;
  retryBtn.onclick = null;
  nextBtn.onclick = null;
  playMyVersionBtn.onclick = null;

  replayBtn.onclick = () => {
    if (phase !== 'await-record') return;
    const line = CHIHIRO_LINES[currentIdx];
    video.muted = false;
    video.playbackRate = 1;
    video.currentTime = line.start;
    video.play();
    phase = 'demo';
    setPhaseUI({ demoRow: false, replay: false, slow: false, countdown: false,
                 record: false, retry: false, next: false });
  };

  slowBtn.onclick = () => {
    if (phase !== 'await-record') return;
    const line = CHIHIRO_LINES[currentIdx];
    video.muted = false;
    video.playbackRate = 0.75;
    video.currentTime = line.start;
    video.play();
    phase = 'demo';
    setPhaseUI({ demoRow: false, replay: false, slow: false, countdown: false,
                 record: false, retry: false, next: false });
  };

  recordBtn.onclick = () => {
    if (phase !== 'await-record') return;
    startCountdown();
  };

  retryBtn.onclick = () => {
    if (userAudio) { userAudio.pause(); userAudio = null; }
    if (myVersionCleanup) { myVersionCleanup(); myVersionCleanup = null; }
    startDemo(currentIdx);
  };

  nextBtn.onclick = () => {
    if (phase !== 'after-record' && phase !== 'await-record') return;
    if (userAudio) { userAudio.pause(); userAudio = null; }
    video.pause();
    const nextIdx = currentIdx + 1;
    if (nextIdx >= CHIHIRO_LINES.length) {
      showFinished();
    } else {
      const resumeFrom = CHIHIRO_LINES[currentIdx].end; // continue from where recording ended
      currentIdx = nextIdx;
      phase = 'demo';
      video.muted = false;
      video.playbackRate = 1;
      video.currentTime = resumeFrom;
      setSubtitle(null);
      setPhaseUI({ demoRow: false, replay: false, slow: false, countdown: false,
                   record: false, retry: false, next: false });
      video.play();
    }
  };

  playMyVersionBtn.onclick = () => playMyVersion();
}

// ─── Reset and initialise ─────────────────────────────────────────────────────
function resetAndInit() {
  currentIdx = 0;
  phase = 'idle';
  recordings = {};
  audioChunks = [];
  if (userAudio) { userAudio.pause(); userAudio = null; }
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  initDOM();
  video.muted = false;
  video.removeEventListener('timeupdate', onTimeUpdate);
  video.addEventListener('timeupdate', onTimeUpdate);
  wireButtons();
  renderTranscript();

  const SRC = './frontend/public/assets/spirited-away-scene1.mp4';
  if (!video.src.includes('spirited-away-scene1.mp4')) {
    // First load — src not yet set, wait for metadata before seeking
    video.src = SRC;
    video.addEventListener('loadedmetadata', () => startDemo(0), { once: true });
  } else {
    // Already loaded — seek directly, no reload
    startDemo(0);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const page = document.getElementById('pg-shadow-live');
  if (!page) return;

  if (page.classList.contains('active')) {
    resetAndInit();
    return;
  }

  // Re-initialise every time the page becomes active; clean up on exit
  const observer = new MutationObserver(() => {
    if (page.classList.contains('active')) {
      resetAndInit();
    } else {
      if (video) { video.pause(); video.currentTime = 0; }
      if (userAudio) { userAudio.pause(); userAudio = null; }
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      if (myVersionCleanup) { myVersionCleanup(); myVersionCleanup = null; }
      phase = 'idle';
    }
  });
  observer.observe(page, { attributes: true, attributeFilter: ['class'] });
});
