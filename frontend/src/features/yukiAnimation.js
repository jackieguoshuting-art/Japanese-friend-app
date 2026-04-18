const BASE = '/frontend/public/assets/characters/yuki/animations';

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

// Generation counter — incremented on every new swap request.
// All async callbacks capture their generation at creation time and
// abort silently if a newer request has since taken over.
let swapGen = 0;

// ── helpers ──────────────────────────────────────────────

function doSwap(onSwapped) {
  // Step 1: make back visible (back is higher in DOM, appears on top of front).
  back.style.opacity = '1';
  // Step 2: wait one full paint so back's frame actually reaches the screen,
  // THEN hide front. Guarantees a 1-frame overlap so transparent tail frames
  // in front are covered before front disappears.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      front.style.opacity = '0';
      [front, back] = [back, front];
      if (onSwapped) onSwapped();
    });
  });
}

function waitFrameThenSwap(gen, onSwapped) {
  // Fixed 150 ms wait — rVFC on opacity:0 elements is unreliable across browsers.
  // Front stays visible during the wait, so there is no gap.
  setTimeout(() => {
    if (swapGen !== gen) return; // a newer request took over — discard
    doSwap(onSwapped);
  }, 150);
}

// Start playing src in back (hidden, opacity:0) without swapping.
function prePlayInBack(src, loop) {
  back.loop  = loop;
  back.muted = true;
  const filename = src.split('/').pop();
  if (back.src.endsWith(filename) && !back.paused) return; // already running
  back.src = src;
  back.load();
  back.addEventListener('canplay', function h() {
    back.removeEventListener('canplay', h);
    back.play().catch(() => {});
  });
}

// Load src into back and swap when ready. Captures swapGen so stale callbacks self-cancel.
function loadAndSwap(src, loop, onSwapped) {
  const gen = swapGen; // capture — used by every async branch below
  back.loop  = loop;
  back.muted = true;

  const filename = src.split('/').pop();
  const sameFile = back.src.endsWith(filename);

  if (sameFile && !back.paused) {
    // Already playing — one rAF, then doSwap
    requestAnimationFrame(() => {
      if (swapGen !== gen) return;
      doSwap(onSwapped);
    });
    return;
  }

  if (sameFile && back.readyState >= 2) {
    back.play()
      .then(() => { if (swapGen === gen) waitFrameThenSwap(gen, onSwapped); })
      .catch(() => { if (swapGen === gen) doSwap(onSwapped); });
    return;
  }

  if (sameFile && back.readyState >= 1) {
    // Already loading same file — don't reset, just wait for canplay
    back.addEventListener('canplay', function handler() {
      back.removeEventListener('canplay', handler);
      if (swapGen !== gen) return;
      back.play()
        .then(() => waitFrameThenSwap(gen, onSwapped))
        .catch(() => doSwap(onSwapped));
    });
    return;
  }

  // Different file — start fresh
  back.src = src;
  back.load();
  back.addEventListener('canplay', function handler() {
    back.removeEventListener('canplay', handler);
    if (swapGen !== gen) return;
    back.play()
      .then(() => waitFrameThenSwap(gen, onSwapped))
      .catch(() => doSwap(onSwapped));
  });
}

function playIdle() {
  currentEmotion = 'idle';
  currentPhase   = 'loop';
  swapGen++;
  loadAndSwap(EMOTIONS.idle.src, true);
}

function onEnded() {
  if (this !== front) return;
  if (currentEmotion === 'idle') return;

  const def = EMOTIONS[currentEmotion];
  if (!def) { playIdle(); return; }

  if (def.type === 'in-loop' && currentPhase === 'in') {
    currentPhase = 'loop';
    // back has been pre-playing loopSrc since the in-phase started → instant rAF swap
    loadAndSwap(def.loopSrc, true);
  } else {
    // once: back has been pre-playing idle → instant rAF swap
    playIdle();
  }
}

// ── exports ──────────────────────────────────────────────

export function initYukiAnimation(primaryVideoEl) {
  front = primaryVideoEl;
  front.style.opacity = '0';   // hidden until first frame paints
  front.style.display = 'block';

  back = document.createElement('video');
  back.className   = front.className;
  back.muted       = true;
  back.playsInline = true;
  back.style.opacity = '0';
  front.insertAdjacentElement('afterend', back);

  front.addEventListener('ended', onEnded.bind(front));
  back.addEventListener('ended',  onEnded.bind(back));

  // Load idle; reveal after canplay — CSS transition handles the fade-in
  front.loop  = true;
  front.muted = true;
  front.src   = EMOTIONS.idle.src;
  front.load();
  front.addEventListener('canplay', function handler() {
    front.removeEventListener('canplay', handler);
    front.play()
      .then(() => { front.style.opacity = '1'; })
      .catch(() => { front.style.opacity = '1'; });
  });
}

export function setEmotion(emotion) {
  if (!front) return;
  const def = EMOTIONS[emotion];
  if (!def) return;
  if (emotion === currentEmotion && currentPhase === 'loop') return;

  currentEmotion = emotion;
  swapGen++; // cancel any in-flight swap from a previous request

  if (def.type === 'loop') {
    currentPhase = 'loop';
    loadAndSwap(def.src, true);
  } else if (def.type === 'in-loop') {
    currentPhase = 'in';
    // After in-phase is in front, immediately pre-play loopSrc in back (hidden).
    // When in-phase ends, back is already mid-play → one rAF swap, no gap.
    loadAndSwap(def.inSrc, false, () => {
      prePlayInBack(def.loopSrc, true);
    });
  } else {
    // once — after swap, pre-play idle in back if it's not already running.
    // When once ends, back (idle) is already playing → instant rAF swap.
    currentPhase = 'once';
    loadAndSwap(def.src, false, () => {
      prePlayInBack(EMOTIONS.idle.src, true);
    });
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

// TODO: remove before production — debug only
window.setYukiEmotion = setEmotion;

