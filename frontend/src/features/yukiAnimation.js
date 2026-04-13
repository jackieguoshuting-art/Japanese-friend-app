const BASE = '/assets/characters/yuki/animations';

const EMOTIONS = {
  idle: {
    type: 'loop',
    src: `${BASE}/Yuki表情过渡/idle.webm`,
  },
  happy: {
    type: 'in-loop',
    inSrc:   `${BASE}/Yuki表情过渡/happy.webm`,
    loopSrc: `${BASE}/Yuki表情单一循环/happy-loop.webm`,
  },
  smile: {
    type: 'in-loop',
    inSrc:   `${BASE}/Yuki表情过渡/smile.webm`,
    loopSrc: `${BASE}/Yuki表情单一循环/smile-loop.webm`,
  },
  surprised: {
    type: 'once',
    src: `${BASE}/Yuki表情过渡/surprised.webm`,
  },
  shy: {
    type: 'once',
    src: `${BASE}/Yuki表情过渡/shy.webm`,
  },
  'lean-smile': {
    type: 'once',
    src: `${BASE}/Yuki表情过渡/lean-smile.webm`,
  },
};

let currentEmotion = 'idle';
let currentPhase   = 'loop';   // 'in' | 'loop' | 'once'
let front = null;
let back  = null;

// ── helpers ──────────────────────────────────────────────

function loadAndSwap(src, loop, onSwapped) {
  back.loop  = loop;
  back.muted = true;
  back.src   = src;
  back.load();
  back.addEventListener('canplay', function handler() {
    back.removeEventListener('canplay', handler);
    back.play();
    back.style.opacity  = '1';
    front.style.opacity = '0';
    [front, back] = [back, front];
    if (onSwapped) onSwapped();
  });
}

function playIdle() {
  currentEmotion = 'idle';
  currentPhase   = 'loop';
  const { src } = EMOTIONS.idle;
  // if back is already playing idle, skip reload
  if (back.readyState >= 2 && back.src.includes('idle.webm')) {
    back.loop = true;
    back.play();
    back.style.opacity  = '1';
    front.style.opacity = '0';
    [front, back] = [back, front];
    return;
  }
  loadAndSwap(src, true);
}

function onEnded() {
  // only act when the playing video is 'front' (the visible one)
  if (this !== front) return;

  if (currentEmotion === 'idle') return;

  const def = EMOTIONS[currentEmotion];
  if (!def) { playIdle(); return; }

  if (def.type === 'in-loop' && currentPhase === 'in') {
    currentPhase = 'loop';
    loadAndSwap(def.loopSrc, true);
  } else {
    playIdle();
  }
}

// ── exports ──────────────────────────────────────────────

export function initYukiAnimation(primaryVideoEl) {
  front = primaryVideoEl;
  front.style.opacity = '1';
  front.style.display = 'block';

  back = document.createElement('video');
  back.className   = front.className;
  back.muted       = true;
  back.playsInline = true;
  back.style.opacity = '0';
  front.insertAdjacentElement('afterend', back);

  front.addEventListener('ended', onEnded.bind(front));
  back.addEventListener('ended',  onEnded.bind(back));

  // start idle
  front.src  = EMOTIONS.idle.src;
  front.loop = true;
  front.muted = true;
  front.play();
}

export function setEmotion(emotion) {
  if (!front) return;
  const def = EMOTIONS[emotion];
  if (!def) return;
  if (emotion === currentEmotion && currentPhase === 'loop') return;

  currentEmotion = emotion;

  if (def.type === 'loop') {
    currentPhase = 'loop';
    loadAndSwap(def.src, true);
  } else if (def.type === 'in-loop') {
    currentPhase = 'in';
    loadAndSwap(def.inSrc, false);
  } else {
    // once
    currentPhase = 'once';
    loadAndSwap(def.src, false);
  }
}

export function onUserSpeak() {
  if (!front) return;
  const def = EMOTIONS[currentEmotion];
  if (!def) return;
  // in-loop currently looping → return to idle
  if (def.type === 'in-loop' && currentPhase === 'loop') {
    playIdle();
  }
  // 'once' currently playing → let it finish naturally (do nothing)
}

export function resetToIdle() {
  playIdle();
}

export function detectEmotion(tag) {
  const map = {
    happy:        'happy',
    smile:        'smile',
    surprised:    'surprised',
    shy:          'shy',
    'lean-smile': 'lean-smile',
    idle:         'idle',
  };
  return map[tag] || 'idle';
}
