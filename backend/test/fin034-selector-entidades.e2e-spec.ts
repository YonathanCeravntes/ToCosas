import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

/**
 * FIN-034 (DEC-0034) · Selector moderno + motor de entidades. Verifica las 3
 * condiciones de cierre del Auditor contra app + BD reales:
 *  (§3.1) la búsqueda es reconocimiento, no recomendación (sin score/rank; camino
 *         libre siempre existe);
 *  (§3.2) la tasa que el usuario confirma en el alta GANA sobre `typicalRate`;
 *  (§3.3) elegir una entidad NUNCA bloquea cambiar el tipo inferido.
 * Más: catálogo global sembrado y buscable; gate DPA+PIA (búsqueda determinista).
 *
 * Ejecución: `npm run test:e2e` (requiere el Postgres de docker levantado).
 */
describe('FIN-034 · selector moderno + entidades (Independencia, §32)', () => {
  let app: INestApplication;
  let base: string;
  let token: string;

  const req = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      /* sin cuerpo */
    }
    return { status: res.status, data };
  };

  const createDebt = (body: Record<string, unknown>) =>
    req('POST', '/v1/debts', { startDate: '2026-06-15', rateBasis: 'EA', ...body });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    await app.listen(0);
    base = (await app.getUrl()).replace('[::1]', '127.0.0.1');

    const reg = await req('POST', '/v1/auth/register', {
      email: `e2e-fin034-${Date.now()}@millo.test`,
      password: 'Passw0rd!e2e',
    });
    token = reg.data.tokens.accessToken;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('catálogo global sembrado y buscable: "nu" → Nu (fintech, sugiere fintech)', async () => {
    const { status, data } = await req('GET', '/v1/entities?q=nu');
    expect(status).toBe(200);
    const nu = data.find((e: { name: string }) => e.name.startsWith('Nu'));
    expect(nu).toBeDefined();
    expect(nu.isGlobal).toBe(true);
    expect(nu.suggestedDebtType).toBe('fintech');
  });

  it('§3.1 Independencia: reconocimiento sin ranking (cero score/rank/recommended)', async () => {
    const { data } = await req('GET', '/v1/entities?q=banco');
    expect(data.length).toBeGreaterThan(0);
    for (const e of data) {
      expect(e).not.toHaveProperty('score');
      expect(e).not.toHaveProperty('rank');
      expect(e).not.toHaveProperty('recommended');
    }
  });

  it('§3.1 camino libre: sin entidad del catálogo, la deuda igual se crea', async () => {
    const c = await createDebt({
      name: 'Préstamo de un amigo (no catalogado)', debtType: 'prestamo_familiar',
      originalAmount: 300_000, currentBalance: 300_000, monthlyPayment: 50_000,
    });
    expect(c.status).toBe(201);
    expect(c.data.debt.entityId).toBeNull(); // nadie queda bloqueado por el catálogo
  });

  it('§3.2 la tasa que el usuario confirma GANA sobre typicalRate de la entidad', async () => {
    const nu = (await req('GET', '/v1/entities?q=Nu')).data.find((e: { name: string }) => e.name.startsWith('Nu'));
    expect(Number(nu.typicalRate)).toBeGreaterThan(0); // la entidad trae una pista
    // El usuario edita la tasa a 15 (≠ la pista de la entidad).
    const c = await createDebt({
      name: 'Mi tarjeta Nu', debtType: 'fintech', entityId: nu.id,
      originalAmount: 0, currentBalance: 0, creditLimit: 2_000_000, interestRate: 15,
    });
    expect(c.status).toBe(201);
    const { data } = await req('GET', `/v1/debts/${c.data.debt.id}`);
    expect(Number(data.interestRate)).toBe(15); // el valor del usuario, NUNCA el typicalRate
    expect(data.entityId).toBe(nu.id);
  });

  it('§3.3 elegir una entidad NUNCA bloquea el tipo: un banco vale para varios productos', async () => {
    const banco = (await req('GET', '/v1/entities?q=Bancolombia')).data[0];
    expect(banco.suggestedDebtType).toBeNull(); // un banco no impone tipo
    const hip = await createDebt({
      name: 'Hipoteca Bancolombia', debtType: 'hipotecario', entityId: banco.id,
      originalAmount: 100_000_000, currentBalance: 100_000_000, termMonths: 180, interestRate: 11,
    });
    const per = await createDebt({
      name: 'Crédito Bancolombia', debtType: 'credito_personal', entityId: banco.id,
      originalAmount: 5_000_000, currentBalance: 5_000_000, termMonths: 24, interestRate: 22,
    });
    expect(hip.status).toBe(201);
    expect(per.status).toBe(201);
    // La MISMA entidad sostiene dos tipos distintos — no hay acople entidad→tipo.
    expect(hip.data.debt.debtType).toBe('hipotecario');
    expect(per.data.debt.debtType).toBe('credito_personal');
  });

  it('recencia/pertenencia: mi propia entidad va antes que las globales', async () => {
    await req('POST', '/v1/entities', { name: 'Banco de la Esquina (mío)', type: 'banco' });
    const { data } = await req('GET', '/v1/entities?q=Banco');
    expect(data[0].name).toBe('Banco de la Esquina (mío)');
    expect(data[0].isGlobal).toBe(false);
  });
});
