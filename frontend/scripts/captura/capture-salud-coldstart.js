/** FIN-019: capturas de cierre — Salud completa (después) + cold-start con usuario nuevo. */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP = 'http://localhost:8081';
const API = 'http://localhost:3000/v1';
const OUT = process.argv[2] || '.';
const PORT = 9672;
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
  // Usuario demo (score real) + usuario NUEVO (cold-start real).
  const lg = await fetch(API + '/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo.laura@millo.app', password: 'Demo2026!millo' }),
  });
  const demo = await lg.json();
  const rg = await fetch(API + '/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `coldstart-${Date.now()}@millo.test`, password: 'Demo2026!millo', fullName: 'Nuevo Usuario' }),
  });
  const fresh = await rg.json();

  const PROFILE = process.env.TEMP + '/millo-019-' + Date.now();
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
  const clickText = (txt) =>
    evalJs(`(() => { const b=[...document.querySelectorAll('div[tabindex="0"],[role="button"],[role="tab"]')].find(e=>e.textContent.trim().includes(${JSON.stringify(txt)})); if(b){b.click();return 'ok'}return 'miss'; })()`);
  const contentHeight = () =>
    evalJs(`(() => {
      const s = [...document.querySelectorAll('div')].filter(d => d.scrollHeight > d.clientHeight + 50)
        .sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
      return s ? s.scrollHeight + 120 : document.body.scrollHeight;
    })()`);
  const loginAs = async (session) => {
    await setViewport(844);
    await cdp(ws, 'Page.navigate', { url: APP + '/' });
    await wait(10000);
    await evalJs(`
      localStorage.setItem('tocosas.tokens', ${JSON.stringify(JSON.stringify(session.tokens))});
      localStorage.setItem('tocosas.user', ${JSON.stringify(JSON.stringify(session.user))});
      'seeded'`);
    await cdp(ws, 'Page.navigate', { url: APP + '/' });
    await wait(11000);
    await clickText('Seguir');
    await wait(1000);
  };

  // 1. Salud DESPUÉS — usuaria demo con Score real, evolución abierta.
  await loginAs(demo);
  console.log('tab salud:', await clickText('Salud'));
  await wait(5000);
  await clickText('Ver mi evolución');
  await wait(2500);
  console.log('score:', await evalJs(`document.body.innerText.includes('de 1.000')`));
  let h = await contentHeight();
  await setViewport(Math.min(h, 6000));
  await wait(2000);
  await shot('despues-salud-01-scroll-completo.png');

  // 2. Cold-start REAL — usuario recién registrado.
  await loginAs(fresh);
  console.log('tab salud (nuevo):', await clickText('Salud'));
  await wait(5000);
  console.log('coldstart:', await evalJs(`document.body.innerText.includes('se está construyendo')`));
  h = await contentHeight();
  await setViewport(Math.min(h, 6000));
  await wait(2000);
  await shot('despues-salud-02-coldstart.png');

  ws.close();
  edge.kill();
  console.log('FIN-019 CAPTURADA');
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
