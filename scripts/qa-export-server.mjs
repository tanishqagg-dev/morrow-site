import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve('out');
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.woff2':'font/woff2', '.mp4':'video/mp4' };
const headers = await readFile(resolve(root, '_headers'), 'utf8');
const csp = headers.match(/Content-Security-Policy: (.+)/)?.[1];
http.createServer(async (req,res)=>{
  try {
    const url = new URL(req.url,'http://localhost');
    let path = resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
    if (!path.startsWith(root + '/')) throw new Error('outside');
    try { if (!(await stat(path)).isFile()) path += '.html'; } catch { path += '.html'; }
    if(csp) res.setHeader('Content-Security-Policy', csp);
    res.setHeader('Content-Type',types[extname(path)] || 'application/octet-stream'); res.end(await readFile(path));
  } catch { res.writeHead(404);res.end('Not found'); }
}).listen(4392,'127.0.0.1',()=>console.log('Static export at http://localhost:4392'));
