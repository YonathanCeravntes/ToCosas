import { allowedOrigins, assertProductionConfig, corsOriginCheck, DEFAULT_CORS_ORIGINS } from './bootstrap.util';

const strong = 'a'.repeat(40);
const strong2 = 'b'.repeat(40);

describe('INFRA-001 · arranque seguro', () => {
  it('fuera de producción no exige nada', () => {
    expect(() => assertProductionConfig({ NODE_ENV: 'development' })).not.toThrow();
  });

  it('en producción rechaza secretos de desarrollo, cortos, iguales o sin base de datos', () => {
    expect(() => assertProductionConfig({ NODE_ENV: 'production', DATABASE_URL: 'x', JWT_ACCESS_SECRET: 'dev-access-secret', JWT_REFRESH_SECRET: strong })).toThrow(/JWT_ACCESS_SECRET/);
    expect(() => assertProductionConfig({ NODE_ENV: 'production', DATABASE_URL: 'x', JWT_ACCESS_SECRET: 'corto', JWT_REFRESH_SECRET: strong })).toThrow(/débil/);
    expect(() => assertProductionConfig({ NODE_ENV: 'production', DATABASE_URL: 'x', JWT_ACCESS_SECRET: strong, JWT_REFRESH_SECRET: strong })).toThrow(/distintos/);
    expect(() => assertProductionConfig({ NODE_ENV: 'production', JWT_ACCESS_SECRET: strong, JWT_REFRESH_SECRET: strong2 })).toThrow(/DATABASE_URL/);
    expect(() => assertProductionConfig({ NODE_ENV: 'production', DATABASE_URL: 'x', JWT_ACCESS_SECRET: strong, JWT_REFRESH_SECRET: strong2 })).not.toThrow();
  });
});

describe('INFRA-001 · CORS', () => {
  const run = (raw: string | undefined, origin: string | undefined) =>
    new Promise<boolean | undefined>((resolve) => corsOriginCheck(raw)(origin, (_e, ok) => resolve(ok)));

  it('sin Origin (app nativa, webhooks) se permite', async () => {
    expect(await run(undefined, undefined)).toBe(true);
  });

  it('por defecto solo la web de Millo y desarrollo local', async () => {
    expect(allowedOrigins(undefined)).toEqual(DEFAULT_CORS_ORIGINS);
    expect(await run(undefined, 'https://yonathanceravntes.github.io')).toBe(true);
    expect(await run(undefined, 'https://evil.example')).toBe(false);
  });

  it('CORS_ORIGINS reemplaza la lista (con o sin barra final)', async () => {
    expect(await run('https://millo.app/, https://www.millo.app', 'https://millo.app')).toBe(true);
    expect(await run('https://millo.app', 'https://yonathanceravntes.github.io')).toBe(false);
  });
});
