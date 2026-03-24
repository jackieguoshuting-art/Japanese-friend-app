import { appState } from './state.js';

function updateNavActive(page) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  const map = {
    'home': 0,
    'friends': 1,
    'call': 1,
    'text': 1,
    'video-call': 1,
    'summary': 1,
    'shadow': 2,
    'listen': 3,
  };
  const idx = map[page] ?? -1;
  if (idx >= 0) {
    document.querySelectorAll('.nav-item').forEach((item, i) => {
      if (i % 4 === idx) item.classList.add('active');
    });
  }
}

export function go(pageName) {
  document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
  document.getElementById(`pg-${pageName}`)?.classList.add('active');
  appState.activePage = pageName;
  syncNav(pageName);
  updateNavActive(pageName);
}

export function syncNav(pageName) {
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
  const nav = document.querySelector(`[data-nav="${pageName}"]`);
  if (nav) nav.classList.add('active');
}

window.go = go;
