/**
 * INFRA-001 · Comprobaciones de arranque y CORS (funciones puras, con pruebas).
 */

/** Valores de desarrollo que NUNCA pueden firmar sesiones en producción. */
const WEAK_SECRETS = new Set(['', 'dev-access-secret', 'dev-refresh-secret', 'cambia-esto', 'cambia-esto-tambien', 'secret', 'changeme']);

export function assertProductionConfig(env: Record<string, string | undefined>): void {
  if (env.NODE_ENV !== 'production') return;
  const problems: string[] = [];
  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    const v = (env[key] ?? '').trim();
    if (WEAK_SECRETS.has(v) || v.length < 32) problems.push(`${key} falta o es débil (mínimo 32 caracteres aleatorios)`);
  }
  if (env.JWT_ACCESS_SECRET && env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    problems.push('JWT_ACCESS_SECRET y JWT_REFRESH_SECRET deben ser distintos');
  }
  if (!env.DATABASE_URL) problems.push('DATABASE_URL falta');
  if (problems.length) {
    throw new Error(`Configuración de producción insegura: ${problems.join('; ')}. Corrígela en el panel de Render.`);
  }
}

/** Orígenes de navegador permitidos por defecto: la web de Millo y desarrollo local. */
export const DEFAULT_CORS_ORIGINS = ['https://yonathanceravntes.github.io', 'http://localhost:8081', 'http://localhost:19006'];

export function allowedOrigins(raw: string | undefined): string[] {
  const list = (raw ?? '').split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
  return list.length ? list : DEFAULT_CORS_ORIGINS;
}

/**
 * Sin `Origin` (app nativa, webhooks de Telegram/WhatsApp/RevenueCat, cron) se permite: CORS
 * es una regla de navegadores. Con `Origin`, solo los de la lista.
 */
export function corsOriginCheck(raw: string | undefined) {
  const allowed = new Set(allowedOrigins(raw));
  return (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return cb(null, true);
    cb(null, allowed.has(origin.replace(/\/$/, '')));
  };
}
