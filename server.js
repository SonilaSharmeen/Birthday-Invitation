// Birthday invite server. Zero dependencies: needs only Node 18+.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = __dirname, PUB = path.join(ROOT, 'public'), DATA = path.join(ROOT, 'data'), DB = path.join(DATA, 'rsvps.json');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const PORT = process.env.PORT || cfg.port || 3000;
fs.mkdirSync(DATA, { recursive: true });
let db = []; try { db = JSON.parse(fs.readFileSync(DB, 'utf8')); } catch {}
const save = () => { const t = DB + '.tmp'; fs.writeFileSync(t, JSON.stringify(db, null, 2)); fs.renameSync(t, DB); };
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
const readBody = req => new Promise((ok, no) => {
  let b = ''; req.on('data', c => { b += c; if (b.length > 5000) { no(new Error('too big')); req.destroy(); } });
  req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch (e) { no(e); } });
});
const isAdmin = req => {
  const a = Buffer.from(String(req.headers['x-admin-pin'] || '')), b = Buffer.from(String(cfg.adminPin));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const hits = new Map();
const limited = req => {
  const ip = req.socket.remoteAddress, now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < 600000); list.push(now); hits.set(ip, list);
  return list.length > 20;
};
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'); const p = url.pathname;
  try {
    if (p === '/api/event' && req.method === 'GET') return json(res, 200, { ...cfg.event, showGuestList: !!cfg.showGuestList });
    if (p === '/api/guests' && req.method === 'GET') {
      if (!cfg.showGuestList) return json(res, 200, []);
      return json(res, 200, db.map(({ name, status, plus }) => ({ name, status, plus })));
    }
    if (p === '/api/rsvp' && req.method === 'POST') {
      if (limited(req)) return json(res, 429, { error: 'Too many requests. Try again in a few minutes.' });
      const d = await readBody(req);
      const name = clean(d.name, 60), status = d.status;
      if (!name) return json(res, 400, { error: 'Enter your name.' });
      if (!['yes', 'maybe', 'no'].includes(status)) return json(res, 400, { error: 'Choose Yes, Maybe or No.' });
      const plus = status === 'yes' ? Math.max(0, Math.min(10, parseInt(d.plus, 10) || 0)) : 0;
      const rec = { id: name.toLowerCase(), name, status, plus, note: clean(d.note, 200), at: new Date().toISOString() };
      const i = db.findIndex(r => r.id === rec.id);
      if (i >= 0) db[i] = rec; else db.push(rec);
      save(); return json(res, 200, { ok: true, updated: i >= 0 });
    }
    if (p === '/api/admin/rsvps') {
      if (!isAdmin(req)) return json(res, 401, { error: 'Wrong PIN.' });
      if (req.method === 'GET') return json(res, 200, db);
      if (req.method === 'DELETE') { db = db.filter(r => r.id !== url.searchParams.get('id')); save(); return json(res, 200, { ok: true }); }
    }
    if (req.method !== 'GET') return json(res, 405, { error: 'Not allowed.' });
    let f = path.normalize(path.join(PUB, p === '/' ? 'index.html' : p));
    if (!f.startsWith(PUB)) { res.writeHead(403); return res.end('Forbidden'); }
    fs.readFile(f, (e, buf) => {
      if (e) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(buf);
    });
  } catch (e) { json(res, 400, { error: 'Bad request.' }); }
}).listen(PORT, () => {
  console.log(`\n  Invite:  http://localhost:${PORT}\n  Host:    http://localhost:${PORT}/admin.html\n`);
  if (cfg.adminPin === 'change-me') console.log('  Warning: change "adminPin" in config.json before sharing.\n');
});
