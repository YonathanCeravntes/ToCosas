import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { DocumentsService } from '../src/modules/documents/documents.service';

/**
 * FIN-054 · Mis documentos: permiso específico (y de salud aparte), guardar, resumen del
 * año con la deducción del 1%, borrar, exportar el .zip con enlace firmado, portabilidad.
 * Sin R2 configurado se guardan los datos (no el archivo) y el .zip trae el resumen.csv.
 */
describe('FIN-054 · Mis documentos', () => {
  let app: INestApplication;
  let base: string;
  let token = '';
  let userId = '';
  let docs: DocumentsService;
  const email = `e2e-fin054-${Date.now()}@millo.test`;

  const req = async (method: string, path: string, body?: unknown, auth = true) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(auth && token ? { Authorization: `Bearer ${token}` } : {}) },
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
    docs = app.get(DocumentsService);
    const reg = await req('POST', '/v1/auth/register', { email, password: 'Passw0rd!e2e', acceptsDataPolicy: true });
    token = reg.data.tokens.accessToken;
    userId = reg.data.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('sin permiso no se guarda nada', async () => {
    expect((await req('GET', '/v1/documents/consent')).data).toMatchObject({ accepted: false, health: false });
    const r = await docs.save(userId, { kind: 'factura', issuer: 'Éxito', total: 100_000, docDate: '2026-09-01', cufe: 'a'.repeat(96) });
    expect(r).toEqual({ saved: false, reason: 'sin_permiso' });
  });

  it('con permiso (sin salud): guarda facturas; la de salud no; el mismo CUFE no se duplica', async () => {
    expect((await req('POST', '/v1/documents/consent', { health: false })).data).toMatchObject({ accepted: true, health: false });
    const a = await docs.save(userId, { kind: 'factura', issuer: 'Éxito', issuerNit: '890.900.608-9', total: 1_000_000, docDate: '2026-09-01', cufe: 'a'.repeat(96), paymentMethod: 'tarjeta' });
    expect(a).toMatchObject({ saved: true, duplicate: false, fileStored: false });
    expect(await docs.save(userId, { kind: 'factura', issuer: 'Éxito', total: 1_000_000, cufe: 'a'.repeat(96) })).toMatchObject({ saved: true, duplicate: true });
    await docs.save(userId, { kind: 'factura', issuer: 'Claro', total: 500_000, docDate: '2026-09-20', cufe: 'b'.repeat(96), paymentMethod: 'transferencia' });
    await docs.save(userId, { kind: 'comprobante', issuer: 'Tienda', total: 300_000, docDate: '2026-09-10', paymentMethod: 'efectivo' });
    expect(await docs.save(userId, { kind: 'factura', issuer: 'Farmatodo', total: 42_300, isHealth: true, docDate: '2026-09-25' })).toEqual({ saved: false, reason: 'salud_sin_permiso' });
    await docs.save(userId, { kind: 'certificado', issuer: 'Mi empresa', certificateType: 'ingresos_retenciones', total: 60_000_000, year: 2026 });
    await docs.save(userId, { kind: 'extracto_cuenta', issuer: 'Bancolombia', total: 3_200_000, docDate: '2026-08-31' });
  });

  it('resumen del año: facturas, electrónico vs efectivo y deducción del 1%', async () => {
    const s = (await req('GET', '/v1/documents/summary?year=2026')).data;
    expect(s.counts).toEqual({ facturas: 3, extractos: 1, certificados: 1 });
    expect(s.invoices).toMatchObject({ count: 3, total: 1_800_000, electronicPaid: 1_500_000, cash: 300_000, deduction: 15_000, electronicCount: 2 });
    expect(s.filesEnabled).toBe(false);
    const list = (await req('GET', '/v1/documents?year=2026&kind=facturas')).data;
    expect(list.map((d: { issuer: string }) => d.issuer)).toEqual(['Claro', 'Tienda', 'Éxito']);
    expect(list[2]).toMatchObject({ electronic: true, paymentMethod: 'tarjeta', hasFile: false });
    expect(JSON.stringify(list)).not.toContain('storageKey');
  });

  it('sin archivo guardado, "descargar" lo explica; borrar lo quita del resumen', async () => {
    const list = (await req('GET', '/v1/documents?year=2026&kind=facturas')).data;
    const tienda = list.find((d: { issuer: string }) => d.issuer === 'Tienda');
    const dl = await req('GET', `/v1/documents/${tienda.id}/download`);
    expect(dl.status).toBe(400);
    expect((await req('DELETE', `/v1/documents/${tienda.id}`)).data).toEqual({ deleted: true });
    expect((await req('GET', '/v1/documents/summary?year=2026')).data.invoices.cash).toBe(0);
  });

  it('descargar todo: enlace firmado de 5 min → .zip con resumen.csv; enlace alterado → 404', async () => {
    const link = (await req('POST', '/v1/documents/export-link?year=2026')).data.url as string;
    expect(link).toMatch(/\/v1\/documents\/export\/.+\..+$/);
    const res = await fetch(link.replace(/^https?:\/\/[^/]+/, base));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/zip');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.subarray(0, 2).toString()).toBe('PK');
    expect(buf.includes(Buffer.from('resumen-2026.csv'))).toBe(true);
    const bad = await fetch(link.replace(/^https?:\/\/[^/]+/, base).slice(0, -3) + 'xyz');
    expect(bad.status).toBe(404);
  });

  it('portabilidad: la exportación de datos incluye los documentos (sin la llave del archivo)', async () => {
    const data = (await req('GET', '/v1/auth/me/export')).data;
    expect(Array.isArray(data.documents)).toBe(true);
    expect(data.documents.length).toBe(4);
    expect(JSON.stringify(data.documents)).not.toContain('storageKey');
  });

  it('revocar con "borrar todo" deja de guardar y borra lo guardado', async () => {
    const r = (await req('POST', '/v1/documents/consent/revoke', { deleteAll: true })).data;
    expect(r).toMatchObject({ accepted: false, deleted: 4 });
    expect((await req('GET', '/v1/documents/summary?year=2026')).data.counts).toEqual({ facturas: 0, extractos: 0, certificados: 0 });
  });
});
