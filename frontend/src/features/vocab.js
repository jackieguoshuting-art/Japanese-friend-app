function parseVocabMarkup(text) {
  return text.replace(/\[\[([^\|]+)\|([^\|]+)\|([^\]]+)\]\]/g, (match, word, reading, meaning) => {
    const id = 'w-' + Date.now() + '-' + Math.random().toString(36).slice(2,6);
    return `<span class="vocab-word" id="${id}" onclick="showVocabCard('${id}','${word}','${reading}','${meaning}')">${word}</span>`;
  });
}

function showVocabCard(id, word, reading, meaning) {
  document.querySelectorAll('.vocab-word').forEach(w => w.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');

  let card = document.getElementById('vocab-card-global');
  if (!card) {
    card = document.createElement('div');
    card.id = 'vocab-card-global';
    card.className = 'vocab-card';
    card.innerHTML = `
      <button class="vocab-card-close" onclick="closeVocabCard()">✕</button>
      <div class="vocab-card-word" id="vcw"></div>
      <div class="vocab-card-reading" id="vcr"></div>
      <div class="vocab-card-meaning" id="vcm"></div>
    `;
    document.getElementById('pg-text')?.appendChild(card);
  }

  document.getElementById('vcw').textContent = word;
  document.getElementById('vcr').textContent = reading;
  document.getElementById('vcm').textContent = meaning;
  card.classList.add('open');
}

function closeVocabCard() {
  document.getElementById('vocab-card-global')?.classList.remove('open');
  document.querySelectorAll('.vocab-word').forEach(w => w.classList.remove('active'));
}

function toggleTranslation(msgId) {
  const tr = document.getElementById('tr-' + msgId);
  const hint = document.querySelector('[id="' + msgId + '"]')?.parentElement?.querySelector('.tap-hint');
  if (!tr) return;
  const isOpen = tr.style.display !== 'none';
  tr.style.display = isOpen ? 'none' : 'block';
  if (hint) hint.style.display = isOpen ? 'block' : 'none';
}

window.parseVocabMarkup = parseVocabMarkup;
window.showVocabCard = showVocabCard;
window.closeVocabCard = closeVocabCard;
window.toggleTranslation = toggleTranslation;
