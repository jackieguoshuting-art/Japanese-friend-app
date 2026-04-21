export function showInAppNotification({ characterName, message, messageJa, messageEn, avatarSrc, onClick }) {
  let bar = document.getElementById('in-app-notif');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'in-app-notif';
    const parent = document.querySelector('.phone') || document.body;
    parent.appendChild(bar);
  }

  // 兼容旧调用:如果没传 messageJa,用 message
  const textJa = messageJa || message || '';
  // 头像 HTML:有 src 就用 img,没有就用首字
  const avatarHtml = avatarSrc
    ? `<img class="notif-avatar" src="${avatarSrc}" alt="${characterName}">`
    : `<div class="notif-avatar-fallback">${(characterName || '?').slice(0, 1)}</div>`;

  bar.innerHTML = `
    ${avatarHtml}
    <div class="notif-content">
      <div class="notif-name">${characterName}</div>
      <div class="notif-text-ja">${textJa.length > 30 ? textJa.slice(0, 30) + '…' : textJa}</div>
    </div>
  `;

  bar.classList.add('notif-show');
  bar.onclick = () => {
    bar.classList.remove('notif-show');
    onClick?.();
  };
  setTimeout(() => bar.classList.remove('notif-show'), 5000);
}
