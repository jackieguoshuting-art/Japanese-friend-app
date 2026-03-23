function spawnStars(layerId) {
  const layer = document.getElementById(layerId);
  if (!layer) return;
  const glyphs = ['✦', '✧', '⋆', '˚', '·', '★', '✩'];
  for (let i = 0; i < 22; i += 1) {
    const s = document.createElement('div');
    s.className = 'star';
    s.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
    s.style.left = `${Math.random() * 96}%`;
    s.style.top = `${Math.random() * 96}%`;
    s.style.fontSize = `${7 + Math.random() * 10}px`;
    s.style.opacity = (0.15 + Math.random() * 0.45).toFixed(2);
    s.style.animationDelay = `${Math.random() * 6}s`;
    s.style.animationDuration = `${4 + Math.random() * 5}s`;
    layer.appendChild(s);
  }
  for (let i = 0; i < 9; i += 1) {
    const d = document.createElement('div');
    d.className = 'diamond-shape';
    const size = 4 + Math.random() * 6;
    d.style.width = `${size}px`;
    d.style.height = `${size}px`;
    d.style.left = `${Math.random() * 96}%`;
    d.style.top = `${Math.random() * 96}%`;
    d.style.animationDelay = `${Math.random() * 7}s`;
    d.style.animationDuration = `${5 + Math.random() * 5}s`;
    layer.appendChild(d);
  }
}

function animateVoiceBars() {
  const bars = document.querySelectorAll('#wave-viz .wbar');
  setInterval(() => {
    bars.forEach((bar) => {
      const height = 10 + Math.random() * 36;
      bar.style.height = `${height}px`;
    });
  }, 180);
}

function initWordTooltips() {
  document.querySelectorAll('.word-link').forEach((word) => {
    word.addEventListener('click', (event) => {
      const tip = event.target.getAttribute('title');
      if (!tip) return;
      const bubble = document.createElement('div');
      bubble.textContent = tip;
      bubble.style.cssText = `
        position: fixed;
        background: rgba(20,18,50,0.95);
        border: 1px solid rgba(122,188,255,0.4);
        color: #7abcff;
        padding: 6px 14px;
        border-radius: 10px;
        font-size: 13px;
        z-index: 999;
        pointer-events: none;
        top: ${event.clientY - 44}px;
        left: ${Math.min(event.clientX - 40, 280)}px;
        font-family: 'Noto Sans JP', sans-serif;
      `;
      document.body.appendChild(bubble);
      setTimeout(() => bubble.remove(), 1800);
    });
  });
}

function injectIdolDecorations() {
  const configs = [
    { id:'sl-home',    items:[{top:'18%',left:'6%'},{top:'28%',right:'8%'},{top:'55%',left:'4%'},{bottom:'35%',right:'8%'}] },
    { id:'sl-friends', items:[{top:'12%',left:'5%'},{top:'45%',right:'5%'},{bottom:'30%',left:'8%'}] },
    { id:'sl-call',    items:[{top:'20%',left:'5%'},{top:'40%',right:'6%'}] },
    { id:'sl-summary', items:[{top:'10%',right:'8%'},{bottom:'40%',left:'6%'}] },
  ];
  const chars = ['✦','✧','★','◆','✶'];
  const beamColors = ['#ff60d0','#60b0ff','#ffe060','#c060ff'];
  const beamAngles = [-18,-6,8,20];

  configs.forEach(cfg => {
    const el = document.getElementById(cfg.id);
    if (!el) return;
    cfg.items.forEach((pos, i) => {
      const s = document.createElement('div');
      s.className = 'sparkle-deco';
      s.textContent = chars[i % chars.length];
      s.style.fontSize = (10 + (i%3)*3) + 'px';
      s.style.animationDelay = (i * 0.4) + 's';
      Object.assign(s.style, pos);
      el.appendChild(s);
    });
    beamColors.forEach((color, i) => {
      const b = document.createElement('div');
      b.className = 'light-beam';
      b.style.left = (i * 25) + '%';
      b.style.background = `linear-gradient(180deg,${color},transparent)`;
      b.style.transform = `rotate(${beamAngles[i]}deg)`;
      b.style.animationDelay = (i * 0.5) + 's';
      el.appendChild(b);
    });
  });
}

window.spawnStars = spawnStars;
window.animateVoiceBars = animateVoiceBars;
window.initWordTooltips = initWordTooltips;
window.injectIdolDecorations = injectIdolDecorations;

document.addEventListener('DOMContentLoaded', injectIdolDecorations);
