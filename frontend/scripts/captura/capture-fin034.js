/**
 * FIN-034 · evidencia del selector moderno con la usuaria demo:
 *   1. Búsqueda de entidad ("banco") → resultados del catálogo (monograma +
 *      categoría) + anclas de tipo.
 *   2. Al elegir "Nu" → el alta armada del descriptor con nombre + tasa típica
 *      PRELLENADA (pista editable) y "Cambiar" (el tipo inferido es editable).
 * Uso: APP_URL=http://localhost:<puerto> node capture-fin034.js <carpeta>
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP = process.env.APP_URL || 'http://localhost:8081';
const API = 'http://localhost:3000/v1';
const OUT = process.argv[2] || '.';
const PORT = 9674;
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

  const PROFILE = process.env.TEMP + '/millo-fin034-' + Date.now();
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
  // RN Web: escribir en el TextInput controlado (setter nativo + evento input).
  const typeSearch = (text) => evalJs(`(() => {
    const input = document.querySelector('input[placeholder^="Busca"]');
    if (!input) return 'no-input';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, ${JSON.stringify(text)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return 'ok';
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

  await tapText('Deudas');
  await wait(4000);
  console.log('nueva deuda:', await tapText('+ Nueva deuda'));
  await wait(2500);

  // --- 1. Búsqueda "banco" → resultados del catálogo + anclas de tipo. ---
  console.log('escribir banco:', await typeSearch('banco'));
  await wait(2500);
  let h = await fullHeight();
  await setViewport(Math.min(h, 4200));
  await wait(1200);
  await shot('fin034-01-selector-busqueda.png');
  console.log('Bancolombia visible:', await evalJs(`document.body.innerText.includes('Bancolombia')`));

  // --- 2. Elegir "Nu" → alta con prellenado + tipo editable ("Cambiar"). ---
  await setViewport(844);
  await typeSearch('Nu');
  await wait(2500);
  console.log('tap Nu:', await tapText('Nu (Nubank)'));
  await wait(2000);
  h = await fullHeight();
  await setViewport(Math.min(h, 3400));
  await wait(1200);
  await shot('fin034-02-alta-prellenada-tipo-editable.png');
  console.log('Cambiar visible:', await evalJs(`document.body.innerText.includes('Cambiar')`));

  ws.close();
  edge.kill();
  console.log('FIN-034 CAPTURADO');
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
