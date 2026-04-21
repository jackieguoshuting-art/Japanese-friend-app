export function showInAppNotification({ characterName, message, onClick }) {
  let bar = document.getElementById('in-app-notif');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'in-app-notif';
    const parent = document.querySelector('.phone') || document.body;
    parent.appendChild(bar);
  }
  bar.innerHTML = `
    <span class="notif-avatar">🔵</span>
    <span class="notif-name">${characterName}</span>
    <span class="notif-text">${message.slice(0, 24)}${message.length > 24 ? '…' : ''}</span>
  `;
  bar.classList.add('notif-show');
  bar.onclick = () => {
    bar.classList.remove('notif-show');
    onClick?.();
  };
  setTimeout(() => bar.classList.remove('notif-show'), 5000);
}
