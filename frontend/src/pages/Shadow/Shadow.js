/* ============================================
   Shadow.js — Live Shadowing Module
   ============================================ */

const SHADOW_SAVE_KEY = 'shadowProgress';

/* ── Story / Scene data ── */
const STORIES = [
  {
    id: 'spirited-away',
    title: '千と千尋の神隠し',
    titleEn: 'Spirited Away',
    icon: '🏮',
    bg: 'bathhouse',
    genre: ['ファンタジー', '冒険'],
    scenes: [
      {
        id: 'sa-01',
        title: '不思議なトンネル',
        charEmoji: '👧',
        charName: '千尋',
        speaker: '千尋',
        role: 'あなたは千尋を演じます',
        targetLine: 'お父さん、ここ変だよ。戻ろうよ。',
        reading: 'おとうさん、ここへんだよ。もどろうよ。',
        translation: "Dad, this place is weird. Let's go back.",
      },
      {
        id: 'sa-02',
        title: '油屋に迷い込む',
        charEmoji: '👵',
        charName: '湯婆婆',
        speaker: '千尋',
        role: 'あなたは千尋を演じます',
        targetLine: 'お願いします！ここで働かせてください！',
        reading: 'おねがいします！ここではたらかせてください！',
        translation: 'Please! Let me work here!',
      },
      {
        id: 'sa-03',
        title: 'ハクとの別れ',
        charEmoji: '👦',
        charName: 'ハク',
        speaker: '千尋',
        role: 'あなたは千尋を演じます',
        targetLine: 'ありがとう、ハク。絶対また会えるよ。',
        reading: 'ありがとう、ハク。ぜったいまたあえるよ。',
        translation: "Thank you, Haku. I'm sure we'll meet again.",
      },
    ],
  },
  {
    id: 'totoro',
    title: 'となりのトトロ',
    titleEn: 'My Neighbor Totoro',
    icon: '🌳',
    bg: 'forest',
    genre: ['ファンタジー', '日常'],
    scenes: [
      {
        id: 'tt-01',
        title: 'バス停での出会い',
        charEmoji: '🐾',
        charName: 'トトロ',
        speaker: 'さつき',
        role: 'あなたはさつきを演じます',
        targetLine: 'あなたが、トトロ？',
        reading: 'あなたが、トトロ？',
        translation: 'Are you Totoro?',
      },
      {
        id: 'tt-02',
        title: '種を植える夜',
        charEmoji: '🌙',
        charName: 'さつき',
        speaker: 'さつき',
        role: 'あなたはさつきを演じます',
        targetLine: 'すごい！芽が出た！トトロのおかげだ！',
        reading: 'すごい！めがでた！トトロのおかげだ！',
        translation: "Amazing! It sprouted! It's thanks to Totoro!",
      },
      {
        id: 'tt-03',
        title: 'ネコバスに乗る',
        charEmoji: '🚌',
        charName: 'ネコバス',
        speaker: 'さつき',
        role: 'あなたはさつきを演じます',
        targetLine: 'お母さんのいる病院へ、お願い！',
        reading: 'おかあさんのいるびょういんへ、おねがい！',
        translation: 'To the hospital where my mother is, please!',
      },
    ],
  },
  {
    id: 'your-name',
    title: '君の名は。',
    titleEn: 'Your Name',
    icon: '✨',
    bg: 'twilight',
    genre: ['ロマンス', 'SF'],
    scenes: [
      {
        id: 'yn-01',
        title: '糸守の朝',
        charEmoji: '🌅',
        charName: '三葉',
        speaker: '三葉',
        role: 'あなたは三葉を演じます',
        targetLine: '誰？夢、じゃないよね……？',
        reading: 'だれ？ゆめ、じゃないよね……？',
        translation: "Who are you? This isn't a dream... is it?",
      },
      {
        id: 'yn-02',
        title: '黄昏時の出会い',
        charEmoji: '🌆',
        charName: '瀧',
        speaker: '三葉',
        role: 'あなたは三葉を演じます',
        targetLine: 'ずっと、何かを、誰かを探してた気がする。',
        reading: 'ずっと、なにかを、だれかをさがしてたきがする。',
        translation: "I feel like I've been searching for something, someone, all along.",
      },
      {
        id: 'yn-03',
        title: '二度目の出会い',
        charEmoji: '🌟',
        charName: '瀧',
        speaker: '三葉',
        role: 'あなたは三葉を演じます',
        targetLine: 'あの……どこかで会ったことありますか？',
        reading: 'あの……どこかであったことありますか？',
        translation: 'Um... have we met somewhere before?',
      },
    ],
  },
];

/* ── Module state ── */
const sdw = {
  story: null,
  sceneIdx: 0,
  currentScene: null,
  recording: false,
  mediaRecorder: null,
  audioChunks: [],
  audioUrl: null,
  micAllowed: null, // null=unknown, true=granted, false=denied
};

/* ── Progress helpers ── */
function sdwLoadProgress() {
  try { return JSON.parse(localStorage.getItem(SHADOW_SAVE_KEY) || '{}'); } catch { return {}; }
}
function sdwSaveProgress(data) {
  try { localStorage.setItem(SHADOW_SAVE_KEY, JSON.stringify(data)); } catch {}
}
function sdwMarkSceneDone(storyId, sceneId) {
  const p = sdwLoadProgress();
  if (!p[storyId]) p[storyId] = { done: [] };
  if (!p[storyId].done.includes(sceneId)) p[storyId].done.push(sceneId);
  p.lastStory = storyId;
  p.lastScene = sceneId;
  sdwSaveProgress(p);
}
function sdwIsSceneDone(storyId, sceneId) {
  const p = sdwLoadProgress();
  return p[storyId]?.done?.includes(sceneId) ?? false;
}
function sdwStoryPct(storyId) {
  const story = STORIES.find(s => s.id === storyId);
  if (!story) return 0;
  const done = sdwLoadProgress()[storyId]?.done?.length ?? 0;
  return Math.round((done / story.scenes.length) * 100);
}

/* ── View routing ── */
const SDW_VIEWS = ['sdw-library', 'sdw-scenes', 'sdw-scene', 'sdw-analysis', 'sdw-reward'];

function shadowGoView(viewId) {
  SDW_VIEWS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const target = document.getElementById(viewId);
  if (target) target.style.display = 'flex';
}

function shadowGoLib() {
  shadowRenderLibrary();
  shadowGoView('sdw-library');
}

/* ── Library ── */
function shadowRenderLibrary() {
  // Daily banner — rotate by day of year across all scenes
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  const allScenes = STORIES.flatMap(s => s.scenes.map(sc => ({ story: s, scene: sc })));
  const daily = allScenes[dayOfYear % allScenes.length];
  const banner = document.getElementById('sdw-daily-banner');
  if (banner && daily) {
    document.getElementById('sdw-daily-story').textContent = daily.story.title;
    document.getElementById('sdw-daily-line').textContent = `"${daily.scene.targetLine}"`;
    banner.dataset.storyId = daily.story.id;
    banner.dataset.sceneIdx = daily.story.scenes.indexOf(daily.scene);
  }

  // Continue row
  const progress = sdwLoadProgress();
  const continueRow = document.getElementById('sdw-continue-row');
  if (continueRow) {
    const lastStory = progress.lastStory ? STORIES.find(s => s.id === progress.lastStory) : null;
    if (lastStory && progress.lastScene) {
      const lastIdx = lastStory.scenes.findIndex(sc => sc.id === progress.lastScene);
      const nextIdx = Math.min(lastIdx + 1, lastStory.scenes.length - 1);
      const nextScene = lastStory.scenes[nextIdx];
      continueRow.style.display = 'flex';
      document.getElementById('sdw-continue-info').textContent = `${lastStory.title} · ${nextScene.title}`;
      continueRow.dataset.storyId = lastStory.id;
      continueRow.dataset.sceneIdx = nextIdx;
    } else {
      continueRow.style.display = 'none';
    }
  }

  // Story grid
  const grid = document.getElementById('sdw-story-grid');
  if (!grid) return;
  grid.innerHTML = '';
  STORIES.forEach(story => {
    const pct = sdwStoryPct(story.id);
    const card = document.createElement('div');
    card.className = 'sdw-story-card';
    card.innerHTML = `
      <div class="sdw-story-cover sdw-bg-${story.bg}">
        <div class="sdw-story-icon">${story.icon}</div>
      </div>
      <div class="sdw-story-info">
        <div class="sdw-story-title">${story.title}</div>
        <div class="sdw-story-en">${story.titleEn}</div>
        <div class="sdw-story-tags">${story.genre.map(g => `<span class="sdw-genre-tag">${g}</span>`).join('')}</div>
        <div class="sdw-story-prog-wrap"><div class="sdw-story-prog-fill" style="width:${pct}%"></div></div>
        <div class="sdw-story-prog-lbl">${pct > 0 ? pct + '% 完了 · ' : ''}${story.scenes.length} シーン</div>
      </div>
    `;
    card.onclick = () => go('shadow-scenes');
    grid.appendChild(card);
  });
}

function shadowStartDaily() {
  const banner = document.getElementById('sdw-daily-banner');
  if (!banner) return;
  const story = STORIES.find(s => s.id === banner.dataset.storyId);
  const idx = parseInt(banner.dataset.sceneIdx, 10) || 0;
  if (story) shadowStartSceneAt(story, idx);
}

function shadowResume() {
  const row = document.getElementById('sdw-continue-row');
  if (!row) return;
  const story = STORIES.find(s => s.id === row.dataset.storyId);
  const idx = parseInt(row.dataset.sceneIdx, 10) || 0;
  if (story) shadowStartSceneAt(story, idx);
}

/* ── Scene List ── */
function shadowOpenStory(storyId) {
  const story = STORIES.find(s => s.id === storyId);
  if (!story) return;
  sdw.story = story;

  document.getElementById('sdw-scenes-title').textContent = story.title;
  const list = document.getElementById('sdw-scenes-list');
  list.innerHTML = '';
  story.scenes.forEach((scene, idx) => {
    const done = sdwIsSceneDone(story.id, scene.id);
    const item = document.createElement('div');
    item.className = 'sdw-scene-item' + (done ? ' sdw-scene-done' : '');
    item.innerHTML = `
      <div class="sdw-scene-num">${idx + 1}</div>
      <div class="sdw-scene-item-info">
        <div class="sdw-scene-item-title">${scene.title}</div>
        <div class="sdw-scene-item-line">"${scene.targetLine}"</div>
      </div>
      <div class="sdw-scene-status">${done ? '✓' : '▶'}</div>
    `;
    item.onclick = () => shadowStartSceneAt(story, idx);
    list.appendChild(item);
  });

  shadowGoView('sdw-scenes');
}

/* ── VN Scene ── */
function shadowStartSceneAt(story, sceneIdx) {
  sdw.story = story;
  sdw.sceneIdx = sceneIdx;
  sdw.audioUrl = null;
  sdw.audioChunks = [];
  sdw.recording = false;
  const scene = story.scenes[sceneIdx];
  if (!scene) return;
  sdw.currentScene = scene;

  // Background
  const bg = document.getElementById('sdw-vn-bg');
  bg.className = 'sdw-vn-bg sdw-bg-' + story.bg;

  // Progress
  document.getElementById('sdw-vn-prog-fill').style.width = ((sceneIdx + 1) / story.scenes.length * 100) + '%';
  document.getElementById('sdw-vn-num').textContent = `${sceneIdx + 1}/${story.scenes.length}`;

  // Content
  document.getElementById('sdw-vn-role-tag').textContent = scene.role;
  document.getElementById('sdw-vn-char-emoji').textContent = scene.charEmoji;
  document.getElementById('sdw-vn-char-name').textContent = scene.charName;
  document.getElementById('sdw-vn-spkr').textContent = scene.speaker;
  document.getElementById('sdw-vn-line').textContent = scene.targetLine;
  document.getElementById('sdw-vn-reading').textContent = scene.reading;
  document.getElementById('sdw-vn-trans').textContent = scene.translation;

  // Reset speak button
  const speakBtn = document.getElementById('sdw-speak-btn');
  speakBtn.className = 'sdw-speak-btn';
  document.getElementById('sdw-speak-lbl').textContent = 'Speak';
  const recStatus = document.getElementById('sdw-rec-status');
  recStatus.style.display = 'none';
  recStatus.innerHTML = '<div class="sdw-rec-dot"></div><span id="sdw-rec-lbl">録音中…</span>';

  shadowGoView('sdw-scene');
}

/* ── TTS Playback ── */
function shadowPlayLine(rate) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  if (!sdw.currentScene) return;
  const utt = new SpeechSynthesisUtterance(sdw.currentScene.targetLine);
  utt.lang = 'ja-JP';
  utt.rate = rate || 0.9;
  window.speechSynthesis.speak(utt);
}

function shadowPlaySlow() { shadowPlayLine(0.55); }

/* ── Recording ── */
async function shadowToggleRecord() {
  if (sdw.recording) {
    if (sdw.mediaRecorder && sdw.mediaRecorder.state !== 'inactive') {
      sdw.mediaRecorder.stop();
    }
    return;
  }
  if (sdw.micAllowed === false) {
    sdwShowMicDenied();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    sdw.micAllowed = true;
    sdw.audioChunks = [];
    sdw.recording = true;

    document.getElementById('sdw-speak-btn').className = 'sdw-speak-btn sdw-recording';
    document.getElementById('sdw-speak-lbl').textContent = '● 停止';
    document.getElementById('sdw-rec-status').style.display = 'flex';

    const mr = new MediaRecorder(stream);
    sdw.mediaRecorder = mr;

    mr.ondataavailable = e => { if (e.data.size > 0) sdw.audioChunks.push(e.data); };
    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      sdw.recording = false;
      const blob = new Blob(sdw.audioChunks, { type: 'audio/webm' });
      sdw.audioUrl = URL.createObjectURL(blob);
      sdwShowAnalysis();
    };

    mr.start();
    // Auto-stop after 8 seconds
    setTimeout(() => {
      if (sdw.recording && mr.state !== 'inactive') mr.stop();
    }, 8000);

  } catch (err) {
    sdw.micAllowed = false;
    sdw.recording = false;
    sdwShowMicDenied();
  }
}

function sdwShowMicDenied() {
  const status = document.getElementById('sdw-rec-status');
  status.style.display = 'flex';
  status.innerHTML = '<span style="color:#ff9090;font-size:12px;text-align:center;">マイクへのアクセスが必要です。<br>ブラウザの設定を確認してください。</span>';
}

/* ── Analysis ── */
function sdwShowAnalysis() {
  // Reset button
  document.getElementById('sdw-speak-btn').className = 'sdw-speak-btn';
  document.getElementById('sdw-speak-lbl').textContent = 'Speak';
  document.getElementById('sdw-rec-status').style.display = 'none';

  // Generate mock score (75–97 feels realistic)
  const score = 75 + Math.floor(Math.random() * 23);
  document.getElementById('sdw-score-num').textContent = score;

  // Animate arc
  const arc = document.getElementById('sdw-score-arc');
  const offset = 264 - (score / 100) * 264;
  arc.style.stroke = score >= 90 ? '#4ade80' : score >= 78 ? '#7abcff' : '#fbbf24';
  setTimeout(() => { arc.style.strokeDashoffset = offset; }, 80);

  // Feedback
  const feedbacks = sdwMakeFeedback(score);
  document.getElementById('sdw-feedback-list').innerHTML = feedbacks.map(f =>
    `<div class="sdw-feedback-item sdw-feedback-${f.type}">
       <span class="sdw-feedback-icon">${f.icon}</span>
       <span class="sdw-feedback-text">${f.text}</span>
     </div>`
  ).join('');

  document.getElementById('sdw-analysis-target').textContent = sdw.currentScene?.targetLine || '';
  shadowGoView('sdw-analysis');
}

function sdwMakeFeedback(score) {
  const list = [];
  if (score >= 90) {
    list.push({ type: 'good', icon: '✦', text: '発音はとても自然です！素晴らしい！' });
    list.push({ type: 'good', icon: '✦', text: 'リズムと間のとり方も上手です。' });
  } else if (score >= 82) {
    list.push({ type: 'good', icon: '✦', text: '全体的な発音は良いです。' });
    list.push({ type: 'tip', icon: '→', text: 'イントネーションをもう少し意識してみましょう。' });
  } else {
    list.push({ type: 'tip', icon: '→', text: 'もう一度ゆっくり聴いて、音のリズムをつかんでみましょう。' });
    list.push({ type: 'tip', icon: '→', text: '長音と短音の区別に注意してみてください。' });
  }
  list.push({
    type: 'neutral',
    icon: '◆',
    text: score >= 78 ? '合格です！続けましょう。' : 'もう一度挑戦してみましょう！',
  });
  return list;
}

/* ── Retry / Continue ── */
function shadowRetry() {
  if (sdw.story) shadowStartSceneAt(sdw.story, sdw.sceneIdx);
}

function shadowContinueScene() {
  if (!sdw.story || !sdw.currentScene) return;
  sdwMarkSceneDone(sdw.story.id, sdw.currentScene.id);

  const isLast = sdw.sceneIdx >= sdw.story.scenes.length - 1;
  if (isLast) {
    sdwShowReward();
  } else {
    shadowStartSceneAt(sdw.story, sdw.sceneIdx + 1);
  }
}

/* ── Reward ── */
function sdwShowReward() {
  const scene = sdw.currentScene;
  if (!scene) return;
  document.getElementById('sdw-reward-char').textContent = scene.charEmoji + '　' + scene.charName;
  document.getElementById('sdw-reward-quote').textContent = `"${scene.targetLine}"`;
  // Hide "next scene" if story complete
  const nextBtn = document.getElementById('sdw-next-scene-btn');
  if (nextBtn) nextBtn.style.display = sdw.sceneIdx >= (sdw.story?.scenes.length ?? 1) - 1 ? 'none' : '';
  shadowGoView('sdw-reward');
}

function shadowRewardPlay() {
  const btn = document.getElementById('sdw-reward-play-btn');
  if (sdw.audioUrl) {
    const audio = new Audio(sdw.audioUrl);
    audio.play().catch(() => {});
    btn.textContent = '▶ 再生中…';
    audio.onended = () => { btn.textContent = '▶ もう一度'; };
  } else {
    shadowPlayLine(0.9);
    btn.textContent = '▶ 再生中…';
    setTimeout(() => { btn.textContent = '▶ 配音版を再生'; }, 2800);
  }
}

function shadowNextScene() {
  if (!sdw.story) return;
  const next = sdw.sceneIdx + 1;
  if (next < sdw.story.scenes.length) {
    shadowStartSceneAt(sdw.story, next);
  } else {
    shadowGoLib();
  }
}

/* ── Init ── */
function initShadowPage() {
  window.spawnStars?.('sl-shadow');
  shadowRenderLibrary();

  // Reset to library when navigating back to this page
  const pgShadow = document.getElementById('pg-shadow');
  if (pgShadow) {
    new MutationObserver(() => {
      if (pgShadow.classList.contains('active')) {
        // Only reset if a fullscreen view is visible (scene/analysis/reward)
        const inFullscreen = ['sdw-scene', 'sdw-analysis', 'sdw-reward']
          .some(id => document.getElementById(id)?.style.display === 'flex');
        if (!inFullscreen) {
          shadowRenderLibrary(); // refresh progress badges
        }
      }
    }).observe(pgShadow, { attributes: true, attributeFilter: ['class'] });
  }
}

/* ── Window exports ── */
window.shadowGoLib = shadowGoLib;
window.shadowStartDaily = shadowStartDaily;
window.shadowResume = shadowResume;
window.shadowOpenStory = shadowOpenStory;
window.shadowPlayLine = shadowPlayLine;
window.shadowPlaySlow = shadowPlaySlow;
window.shadowToggleRecord = shadowToggleRecord;
window.shadowRetry = shadowRetry;
window.shadowContinueScene = shadowContinueScene;
window.shadowRewardPlay = shadowRewardPlay;
window.shadowNextScene = shadowNextScene;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initShadowPage);
} else {
  initShadowPage();
}
