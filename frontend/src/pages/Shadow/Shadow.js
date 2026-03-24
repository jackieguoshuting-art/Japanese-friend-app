function initShadowPage() {
  window.spawnStars?.('sl-shadow');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initShadowPage);
} else {
  initShadowPage();
}
