/**
 * FIN-031 · evidencia de la espina de tarjeta de crédito con la usuaria demo.
 *  Prepara por API una tarjeta con cupo y dos compras a cuotas, y captura:
 *   1. El detalle de la tarjeta con la sección "Tu tarjeta" (cupo/saldo + compras).
 *   2. El alta de deuda con el selector "Tarjeta de crédito" y el campo de cupo.
 * Uso: APP_URL=http://localhost:<puerto> node capture-fin031.js <carpeta>
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP = process.env.APP_URL || 'http://localhost:8081';
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

async function api(token, method, pathname, body) {
  const res = await fetch(API + pathname, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* sin cuerpo */ }
  return { status: res.status, data };
}

(async () => {
  const lg = await fetch(API + '/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo.laura@millo.app', password: 'Demo2026!millo' }),
  });
  const { tokens, user } = await lg.json();
  const token = tokens.accessToken;

  // --- Datos de la evidencia (idempotente): una tarjeta con cupo y compras. ---
  const list = await api(token, 'GET', '/debts');
  let card = (list.data || []).find((d) => d.debtType === 'tarjeta_credito' && d.name === 'Mi tarjeta Visa');
  if (!card) {
    const created = await api(token, 'POST', '/debts', {
      name: 'Mi tarjeta Visa', debtType: 'tarjeta_credito',
      originalAmount: 0, currentBalance: 0, startDate: '2026-06-15',
      termMonths: 24, interestRate: 28, rateBasis: 'EA', creditLimit: 3_000_000,
    });
    card = created.data.debt;
  }
  const sum = await api(token, 'GET', '/debts/cards/' + card.id);
  if (!sum.data.purchases || sum.data.purchases.length === 0) {
    await api(token, 'POST', '/debts/cards/' + card.id + '/purchases', { amount: 600_000, installments: 3, note: 'Mercado del mes' });
    await api(token, 'POST', '/debts/cards/' + card.id + '/purchases', { amount: 900_000, installments: 6, withInterest: true, note: 'Nevera nueva' });
  }
  console.log('tarjeta demo lista:', card.id);

  const PROFILE = process.env.TEMP + '/millo-fin031-' + Date.now();
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
  await cdp(ws, 'Network.enable');
  const reqUrls = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Network.requestWillBeSent' && /\/v1\/debts/.test(m.params.request.url)) reqUrls.push(m.params.request.url);
  });

  // El bundle web resuelve el API a producción (app.json extra.apiUrl → Render).
  // Para capturar contra el backend LOCAL sin tocar el dev server del usuario,
  // reescribimos el host en `fetch` ANTES de que evalúe cualquier script del app.
  await cdp(ws, 'Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => {
      const LOCAL = 'http://localhost:3000';
      // El bundle apunta a producción (Render) o a una IP LAN :3000 ya inalcanzable
      // (la máquina cambió de red). Redirigimos AMBOS al backend local para capturar.
      const fix = (u) => typeof u === 'string'
        ? u.replace('https://milla-backend.onrender.com', LOCAL).replace(/http:\\/\\/[0-9.]+:3000/, LOCAL)
        : u;
      let real = window.fetch;
      window.__shimmed = true;
      const wrap = (input, init) => {
        try {
          if (typeof input === 'string') input = fix(input);
          else if (input && input.url) input = new Request(fix(input.url), input);
        } catch (e) {}
        return real(input, init);
      };
      // RN Web reasigna window.fetch al cargar: interceptamos con un accessor para
      // que CUALQUIER fetch instalado quede envuelto con el rewrite de host.
      Object.defineProperty(window, 'fetch', {
        configurable: true,
        get() { return wrap; },
        set(v) { real = v; },
      });
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
  const tapText = (txt, exact = true) => evalJs(`(() => {
    const t = ${JSON.stringify(txt)};
    const exact = ${JSON.stringify(exact)};
    const all = [...document.querySelectorAll('div[tabindex="0"],[role="button"],div,span')];
    const el = exact ? all.find(e => e.textContent.trim() === t)
                     : all.find(e => e.textContent.includes(t));
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

  // --- 1. Detalle de la tarjeta con la sección "Tu tarjeta". ---
  // Diagnóstico: ¿el shim se aplicó y hay conectividad con el backend local?
  console.log('shim aplicado:', await evalJs('window.__shimmed === true'));
  console.log('fetch local:', await evalJs(`(async () => {
    try { const r = await fetch('http://localhost:3000/v1/debts', { headers: { Authorization: 'Bearer ' + ${JSON.stringify(token)} } }); const j = await r.json(); return r.status + ' n=' + (Array.isArray(j) ? j.length : '?'); }
    catch (e) { return 'ERR ' + e.message; }
  })()`));

  console.log('tab Deudas:', await tapText('Deudas'));
  await wait(6000);
  console.log('URLs /v1/debts emitidas por la app:', JSON.stringify(reqUrls.slice(0, 4)));
  console.log('fila tarjeta:', await tapText('Mi tarjeta Visa'));
  await wait(5000);
  let h = await fullHeight();
  await setViewport(Math.min(h, 6000));
  await wait(1800);
  await shot('fin031-01-detalle-tarjeta.png');
  console.log('sección visible:', await evalJs(`document.body.innerText.includes('Tu tarjeta')`));

  // --- 2. El formulario de "registrar una compra" abierto (baja fricción, H). ---
  await setViewport(844);
  await wait(600);
  console.log('abrir compra:', await tapText('➕ Registrar una compra'));
  await wait(1500);
  h = await fullHeight();
  await setViewport(Math.min(h, 3200));
  await wait(1200);
  await shot('fin031-02-registrar-compra.png');
  console.log('form compra visible:', await evalJs(`document.body.innerText.includes('Monto de la compra')`));

  // --- 3. Alta con el selector Tarjeta de crédito + campo de cupo. ---
  await setViewport(844);
  await tapText('Deudas');
  await wait(1500);
  await tapText('+ Nueva deuda');
  await wait(2500);
  await tapText('💳 Tarjeta de crédito');
  await wait(1200);
  h = await fullHeight();
  await setViewport(Math.min(h, 3000));
  await wait(1500);
  await shot('fin031-03-alta-tarjeta-cupo.png');
  console.log('campo cupo visible:', await evalJs(`document.body.innerText.includes('Cupo total')`));

  ws.close();
  edge.kill();
  console.log('FIN-031 CAPTURADO');
  process.exit(0);
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
