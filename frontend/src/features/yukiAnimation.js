const EMOTIONS = {
  idle:         '/frontend/public/assets/characters/yuki/animations/idle.webm',
  happy:        '/frontend/public/assets/characters/yuki/animations/happy.webm',
  smile:        '/frontend/public/assets/characters/yuki/animations/smile.webm',
  surprised:    '/frontend/public/assets/characters/yuki/animations/surprised.webm',
  'lean-smile': '/frontend/public/assets/characters/yuki/animations/lean-smile.webm',
};

let currentEmotion = 'idle';
let videoEl = null;

export function initYukiAnimation(videoElement) {
  videoEl = videoElement;
  videoEl.src = EMOTIONS.idle;
  videoEl.loop = true;
  videoEl.autoplay = true;
  videoEl.muted = true;
  videoEl.play();
}

export function setEmotion(emotion) {
  if (!videoEl) return;
  if (emotion === currentEmotion) return;
  currentEmotion = emotion;
  videoEl.src = EMOTIONS[emotion] || EMOTIONS.idle;
  videoEl.loop = true;
  videoEl.play();
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
