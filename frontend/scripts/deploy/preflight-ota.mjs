#!/usr/bin/env node
/**
 * Gate automático de pre-publicación OTA (política del Fundador tras BT-003).
 *
 * Bloquea (exit 1) una publicación OTA si la configuración EFECTIVA que
 * recibiría el usuario es insegura. Nace del incidente BT-003: un OTA se
 * publicó apuntando a `localhost` porque `eas update` no hereda el `env` del
 * perfil de build. Este script hace imposible repetir esa clase de error:
 * NO confía en que el bundle "compile", valida lo que el usuario recibirá.
 *
 * Uso: `node scripts/deploy/preflight-ota.mjs [canal]`  (canal por defecto: preview)
 *
 * Comprueba: runtime · canal · URL final de producción · variables críticas ·
 * endpoint /health · AUSENCIA TOTAL de referencias a localhost en el bundle.
 */
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const CHANNEL = process.argv[2] || 'preview';

// Fuente única de verdad de la URL de producción esperada.
const EXPECTED_PROD_URL = 'https://milla-backend.onrender.com/v1';
const VALID_CHANNELS = ['development', 'preview', 'production'];
// Para el valor de config (una URL completa): cualquier aparición es sospechosa.
const LOCALHOST_RE = /localhost|127\.0\.0\.1|10\.0\.2\.2|0\.0\.0\.0/i;
// Para el barrido del bundle: SOLO localhost usado como HOST de una URL, para no
// confundir con substrings inocentes de la tabla de strings de Hermes
// (p. ej. "RCTRefreshControl" + "ocalhost..."). Detecta el patrón real de BT-003.
const LOCALHOST_URL_RE = /(https?:)?\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2|0\.0\.0\.0)|(localhost|127\.0\.0\.1):\d{2,5}/i;

const problems = [];
const fail = (m) => { problems.push(m); console.error(`  ❌ ${m}`); };
const ok = (m) => console.log(`  ✅ ${m}`);

console.log(`\n🔒 Preflight OTA — canal "${CHANNEL}"\n`);

// 1) Canal válido -------------------------------------------------------------
console.log('· Canal');
if (!VALID_CHANNELS.includes(CHANNEL)) fail(`canal desconocido: ${CHANNEL} (esperados: ${VALID_CHANNELS.join(', ')})`);
else ok(`canal ${CHANNEL}`);

// 2) Config efectiva (lo que viaja en el manifiesto del OTA) ------------------
console.log('· Configuración efectiva (expo config)');
let cfg;
try {
  cfg = JSON.parse(execSync('npx expo config --type public --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
} catch (e) {
  fail(`no se pudo resolver expo config: ${e.message}`);
}
if (cfg) {
  const apiUrl = cfg.extra?.apiUrl;
  if (!apiUrl) fail('extra.apiUrl ausente');
  else if (LOCALHOST_RE.test(apiUrl)) fail(`extra.apiUrl apunta a un host local: ${apiUrl}`);
  else if (!apiUrl.startsWith('https://')) fail(`extra.apiUrl no es https: ${apiUrl}`);
  else if (CHANNEL === 'preview' && apiUrl !== EXPECTED_PROD_URL) fail(`extra.apiUrl (${apiUrl}) != producción esperada (${EXPECTED_PROD_URL})`);
  else ok(`URL de API: ${apiUrl}`);

  // runtimeVersion presente (política appVersion o valor fijo)
  const rtv = cfg.runtimeVersion;
  if (!rtv) fail('runtimeVersion ausente en la config');
  else ok(`runtimeVersion: ${typeof rtv === 'object' ? JSON.stringify(rtv) : rtv}`);

  // updates.url del proyecto EAS
  if (!cfg.updates?.url) fail('updates.url ausente (expo-updates no configurado)');
  else ok(`updates.url: ${cfg.updates.url}`);
}

// 2b) Compatibilidad con la APK instalada (BP-05, lección 2026-09-26) ---------
// Un OTA solo puede llevar JS/assets: si el proyecto cambió de SDK, de runtime o
// agregó un módulo NATIVO que la APK no trae, el bundle rompería la app instalada.
console.log('· Compatibilidad con la APK instalada (apk-baseline.json)');
try {
  const here = dirname(fileURLToPath(import.meta.url));
  const baseline = JSON.parse(readFileSync(join(here, 'apk-baseline.json'), 'utf8'));
  const pkg = JSON.parse(readFileSync(join(here, '..', '..', 'package.json'), 'utf8'));
  const expoMajor = Number(String(pkg.dependencies?.expo ?? '').replace(/[^\d.]/g, '').split('.')[0]);
  if (expoMajor !== baseline.expoSdkMajor) fail(`Expo SDK del proyecto (${expoMajor}) != APK instalada (${baseline.expoSdkMajor}) — requiere APK nueva, no OTA`);
  else ok(`Expo SDK ${expoMajor} coincide con la APK`);
  const rn = String(pkg.dependencies?.['react-native'] ?? '');
  if (!rn.startsWith(baseline.reactNative)) fail(`react-native ${rn} != APK (${baseline.reactNative}.x)`);
  else ok(`react-native ${rn} compatible`);
  if (cfg) {
    const rtv = typeof cfg.runtimeVersion === 'object' ? (cfg.runtimeVersion.policy === 'appVersion' ? cfg.version : JSON.stringify(cfg.runtimeVersion)) : cfg.runtimeVersion;
    if (rtv !== baseline.runtimeVersion) fail(`runtimeVersion efectivo (${rtv}) != APK (${baseline.runtimeVersion})`);
    else ok(`runtimeVersion ${rtv} coincide con la APK`);
  }
  // Módulos nativos: cualquier dependencia expo-*/react-native-* nueva que no esté
  // en la APK es sospechosa (los paquetes puramente JS conocidos se excluyen).
  const PURE_JS = new Set(['expo', 'react', 'react-dom', 'react-native', 'react-native-web', 'zustand', '@expo/vector-icons', '@react-navigation/native', '@react-navigation/native-stack', '@react-navigation/bottom-tabs']);
  const suspicious = Object.keys(pkg.dependencies ?? {}).filter((d) => !PURE_JS.has(d) && /^(expo-|react-native-|@react-native)/.test(d) && !baseline.nativeModules.includes(d));
  if (suspicious.length) fail(`dependencias nativas que la APK no trae: ${suspicious.join(', ')} — agrégalas al baseline SOLO tras construir una APK nueva`);
  else ok('sin módulos nativos nuevos respecto a la APK');
  if (!existsSync(join(here, '..', '..', 'node_modules', 'expo', 'package.json'))) fail('node_modules ausente — corre npm install');
  else {
    const installed = JSON.parse(readFileSync(join(here, '..', '..', 'node_modules', 'expo', 'package.json'), 'utf8')).version;
    if (Number(installed.split('.')[0]) !== baseline.expoSdkMajor) fail(`node_modules tiene expo ${installed} (≠ SDK ${baseline.expoSdkMajor}) — corre npm install antes de publicar`);
    else ok(`node_modules: expo ${installed}`);
    // Lección 2026-10-03 (APK que se cerraba al abrir): un peer (expo-font de
    // @expo/vector-icons) se resolvió a la versión de otro SDK y el build la enlazó.
    // Cada módulo nativo instalado debe tener la versión mayor que pide este SDK.
    const bundledPath = join(here, '..', '..', 'node_modules', 'expo', 'bundledNativeModules.json');
    if (existsSync(bundledPath)) {
      const bundled = JSON.parse(readFileSync(bundledPath, 'utf8'));
      const major = (v) => String(v).replace(/^[^\d]*/, '').split('.')[0];
      const wrong = [];
      for (const [name, range] of Object.entries(bundled)) {
        const p = join(here, '..', '..', 'node_modules', ...name.split('/'), 'package.json');
        if (!existsSync(p)) continue;
        const v = JSON.parse(readFileSync(p, 'utf8')).version;
        if (major(v) !== major(range)) wrong.push(`${name}@${v} (SDK pide ${range})`);
      }
      if (wrong.length) fail(`módulos nativos con versión de otro SDK: ${wrong.join(', ')} — corre npx expo install --fix`);
      else ok('módulos nativos en la versión de este SDK');
    }
  }
} catch (e) {
  fail(`no se pudo verificar el baseline de la APK: ${e.message}`);
}

// 3) Export del bundle y barrido de localhost --------------------------------
console.log('· Bundle (export + barrido de localhost)');
const outDir = join(tmpdir(), `ota-preflight-${Date.now()}`);
try {
  execSync(`npx expo export --platform android --output-dir "${outDir}"`, { stdio: 'ignore' });
  const hits = scanForLocalhost(outDir);
  if (hits.length) fail(`el bundle contiene referencias a host local (${hits.length} archivo/s): ${hits.join(', ')}`);
  else ok('sin referencias a localhost en el bundle');
} catch (e) {
  fail(`no se pudo exportar/escanear el bundle: ${e.message}`);
} finally {
  try { rmSync(outDir, { recursive: true, force: true }); } catch { /* limpieza best-effort */ }
}

// 4) Endpoint /health de producción ------------------------------------------
console.log('· Backend /health');
const healthUrl = `${EXPECTED_PROD_URL}/health`;
{
  // AbortController + clearTimeout: no dejar un timer pendiente que haga crashear
  // el teardown de Node en Windows al salir (assertion de libuv).
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 40000);
  try {
    const res = await fetch(healthUrl, { signal: ac.signal });
    if (!res.ok) fail(`/health respondió HTTP ${res.status}`);
    else ok(`/health 200 (${healthUrl})`);
  } catch (e) {
    fail(`/health no respondió: ${e.message}`);
  } finally {
    clearTimeout(t);
  }
}

// Veredicto -------------------------------------------------------------------
console.log('');
if (problems.length) {
  console.error(`🚫 PUBLICACIÓN BLOQUEADA — ${problems.length} problema(s). No se publicará el OTA.\n`);
  process.exitCode = 1;
} else {
  console.log('🟢 Preflight OK — configuración segura para publicar.\n');
  process.exitCode = 0;
}

// --- helpers ---------------------------------------------------------------
function scanForLocalhost(dir) {
  const hits = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.(hbc|js|json|map)$/.test(name)) {
        // .hbc es bytecode Hermes pero los literales de string quedan en claro.
        const content = readFileSync(p, 'latin1');
        if (LOCALHOST_URL_RE.test(content)) hits.push(name);
      }
    }
  };
  walk(dir);
  return hits;
}
