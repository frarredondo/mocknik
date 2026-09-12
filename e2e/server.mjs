import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const port = Number(process.env.FIXTURE_PORT ?? 4173);

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  const relative = normalize(decodeURIComponent(url.pathname)).replace(/^\/+/, '') || 'index.html';
  if (relative.includes('..')) {
    response.writeHead(403).end('forbidden');
    return;
  }
  try {
    const body = await readFile(join(root, relative));
    response.writeHead(200, {
      'content-type': types[extname(relative)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    response.end(body);
  } catch {
    response.writeHead(404).end('not found');
  }
}).listen(port, () => {
  console.log(`fixture server on http://localhost:${port}`);
});
