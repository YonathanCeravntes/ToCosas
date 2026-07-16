/**
 * FIN-036 · evidencia de la confirmación de actualización por corte:
 *   1. El detalle de la tarjeta con "🔎 Una confirmación rápida" (¿cambió el cupo?).
 *   2. Tras "No cambió" → acuse de calma ("no te lo vuelvo a preguntar").
 * Uso: APP_URL=http://localhost:<puerto> node capture-fin036.js <carpeta>
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP = process.env.APP_URL || 'http://localhost:8081';
const API = 'http://localhost:3000/v1';
const OUT = process.argv[2] || '.';
const PORT = 9676;
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

(async () => {
  const lg = await fetch(API + '/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo.laura@millo.app', password: 'Demo2026!millo' }),
  });
  const { tokens, user } = await lg.json();

  const PROFILE = process.env.TEMP + '/millo-fin036-' + Date.now();
  const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
     '--user-data-dir=' + PROFILE, '--window-size=390,844', '--hide-scrollbars', 'about:blank'],
    { stdio: 'ignore' });
  await wait(4000);
  const tabs = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
  const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  await cdp(ws, 'Page.enable');
  await cdp(ws, 'Runtime.enable');
  await cdp(ws, 'Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => {
      const LOCAL = 'http://localhost:3000';
      const fix = (u) => typeof u === 'string'
        ? u.replace('https://milla-backend.onrender.com', LOCAL).replace(/http:\\/\\/[0-9.]+:3000/, LOCAL) : u;
      let real = window.fetch;
      const wrap = (input, init) => {
        try { if (typeof input === 'string') input = fix(input); else if (input && input.url) input = new Request(fix(input.url), input); } catch (e) {}
        return real(input, init);
      };
      Object.defineProperty(window, 'fetch', { configurable: true, get() { return wrap; }, set(v) { real = v; } });
    })();`,
  });

  const evalJs = async (expression) =>
    (await cdp(ws, 'Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value;
  const setViewport = (h) =>
    cdp(ws, 'Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 2, mobile: true });
  const shot = async (name) => {
    const r = await cdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, name), Buffer.from(r.data, 'base64'));
    console.log('captura:', name);
  };
  const tapText = (txt) => evalJs(`(() => {
    const t = ${JSON.stringify(txt)};
    const el = [...document.querySelectorAll('div[tabindex="0"],[role="button"],div,span')].find(e => e.textContent.trim() === t);
    (el?.closest('[tabindex="0"],[role="button"]') || el)?.click();
    return el ? 'ok' : 'no:' + t;
  })()`);
  const fullHeight = () => evalJs(`(() => {
    const s = [...document.querySelectorAll('div')].filter(d => d.scrollHeight > d.clientHeight + 50)
      .sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
    return s ? s.scrollHeight + 160 : document.body.scrollHeight;
  })()`);

  await setViewport(844);
  await cdp(ws, 'Page.navigate', { url: APP + '/' });
  await wait(15000);
  await evalJs(`
    localStorage.setItem('tocosas.tokens', ${JSON.stringify(JSON.stringify(tokens))});
    localStorage.setItem('tocosas.user', ${JSON.stringify(JSON.stringify(user))});
    'seeded'`);
  await cdp(ws, 'Page.navigate', { url: APP + '/' });
  await wait(12000);
  await tapText('Seguir');
  await wait(1200);

  // --- 1. Detalle con la confirmación pendiente ("¿Cambió el cupo?"). ---
  await tapText('Deudas');
  await wait(5000);
  console.log('fila tarjeta:', await tapText('Mi tarjeta Visa'));
  await wait(4500);
  await setViewport(Math.min(await fullHeight(), 4200));
  await wait(1200);
  await shot('fin036-01-confirmacion-pendiente.png');
  console.log('pregunta visible:', await evalJs(`document.body.innerText.includes('Una confirmación rápida')`));

  // --- 2. "No cambió" → acuse de calma. ---
  await setViewport(844);
  console.log('no cambió:', await tapText('No cambió'));
  await wait(2500);
  await setViewport(Math.min(await fullHeight(), 4200));
  await wait(1000);
  await shot('fin036-02-no-cambio-calma.png');
  console.log('calma visible:', await evalJs(`document.body.innerText.includes('sigue igual')`));

  ws.close();
  edge.kill();
  console.log('FIN-036 CAPTURADO');
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
