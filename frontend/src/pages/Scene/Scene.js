const SCENES = {
  station: {
    titleJa: '地下鉄',
    titleEn: 'STATION',
    desc: '"乗り換えは次の駅です…" Announcements, platform chatter, and the daily rhythm of Tokyo commutes.',
    stars: 2,
    route: 'transit',
  },
  izakaya: {
    titleJa: '居酒屋',
    titleEn: 'IZAKAYA',
    desc: '"もう一杯！" Late-night toasts, casual slang, and the warmth of shared food and laughter.',
    stars: 3,
    route: 'izakaya',
  },
  minimart: {
    titleJa: 'コンビニ',
    titleEn: 'MINI MART',
    desc: '"いらっしゃいませ！" Quick transactions, staff phrases, and the soundtrack of 24-hour life.',
    stars: 1,
    route: 'konbini',
  },
};

function stars(n) {
  var s = '';
  for (var i = 0; i < 3; i++) {
    s += '<span class="scene-star' + (i < n ? ' on' : '') + '">★</span>';
  }
  return s;
}

function openPopup(id, anchor) {
  closePopup();
  var d = SCENES[id];
  if (!d) return;
  var wrap = document.getElementById('scene-map-wrap');
  var card = document.createElement('div');
  card.className = 'scene-popup';
  card.dataset.sceneId = id;
  card.innerHTML =
    '<div class="scene-popup-tag">SELECTED SCENE</div>' +
    '<div class="scene-popup-header">' +
      '<div class="scene-popup-title-ja">' + d.titleJa + '</div>' +
      '<div class="scene-popup-stars">' + stars(d.stars) + '</div>' +
    '</div>' +
    '<div class="scene-popup-title-en">' + d.titleEn + '</div>' +
    '<p class="scene-popup-desc">' + d.desc + '</p>' +
    '<div class="scene-popup-actions">' +
      '<button class="scene-popup-enter" data-route="' + d.route + '">ENTER ARCHIVE</button>' +
      '<button class="scene-popup-bookmark">' +
        '<svg width="13" height="17" viewBox="0 0 14 18" fill="none">' +
          '<path d="M2 2h10v14l-5-3-5 3V2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>' +
        '</svg>' +
      '</button>' +
    '</div>' +
    '<div class="scene-popup-arrow"></div>';

  wrap.appendChild(card);

  var wRect = wrap.getBoundingClientRect();
  var aRect = anchor.getBoundingClientRect();
  var cw = 240; var ch = card.offsetHeight || 200;
  var left = (aRect.left - wRect.left) + aRect.width / 2 - cw / 2;
  var top  = (aRect.top  - wRect.top)  - ch - 12;
  left = Math.max(8, Math.min(left, wRect.width - cw - 8));
  if (top < 56) {
    top = (aRect.top - wRect.top) + aRect.height + 8;
    var arr = card.querySelector('.scene-popup-arrow');
    if (arr) arr.style.cssText = 'bottom:auto;top:-8px;border-top:none;border-bottom:8px solid rgba(0,47,167,0.5);';
  }
  card.style.left = left + 'px';
  card.style.top  = top  + 'px';

  document.querySelectorAll('#pg-scene .scene-hotspot').forEach(function(h) {
    h.classList.toggle('is-active', h.dataset.scene === id);
  });

  requestAnimationFrame(function() { card.classList.add('is-visible'); });
}

function closePopup() {
  document.querySelectorAll('#pg-scene .scene-popup').forEach(function(c) { c.remove(); });
  document.querySelectorAll('#pg-scene .scene-hotspot').forEach(function(h) { h.classList.remove('is-active'); });
}

function initPan() {
  var wrap = document.getElementById('scene-map-wrap');
  var img  = document.getElementById('scene-map-img');
  if (!wrap || !img) return;

  var ox = 0, oy = 0;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function applyTransform() {
    img.style.transform = 'translate(' + ox + 'px,' + oy + 'px)';
  }

  function center() {
    var ww = wrap.offsetWidth,  wh = wrap.offsetHeight;
    var iw = img.offsetWidth,   ih = img.offsetHeight;
    if (iw === 0 || ih === 0) return;
    ox = clamp(-Math.round((iw - ww) * 0.57), ww - iw, 0);
    oy = clamp(-Math.round((ih - wh) * 0.66), wh - ih, 0);
    applyTransform();
  }

  function limit() {
    var ww = wrap.offsetWidth,  wh = wrap.offsetHeight;
    var iw = img.offsetWidth,   ih = img.offsetHeight;
    if (iw > ww) { ox = clamp(ox, ww - iw, 0); } else { ox = 0; }
    if (ih > wh) { oy = clamp(oy, wh - ih, 0); } else { oy = 0; }
  }

  img.onload = center;
  setTimeout(center, 100);

  var dragging = false, sx, sy;

  wrap.addEventListener('pointerdown', function(e) {
    if (e.target.closest('.scene-hotspot') || e.target.closest('.scene-popup')) return;
    dragging = true;
    sx = e.clientX - ox;
    sy = e.clientY - oy;
    wrap.setPointerCapture(e.pointerId);
  });

  wrap.addEventListener('pointermove', function(e) {
    if (!dragging) return;
    ox = e.clientX - sx;
    oy = e.clientY - sy;
    limit();
    applyTransform();
  });

  function end() { dragging = false; }
  wrap.addEventListener('pointerup', end);
  wrap.addEventListener('pointercancel', end);
}

function bind() {
  var page = document.getElementById('pg-scene');
  if (!page) return;

  page.addEventListener('click', function(e) {
    var hs = e.target.closest('.scene-hotspot');
    if (hs) {
      var id = hs.dataset.scene;
      var existing = page.querySelector('.scene-popup[data-scene-id="' + id + '"]');
      if (existing) { closePopup(); return; }
      openPopup(id, hs);
      return;
    }
    var btn = e.target.closest('.scene-popup-enter');
    if (btn) {
      var route = btn.dataset.route;
      if (typeof go === 'function') go(route);
      else alert('entering: ' + route);
      return;
    }
    if (!e.target.closest('.scene-popup')) {
      closePopup();
    }
  });

  initPan();

  new MutationObserver(function() {
    if (!page.classList.contains('active')) closePopup();
  }).observe(page, { attributes: true, attributeFilter: ['class'] });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bind);
} else {
  bind();
}
