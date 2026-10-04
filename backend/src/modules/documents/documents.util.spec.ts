import { deductionSummary, downloadName, looksHealth, uvtFor } from './documents.util';

describe('FIN-054 · reglas de Mis documentos', () => {
  it('deducción del 1%: solo facturas electrónicas pagadas con tarjeta o transferencia', () => {
    const s = deductionSummary(
      [
        { total: 1_000_000, hasCufe: true, paymentMethod: 'tarjeta' },
        { total: 500_000, hasCufe: true, paymentMethod: 'transferencia' },
        { total: 300_000, hasCufe: true, paymentMethod: 'efectivo' }, // efectivo: no cuenta
        { total: 200_000, hasCufe: false, paymentMethod: 'tarjeta' }, // sin CUFE: no es factura electrónica
      ],
      2026,
    );
    expect(s).toMatchObject({ count: 4, total: 2_000_000, electronicPaid: 1_500_000, cash: 300_000, unknown: 200_000, deduction: 15_000 });
  });

  it('el tope es 240 UVT del año de la deducción', () => {
    const s = deductionSummary([{ total: 5_000_000_000, hasCufe: true, paymentMethod: 'tarjeta' }], 2025);
    expect(s.deduction).toBe(240 * 49_799);
    expect(uvtFor(2026)).toBe(52_374);
  });

  it('reconoce facturas de salud (dato sensible)', () => {
    expect(looksHealth('Farmatodo')).toBe(true);
    expect(looksHealth('Droguería La Economía')).toBe(true);
    expect(looksHealth('Éxito')).toBe(false);
  });

  it('nombre de descarga legible', () => {
    expect(downloadName({ kind: 'factura', issuer: 'Éxito S.A.', docDate: new Date('2026-09-28T00:00:00Z'), mimeType: 'application/pdf' }))
      .toBe('2026-09-28 Factura Éxito S.A.pdf');
    expect(downloadName({ kind: 'extracto_cuenta', issuer: null, docDate: null, mimeType: 'image/jpeg' })).toBe('sin-fecha Extracto cuenta.jpg');
  });
});
