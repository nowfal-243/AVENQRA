const http = require('http');
const fs = require('fs');
const path = require('path');
const DIST = path.join(__dirname, 'dist');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  // Strip the Vite base prefix so /FINAL-PROJECT/assets/... maps to dist/assets/...
  if (p.startsWith('/FINAL-PROJECT/')) p = p.slice('/FINAL-PROJECT'.length) || '/';
  if (p === '/') p = '/index.html';
  let file = path.normalize(path.join(DIST, p));
  if (!file.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(file).on('error', () => { res.writeHead(500); res.end('read error'); }).pipe(res);
});
server.listen(3000, '0.0.0.0', () => console.log('AVENQRA web live at http://localhost:3000/FINAL-PROJECT/'));
