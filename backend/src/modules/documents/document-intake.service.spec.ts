import { DocumentIntakeService } from './document-intake.service';
import { DocumentExtractionService } from '../messaging/document-extraction.service';

/** FIN-056 · Subir un documento desde la app: misma lectura y misma bóveda que el bot. */
describe('DocumentIntakeService (FIN-056)', () => {
  const file = { data: Buffer.from('x'), mimeType: 'image/jpeg' };

  const build = (over: { settings?: Record<string, unknown> | null; extraction?: Record<string, unknown>; match?: { id: string } | null; available?: boolean } = {}) => {
    const prisma = {
      userSettings: {
        findUnique: jest.fn().mockResolvedValue(over.settings === undefined ? { docsStorageConsentAt: new Date(), docsAiConsentAt: null } : over.settings),
        update: jest.fn().mockResolvedValue({}),
      },
      transaction: { findFirst: jest.fn().mockResolvedValue({ id: 't1' }) },
    };
    const docs = {
      save: jest.fn().mockResolvedValue({ saved: true, duplicate: false, fileStored: true, document: { id: 'd1' } }),
      findMatchingExpense: jest.fn().mockResolvedValue(over.match ?? null),
      linkTransaction: jest.fn().mockResolvedValue(undefined),
    };
    const extractor = {
      isAvailable: () => over.available ?? true,
      extract: jest.fn().mockResolvedValue({
        kind: 'factura_electronica',
        merchant: 'Éxito',
        amount: 186_400,
        occurredAt: '2026-09-28',
        cufe: 'abc',
        paymentMethod: 'tarjeta',
        confidence: 0.9,
        ...over.extraction,
      }),
    };
    const moduleRef = { get: jest.fn((t: unknown) => (t === DocumentExtractionService ? extractor : null)) };
    const svc = new DocumentIntakeService(prisma as never, docs as never, moduleRef as never);
    return { svc, prisma, docs, extractor };
  };

  it('sin permiso de Mis documentos no lee ni guarda nada', async () => {
    const { svc, extractor } = build({ settings: { docsStorageConsentAt: null } });
    expect(await svc.intake('u1', file)).toEqual({ status: 'sin_permiso' });
    expect(extractor.extract).not.toHaveBeenCalled();
  });

  it('con permiso: lee, guarda (source app), activa la lectura con IA y propone el gasto', async () => {
    const { svc, prisma, docs } = build();
    const r = await svc.intake('u1', file);
    expect(r.status).toBe('guardado');
    if (r.status !== 'guardado') return;
    expect(docs.save.mock.calls[0][1]).toMatchObject({ kind: 'factura', issuer: 'Éxito', total: 186_400, paymentMethod: 'tarjeta', source: 'app' });
    expect(prisma.userSettings.update).toHaveBeenCalledWith({ where: { userId: 'u1' }, data: { docsAiConsentAt: expect.any(Date) } });
    expect(r.proposal).toMatchObject({ amount: 186_400, merchant: 'Éxito', occurredAt: '2026-09-28', alreadyRegistered: false });
    expect(r.summary).toContain('Guardé tu factura electrónica de Éxito por $186.400');
  });

  it('si el gasto ya estaba registrado, lo enlaza y no lo propone de nuevo', async () => {
    const { svc, docs } = build({ match: { id: 't9' } });
    const r = await svc.intake('u1', file);
    expect(docs.linkTransaction).toHaveBeenCalledWith('u1', 'd1', 't9');
    expect(r.status === 'guardado' && r.proposal?.alreadyRegistered).toBe(true);
  });

  it('documento no reconocido, IA apagada o formato raro: lo dice sin guardar', async () => {
    expect(await build({ extraction: { kind: 'desconocido', confidence: 0.1, notes: 'borrosa' } }).svc.intake('u1', file)).toEqual({ status: 'no_reconocido', notes: 'borrosa' });
    expect(await build({ available: false }).svc.intake('u1', file)).toEqual({ status: 'ia_no_disponible' });
    expect(await build().svc.intake('u1', { data: Buffer.from('x'), mimeType: 'text/plain' })).toEqual({ status: 'formato_no_soportado' });
  });

  it('link solo enlaza movimientos de la persona', async () => {
    const { svc, prisma, docs } = build();
    expect(await svc.link('u1', 'd1', 't1')).toEqual({ linked: true });
    expect(docs.linkTransaction).toHaveBeenCalledWith('u1', 'd1', 't1');
    prisma.transaction.findFirst.mockResolvedValue(null);
    expect(await svc.link('u1', 'd1', 'ajeno')).toEqual({ linked: false });
  });
});
