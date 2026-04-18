var BUILDING_DEFS = [
  { id: 'building-station',  cx: 1390, cy: 2235, w: 850, h: 890, scene: 'station'  },
  { id: 'building-izakaya',  cx: 2687, cy: 2245, w: 560, h: 855, scene: 'izakaya'  },
  { id: 'building-minimart', cx: 3233, cy: 2973, w: 457, h: 700, scene: 'minimart' },
];
var ORIG_W = 5116;
var ORIG_H = 5120;

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
  document.querySelectorAll('#pg-scene .scene-building').forEach(function(b) {
    b.classList.toggle('is-active', b.dataset.scene === id);
  });

  requestAnimationFrame(function() { card.classList.add('is-visible'); });
}

function closePopup() {
  document.querySelectorAll('#pg-scene .scene-popup').forEach(function(c) { c.remove(); });
  document.querySelectorAll('#pg-scene .scene-hotspot').forEach(function(h) { h.classList.remove('is-active'); });
  document.querySelectorAll('#pg-scene .scene-building').forEach(function(b) { b.classList.remove('is-active'); });
}

var syncBuildings = function() {};

function initPan() {
  var wrap = document.getElementById('scene-map-wrap');
  var img  = document.getElementById('scene-map-img');
  if (!wrap || !img) return;

  var ox = 0, oy = 0;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function applyTransform() {
    var t = 'translate(' + ox + 'px,' + oy + 'px)';
    img.style.transform = t;
    var layer = document.getElementById('scene-building-layer');
    if (layer) layer.style.transform = t;
  }

  syncBuildings = function() {
    var iw = img.offsetWidth;
    var ih = img.offsetHeight;
    if (iw === 0 || ih === 0) return;

    var layer = document.getElementById('scene-building-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'scene-building-layer';
      layer.style.position = 'absolute';
      layer.style.top = '0';
      layer.style.left = '0';
      layer.style.pointerEvents = 'none';
      layer.style.overflow = 'visible';
      wrap.appendChild(layer);
    }
    layer.style.width  = iw + 'px';
    layer.style.height = ih + 'px';

    var defs = [
      { id: 'building-station',  cx: 1390, cy: 2235, w: 850, h: 890, scene: 'station'  },
      { id: 'building-izakaya',  cx: 2687, cy: 2245, w: 560, h: 855, scene: 'izakaya'  },
      { id: 'building-minimart', cx: 3233, cy: 2973, w: 457, h: 700, scene: 'minimart' },
    ];

    defs.forEach(function(d) {
      var el = document.getElementById(d.id);
      if (!el) return;
      if (el.parentElement !== layer) layer.appendChild(el);
      var scale = 1.15;
      var baseW = (d.w / ORIG_W) * iw;
      var baseH = (d.h / ORIG_H) * ih;
      var displayW = baseW * scale;
      var displayH = baseH * scale;
      var originLeft = (d.cx / ORIG_W) * iw;
      var originTop  = (d.cy / ORIG_H) * ih;
      var left = originLeft - (displayW - baseW) / 2;
      var top  = originTop  - (displayH - baseH) / 2;
      // visual: pointer-events off, glow via class
      el.style.cssText = [
        'position:absolute',
        'left:' + Math.round(left) + 'px',
        'top:'  + Math.round(top)  + 'px',
        'width:'  + Math.round(displayW) + 'px',
        'height:auto',
        'max-width:none!important',
        'pointer-events:none',
        'transform:none',
        'transition:filter 0.3s ease',
        'filter:drop-shadow(0 0 8px rgba(255,255,255,0.9)) drop-shadow(0 0 20px rgba(255,255,255,0.5))'
      ].join(';');
      // hit area: 60% size, centered on building
      var hitW = Math.round(displayW * 0.6);
      var hitH = Math.round(displayH * 0.6);
      var hitLeft = Math.round(left + (displayW - hitW) / 2);
      var hitTop  = Math.round(top  + (displayH - hitH) / 2);
      var hitId = 'hit-' + d.id;
      var hit = document.getElementById(hitId);
      if (!hit) {
        hit = document.createElement('div');
        hit.id = hitId;
        hit.className = 'scene-building';
        hit.dataset.scene = d.scene || d.id.replace('building-', '');
        layer.appendChild(hit);
      }
      hit.style.cssText = [
        'position:absolute',
        'left:' + hitLeft + 'px',
        'top:'  + hitTop  + 'px',
        'width:'  + hitW + 'px',
        'height:' + hitH + 'px',
        'pointer-events:auto',
        'cursor:pointer',
        'background:transparent'
      ].join(';');
    });
  };

  function center() {
    var ww = wrap.offsetWidth,  wh = wrap.offsetHeight;
    var iw = img.offsetWidth,   ih = img.offsetHeight;
    if (iw === 0 || ih === 0) return;
    ox = clamp(-Math.round((iw - ww) * 0.57), ww - iw, 0);
    oy = clamp(-Math.round((ih - wh) * 0.66), wh - ih, 0);
    syncBuildings();
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
    if (e.target.closest('.scene-hotspot') || e.target.closest('.scene-popup') || e.target.closest('.scene-building')) return;
    dragging = true;
    sx = e.clientX - ox;
    sy = e.clientY - oy;
    wrap.setPointerCapture(e.pointerId);
  });

  wrap.addEventListener('pointermove', function(e) {
    if (!dragging) return;
    var ww = wrap.offsetWidth, wh = wrap.offsetHeight;
    var iw = img.offsetWidth,  ih = img.offsetHeight;
    ox = clamp(e.clientX - sx, ww - iw, 0);
    oy = clamp(e.clientY - sy, wh - ih, 0);
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
    var bld = e.target.closest('.scene-building');
    if (bld) {
      var id = bld.dataset.scene;
      var existing = page.querySelector('.scene-popup[data-scene-id="' + id + '"]');
      if (existing) { closePopup(); return; }
      openPopup(id, bld);
      return;
    }
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
    if (page.classList.contains('active')) {
      setTimeout(function() {
        var img = document.getElementById('scene-map-img');
        var wrap = document.getElementById('scene-map-wrap');
        if (!img || !wrap) return;
        var ww = wrap.offsetWidth, wh = wrap.offsetHeight;
        var iw = img.offsetWidth,  ih = img.offsetHeight;
        if (iw === 0 || ih === 0) return;
        var ox = Math.max(ww - iw, Math.min(0, -Math.round((iw - ww) * 0.57)));
        var oy = Math.max(wh - ih, Math.min(0, -Math.round((ih - wh) * 0.66)));
        var t = 'translate(' + ox + 'px,' + oy + 'px)';
        img.style.transform = t;
        syncBuildings();
        var layer = document.getElementById('scene-building-layer');
        if (layer) layer.style.transform = t;
      }, 50);
    } else {
      closePopup();
    }
  }).observe(page, { attributes: true, attributeFilter: ['class'] });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bind);
} else {
  bind();
}
