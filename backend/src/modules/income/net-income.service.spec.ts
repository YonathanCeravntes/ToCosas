import { NetIncomeService } from './net-income.service';

/**
 * FIN-027 · Caso a mano del ARQ-0027 §13.2: salario fijo 4.000.000 + comisiones
 * variables (estimado) 800.000; deducciones salud 4% sobre TOTAL (retenida) y
 * pensión 4% sobre una base PARCIAL de 2.500.000, pagada por la usuaria
 * (independiente) — el requisito duro del Fundador (base configurable).
 */
describe('NetIncomeService (FIN-027, GOBERNANZA §32)', () => {
  const prismaWith = (sources: unknown[]) =>
    ({ incomeSource: { findMany: jest.fn().mockResolvedValue(sources) } }) as never;

  const source = (over: Record<string, unknown>) => ({
    amount: 4_000_000,
    isVariable: false,
    dayOfMonth: 15,
    deductions: [],
    ...over,
  });

  it('caso a mano: base TOTAL vs PARCIAL producen netos distintos correctos', async () => {
    const svc = new NetIncomeService(
      prismaWith([
        source({
          deductions: [
            { name: 'Salud', kind: 'salud', percent: 4, fixedAmount: null, base: 'total', baseAmount: null, withheldAtSource: true },
            { name: 'Pensión', kind: 'pension', percent: 4, fixedAmount: null, base: 'parcial', baseAmount: 2_500_000, withheldAtSource: false },
          ],
        }),
      ]),
    );
    const r = await svc.compute('u1');
    // Salud: 4% de 4.000.000 = 160.000. Pensión: 4% de 2.500.000 (parcial) = 100.000.
    expect(r.grossFixedTotal).toBe(4_000_000);
    expect(r.netFixedTotal).toBe(3_740_000); // 4M − 160k − 100k
    expect(r.selfPaidDeductionsTotal).toBe(100_000); // solo la pensión (withheldAtSource=false)
    expect(r.hasDeductions).toBe(true);
  });

  it('fuentes fijas y variables COEXISTEN: la variable es estimado, no se deduce', async () => {
    const svc = new NetIncomeService(
      prismaWith([
        source({ amount: 4_000_000 }),
        source({ amount: 800_000, isVariable: true, deductions: [{ name: 'x', percent: 10, fixedAmount: null, base: 'total', baseAmount: null, withheldAtSource: true }] }),
      ]),
    );
    const r = await svc.compute('u1');
    expect(r.grossFixedTotal).toBe(4_000_000);
    expect(r.grossVariableEstimate).toBe(800_000);
    expect(r.netFixedTotal).toBe(4_000_000); // sin deducciones en la fija
    expect(r.netMonthlyEstimate).toBe(4_800_000); // neto fijo + variable estimado
  });

  it('deducción por monto FIJO (no porcentual)', async () => {
    const svc = new NetIncomeService(
      prismaWith([
        source({
          deductions: [{ name: 'Otra', kind: 'otra', percent: null, fixedAmount: 50_000, base: 'total', baseAmount: null, withheldAtSource: true }],
        }),
      ]),
    );
    expect((await svc.compute('u1')).netFixedTotal).toBe(3_950_000);
  });

  it('regresión: sin fuentes configuradas, todos los totales son 0 (mismo comportamiento legado)', async () => {
    const svc = new NetIncomeService(prismaWith([]));
    const r = await svc.compute('u1');
    expect(r).toMatchObject({
      grossFixedTotal: 0,
      grossVariableEstimate: 0,
      netFixedTotal: 0,
      netMonthlyEstimate: 0,
      selfPaidDeductionsTotal: 0,
      hasDeductions: false,
    });
  });
});
