export function showTalkBadge() {
  document.querySelectorAll('.talk-badge').forEach(b => b.style.display = 'block');
}

export function hideTalkBadge() {
  document.querySelectorAll('.talk-badge').forEach(b => b.style.display = 'none');
}

export function updateFriendBadge(characterId, count) {
  const badges = document.querySelectorAll(`.fr-badge[data-character="${characterId}"]`);
  badges.forEach(badge => {
    if (count <= 0) {
      badge.classList.remove('fr-badge-show');
      badge.textContent = '';
    } else {
      badge.classList.add('fr-badge-show');
      badge.textContent = count > 9 ? '9+' : String(count);
    }
  });
}

export function refreshAllFriendBadges(characterIds, getCount) {
  characterIds.forEach(id => updateFriendBadge(id, getCount(id)));
}
