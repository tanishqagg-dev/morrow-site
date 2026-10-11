// Local QA only. Serve the actual published homepage alongside Next development routes.
import http from 'node:http';
import net from 'node:net';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd(), true);
const root = resolve('published-home');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
  try {
    if (!path.startsWith(root + '/')) throw new Error('outside');
    if (!(await stat(path)).isFile()) throw new Error('directory');
    let bytes = await readFile(path);
    if (url.pathname === '/') bytes = Buffer.from(bytes.toString().replace('__MORROW_BILLING_BASE__', process.env.NEXT_PUBLIC_LICENSE_API_URL || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`).replace('__MORROW_BILLING_KEY__', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''));
    res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream'); res.end(bytes);
  } catch {
    const proxy = http.request({ hostname: '127.0.0.1', port: 4391, path: req.url, method: req.method, headers: req.headers }, upstream => { res.writeHead(upstream.statusCode, upstream.headers); upstream.pipe(res); });
    proxy.on('error', () => { res.writeHead(502); res.end('Next dev is unavailable'); }); req.pipe(proxy);
  }
});
server.on('upgrade', (req, socket, head) => {
  const upstream = net.connect(4391, '127.0.0.1', () => {
    upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` + Object.entries(req.headers).map(([key, value]) => `${key}: ${value}`).join('\r\n') + '\r\n\r\n');
    if (head.length) upstream.write(head);
    socket.pipe(upstream); upstream.pipe(socket);
  });
  upstream.on('error', () => socket.destroy()); socket.on('error', () => upstream.destroy());
});
server.listen(4390, '127.0.0.1', () => console.log('Published homepage + Next QA at http://127.0.0.1:4390'));
