const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const emitter = new EventEmitter();

const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg'
};

function send(res, code, type, body) {
  res.writeHead(code, {'Content-Type': type});
  res.end(body);
}

const server = http.createServer((req, res) => {
  emitter.emit('request', req.method + ' ' + req.url);
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = decodeURIComponent(url.pathname);

  if (p === '/') {
    send(res, 200, 'text/html', `
<!DOCTYPE html>
<html><head><title>Server</title></head>
<body>
<h1>Node Server</h1>
<p>Dir: ${path.resolve('.')}</p>
<p>${os.type()} ${os.release()}, ${os.cpus().length} cores, mem: ${Math.round(os.freemem()/1e6)}MB</p>
<ul>
<li><a href=/files>/files</a></li>
<li><a href=/cpu>/cpu</a></li>
<li><a href=/mem>/mem</a></li>
</ul></body></html>`);
    return;
  }

  if (p === '/files') {
    fs.readdir('.', (e, files) => {
      if (e) return send(res, 500, 'text/plain', 'Error');
      let html = '<h1>Files</h1><ul>';
      files.forEach(f => {
        try {
          const st = fs.statSync(f);
          html += `<li><a href="/serve?f=${encodeURIComponent(f)}">${f}</a> ${st.size}b</li>`;
        } catch {}
      });
      html += '</ul>';
      send(res, 200, 'text/html', html);
    });
    return;
  }

  if (p === '/cpu') return send(res, 200, 'application/json', JSON.stringify(os.cpus().slice(0,2)));

  if (p === '/mem') return send(res, 200, 'application/json', JSON.stringify({
    total: Math.round(os.totalmem()/1e6)+'MB',
    free: Math.round(os.freemem()/1e6)+'MB',
    up: os.uptime()
  }));

  if (p === '/serve' && url.searchParams.has('f')) {
    const fp = path.resolve(url.searchParams.get('f'));
    fs.readFile(fp, (e, d) => {
      if (e) return send(res, 404, 'text/plain', 'Not found');
      const ext = path.extname(fp);
      send(res, 200, mime[ext] || 'text/plain', d);
    });
    return;
  }

  send(res, 404, 'text/plain', 'Not Found');
});

server.listen(3000, () => {
  console.log('http://localhost:3000');
  console.log(os.type(), os.cpus().length, 'cores');
});

