import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';

import { gespPapers } from '../src/data/gespPapers.js';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);

const outDir = args.get('--out');
const baseUrl = args.get('--base') || 'http://localhost:5174';
const levelFilter = args.get('--level') || '';
const chromePath = process.env.GESP_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

if (!outDir) throw new Error('missing --out');
fs.mkdirSync(outDir, { recursive: true });

function questionsForGroups() {
  const groups = [];
  for (const [levelKey, papers] of Object.entries(gespPapers)) {
    if (levelFilter && levelKey !== levelFilter) continue;
    for (const [session, paper] of Object.entries(papers)) {
      for (const type of ['choice', 'judgment']) {
        const ids = (paper.sections?.[type]?.questions || []).map((q) => q.id);
        if (ids.length) groups.push({ levelKey, session, type, ids });
      }
    }
  }
  groups.sort((a, b) => a.levelKey.localeCompare(b.levelKey) || a.session.localeCompare(b.session) || a.type.localeCompare(b.type));
  return groups;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch (error) {
      lastError = error;
    }
    await sleep(200);
  }
  throw lastError || new Error(`timed out waiting for ${url}`);
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result || {});
        return;
      }
      const waiters = this.events.get(message.method);
      if (waiters?.length) waiters.shift()(message.params || {});
    });
  }

  async open() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    await once(this.ws, 'open');
  }

  call(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  waitEvent(method, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timed out waiting for ${method}`)), timeoutMs);
      const wrapped = (params) => {
        clearTimeout(timer);
        resolve(params);
      };
      const waiters = this.events.get(method) || [];
      waiters.push(wrapped);
      this.events.set(method, waiters);
    });
  }

  close() {
    this.ws.close();
  }
}

async function waitFor(cdp, expression, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const result = await cdp.call('Runtime.evaluate', { expression, returnByValue: true });
      if (result.result?.value) return true;
    } catch {
      // Page reloads can destroy the current execution context; retry on the next tick.
    }
    await sleep(150);
  }
  throw new Error(`timed out waiting for ${expression}`);
}

async function main() {
  const groups = questionsForGroups();
  const totalCards = groups.reduce((sum, group) => sum + group.ids.length, 0);
  const port = await freePort();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gesp-chrome-'));
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'ignore'] });

  let cdp;
  try {
    await waitForJson(`http://127.0.0.1:${port}/json/version`);
    let targetResponse = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
    let target = targetResponse.ok ? await targetResponse.json() : null;
    if (!target?.webSocketDebuggerUrl) {
      const targets = await waitForJson(`http://127.0.0.1:${port}/json`);
      target = targets.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
    }
    if (!target?.webSocketDebuggerUrl) throw new Error('Chrome page target not found');
    cdp = new Cdp(target.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.call('Page.enable');
    await cdp.call('DOM.enable');
    await cdp.call('Runtime.enable');
    await cdp.call('Emulation.setDeviceMetricsOverride', {
      width: 1700,
      height: 2200,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await cdp.call('Page.addScriptToEvaluateOnNewDocument', {
      source: `(() => { const nativeFetch = window.fetch.bind(window); window.fetch = (input, init) => { const url = typeof input === 'string' ? input : input?.url || ''; if (url.includes('/api/training-courses/student/access') || url.includes('/api/training-courses/access')) return Promise.resolve(new Response(JSON.stringify({ hasAccess: false }), { status: 200, headers: { 'Content-Type': 'application/json' } })); return nativeFetch(input, init); }; const setAuditAuth = () => { try { if (!localStorage.getItem('csp_token')) { localStorage.setItem('csp_token','visual-audit'); localStorage.setItem('csp_user', JSON.stringify({name:'Visual Audit', username:'audit', role:'student'})); location.reload(); } } catch (error) {} }; if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setAuditAuth, { once: true }); else setAuditAuth(); })();`,
    });
    const loadEvent = cdp.waitEvent('Page.loadEventFired');
    await cdp.call('Page.navigate', { url: baseUrl });
    await loadEvent;
    await cdp.call('Runtime.evaluate', {
      expression: `localStorage.setItem('csp_token','visual-audit'); localStorage.setItem('csp_user', JSON.stringify({name:'Visual Audit', username:'audit', role:'student'})); localStorage.getItem('csp_token')`,
      returnByValue: true,
    });
    const reloadEvent = cdp.waitEvent('Page.loadEventFired').catch(() => null);
    await cdp.call('Runtime.evaluate', { expression: `location.reload()` });
    await reloadEvent;
    await sleep(500);

    await waitFor(cdp, `Boolean(document.querySelector('.nav-item'))`);
    await cdp.call('Runtime.evaluate', {
      expression: `[...document.querySelectorAll('.nav-item')].find((item) => item.textContent.includes('GESP'))?.click()`,
    });
    await waitFor(cdp, `Boolean(document.querySelector('.gesp-page'))`);

    let done = 0;
    for (const group of groups) {
      await cdp.call('Runtime.evaluate', {
        expression: `
          (() => {
            const selects = document.querySelectorAll('.gesp-page select');
            selects[1].value = ${JSON.stringify(group.levelKey)};
            selects[1].dispatchEvent(new Event('change', { bubbles: true }));
          })()
        `,
      });
      await sleep(150);
      await cdp.call('Runtime.evaluate', {
        expression: `
          (() => {
            const selects = document.querySelectorAll('.gesp-page select');
            selects[2].value = ${JSON.stringify(group.session)};
            selects[2].dispatchEvent(new Event('change', { bubbles: true }));
            document.querySelectorAll('.tabs button')[${group.type === 'choice' ? 0 : 1}].click();
          })()
        `,
      });
      await waitFor(cdp, `document.querySelectorAll('article.card').length === ${group.ids.length}`);

      for (let index = 0; index < group.ids.length; index++) {
        const id = group.ids[index];
        const file = path.join(outDir, `${id}.jpg`);
        if (fs.existsSync(file)) {
          done++;
          continue;
        }
        const rectResult = await cdp.call('Runtime.evaluate', {
          expression: `
            (() => {
              const card = document.querySelectorAll('article.card')[${index}];
              card.scrollIntoView({ block: 'start' });
              const rect = card.getBoundingClientRect();
              return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
            })()
          `,
          returnByValue: true,
        });
        await sleep(50);
        const rect = rectResult.result.value;
        const screenshot = await cdp.call('Page.captureScreenshot', {
          format: 'jpeg',
          quality: 82,
          captureBeyondViewport: true,
          clip: {
            x: Math.max(0, rect.x),
            y: Math.max(0, rect.y),
            width: Math.max(1, rect.width),
            height: Math.max(1, rect.height),
            scale: 1,
          },
        });
        fs.writeFileSync(file, Buffer.from(screenshot.data, 'base64'));
        done++;
        if (done % 25 === 0 || done === totalCards) console.log(`WEB ${done}/${totalCards}`);
      }
    }
    fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({ totalCards, groups: groups.length }, null, 2));
  } finally {
    if (cdp) cdp.close();
    chrome.kill();
    await sleep(300);
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // Chrome can keep a handle briefly on Windows; the next temp cleanup can remove it.
    }
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
