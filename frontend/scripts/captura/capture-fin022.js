/**
 * FIN-022: captura de SCROLL COMPLETO de la lista de Deudas (usuaria demo) y
 * cold-start real (usuario nuevo registrado por API, sin deudas).
 * Uso: APP_URL=http://localhost:<puerto> node capture-fin022.js <carpeta> <prefijo>
 *   prefijo: p. ej. "antes" | "despues" (cold-start solo se captura con "despues")
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP = process.env.APP_URL || 'http://localhost:8081';
const API = 'http://localhost:3000/v1';
const OUT = process.argv[2] || '.';
const PREFIX = process.argv[3] || 'captura';
const PORT = 9667;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let msgId = 0;
function cdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    const onMsg = (ev) => { const m = JSON.parse(ev.data); if (m.id === id) { ws.removeEventListener('message', onMsg); m.error ? reject(new Error(method + ': ' + JSON.stringify(m.error))) : resolve(m.result); } };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function session(email, password) {
  const lg = await fetch(API + '/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await lg.json();
  if (!j.tokens) throw new Error('login falló: ' + email);
  return j;
}

(async () => {
  const demo = await session('demo.laura@millo.app', 'Demo2026!millo');

  const PROFILE = process.env.TEMP + '/millo-fin022-' + Date.now();
  const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
     '--user-data-dir=' + PROFILE, '--window-size=390,844', '--hide-scrollbars', 'about:blank'],
    { stdio: 'ignore' });
  await wait(4000);
  const list = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
  const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  await cdp(ws, 'Page.enable');
  await cdp(ws, 'Runtime.enable');

  const evalJs = async (expression) =>
    (await cdp(ws, 'Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value;
  const setViewport = (h) =>
    cdp(ws, 'Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 2, mobile: true });
  const shot = async (name) => {
    const r = await cdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, name), Buffer.from(r.data, 'base64'));
    console.log('captura:', name);
  };
  const contentHeight = () => evalJs(`(() => {
    const s = [...document.querySelectorAll('div')].filter(d => d.scrollHeight > d.clientHeight + 50)
      .sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
    return s ? s.scrollHeight + 140 : document.body.scrollHeight;
  })()`);
  const seed = async (tokens, user) => {
    await evalJs(`
      localStorage.clear();
      localStorage.setItem('tocosas.tokens', ${JSON.stringify(JSON.stringify(tokens))});
      localStorage.setItem('tocosas.user', ${JSON.stringify(JSON.stringify(user))});
      'seeded'`);
    await cdp(ws, 'Page.navigate', { url: APP + '/' });
    await wait(12000);
    await evalJs(`(() => { const b=[...document.querySelectorAll('div[tabindex="0"],[role="button"]')].find(e=>e.textContent.trim()==='Seguir'); b?.click(); return 'ok'; })()`);
    await wait(1500);
  };
  const goDebts = async () => {
    const r = await evalJs(`(() => {
      const els = [...document.querySelectorAll('div[tabindex="0"],[role="button"],[role="tab"]')];
      const b = els.find((e) => e.textContent.trim() === 'Deudas') || els.find((e) => e.textContent.includes('Deudas'));
      b?.click(); return b ? 'ok' : 'NO ENCONTRADO';
    })()`);
    console.log('tab deudas:', r);
    await wait(4000);
  };

  await setViewport(844);
  await cdp(ws, 'Page.navigate', { url: APP + '/' });
  await wait(15000);

  // 1) Usuaria demo — lista completa.
  await seed(demo.tokens, demo.user);
  await goDebts();
  let h = await contentHeight();
  await setViewport(Math.min(h, 6000));
  await wait(2500);
  await shot(`fin022-${PREFIX}-deudas-lista.png`);

  // 2) Cold-start REAL (solo en "despues"): usuario nuevo por API, sin deudas.
  if (PREFIX === 'despues') {
    const email = `coldstart-fin022-${Date.now()}@millo.test`;
    const reg = await fetch(API + '/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Passw0rd!cold' }),
    });
    const nuevo = await reg.json();
    await setViewport(844);
    await seed(nuevo.tokens, nuevo.user);
    await goDebts();
    h = await contentHeight();
    await setViewport(Math.min(h, 6000));
    await wait(2000);
    await shot('fin022-despues-deudas-coldstart.png');
  }

  ws.close();
  edge.kill();
  console.log('FIN-022 CAPTURADO (' + PREFIX + ')');
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
