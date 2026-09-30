/**
 * FIN-027: evidencia del modelo de ingresos con la usuaria demo (ya tiene
 * perfil, fuente fija con salud retenida + pensión auto-pagada configuradas).
 *  1. Ajustes → "Mi perfil de ingresos" → pantalla completa.
 *  2. Salud: nota de costo de honestidad visible.
 *  3. Presupuesto: sin opción "Ingreso fijo" en el alta; card de referencia.
 * Uso: APP_URL=http://localhost:<puerto> node capture-fin027.js <carpeta>
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP = process.env.APP_URL || 'http://localhost:8081';
const API = 'http://localhost:3000/v1';
const OUT = process.argv[2] || '.';
const PORT = 9666;
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

  const PROFILE = process.env.TEMP + '/millo-fin027-' + Date.now();
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
  const clickText = (label) => evalJs(`(() => {
    const els = [...document.querySelectorAll('div[tabindex="0"],[role="button"],[role="tab"]')];
    const b = els.find((e) => e.textContent.trim() === ${JSON.stringify(label)})
      || els.find((e) => e.textContent.includes(${JSON.stringify(label)}));
    b?.click(); return b ? 'ok' : 'NO ENCONTRADO';
  })()`);
  const fullShot = async (name) => {
    const h = await contentHeight();
    await setViewport(Math.min(h, 6000));
    await wait(2500);
    await shot(name);
    await setViewport(844);
    await wait(800);
  };

  await setViewport(844);
  await cdp(ws, 'Page.navigate', { url: APP + '/' });
  await wait(15000);
  await evalJs(`
    localStorage.setItem('tocosas.tokens', ${JSON.stringify(JSON.stringify(tokens))});
    localStorage.setItem('tocosas.user', ${JSON.stringify(JSON.stringify(user))});
    'seeded'`);
  await cdp(ws, 'Page.navigate', { url: APP + '/' });
  await wait(12000);
  await evalJs(`(() => { const b=[...document.querySelectorAll('div[tabindex="0"],[role="button"]')].find(e=>e.textContent.trim()==='Seguir'); b?.click(); return 'ok'; })()`);
  await wait(1500);

  console.log('tab salud:', await clickText('Salud'));
  await wait(4000);
  await fullShot('fin027-01-salud-notice.png');

  console.log('tab ajustes:', await clickText('Ajustes'));
  await wait(3000);
  console.log('mi perfil de ingresos:', await clickText('Mi perfil de ingresos'));
  await wait(4000);
  await fullShot('fin027-02-perfil-ingresos.png');

  ws.close();
  edge.kill();
  console.log('FIN-027 CAPTURADO');
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
