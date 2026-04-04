export function showTalkBadge() {
  document.querySelectorAll('.talk-badge').forEach(b => b.style.display = 'block');
}

export function hideTalkBadge() {
  document.querySelectorAll('.talk-badge').forEach(b => b.style.display = 'none');
}
