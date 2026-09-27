/**
 * SPRINT-PULIDO-001 · evidencia de los P0 + P1/P2:
 *   1. Wizard de Registrar con "‹ Atrás" visible (P0.1) — y al tocarlo, el monto
 *      diligenciado sigue intacto (nunca se borra).
 *   2. Acuse nuevo (P1: consecuencia en lenguaje humano) + "Deshacer (Ns)" con
 *      cuenta regresiva (P2.6).
 *   3. P0.2: con el detalle de la deuda YA montado, un pago desde Registrar y al
 *      volver el detalle muestra el saldo NUEVO (antes quedaba congelado).
 * Uso: APP_URL=http://localhost:<puerto> node capture-pulido001.js <carpeta>
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP = process.env.APP_URL || 'http://localhost:8081';
const API = 'http://localhost:3000/v1';
const OUT = process.argv[2] || '.';
const PORT = 9678;
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
  const token = tokens.accessToken;

  const PROFILE = process.env.TEMP + '/millo-pulido-' + Date.now();
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
  const tapButton = (txt) => evalJs(`(() => {
    const t = ${JSON.stringify(txt)};
    const cands = [...document.querySelectorAll('div[tabindex="0"],[role="button"]')]
      .filter(e => e.textContent.trim() === t)
      .map(e => ({ e, w: e.getBoundingClientRect().width }))
      .sort((a, b) => b.w - a.w);
    cands[0]?.e.click();
    return cands.length ? 'ok' : 'no:' + t;
  })()`);
  const typeInput = (text) => evalJs(`(() => {
    const input = document.querySelector('input');
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

  // --- P0.2 precondición: montar el detalle de la deuda ANTES del pago. ---
  await tapText('Deudas');
  await wait(5000);
  console.log('montar detalle:', await tapText('Gota a gota del barrio'));
  await wait(4000);
  console.log('saldo inicial visible (500.000):', await evalJs(`document.body.innerText.includes('500.000')`));

  // --- 1. P0.1: wizard con "Atrás" + los datos sobreviven al retroceso. ---
  await tapText('Registrar');
  await wait(3000);
  await tapText('Un gasto');
  await wait(1500);
  await typeInput('45000');
  await wait(600);
  await tapText('Siguiente');
  await wait(1500);
  await setViewport(Math.min(await fullHeight(), 2600));
  await wait(600);
  await shot('pulido-01-wizard-atras.png');
  console.log('Atrás visible:', await evalJs(`document.body.innerText.includes('‹ Atrás')`));
  await setViewport(844);
  await tapText('‹ Atrás');
  await wait(1200);
  console.log('P0.1 datos intactos tras Atrás (45.000):', await evalJs(`document.body.innerText.includes('45.000')`));

  // --- 2. P1+P2.6: acuse con consecuencia humana + Deshacer con contador. ---
  await tapText('Siguiente');
  await wait(1200);
  await tapText('Efectivo');
  await wait(1500);
  await tapButton('Registrar');
  await wait(3500);
  await setViewport(Math.min(await fullHeight(), 2600));
  await wait(600);
  await shot('pulido-02-acuse-consecuencia-deshacer.png');
  console.log('consecuencia visible:', await evalJs(`document.body.innerText.includes('Actualicé tu presupuesto')`));
  console.log('contador visible:', await evalJs(`/Deshacer \\(\\d+s\\)/.test(document.body.innerText)`));
  // Deshacemos el gasto de prueba (deja la demo limpia) — y probamos el undo.
  await setViewport(844);
  await evalJs(`(() => { const el=[...document.querySelectorAll('div,span')].find(e=>/^↩︎ Deshacer \\(\\d+s\\)$/.test(e.textContent.trim())); (el?.closest('[tabindex="0"],[role="button"]')||el)?.click(); return 'ok'; })()`);
  await wait(2500);

  // --- 3. P0.2: pago desde Registrar → volver al detalle YA montado → saldo nuevo. ---
  await tapButton('Registrar otra cosa');
  await wait(1500);
  await tapText('Un pago de deuda');
  await wait(1500);
  await typeInput('100000');
  await wait(600);
  await tapText('Siguiente');
  await wait(1500);
  await tapText('Gota a gota del barrio');
  await wait(3500);
  console.log('acuse pago:', await evalJs(`document.body.innerText.includes('400.000')`));
  // Volvemos al detalle que quedó montado con 500.000 — debe reconstruirse a 400.000.
  await tapText('Deudas');
  await wait(4000);
  await setViewport(Math.min(await fullHeight(), 4200));
  await wait(1200);
  await shot('pulido-03-detalle-reconstruido.png');
  console.log('P0.2 detalle reconstruido (400.000):', await evalJs(`document.body.innerText.includes('400.000')`));

  // Limpieza: anulamos el pago de prueba por la MISMA vía del deshacer.
  const txs = await (await fetch(API + '/transactions?', { headers: { Authorization: 'Bearer ' + token } })).json();
  const pago = txs.find((t) => t.kind === 'pago_deuda' && Number(t.amount) === 100000);
  if (pago) {
    await fetch(API + '/transactions/' + pago.id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
    console.log('limpieza: pago de prueba anulado');
  }

  ws.close();
  edge.kill();
  console.log('SPRINT-PULIDO-001 CAPTURADO');
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
