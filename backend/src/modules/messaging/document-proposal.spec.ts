import { applyFix, describeProposal, installmentsFor, monthlyToEA, parseReply, toProposal } from './document-proposal';
import { normalize } from './document-extraction.service';

/**
 * FIN-042 · Capa pura de propuestas: lo que el usuario ve y cómo se interpreta su
 * respuesta. Sin IA ni BD.
 */
describe('FIN-042 · document-proposal', () => {
  it('extracto de tarjeta → propuesta con cuotas que igualan el pago del mes', () => {
    const p = toProposal({
      kind: 'extracto_tarjeta',
      entityName: 'Davivienda',
      productLabel: 'Tarjeta Visa',
      balance: 2_350_000,
      creditLimit: 4_000_000,
      availableCredit: 1_650_000,
      minimumPayment: 120_000,
      totalPayment: 235_000,
      monthlyRate: 2.1,
      dueDate: '2026-10-15',
      confidence: 0.9,
    });
    expect(p?.kind).toBe('extracto_tarjeta');
    if (p?.kind !== 'extracto_tarjeta') throw new Error('kind');
    expect(p.name).toBe('Davivienda · Tarjeta Visa');
    expect(p.monthlyPayment).toBe(235_000);
    expect(p.installments).toBe(10); // 2.350.000 / 235.000
    expect(p.paymentDay).toBe(15);
    expect(p.annualEffectiveRate).toBeCloseTo(monthlyToEA(2.1), 6);
    const text = describeProposal(p);
    expect(text).toContain('$2.350.000');
    expect(text).toContain('10 cuotas');
    expect(text).toContain('¿Creo esta deuda');
  });

  it('sin pago conocido reparte en 12; cuotas acotadas a [1, 36]', () => {
    expect(installmentsFor(1_000_000, null)).toBe(12);
    expect(installmentsFor(1_000_000, 10)).toBe(36);
    expect(installmentsFor(100, 1_000_000)).toBe(1);
  });

  it('comprobante → gasto con fecha del documento', () => {
    const p = toProposal({ kind: 'comprobante', merchant: 'Éxito', amount: 45_000, occurredAt: '2026-09-27', confidence: 0.8 });
    expect(p).toEqual({ kind: 'comprobante', amount: 45_000, merchant: 'Éxito', occurredAt: '2026-09-27' });
    expect(describeProposal(p!)).toContain('¿Lo registro?');
  });

  it('desconocido o sin datos → null (nunca se propone en falso)', () => {
    expect(toProposal({ kind: 'desconocido', confidence: 0.2 })).toBeNull();
    expect(toProposal({ kind: 'extracto_tarjeta', confidence: 0.9 })).toBeNull();
    expect(toProposal({ kind: 'comprobante', amount: 0, confidence: 0.9 })).toBeNull();
  });

  it('parseReply: sí / no / correcciones con formato regional', () => {
    expect(parseReply('Sí')).toEqual({ type: 'yes' });
    expect(parseReply('dale')).toEqual({ type: 'yes' });
    expect(parseReply('no')).toEqual({ type: 'no' });
    expect(parseReply('cuota 180.000')).toEqual({ type: 'fix', field: 'cuota', value: 180_000 });
    expect(parseReply('tasa 28,5')).toEqual({ type: 'fix', field: 'tasa', value: 28.5 });
    expect(parseReply('nombre Visa Davivienda')).toEqual({ type: 'fix', field: 'nombre', value: 'Visa Davivienda' });
    expect(parseReply('día 15')).toEqual({ type: 'fix', field: 'dia', value: 15 });
    expect(parseReply('resumen')).toEqual({ type: 'other' });
  });

  it('applyFix recalcula cuotas al cambiar saldo o cuota, y rechaza campos ajenos', () => {
    const base = toProposal({ kind: 'extracto_tarjeta', balance: 1_000_000, totalPayment: 100_000, confidence: 0.9 });
    if (base?.kind !== 'extracto_tarjeta') throw new Error('kind');
    expect(base.installments).toBe(10);
    const r1 = applyFix(base, 'cuota', 250_000);
    expect('proposal' in r1 && r1.proposal.kind === 'extracto_tarjeta' && r1.proposal.installments).toBe(4);
    const r2 = applyFix(base, 'saldo', 500_000);
    expect('proposal' in r2 && r2.proposal.kind === 'extracto_tarjeta' && r2.proposal.installments).toBe(5);
    const receipt = toProposal({ kind: 'comprobante', amount: 10_000, confidence: 0.9 })!;
    expect('error' in applyFix(receipt, 'cupo', 5)).toBe(true);
    expect('proposal' in applyFix(receipt, 'fecha', '2026-09-01')).toBe(true);
  });

  it('normalize sanea la salida del modelo (tipos, rangos, formatos)', () => {
    const n = normalize({ kind: 'extracto_tarjeta', balance: '2.350.000', confidence: 7, dueDate: '15/10/2026', notes: 'x'.repeat(500) });
    expect(n.kind).toBe('extracto_tarjeta');
    expect(n.balance).toBe(2350000);
    expect(n.confidence).toBe(1);
    expect(n.dueDate).toBeNull();
    expect(n.notes?.length).toBe(120);
    expect(normalize({ kind: 'lo que sea', confidence: 0.5 }).kind).toBe('desconocido');
  });
});
