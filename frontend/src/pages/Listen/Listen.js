const LISTEN_SCENES = {
  morning: {
    titleJa: '日本の朝',
    titleEn: 'Morning in Japan',
    mood:
      'さわやかで活き活き、軽い情報も入る雰囲気。天気・ラジオ・駅アナウンスなど、朝の音に慣れる。',
    items: ['天気予報', '朝のラジオ', '電車のアナウンス', 'カフェの注文', '早い時間の通勤音'],
    transcript:
      '（プレースホルダー）「本日は晴れのち曇り。夕方から雨の可能性があります……次、渋谷、渋谷です。出口は左側です。」',
  },
  afternoon: {
    titleJa: '日本の昼',
    titleEn: 'Afternoon in Japan',
    mood:
      'カジュアルで「ある一日」の断片。自然な会話密度で、リスニング負荷を抑えつつリアルな日本語に触れる。',
    items: ['カフェの会話', 'コンビニの店内', '校内アナウンス', 'オフィス周りのざわめき'],
    transcript:
      '（プレースホルダー）「いらっしゃいませ。温かいものと冷たいもの、どちらになさいますか？」「あ、これお願いします。」',
  },
  night: {
    titleJa: '日本の夜',
    titleEn: 'Night in Japan',
    mood:
      '落ち着きと余韻。照明・電車・街の低音など、夜のリスニング空間。発話なしの没入も想定。',
    items: ['夕方〜夜の電車', '居酒屋の遠い声', 'テレビの番宣', '住宅街の静けさ', 'ネオンと足音'],
    transcript:
      '（プレースホルダー）「まもなく終電となります。ご乗車のお客様はご注意ください……」',
  },
  stories: {
    titleJa: 'デイリーストーリー',
    titleEn: 'Daily Stories',
    mood:
      '短い物語の流れで、同じ音源を繰り返し聞ける構成に向けたテーマ（朗読・セリフ・地の文）。',
    items: ['連続した一話', '日常の一コマ', '視点の切り替え'],
    transcript:
      '（プレースホルダー）「今日の帰り道、いつものコンビニで見慣れない猫がいてさ……。」',
  },
  ambient: {
    titleJa: 'アンビエント',
    titleEn: 'Ambient Listening',
    mood:
      '雰囲気と音の層が主役。語彙密度を低く保ち、聞き流し・背景聴取に適したスペース。',
    items: ['雨と遠い車音', '商店街の足音', '室内の小さな音', '海辺・風'],
    transcript:
      '（字幕オフ推奨 — 音声のみの没入向け。ON にすると効果音の説明テキストを表示できます。）',
  },
};

function qs(root, sel) {
  return (root || document).querySelector(sel);
}

function resetListenHub() {
  const root = document.getElementById('pg-listen');
  if (!root) return;
  const hub = qs(root, '.listen-hub-view');
  const detail = qs(root, '.listen-detail');
  const player = qs(root, '.listen-player');
  const trans = qs(root, '.listen-transcript');
  const transBtn = qs(root, '#listen-btn-transcript');
  if (hub) {
    hub.classList.remove('is-hidden');
  }
  if (detail) {
    detail.classList.remove('is-open');
  }
  if (player) {
    player.classList.remove('is-playing', 'is-slow');
  }
  if (trans) {
    trans.classList.remove('is-visible');
  }
  if (transBtn) {
    transBtn.classList.remove('is-on');
  }
}

function openListenScene(id) {
  const cfg = LISTEN_SCENES[id];
  if (!cfg) return;
  const root = document.getElementById('pg-listen');
  if (!root) return;

  const titleEl = qs(root, '#listen-detail-title');
  if (titleEl) {
    titleEl.textContent = `${cfg.titleJa} · ${cfg.titleEn}`;
  }
  const moodEl = qs(root, '#listen-detail-mood');
  if (moodEl) {
    moodEl.textContent = cfg.mood;
  }
  const chips = qs(root, '#listen-scene-chips');
  if (chips) {
    chips.innerHTML = cfg.items
      .map((t) => `<span class="listen-chip">${t}</span>`)
      .join('');
  }
  const transText = qs(root, '#listen-transcript-text');
  if (transText) {
    transText.textContent = cfg.transcript;
  }
  root.dataset.listenScene = id;

  qs(root, '.listen-hub-view')?.classList.add('is-hidden');
  qs(root, '.listen-detail')?.classList.add('is-open');

  const player = qs(root, '.listen-player');
  const transPanel = qs(root, '.listen-transcript');
  const transBtn = qs(root, '#listen-btn-transcript');
  const slowBtn = qs(root, '#listen-btn-slow');
  if (player) player.classList.remove('is-playing', 'is-slow');
  if (transPanel) transPanel.classList.remove('is-visible');
  if (transBtn) transBtn.classList.remove('is-on');
  if (slowBtn) slowBtn.classList.remove('is-on');
}

function backToListenHub() {
  resetListenHub();
}

function initListenNavStars() {
  window.spawnStars?.('sl-listen');
}

function bindListenPage() {
  const page = document.getElementById('pg-listen');
  if (!page) return;

  page.addEventListener('click', (e) => {
    const hubCard = e.target.closest('.listen-hub-card');
    if (hubCard && hubCard.dataset.listenCat) {
      openListenScene(hubCard.dataset.listenCat);
      return;
    }
    if (e.target.closest('#listen-back-detail')) {
      backToListenHub();
      return;
    }
    if (e.target.closest('#listen-btn-play')) {
      const player = qs(page, '.listen-player');
      if (player) player.classList.toggle('is-playing');
      return;
    }
    if (e.target.closest('#listen-btn-replay')) {
      const player = qs(page, '.listen-player');
      if (player) {
        player.classList.remove('is-playing');
        requestAnimationFrame(() => player.classList.add('is-playing'));
      }
      return;
    }
    if (e.target.closest('#listen-btn-slow')) {
      const player = qs(page, '.listen-player');
      const btn = qs(page, '#listen-btn-slow');
      if (player && btn) {
        player.classList.toggle('is-slow');
        btn.classList.toggle('is-on', player.classList.contains('is-slow'));
      }
      return;
    }
    if (e.target.closest('#listen-btn-transcript')) {
      const panel = qs(page, '.listen-transcript');
      const btn = qs(page, '#listen-btn-transcript');
      if (panel && btn) {
        panel.classList.toggle('is-visible');
        btn.classList.toggle('is-on', panel.classList.contains('is-visible'));
      }
    }
  });

  const obs = new MutationObserver(() => {
    if (page.classList.contains('active')) {
      resetListenHub();
    }
  });
  obs.observe(page, { attributes: true, attributeFilter: ['class'] });
}

function boot() {
  initListenNavStars();
  bindListenPage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
