import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('./smoke.html', import.meta.url));
const operation = await readFile(new URL('../fixtures/modern-typescript/browser.mjs', import.meta.url));
let active = 0;
let closed = 0;

const server = createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path === '/pending') {
    active++;
    response.on('close', () => { active--; closed++; });
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.write('started');
    return;
  }
  if (path === '/state') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ active, closed }));
    return;
  }
  if (path === '/ok' || path === '/fail') {
    response.writeHead(path === '/ok' ? 200 : 500, { 'Content-Type': 'text/plain' });
    response.end(path === '/ok' ? 'complete' : 'controlled failure');
    return;
  }
  const content = path === '/' ? page : path === '/browser.mjs' ? operation : null;
  response.writeHead(content ? 200 : 404, {
    'Content-Type': path === '/' ? 'text/html' : 'text/javascript',
  });
  response.end(content ?? 'Not found');
});

server.listen(0, '127.0.0.1', () => {
  console.log(`url: http://127.0.0.1:${server.address().port}\noperation: await runSmoke()`);
});

process.on('SIGINT', () => {
  server.closeAllConnections();
  server.close();
});
