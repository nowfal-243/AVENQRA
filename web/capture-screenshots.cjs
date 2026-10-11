/*
 * Captures real rendered screenshots of every AVENQRA portal route.
 *
 * Drives headless Microsoft Edge over the Chrome DevTools Protocol so no
 * puppeteer/playwright download is needed — only the small `ws` package.
 *
 * Strategy: force demo mode into localStorage before the app boots, sign in
 * with a demo account, then visit each route and screenshot it.
 *
 * Usage:  npm i -D ws   (once)   then:   node capture-screenshots.js
 */
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');
const os = require('os');

const BASE = process.env.BASE_URL || 'http://localhost:4173';
const OUT_DIR = path.join(__dirname, 'screenshots');
const EDGE = process.env.EDGE_PATH ||
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const DEBUG_PORT = Number(process.env.CDP_PORT || 9222);
const PROFILE = path.join(os.tmpdir(), `avenqra-shot-${process.pid}`);

const ROUTES = [
  { file: '01-login', url: '/login', note: 'Login screen' },
  { file: '02-dashboard', url: '/dashboard', note: 'Overview dashboard' },
  { file: '03-complaints-board', url: '/complaints', note: 'Complaints — Kanban board' },
  { file: '04-complaints-table', url: '/complaints', table: true, note: 'Complaints — table view' },
  { file: '05-reporter', url: '/reporter', note: 'Live camera reporter' },
  { file: '06-departments', url: '/departments', note: 'Departments' },
  { file: '07-officers', url: '/officers', note: 'Field officers' },
  { file: '08-map', url: '/map', note: 'Live issue map' },
  { file: '09-analytics', url: '/analytics', note: 'Analytics & reports' },
  { file: '10-settings', url: '/settings', note: 'Settings' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* In some CI/shell environments node's console output is swallowed, so every
 * line is mirrored to capture.log as well as stdout. */
const LOG_PATH = path.join(__dirname, 'capture.log');
const logLines = [];
function log(...args) {
  const line = args.join(' ');
  logLines.push(line);
  try {
    fs.appendFileSync(LOG_PATH, `${line}\n`);
  } catch (e) {
    /* ignore */
  }
  process.stdout.write(`${line}\n`);
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = '';
        res.on('data', (c) => {
          body += c;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`Bad JSON from ${url}`));
          }
        });
      })
      .on('error', reject);
  });
}

/* ------------------------- Minimal CDP client ------------------------- */

class Cdp {
  constructor(wsUrl, WebSocketImpl) {
    this.wsUrl = wsUrl;
    this.WebSocketImpl = WebSocketImpl;
    this.seq = 0;
    this.pending = new Map();
    this.ready = this.open();
  }

  async open() {
    this.ws = new this.WebSocketImpl(this.wsUrl, {
      perMessageDeflate: false,
      maxPayload: 256 * 1024 * 1024,
    });
    this.ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch (e) {
        return;
      }
      if (msg.id && this.pending.has(msg.id)) {
        const slot = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) slot.reject(new Error(msg.error.message));
        else slot.resolve(msg.result);
      }
    });
    await new Promise((resolve, reject) => {
      this.ws.on('open', resolve);
      this.ws.on('error', reject);
    });
  }

  async send(method, params, sessionId) {
    await this.ready;
    const id = (this.seq += 1);
    const body = JSON.stringify(
      Object.assign({ id: id, method: method, params: params || {} }, sessionId ? { sessionId: sessionId } : {})
    );
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve: resolve, reject: reject });
      this.ws.send(body);
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 60000);
    });
  }

  async evalJs(expression, sessionId) {
    const res = await this.send(
      'Runtime.evaluate',
      { expression: expression, returnByValue: true, awaitPromise: true },
      sessionId
    );
    if (res.exceptionDetails) {
      const d = res.exceptionDetails.exception
        ? res.exceptionDetails.exception.description
        : res.exceptionDetails.text;
      throw new Error(`JS error: ${d}`);
    }
    return res.result ? res.result.value : undefined;
  }

  async screenshot(sessionId) {
    const res = await this.send(
      'Page.captureScreenshot',
      { format: 'png', captureBeyondViewport: true },
      sessionId
    );
    return Buffer.from(res.data, 'base64');
  }

  close() {
    try {
      this.ws.close();
    } catch (e) {
      /* ignore */
    }
  }
}


/* -------------------------------- main -------------------------------- */

async function main() {
  let WebSocketImpl;
  try {
    WebSocketImpl = require('ws');
  } catch (e) {
    throw new Error('The `ws` package is required. Install it first:  npm i -D ws');
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  log('Launching headless Edge...');
  if (!fs.existsSync(EDGE)) throw new Error(`Edge not found at: ${EDGE}`);
  const edge = spawn(EDGE, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${PROFILE}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-gpu',
    '--window-size=1600,1000',
    '--hide-scrollbars',
    'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'], detached: true });

  edge.stderr.on('data', (d) => process.stderr.write(`[edge] ${d}`));
  edge.on('error', (e) => {
    console.error('Failed to spawn Edge:', e.message);
    process.exit(1);
  });
  log(`  spawned pid=${edge.pid}, waiting for DevTools on :${DEBUG_PORT}`);

  let version = null;
  for (let i = 0; i < 40; i += 1) {
    try {
      version = await getJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      break;
    } catch (e) {
      await sleep(500);
    }
  }
  if (!version) throw new Error('Edge DevTools endpoint never became reachable.');
  log(`  ${version.Browser}`);

  const cdp = new Cdp(version.webSocketDebuggerUrl, WebSocketImpl);
  await cdp.ready;

  const target = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const attached = await cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  const sid = attached.sessionId;

  await cdp.send('Page.enable', {}, sid);
  await cdp.send('Runtime.enable', {}, sid);
  await cdp.send('Emulation.setDeviceMetricsOverride',
    { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false }, sid);

  const goTo = async (url) => {
    await cdp.send('Page.navigate', { url: url }, sid);
    await sleep(3200);
  };

  /* 0 - capture the login screen BEFORE any session exists */
  await goTo(`${BASE}/login`);
  await cdp.evalJs(`(() => {
    try { localStorage.clear(); } catch (e) {}
    return 'cleared';
  })()`, sid);
  await goTo(`${BASE}/login`);
  const loginShot = await cdp.screenshot(sid);
  fs.writeFileSync(path.join(OUT_DIR, '01-login.png'), loginShot);
  const loginInfo = await cdp.evalJs(`(() => ({
    path: location.pathname,
    inputs: document.querySelectorAll('input').length,
    buttons: document.querySelectorAll('button').length,
    textLen: (document.body.innerText || '').length
  }))()`, sid);
  log(`  01-login.png captured (${JSON.stringify(loginInfo)})`);

  /* 1 - seed a demo session, then sign in through the real form */
  await goTo(`${BASE}/`);
  const seeded = await cdp.evalJs(`(() => {
    try {
      localStorage.setItem('avenqra_token', 'demo-session-token');
      localStorage.setItem('avenqra_user', JSON.stringify({
        id: 'demo-admin', name: 'System Administrator',
        email: 'admin@avenqra.com', role: 'SUPER_ADMIN', isDemoSession: true
      }));
    } catch (e) { return 'storage-error'; }
    return 'seeded';
  })()`, sid);

  await goTo(`${BASE}/login`);
  const login = await cdp.evalJs(`(async () => {
    await new Promise(r => setTimeout(r, 1500));
    const set = (el, v) => {
      const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      d.set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const inputs = Array.prototype.slice.call(document.querySelectorAll('input'));
    const email = inputs.find(i => (i.type || '').toLowerCase() === 'email')
               || inputs.find(i => /email/i.test(i.id + ' ' + i.name));
    const pass = inputs.find(i => (i.type || '').toLowerCase() === 'password');
    if (email) set(email, 'admin@avenqra.com');
    if (pass) set(pass, 'Admin@123');
    const btn = Array.prototype.slice.call(document.querySelectorAll('button'))
      .find(b => /sign in|log in|^login$|access/i.test((b.textContent || '').trim()));
    if (btn) btn.click();
    await new Promise(r => setTimeout(r, 3500));
    return {
      hasEmail: !!email, hasPass: !!pass, clicked: !!btn,
      url: location.pathname,
      authed: /dashboard|complaints/i.test(location.pathname)
    };
  })()`, sid);
  log(`  seed=${seeded} login=${JSON.stringify(login)}`);

  /* 3 - capture every authenticated route (login already captured above) */
  const results = [{
    file: '01-login',
    note: 'Login screen',
    textLen: loginInfo.textLen,
    inputs: loginInfo.inputs,
  }];

  for (const route of ROUTES) {
    if (route.file === '01-login') continue;
    await goTo(BASE + route.url);

    if (route.table) {
      await cdp.evalJs(`(() => {
        const b = Array.prototype.slice.call(document.querySelectorAll('button'))
          .find(x => /triage\\s*table|^table$/i.test((x.textContent || '').trim()));
        if (b) b.click();
        return !!b;
      })()`, sid);
      await sleep(2500);
    }

    const info = await cdp.evalJs(`(() => {
      const t = document.body.innerText || '';
      return {
        path: location.pathname,
        textLen: t.length,
        cards: document.querySelectorAll('.card').length,
        rows: document.querySelectorAll('tbody tr').length,
        svgs: document.querySelectorAll('svg').length,
        kanbanCols: document.querySelectorAll('[class*="kanban"], [data-column]').length,
        tickets: (t.match(/AVN-2\d{3}-\d+/g) || []).length,
        hasError: /Something went wrong|Application error|is not defined|Cannot read propert/i.test(t),
        sample: t.slice(0, 140).replace(/\\s+/g, ' ').trim()
      };
    })()`, sid);

    const png = await cdp.screenshot(sid);
    fs.writeFileSync(path.join(OUT_DIR, `${route.file}.png`), png);
    results.push(Object.assign({}, route, info, { kb: Math.round(png.length / 1024) }));
    log(`  ok ${route.file}.png (${Math.round(png.length / 1024)} KB)`);
  }

  /* 4 - report */
  log('\n================ RENDER REPORT ================');
  results.forEach((r) => {
    const flag = r.hasError ? 'ERROR ' : r.textLen < 250 ? 'SPARSE' : 'OK    ';
    log(`${flag} ${r.file.padEnd(22)} ${String(r.textLen).padStart(6)} chars  ` +
      `${String(r.cards).padStart(3)} cards  ${String(r.rows).padStart(3)} rows  ` +
      `${String(r.tickets !== undefined ? r.tickets : 0).padStart(3)} tickets  ${String(r.kb).padStart(5)} KB`);
    log(`        ${r.note}  [${r.path}]`);
    if (r.sample) log(`        "${r.sample}"`);
  });

  const bad = results.filter((r) => r.hasError || r.textLen < 250);
  log(`\n${results.length - bad.length}/${results.length} routes rendered real content.`);
  if (bad.length) log(`Needs attention: ${bad.map((b) => b.file).join(', ')}`);
  log(`Screenshots written to: ${OUT_DIR}`);

  cdp.close();
  try {
    edge.kill();
  } catch (e) {
    /* ignore */
  }
  // Edge may still hold file locks briefly; cleanup is best-effort.
  try {
    fs.rmSync(PROFILE, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
  } catch (e) {
    log(`  (temp profile left behind: ${PROFILE})`);
  }
}

main().catch((err) => {
  log(`\nCAPTURE FAILED: ${err.message}`);
  if (err.stack) log(err.stack);
  process.exit(1);
});

