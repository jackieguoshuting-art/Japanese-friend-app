// Compress an image File to base64 JPEG (max 800px, quality 0.75)
export function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w >= h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        resolve({ base64: dataUrl.split(',')[1], mediaType: 'image/jpeg', dataUrl });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Position popup near the anchor button
function showPopup(popup, anchorEl) {
  popup.style.display = 'block';
  const rect = anchorEl.getBoundingClientRect();
  const pw = popup.offsetWidth || 180;
  const ph = popup.offsetHeight || 120;
  let top = rect.top - ph - 10;
  let left = rect.left + rect.width / 2 - pw / 2;
  if (top < 8) top = rect.bottom + 10;
  if (left < 8) left = 8;
  if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
  popup.style.top = top + 'px';
  popup.style.left = left + 'px';
}

// Attach popup + two file inputs to a button (per-instance, not singleton)
export function initImageButton({ btnId, onImage }) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (btn.dataset.imgInit) return;
  btn.dataset.imgInit = '1';

  // Per-instance popup
  const popup = document.createElement('div');
  popup.style.cssText = `
    display:none;position:fixed;z-index:10000;
    background:#fff;border-radius:16px;
    box-shadow:0 8px 32px rgba(0,0,0,0.22);
    padding:8px 0;min-width:180px;
    font-family:inherit;
  `;
  const cameraItemId = `img-popup-camera-${btnId}`;
  const galleryItemId = `img-popup-gallery-${btnId}`;
  popup.innerHTML = `
    <div id="${cameraItemId}" style="display:flex;align-items:center;gap:12px;padding:14px 20px;cursor:pointer;font-size:14px;color:#0a0a0a;">
      <svg width="20" height="18" viewBox="0 0 20 18" fill="none">
        <path d="M7 2H13L15 4H18C18.6 4 19 4.4 19 5V15C19 15.6 18.6 16 18 16H2C1.4 16 1 15.6 1 15V5C1 4.4 1.4 4 2 4H5L7 2Z" stroke="#0047ff" stroke-width="1.4" fill="none"/>
        <circle cx="10" cy="10" r="3" stroke="#0047ff" stroke-width="1.4"/>
      </svg>
      拍照
    </div>
    <div style="height:1px;background:#f0f0f0;margin:0 16px;"></div>
    <div id="${galleryItemId}" style="display:flex;align-items:center;gap:12px;padding:14px 20px;cursor:pointer;font-size:14px;color:#0a0a0a;">
      <svg width="20" height="18" viewBox="0 0 20 18" fill="none">
        <rect x="1" y="2" width="18" height="14" rx="2" stroke="#0047ff" stroke-width="1.4" fill="none"/>
        <circle cx="6.5" cy="6.5" r="1.5" fill="#0047ff"/>
        <path d="M1 13l4-4 3 3 3-3 5 5" stroke="#0047ff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
      从相册选择
    </div>
  `;
  document.body.appendChild(popup);

  document.addEventListener('click', (e) => {
    if (!popup.contains(e.target) && popup.style.display !== 'none') {
      popup.style.display = 'none';
    }
  }, true);

  // Gallery input
  const galleryInput = document.createElement('input');
  galleryInput.type = 'file';
  galleryInput.accept = 'image/*';
  galleryInput.style.display = 'none';
  document.body.appendChild(galleryInput);

  // Camera input (capture="environment" = rear camera on mobile)
  const cameraInput = document.createElement('input');
  cameraInput.type = 'file';
  cameraInput.accept = 'image/*';
  cameraInput.capture = 'environment';
  cameraInput.style.display = 'none';
  document.body.appendChild(cameraInput);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const data = await compressImage(file);
    onImage(data);
  }
  galleryInput.addEventListener('change', handleFile);
  cameraInput.addEventListener('change', handleFile);

  document.getElementById(cameraItemId).addEventListener('click', (e) => {
    e.stopPropagation();
    popup.style.display = 'none';
    cameraInput.click();
  });
  document.getElementById(galleryItemId).addEventListener('click', (e) => {
    e.stopPropagation();
    popup.style.display = 'none';
    galleryInput.click();
  });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (popup.style.display !== 'none') { popup.style.display = 'none'; return; }
    showPopup(popup, btn);
  });
}
