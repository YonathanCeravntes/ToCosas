#!/usr/bin/env node
/**
 * Publicación OTA SEGURA (política del Fundador tras BT-003).
 *
 * ÚNICA vía autorizada para publicar un OTA. Prohibido correr `eas update`
 * directamente. Este wrapper:
 *   1. Corre el gate `preflight-ota.mjs` — si algo falla, NO publica (exit 1).
 *   2. Exige la confirmación del **dispositivo centinela** (`--sentinel`): el
 *      operador declara que ya instaló y verificó el OTA en un dispositivo
 *      interno (apertura · autenticación · consumo del backend · navegación).
 *   3. Solo entonces ejecuta `eas update` con la URL de producción explícita.
 *
 * Uso:
 *   node scripts/deploy/publish-ota.mjs --branch preview \
 *        --message "descripción" --sentinel "Pixel 7 de Yonathan — OK"
 */
import { execSync } from 'node:child_process';

const args = parseArgs(process.argv.slice(2));
const branch = args.branch || 'preview';
const message = args.message;
const sentinel = args.sentinel;
const PROD_URL = 'https://milla-backend.onrender.com/v1';

if (!message) {
  console.error('❌ Falta --message "descripción del cambio".');
  process.exit(1);
}

// Paso 1 · Gate automático ----------------------------------------------------
console.log('▶ Paso 1/3 — preflight automático');
try {
  execSync(`node scripts/deploy/preflight-ota.mjs ${branch}`, { stdio: 'inherit' });
} catch {
  console.error('🚫 Preflight falló — publicación abortada.');
  process.exit(1);
}

// Paso 2 · Dispositivo centinela ---------------------------------------------
console.log('▶ Paso 2/3 — dispositivo centinela');
if (!sentinel) {
  console.error(
    '\n🚫 Falta la verificación del dispositivo centinela.\n' +
    'Antes de publicar al resto de usuarios, instala el OTA/APK en un dispositivo\n' +
    'interno y verifica: apertura · autenticación · consumo del backend · navegación.\n' +
    'Luego repite el comando añadiendo: --sentinel "<dispositivo> — OK"\n',
  );
  process.exit(1);
}
console.log(`  ✅ Centinela declarado: ${sentinel}`);

// Paso 3 · Publicar -----------------------------------------------------------
console.log('▶ Paso 3/3 — eas update');
const fullMessage = `${message} [centinela: ${sentinel}]`;
const env = { ...process.env, EAS_NO_VCS: '1', EXPO_PUBLIC_API_URL: PROD_URL };
execSync(
  `npx eas-cli update --branch ${branch} --message ${JSON.stringify(fullMessage)} --non-interactive`,
  { stdio: 'inherit', env },
);
console.log('\n🟢 OTA publicado de forma segura.');

// --- helpers ---------------------------------------------------------------
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      out[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    }
  }
  return out;
}
