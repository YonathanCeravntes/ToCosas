/**
 * FIN-021: capturas de SCROLL COMPLETO de las 3 pantallas co-visibles del
 * fondo de emergencia (Inicio, Salud, Presupuesto). Mismo método CDP.
 * Uso: APP_URL=http://localhost:<puerto> node capture-fin021.js <carpeta-salida>
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP = process.env.APP_URL || 'http://localhost:8081';
const API = 'http://localhost:3000/v1';
const OUT = process.argv[2] || '.';
const PORT = 9668;
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
  if (!tokens) throw new Error('login demo falló');

  const PROFILE = process.env.TEMP + '/millo-fin021-' + Date.now();
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
  const clickTab = (label) => evalJs(`(() => {
    const els = [...document.querySelectorAll('div[tabindex="0"],[role="button"],[role="tab"]')];
    const b = els.find((e) => e.textContent.trim() === ${JSON.stringify(label)})
      || els.find((e) => e.textContent.includes(${JSON.stringify(label)}));
    b?.click(); return b ? 'ok' : 'NO ENCONTRADO';
  })()`);
  const fullShot = async (name, marker) => {
    const h = await contentHeight();
    await setViewport(Math.min(h, 6000));
    await wait(2500);
    if (marker) console.log(name, '→ marcador visible:', await evalJs(`document.body.innerText.includes(${JSON.stringify(marker)})`));
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

  await fullShot('fin021-01-inicio-completo.png', 'colchón inicial');

  console.log('tab salud:', await clickTab('Salud'));
  await wait(4000);
  await fullShot('fin021-02-salud-completo.png', 'Fondo de emergencia');

  console.log('tab presupuesto:', await clickTab('Presupu'));
  await wait(4000);
  await fullShot('fin021-03-presupuesto-completo.png', 'Con lo libre');

  ws.close();
  edge.kill();
  console.log('FIN-021 CAPTURADO');
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
