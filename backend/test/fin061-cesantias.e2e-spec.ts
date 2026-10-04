import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

/**
 * FIN-061 · Cesantías (Fundador, 2026-10-04): hacen parte del patrimonio, pero no son
 * plata disponible; solo se retiran para vivienda, educación o al terminar el contrato.
 */
describe('FIN-061 · Cesantías como patrimonio no disponible', () => {
  let app: INestApplication;
  let base: string;
  let token = '';
  const req = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data: any = null;
    try { data = await res.json(); } catch { /* sin cuerpo */ }
    return { status: res.status, data };
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    await app.listen(0);
    base = (await app.getUrl()).replace('[::1]', '127.0.0.1');
    const r = await fetch(`${base}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `e2e-fin061-${Date.now()}@millo.test`, password: 'Passw0rd!e2e', fullName: 'Cesantías Prueba', acceptsDataPolicy: true }),
    });
    token = (await r.json()).tokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('suman al patrimonio pero no a lo líquido ni al fondo de emergencia, aunque se pidan líquidas', async () => {
    const c = await req('POST', '/v1/assets', { name: 'Cesantías Porvenir', type: 'cesantias', currentValue: 8_000_000, isLiquid: true });
    expect(c.status).toBe(201);
    expect(c.data.isLiquid).toBe(false);
    const nw = await req('GET', '/v1/net-worth');
    expect(nw.status).toBe(200);
    expect(nw.data.netWorth).toBe(8_000_000);
    expect(nw.data.totalLiquid).toBe(0);
    expect(nw.data.totalEmergencyFund).toBe(0);
    expect(nw.data.assets[0].type).toBe('cesantias');
  });

  it('editarlas no las vuelve líquidas', async () => {
    const list = await req('GET', '/v1/assets');
    const id = list.data[0].id;
    const u = await req('PATCH', `/v1/assets/${id}`, { isLiquid: true, currentValue: 9_000_000 });
    expect(u.status).toBe(200);
    expect(u.data.isLiquid).toBe(false);
  });
});
