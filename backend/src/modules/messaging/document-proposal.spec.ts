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
    expect(p.monthlyPayment).toBe(120_000); // BT-017: manda el pago mínimo, no el total
    expect(p.installments).toBe(20); // 2.350.000 / 120.000
    expect(p.paymentDay).toBe(15);
    expect(p.annualEffectiveRate).toBeCloseTo(monthlyToEA(2.1), 6);
    const text = describeProposal(p);
    expect(text).toContain('$2.350.000');
    expect(text).toContain('20 cuotas');
    expect(text).toContain('¿Creo esta deuda');
  });

  it('BT-017: "pago total" igual al saldo no es cuota mensual → sin pago conocido (12 cuotas)', () => {
    const p = toProposal({ kind: 'extracto_tarjeta', balance: 3_983_020, totalPayment: 3_983_020, confidence: 0.9 });
    if (p?.kind !== 'extracto_tarjeta') throw new Error('kind');
    expect(p.installments).toBe(12);
    const q = toProposal({ kind: 'extracto_tarjeta', balance: 3_983_020, minimumPayment: 250_000, totalPayment: 3_983_020, confidence: 0.9 });
    if (q?.kind !== 'extracto_tarjeta') throw new Error('kind');
    expect(q.monthlyPayment).toBe(250_000);
    expect(q.installments).toBe(16);
  });

  it('cuota de manejo (Fundador 2026-10-02): se lee, se propone como cargo aparte y se corrige con "manejo"', () => {
    const x = normalize({ kind: 'extracto_tarjeta', balance: '3.983.020', minimumPayment: 250000, handlingFee: '32.900', confidence: 0.9 });
    expect(x.handlingFee).toBe(32_900);
    const p = toProposal(x);
    if (p?.kind !== 'extracto_tarjeta') throw new Error('kind');
    expect(p.handlingFee).toBe(32_900);
    expect(describeProposal(p)).toContain('Cuota de manejo: $32.900 al mes');
    // Corrección: un valor nuevo, o 0 para quitarla.
    const r1 = applyFix(p, 'manejo', 29_900);
    expect('proposal' in r1 && r1.proposal.kind === 'extracto_tarjeta' ? r1.proposal.handlingFee : null).toBe(29_900);
    expect(parseReply('cuota de manejo 29.900')).toEqual({ type: 'fix', field: 'manejo', value: 29_900 });
    const r0 = applyFix(p, 'manejo', 0);
    expect('proposal' in r0 && r0.proposal.kind === 'extracto_tarjeta' ? r0.proposal.handlingFee : 'x').toBeNull();
    // Una "cuota de manejo" de 900.000 no es plausible: lectura errada, se ignora.
    const q = toProposal({ kind: 'extracto_tarjeta', balance: 1_000_000, handlingFee: 900_000, confidence: 0.9 });
    if (q?.kind !== 'extracto_tarjeta') throw new Error('kind');
    expect(q.handlingFee).toBeNull();
    expect(describeProposal(q)).not.toContain('Cuota de manejo');
  });

  it('sin pago conocido reparte en 12; cuotas acotadas a [1, 36]', () => {
    expect(installmentsFor(1_000_000, null)).toBe(12);
    expect(installmentsFor(1_000_000, 10)).toBe(36);
    expect(installmentsFor(100, 1_000_000)).toBe(1);
  });

  it('extracto de crédito Davivienda (caso real 2026-09-28): saldo, cuota, cuotas y fecha correctos, sin avisos', () => {
    const p = toProposal(
      {
        kind: 'extracto_credito',
        entityName: 'Davivienda',
        productLabel: 'Crédito de libre inversión',
        balance: 63_253_743.76,
        totalPayment: 932_000,
        paidInstallments: 11,
        remainingInstallments: 109,
        termMonths: 120,
        annualEffectiveRate: 15.39,
        dueDate: '2026-10-02',
        periodPaid: 1_043_000,
        confidence: 0.9,
      },
      new Date('2026-09-28T12:00:00Z'),
    );
    if (p?.kind !== 'extracto_credito') throw new Error('kind');
    expect(p.balance).toBe(63_253_744);
    expect(p.monthlyPayment).toBe(932_000);
    expect(p.remainingInstallments).toBe(109);
    expect(p.paymentDay).toBe(2);
    expect(p.warnings).toEqual([]);
    const text = describeProposal(p);
    expect(text).toContain('11 pagadas · 109 restantes · plazo 120');
    expect(text).toContain('Próximo pago: 2026-10-02');
  });

  it('extracto de crédito con lecturas incoherentes: avisa y descarta la fecha imposible', () => {
    const p = toProposal(
      { kind: 'extracto_credito', balance: 1_043_000, totalPayment: 932_000, paidInstallments: 11, remainingInstallments: 11, termMonths: 120, dueDate: '2023-10-30', confidence: 0.7 },
      new Date('2026-09-28T12:00:00Z'),
    );
    if (p?.kind !== 'extracto_credito') throw new Error('kind');
    expect(p.dueDate).toBeNull();
    expect(p.remainingInstallments).toBe(109); // plazo 120 − 11 pagadas, no el 11 leído
    expect(p.warnings.length).toBe(3);
    expect(describeProposal(p)).toContain('⚠️ Revisa');
    const step = applyFix(p, 'restantes', 109) as { proposal: typeof p };
    const fixed = applyFix(step.proposal, 'vence', '2026-10-02');
    expect('proposal' in fixed && fixed.proposal.kind === 'extracto_credito' && fixed.proposal.paymentDay).toBe(2);
  });

  it('comprobante → gasto con fecha del documento', () => {
    const p = toProposal({ kind: 'comprobante', merchant: 'Éxito', amount: 45_000, occurredAt: '2026-09-27', confidence: 0.8 });
    expect(p).toEqual({ kind: 'comprobante', amount: 45_000, merchant: 'Éxito', occurredAt: '2026-09-27', electronic: false });
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
    expect(parseReply('Cuota restante: 109')).toEqual({ type: 'fix', field: 'restantes', value: 109 });
    expect(parseReply('cuotas restantes 109')).toEqual({ type: 'fix', field: 'restantes', value: 109 });
    expect(parseReply('plazo 120')).toEqual({ type: 'fix', field: 'plazo', value: 120 });
    expect(parseReply('vence 2026-10-02')).toEqual({ type: 'fix', field: 'vence', value: '2026-10-02' });
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
