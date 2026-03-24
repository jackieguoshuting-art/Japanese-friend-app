function escapeHtml(s) {
  if (s == null) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function escapeHtmlAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseVocabMarkup(text) {
  if (!text) return '';
  return text.replace(/\[\[([^\|]+)\|([^\|]+)\|([^\]]+)\]\]/g, (_match, word, reading, meaning) => {
    const w = word.trim();
    const r = reading.trim();
    const m = meaning.trim();
    return `<span class="vocab-word" data-word="${escapeHtmlAttr(w)}" data-reading="${escapeHtmlAttr(r)}" data-meaning="${escapeHtmlAttr(m)}">${escapeHtml(w)}</span>`;
  });
}

function openVocabFromEl(el) {
  if (!el) return;
  ensureVocabCardShell();
  bindVocabWordCapture();
  const backdrop = document.getElementById('vocab-card-backdrop');
  const card = document.getElementById('vocab-card-global');
  if (!backdrop || !card) return;

  document.querySelectorAll('.vocab-word').forEach((w) => w.classList.remove('active'));
  el.classList.add('active');

  const vcw = document.getElementById('vcw');
  const vcr = document.getElementById('vcr');
  const vcm = document.getElementById('vcm');
  if (vcw) vcw.textContent = el.dataset.word || '';
  if (vcr) vcr.textContent = el.dataset.reading || '';
  if (vcm) vcm.textContent = el.dataset.meaning || '';

  backdrop.classList.add('open');
  card.classList.add('open');
}

/** Legacy / programmatic: id can be empty; then pass raw strings. */
function showVocabCard(id, word, reading, meaning) {
  ensureVocabCardShell();
  bindVocabWordCapture();
  const el = id && document.getElementById(id);
  if (el && el.classList.contains('vocab-word') && el.dataset.word != null) {
    openVocabFromEl(el);
    return;
  }
  const backdrop = document.getElementById('vocab-card-backdrop');
  const card = document.getElementById('vocab-card-global');
  if (!backdrop || !card) return;
  document.querySelectorAll('.vocab-word').forEach((w) => w.classList.remove('active'));
  const vcw = document.getElementById('vcw');
  const vcr = document.getElementById('vcr');
  const vcm = document.getElementById('vcm');
  if (vcw) vcw.textContent = word;
  if (vcr) vcr.textContent = reading;
  if (vcm) vcm.textContent = meaning;
  backdrop.classList.add('open');
  card.classList.add('open');
}

function closeVocabCard() {
  document.getElementById('vocab-card-backdrop')?.classList.remove('open');
  document.getElementById('vocab-card-global')?.classList.remove('open');
  document.querySelectorAll('.vocab-word').forEach((w) => w.classList.remove('active'));
}

function toggleTranslation(msgId) {
  const tr = document.getElementById('tr-' + msgId);
  const hint = document.querySelector('[id="' + msgId + '"]')?.parentElement?.querySelector('.tap-hint');
  if (!tr) return;
  const isOpen = tr.style.display !== 'none';
  tr.style.display = isOpen ? 'none' : 'block';
  if (hint) hint.style.display = isOpen ? 'block' : 'none';
}

function bindVocabEscape() {
  if (document.documentElement.dataset.vocabEscapeBound) return;
  document.documentElement.dataset.vocabEscapeBound = '1';
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('vocab-card-global')?.classList.contains('open')) {
      closeVocabCard();
    }
  });
}

function ensureVocabCardShell() {
  /** Mount on body so .phone { overflow:hidden } never clips the overlay. */
  const mount = document.body;
  if (!mount) return;

  let backdrop = document.getElementById('vocab-card-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'vocab-card-backdrop';
    backdrop.className = 'vocab-card-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.addEventListener('click', () => closeVocabCard());
    mount.appendChild(backdrop);
  } else if (backdrop.parentElement !== mount) {
    mount.appendChild(backdrop);
  }

  let card = document.getElementById('vocab-card-global');
  if (!card) {
    card = document.createElement('div');
    card.id = 'vocab-card-global';
    card.className = 'vocab-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.innerHTML = `
      <button type="button" class="vocab-card-close" aria-label="閉じる">✕</button>
      <div class="vocab-card-word" id="vcw"></div>
      <div class="vocab-card-reading" id="vcr"></div>
      <div class="vocab-card-meaning" id="vcm"></div>
    `;
    card.querySelector('.vocab-card-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeVocabCard();
    });
    card.addEventListener('click', (e) => e.stopPropagation());
    mount.appendChild(card);
  } else if (card.parentElement !== mount) {
    mount.appendChild(card);
  }
}

function bindVocabWordCapture() {
  const shell = document.getElementById('app');
  if (!shell || shell.dataset.vocabCaptureBound) return;
  shell.dataset.vocabCaptureBound = '1';
  shell.addEventListener(
    'click',
    (e) => {
      const vw = e.target.closest?.('.vocab-word');
      if (!vw) return;
      e.preventDefault();
      e.stopPropagation();
      openVocabFromEl(vw);
    },
    true
  );
}

function initVocabCardUI() {
  ensureVocabCardShell();
  bindVocabWordCapture();
  bindVocabEscape();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVocabCardUI);
} else {
  initVocabCardUI();
}

window.escapeHtml = escapeHtml;
window.parseVocabMarkup = parseVocabMarkup;
window.showVocabCard = showVocabCard;
window.closeVocabCard = closeVocabCard;
window.toggleTranslation = toggleTranslation;
