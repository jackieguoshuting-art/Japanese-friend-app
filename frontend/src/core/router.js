import { appState } from './state.js';

export function go(pageName) {
  document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
  document.getElementById(`pg-${pageName}`)?.classList.add('active');
  appState.activePage = pageName;
  syncNav(pageName);
}

export function syncNav(pageName) {
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
  const nav = document.querySelector(`[data-nav="${pageName}"]`);
  if (nav) nav.classList.add('active');
}

window.go = go;
