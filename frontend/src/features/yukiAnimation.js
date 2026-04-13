const EMOTIONS = {
  idle:         '/frontend/public/assets/characters/yuki/animations/idle.webm',
  happy:        '/frontend/public/assets/characters/yuki/animations/happy.webm',
  smile:        '/frontend/public/assets/characters/yuki/animations/smile.webm',
  surprised:    '/frontend/public/assets/characters/yuki/animations/surprised.webm',
  'lean-smile': '/frontend/public/assets/characters/yuki/animations/lean-smile.webm',
};

let currentEmotion = 'idle';
let front = null;  // currently visible video
let back  = null;  // preloading in background

function swapNow() {
  back.style.opacity  = '1';
  front.style.opacity = '0';
  [front, back] = [back, front];
}

function loadAndPlay(el, src, loop, onReady) {
  el.loop  = loop;
  el.muted = true;
  el.src   = src;
  el.load();
  el.addEventListener('canplay', function handler() {
    el.removeEventListener('canplay', handler);
    onReady();
  });
}

function playIdle() {
  currentEmotion = 'idle';
  // back is already playing idle in background — swap directly, no reload
  if (back.readyState >= 2 && back.src.includes('idle.webm')) {
    back.loop = true;
    back.play();
    swapNow();
    return;
  }
  loadAndPlay(back, EMOTIONS.idle, true, () => {
    back.play();
    swapNow();
  });
}

export function initYukiAnimation(primaryVideoEl) {
  front = primaryVideoEl;

  // create back video dynamically, same class/position as front
  back = document.createElement('video');
  back.className   = front.className;
  back.muted       = true;
  back.playsinline = true;
  back.style.opacity = '0';
  front.style.opacity = '1';
  front.style.display = 'block';
  front.insertAdjacentElement('afterend', back);

  const onEnded = () => { if (currentEmotion !== 'idle') playIdle(); };
  front.addEventListener('ended', onEnded);
  back.addEventListener('ended', onEnded);

  // start idle on front
  front.src  = EMOTIONS.idle;
  front.loop = true;
  front.muted = true;
  front.play();
}

export function setEmotion(emotion) {
  if (!front) return;
  if (emotion === currentEmotion) return;
  if (!emotion || emotion === 'idle') {
    playIdle();
    return;
  }
  currentEmotion = emotion;
  loadAndPlay(back, EMOTIONS[emotion] || EMOTIONS.idle, false, () => {
    back.play();
    swapNow();
  });
}

export function resetToIdle() {
  setEmotion('idle');
}

export function detectEmotion(emotionTag) {
  const map = {
    happy: 'happy',
    smile: 'smile',
    surprised: 'surprised',
    'lean-smile': 'lean-smile',
    idle: 'idle',
  };
  return map[emotionTag] || 'idle';
}
