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
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
function setSubtitle(line) {
  if (!line) {
    subtitleJa.textContent = '';
    subtitleEn.textContent = '';
    subtitleJa.style.color = '';
    subtitleEn.style.color = '';
    return;
  }
  subtitleJa.textContent = line.ja;
  subtitleEn.textContent = line.en;
  const color = line.speaker === 'chihiro' ? '#4a90e2' : '#888';
  subtitleJa.style.color = color;
  subtitleEn.style.color = color;
}

function show(el)  { if (el) el.style.display = ''; }
function hide(el)  { if (el) el.style.display = 'none'; }

function setPhaseUI(cfg) {
  // cfg: flags for which controls to show
  if (demoControls) demoControls.style.display = cfg.demoRow ? '' : 'none';
  if (replayBtn)    replayBtn.style.display     = cfg.replay  ? '' : 'none';
  if (slowBtn)      slowBtn.style.display       = cfg.slow    ? '' : 'none';
  if (countdownEl)  countdownEl.style.display   = cfg.countdown ? '' : 'none';
  if (recordBtn)    recordBtn.style.display      = cfg.record  ? '' : 'none';
  if (retryBtn)     retryBtn.style.display       = cfg.retry   ? '' : 'none';
  if (nextBtn)      nextBtn.style.display        = cfg.next    ? '' : 'none';
}

// ─── Demo (show chihiro line, muted) ─────────────────────────────────────────
function startDemo(idx) {
  currentIdx = idx;
  phase = 'demo';
  if (userAudio) { userAudio.pause(); userAudio = null; }

  setPhaseUI({ demoRow: false, replay: false, slow: false, countdown: false,
               record: false, retry: false, next: false });

  const line = CHIHIRO_LINES[idx];
  video.muted = true;
  video.playbackRate = 1;
  video.currentTime = line.start;
  video.play();
}

function onDemoDone() {
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

// ─── Auto-play user recording then show RETRY/NEXT ───────────────────────────
function playUserRecording(blob) {
  phase = 'after-record';
  setPhaseUI({ demoRow: false, replay: false, slow: false, countdown: false,
               record: false, retry: false, next: false });

  const url = URL.createObjectURL(blob);
  userAudio = new Audio(url);
  userAudio.onended = () => {
    URL.revokeObjectURL(url);
    userAudio = null;
    setPhaseUI({ demoRow: false, replay: false, slow: false, countdown: false,
                 record: false, retry: true, next: true });
  };
  userAudio.play();
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

  const played = new Set();

  function checkMyVersion() {
    const t = video.currentTime;
    for (let i = 0; i < CHIHIRO_LINES.length; i++) {
      const line = CHIHIRO_LINES[i];
      if (!played.has(i) && t >= line.start && t < line.end && recordings[i]) {
        played.add(i);
        video.muted = true;
        const url = URL.createObjectURL(recordings[i]);
        const a = new Audio(url);
        a.onended = () => {
          URL.revokeObjectURL(url);
          video.muted = false;
        };
        a.play();
      }
    }
  }

  function onEnded() {
    video.removeEventListener('timeupdate', checkMyVersion);
    video.removeEventListener('ended', onEnded);
    if (finishedModal) finishedModal.style.display = 'flex';
    phase = 'idle';
  }

  // Store cleanup so retry can cancel it
  myVersionCleanup = () => {
    video.removeEventListener('timeupdate', checkMyVersion);
    video.removeEventListener('ended', onEnded);
  };

  video.addEventListener('timeupdate', checkMyVersion);
  video.addEventListener('ended', onEnded);

  video.muted = false;
  video.playbackRate = 1;
  video.currentTime = 0;
  video.play();
}

// ─── Main timeupdate handler ──────────────────────────────────────────────────
function onTimeUpdate() {
  const t = video.currentTime;

  // Subtitle sync
  const active = TIMELINE.find(l => t >= l.start && t < l.end) || null;
  setSubtitle(active);

  // Phase triggers
  if (phase === 'demo') {
    const line = CHIHIRO_LINES[currentIdx];
    if (t >= line.end) onDemoDone();
  } else if (phase === 'recording') {
    const line = CHIHIRO_LINES[currentIdx];
    if (t >= line.end) stopRecording();
  }
}

// ─── Button wiring ────────────────────────────────────────────────────────────
function wireButtons() {
  replayBtn.onclick = () => {
    if (phase !== 'await-record') return;
    const line = CHIHIRO_LINES[currentIdx];
    video.muted = true;
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
    video.muted = true;
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
    if (userAudio) { userAudio.pause(); userAudio = null; }
    const nextIdx = currentIdx + 1;
    if (nextIdx >= CHIHIRO_LINES.length) {
      showFinished();
    } else {
      startDemo(nextIdx);
    }
  };

  playMyVersionBtn.onclick = () => playMyVersion();
}

// ─── Initialise when page becomes active ─────────────────────────────────────
function init() {
  initDOM();
  if (!video) return;

  video.src = '/frontend/public/assets/spirited-away-scene1.mp4';
  video.muted = true;
  video.addEventListener('timeupdate', onTimeUpdate);

  wireButtons();
  startDemo(0);
}

document.addEventListener('DOMContentLoaded', () => {
  const page = document.getElementById('pg-shadow-live');
  if (!page) return;

  if (page.classList.contains('active')) {
    init();
    return;
  }

  // Wait for the router to activate this page
  const observer = new MutationObserver(() => {
    if (page.classList.contains('active')) {
      observer.disconnect();
      init();
    }
  });
  observer.observe(page, { attributes: true, attributeFilter: ['class'] });
});
