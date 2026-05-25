// Local dev server: serves static files and runs the /api handlers,
// mirroring how Vercel routes requests. Usage: npm run dev
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = process.env.PORT || 3000;
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml',
};

function makeRes(res) {
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
  return res;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  makeRes(res);

  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.replace('/api/', '').replace(/\/$/, '') || 'index';
    try {
      const mod = await import(pathToFileURL(join(ROOT, 'api', `${name}.js`)).href);
      req.query = Object.fromEntries(url.searchParams);
      await mod.default(req, res);
    } catch (e) {
      res.status(500).json({ error: 'Handler error', detail: e.message });
    }
    return;
  }

  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  try {
    const buf = await readFile(join(ROOT, file));
    res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream');
    res.end(buf);
  } catch {
    res.status(404).end('Not found');
  }
});

server.listen(PORT, () => console.log(`FightBase dev server on http://localhost:${PORT}`));
