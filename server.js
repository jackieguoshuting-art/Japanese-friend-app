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
const API_KEY = env.ANTHROPIC_API_KEY || '';

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
  const rel  = urlPath === '/' ? 'index.html' : urlPath.split('?')[0];
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

// ── Proxy to Anthropic ──
function callAnthropic(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req  = https.request({
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         API_KEY,
        'anthropic-version': '2023-06-01',
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
    const result = await callAnthropic({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: 'You are a Japanese casual text formatter. Output ONLY the reformatted Japanese text — no explanation, no quotes, no JSON.',
      messages: [{
        role: 'user',
        content: `Reformat this speech recognition transcript as a natural casual Japanese text message.\n- Add punctuation (。！？…) where it fits naturally\n- Add emoji (😊😂👍✨🤔 etc.) when the emotion calls for it\n- Add casual tone markers (笑、ね〜、よ、な〜、えー) where natural\n- Keep the exact same meaning — do not invent new content\n- Output ONLY the reformatted text\n\nTranscript: ${text}`
      }]
    });
    raw = result.status === 200
      ? (JSON.parse(result.raw).content?.[0]?.text?.trim() || text)
      : text;
  } catch { raw = ''; }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ formatted: raw }));
}

async function handleChat(req, res) {
  try {
    const { prompt, messages, systemPrompt } = JSON.parse(await readBody(req));
    const result = await callAnthropic({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 512,
      system:     (systemPrompt || 'You are a friendly Japanese AI friend.') + "\n\nYou MUST reply in this exact JSON format with no extra text outside the JSON:\n{\"replyJa\": \"日本語の返事\", \"replyEn\": \"English translation\", \"memoryCandidate\": \"\"}\nDo not add markdown, code blocks, or any text before or after the JSON.\n" +
        "VOCAB_MARKUP in replyJa (required, dense): wrap almost EVERY noun and EVERY lexical verb in [[surface as written|ひらがな reading|concise English gloss]]. Also wrap meaningful い-adjectives and な-adjectives used as predicates. No spaces inside [[ ]]. Inside JSON strings escape any double-quote as \\\". " +
        "Skip marking ONLY: particles (は を に が の と も や か ね よ さ へ で から まで より って), interjections with no lexical content, and bare です／ます／だ when they add no new lemma. " +
        "Mark inflected verbs (た てる ない られる etc.) as one span covering the whole spoken form when one lemma. Merge compound nouns as one span when natural. " +
        "Goal: at least ~80% of all nouns and verbs in the sentence should appear inside [[|]], not just one or two words.",
      messages:   messages && Array.isArray(messages) ? messages : [{ role: 'user', content: prompt }],
    });

    if (result.status !== 200) {
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Anthropic error', detail: result.raw }));
      return;
    }

    const text = JSON.parse(result.raw).content?.[0]?.text || '';
    console.log('[DEBUG] Claude raw text:', text);
    const cleanText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    let parsed;
    try { parsed = JSON.parse(cleanText); }
    catch { parsed = { replyJa: cleanText, replyEn: '', memoryCandidate: '' }; }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(parsed));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}

// ── Route dispatcher ──
const routes = {
  'POST /api/voice-format': handleVoiceFormat,
  'POST /api/chat':         handleChat,
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
