// Server lokal untuk mencoba situs + /api/osis tanpa Vercel CLI.
// Jalankan: npm run dev
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from './api/osis.js';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

const server = http.createServer(async (req, res) => {
  try {
    const urlPath = new URL(req.url, 'http://localhost').pathname;

    if (urlPath === '/api/osis') {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      if (raw) {
        try {
          req.body = JSON.parse(raw);
        } catch {
          req.body = {};
        }
      }
      await handler(req, res);
      return;
    }

    const relative = urlPath === '/' ? 'index.html' : decodeURIComponent(urlPath).replace(/^\/+/, '');
    if (relative.split('/').some((part) => part.startsWith('.'))) {
      res.writeHead(404);
      return res.end('Not found');
    }

    const file = normalize(join(ROOT, relative));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch (error) {
    if (error.code !== 'ENOENT') console.error(error);
    if (!res.headersSent) res.writeHead(404);
    res.end('Not found');
  }
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => console.log(`Buka http://localhost:${port}`));
