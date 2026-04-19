// frontend/src/services/dialogue.service.js
// 场景对话 service(便利店/居酒屋/地铁等)。
// 独立于 claude.service.js(角色对话)。调用后端 /api/scene-chat。
// 详见 docs/NAMING.md。

const API_URL = '/api/scene-chat';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

export async function sceneChat({ systemPrompt, messages }) {
  const body = JSON.stringify({ systemPrompt, messages });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (response.ok) return response.json();
    if (response.status === 529 && attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      continue;
    }
    throw new Error(`scene-chat API failed: ${response.status}`);
  }
}
