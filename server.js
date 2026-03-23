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
};

function serveStatic(res, urlPath) {
  const rel  = urlPath === '/' ? 'index.html' : urlPath.split('?')[0];
  let   full = path.join(__dirname, rel);
  if (fs.existsSync(full) && fs.statSync(full).isDirectory()) full = path.join(full, 'index.html');
  try {
    const ext  = path.extname(full);
    const mime = MIME[ext] || 'text/plain';
    const data = fs.readFileSync(full);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
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

// ── Server ──
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const { prompt, systemPrompt } = JSON.parse(body);
        const enhancedSystem = (systemPrompt || '') + `

VOCABULARY MARKUP RULE:
In every reply, wrap 2-4 important or potentially unfamiliar Japanese words/phrases with this exact format:
[[word|reading|meaning_in_english]]

Example: [[ちょうど|ちょうど|just/exactly]]古着漁ってたとこ。[[なんか|なんか|somehow/something]]用？

Rules:
- Only mark words that are genuinely useful for a Japanese learner
- Do not mark extremely basic words like は、が、の、です
- Maximum 4 marked words per reply
- Keep the rest of the reply completely natural
- The markup must not break the sentence flow
`;
        const result = await callAnthropic({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 256,
          system:     enhancedSystem,
          messages:   [{ role: 'user', content: prompt }],
        });

        if (result.status !== 200) {
          res.writeHead(result.status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Anthropic error', detail: result.raw }));
          return;
        }

        const text = JSON.parse(result.raw).content?.[0]?.text || '';
        let parsed;
        try { parsed = JSON.parse(text); }
        catch { parsed = { replyJa: text, replyEn: '', memoryCandidate: '' }; }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(parsed));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  serveStatic(res, req.url);
});

server.listen(PORT, () => {
  console.log(`\n  INFO  Server running at http://localhost:${PORT}\n`);
});
