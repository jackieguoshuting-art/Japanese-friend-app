import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

// ── Read .env ──
function loadEnv() {
  try {
    return Object.fromEntries(
      fs.readFileSync(path.join(__dirname, '.env'), 'utf8')
        .split('\n')
        .filter(l => l.includes('='))
        .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
    );
  } catch { return {}; }
}
const env = loadEnv();
const OPENAI_API_KEY = env.OPENAI_API_KEY || '';
const OPENAI_MODEL = env.OPENAI_MODEL || 'gpt-6-astra';

// ── Static file serving ──
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.mov':  'video/quicktime',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
};

function serveStatic(res, urlPath, req) {
  const rel  = urlPath === '/' ? 'index.html' : decodeURIComponent(urlPath.split('?')[0]);
  let   full = path.join(__dirname, rel);
  if (fs.existsSync(full) && fs.statSync(full).isDirectory()) full = path.join(full, 'index.html');
  try {
    const ext   = path.extname(full);
    const mime  = MIME[ext] || 'text/plain';
    const total = fs.statSync(full).size;
    const range = req && req.headers['range'];

    if (range) {
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end   = endStr ? parseInt(endStr, 10) : total - 1;
      res.writeHead(206, {
        'Content-Type':   mime,
        'Content-Range':  `bytes ${start}-${end}/${total}`,
        'Accept-Ranges':  'bytes',
        'Content-Length': end - start + 1,
      });
      fs.createReadStream(full, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Type':   mime,
        'Accept-Ranges':  'bytes',
        'Content-Length': total,
      });
      fs.createReadStream(full).pipe(res);
    }
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

// ── Responses API proxy ──
function toResponsesInput(messages = []) {
  return messages.map(({ role, content }) => {
    const safeRole = role === 'assistant' ? 'assistant' : 'user';
    if (typeof content === 'string') return { role: safeRole, content };
    if (!Array.isArray(content)) return { role: safeRole, content: String(content ?? '') };

    const parts = content.flatMap((part) => {
      if (part?.type === 'text') return [{ type: 'input_text', text: part.text || '' }];
      if (part?.type === 'image' && part.source?.type === 'base64') {
        return [{
          type: 'input_image',
          image_url: `data:${part.source.media_type};base64,${part.source.data}`,
        }];
      }
      if (part?.type === 'image_url' && part.image_url?.url) {
        return [{ type: 'input_image', image_url: part.image_url.url }];
      }
      return [];
    });
    return { role: safeRole, content: parts };
  });
}

function callOpenAI({ instructions, messages, prompt, maxOutputTokens = 512, schemaName, schema }) {
  return new Promise((resolve, reject) => {
    if (!OPENAI_API_KEY) {
      resolve({ status: 503, raw: JSON.stringify({ error: { message: 'OPENAI_API_KEY is missing from .env' } }) });
      return;
    }
    const payload = {
      model: OPENAI_MODEL,
      instructions,
      input: messages ? toResponsesInput(messages) : prompt,
      max_output_tokens: maxOutputTokens,
      store: false,
    };
    if (schema) {
      payload.text = {
        format: { type: 'json_schema', name: schemaName, strict: true, schema },
      };
    }
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/responses',
      method:   'POST',
      headers: {
        'Content-Type':      'application/json',
        'Authorization':     `Bearer ${OPENAI_API_KEY}`,
        'Content-Length':    Buffer.byteLength(body),
      },
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, raw }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getResponseText(raw) {
  const response = JSON.parse(raw);
  if (response.output_text) return response.output_text;
  return (response.output || [])
    .filter((item) => item.type === 'message')
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === 'output_text')
    .map((item) => item.text)
    .join('');
}

// ── API route handlers ──

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => resolve(body));
  });
}

async function handleVoiceFormat(req, res) {
  let raw = '';
  try {
    const { text } = JSON.parse(await readBody(req));
    if (!text) { res.writeHead(200); res.end(JSON.stringify({ formatted: '' })); return; }
    const result = await callOpenAI({
      maxOutputTokens: 200,
      instructions: 'You are a Japanese casual text formatter. Output ONLY the reformatted Japanese text — no explanation, no quotes, no JSON.',
      messages: [{
        role: 'user',
        content: `Reformat this speech recognition transcript as a natural casual Japanese text message.\n- Add punctuation (。！？…) where it fits naturally\n- Add emoji (😊😂👍✨🤔 etc.) when the emotion calls for it\n- Add casual tone markers (笑、ね〜、よ、な〜、えー) where natural\n- Keep the exact same meaning — do not invent new content\n- Output ONLY the reformatted text\n\nTranscript: ${text}`
      }]
    });
    raw = result.status === 200
      ? (getResponseText(result.raw).trim() || text)
      : text;
  } catch { raw = ''; }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ formatted: raw }));
}

async function handleChat(req, res) {
  try {
    const { prompt, messages, systemPrompt, isProactive, mode } = JSON.parse(await readBody(req));
    const emotionSchema = ['idle', 'happy', 'smile', 'surprised', 'lean-smile', 'shy'];
    const replyFormat = mode === 'teacher'
      ? '\n\nTeacher mode JSON: replyJa is a concise Japanese example or prompt; replyEn is the learner-facing explanation in Simplified Chinese. Choose emotion from idle, happy, smile, surprised, lean-smile, shy based on the conversation; do not default to idle when another emotion fits. Keep memoryCandidate empty. Return only JSON: {"replyJa":"...","replyEn":"...","emotion":"idle","memoryCandidate":""}. Do not add English translations unless requested.'
      : "\n\nYou MUST reply in this exact JSON format with no extra text outside the JSON:\n{\"replyJa\": \"日本語の返事\", \"replyEn\": \"English translation\", \"emotion\": \"idle\", \"memoryCandidate\": \"ユーザーが明かした具体的な個人情報（趣味・仕事・住んでいる場所・好き嫌いなど）を短い日本語で。新情報がなければ空文字\"}\nemotion must be one of: idle, happy, smile, surprised, lean-smile.\nDo not add markdown, code blocks, or any text before or after the JSON.\n";
    const result = await callOpenAI({
      maxOutputTokens: 512,
      instructions:    (systemPrompt || 'You are a friendly Japanese AI friend.') +
        (isProactive ? '\n\n今から友達に自分から一言送る。挨拶じゃなく、自分の生活の一コマを自然にシェアする感じで。50文字以内。30%の確率で [image: 画像の説明] を含めること。' : '') +
        replyFormat +
        "VOCAB_MARKUP in replyJa (required, dense): wrap almost EVERY noun and EVERY lexical verb in [[surface as written|ひらがな reading|concise English gloss]]. Also wrap meaningful い-adjectives and な-adjectives used as predicates. No spaces inside [[ ]]. Inside JSON strings escape any double-quote as \\\". " +
        "Skip marking ONLY: particles (は を に が の と も や か ね よ さ へ で から まで より って), interjections with no lexical content, and bare です／ます／だ when they add no new lemma. " +
        "Mark inflected verbs (た てる ない られる etc.) as one span covering the whole spoken form when one lemma. Merge compound nouns as one span when natural. " +
        "Goal: at least ~80% of all nouns and verbs in the sentence should appear inside [[|]], not just one or two words.",
      messages:   messages && Array.isArray(messages) ? messages : [{ role: 'user', content: prompt }],
      schemaName: 'japanese_friend_reply',
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          replyJa: { type: 'string' },
          replyEn: { type: 'string' },
          emotion: { type: 'string', enum: emotionSchema },
          memoryCandidate: { type: 'string' },
        },
        required: ['replyJa', 'replyEn', 'emotion', 'memoryCandidate'],
      },
    });

    if (result.status !== 200) {
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'OpenAI API error', detail: result.raw }));
      return;
    }

    const text = getResponseText(result.raw) || '';
    console.log('[DEBUG] OpenAI raw text:', text);
    const cleanText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    let parsed;
    try { parsed = JSON.parse(cleanText); }
    catch {
      // Keep a tolerant fallback for models that return extra text around JSON.
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); }
        catch { parsed = { replyJa: cleanText, replyEn: '', memoryCandidate: '' }; }
      } else {
        parsed = { replyJa: cleanText, replyEn: '', memoryCandidate: '' };
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(parsed));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}

async function handleTTS(req, res) {
  try {
    const { text, voiceId: requestVoiceId } = JSON.parse(await readBody(req));
    const voiceId = requestVoiceId || env.YUKI_VOICE_ID;
    const elevenKey = env.ELEVENLABS_API_KEY;
    if (!/^[A-Za-z0-9]+$/.test(voiceId || '')) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid voiceId' }));
      return;
    }
    if (!voiceId || !elevenKey) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'TTS not configured' }));
      return;
    }
    const body = JSON.stringify({
      text,
      model_id: 'eleven_v3',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2, speed: 0.9 },
    });
    const { status: elevenStatus, chunks } = await new Promise((resolve, reject) => {
      const r2 = https.request({
        hostname: 'api.elevenlabs.io',
        path:     `/v1/text-to-speech/${voiceId}`,
        method:   'POST',
        headers: {
          'xi-api-key':     elevenKey,
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      }, (r) => {
        const bufs = [];
        r.on('data', c => bufs.push(c));
        r.on('end', () => resolve({ status: r.statusCode, chunks: bufs }));
      });
      r2.on('error', reject);
      r2.write(body);
      r2.end();
    });
    const buf = Buffer.concat(chunks);
    if (elevenStatus !== 200) {
      console.error('[TTS] ElevenLabs error', elevenStatus, buf.toString('utf8'));
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'ElevenLabs API error', status: elevenStatus, detail: buf.toString('utf8') }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': buf.length });
    res.end(buf);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}

// ── Scene dialogue (便利店/居酒屋/地铁等场景对话) ──
// 独立于 handleChat:无 emotion、无 memoryCandidate、无 character/topic,
// 仅保留 VOCAB_MARKUP 标注。前端通过 dialogue.service.js 调用。
async function handleSceneChat(req, res) {
  try {
    const { messages, systemPrompt } = JSON.parse(await readBody(req));
    const result = await callOpenAI({
      maxOutputTokens: 256,
      instructions:    (systemPrompt || '') +
        "\n\nYou MUST reply in this exact JSON format with no extra text outside the JSON:\n" +
        "{\"replyJa\": \"日本語の返事\", \"replyEn\": \"English translation\"}\n" +
        "Do not add markdown, code blocks, or any text before or after the JSON.\n" +
        "VOCAB_MARKUP in replyJa (required, dense): wrap almost EVERY noun and EVERY lexical verb in [[surface as written|ひらがな reading|concise English gloss]]. " +
        "Skip ONLY: particles (は を に が の と も や か ね よ さ へ で から まで より って), interjections, and bare です／ます／だ when they add no new lemma. " +
        "No spaces inside [[ ]]. Inside JSON strings escape any double-quote as \\\".",
      messages,
      schemaName: 'japanese_scene_reply',
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: { replyJa: { type: 'string' }, replyEn: { type: 'string' } },
        required: ['replyJa', 'replyEn'],
      },
    });

    if (result.status !== 200) {
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'OpenAI API error', detail: result.raw }));
      return;
    }

    const text = getResponseText(result.raw) || '';
    const cleanText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(cleanText);
    } catch {
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { replyJa: cleanText, replyEn: '' };
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(parsed));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}

// ── Route dispatcher ──
const routes = {
  'POST /api/voice-format': handleVoiceFormat, // STT 文本润色 → { formatted }
  'POST /api/chat':         handleChat,         // 主聊天接口 → { replyJa, replyEn, memoryCandidate }
  'POST /api/scene-chat':   handleSceneChat,    // 场景对话 → { replyJa, replyEn }
  'POST /api/tts':          handleTTS,          // ElevenLabs TTS → audio/mpeg
};

// ── Server ──
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const routeKey = `${req.method} ${req.url.split('?')[0]}`;
  if (routes[routeKey]) {
    routes[routeKey](req, res);
    return;
  }

  serveStatic(res, req.url, req);
});

server.listen(PORT, () => {
  console.log(`\n  INFO  Server running at http://localhost:${PORT}\n`);
});
