import {
  cushionTiers,
  incomeKindOf,
  monthlySetAside,
  monthsUntil,
  nextWindfallDate,
  percentile25,
  stableVariableIncome,
  windfallView,
} from './year-plan.util';

const d = (s: string) => new Date(`${s}T12:00:00Z`);

describe('FIN-061 2.5 · plata del año', () => {
  it('gastos grandes: se reparten entre los meses que faltan', () => {
    expect(monthsUntil(3, d('2026-10-04'))).toBe(5); // oct, nov, dic, ene, feb
    expect(monthlySetAside(620_000, 3, d('2026-10-04'))).toBe(124_000);
    expect(monthsUntil(10, d('2026-10-04'))).toBe(1); // es este mes
    expect(monthsUntil(12, d('2026-10-04'))).toBe(2);
  });

  it('ingreso irregular: el mes flojo de 6, nunca más que lo estimado', () => {
    expect(percentile25([1, 2, 3, 4, 5])).toBe(2);
    expect(stableVariableIncome(2_000_000, [800_000, 2_500_000, 1_500_000, 3_000_000, 1_200_000, 2_200_000])).toEqual({ amount: 1_275_000, source: 'mes_flojo' });
    expect(stableVariableIncome(1_000_000, [3_000_000, 3_000_000, 3_000_000]).amount).toBe(1_000_000);
    expect(stableVariableIncome(1_000_000, [500_000, 600_000])).toEqual({ amount: 1_000_000, source: 'estimado' });
  });

  it('primas: fechas, aviso 30 días antes y reparto 60/20/20 que suma exacto', () => {
    expect(nextWindfallDate('prima_diciembre', d('2026-10-04')).toISOString().slice(0, 10)).toBe('2026-12-20');
    expect(nextWindfallDate('prima_junio', d('2026-10-04')).toISOString().slice(0, 10)).toBe('2027-06-30');
    expect(nextWindfallDate('intereses_cesantias', d('2026-10-04')).toISOString().slice(0, 10)).toBe('2027-01-31');
    const v = windfallView('prima_diciembre', 2_500_001, null, d('2026-11-25'));
    expect(v.planNow).toBe(true);
    expect(v.toDebt! + v.toCushion! + v.free!).toBe(2_500_001);
    expect(windfallView('prima_diciembre', 2_500_000, null, d('2026-10-04')).planNow).toBe(false);
    expect(windfallView('prima_junio', null, null, d('2026-10-04')).toDebt).toBeNull();
  });

  it('colchón por escalones: 1 → 3 (asalariado con prima) → 6 (independiente o único ingreso)', () => {
    const a = cushionTiers({ essentialMonthly: 5_625_890, saved: 220_000, incomeKind: 'asalariado_con_prima', onlyIncomeOfHousehold: false });
    expect(a.tiers.map((t) => t.months)).toEqual([1, 3]);
    expect(a.current).toBe(1);
    expect(a.progress).toBeCloseTo(0.039, 3);
    const b = cushionTiers({ essentialMonthly: 1_000_000, saved: 1_500_000, incomeKind: 'independiente', onlyIncomeOfHousehold: false });
    expect(b.tiers.map((t) => t.months)).toEqual([1, 3, 6]);
    expect(b.current).toBe(2);
    expect(b.progress).toBe(0.25);
    expect(cushionTiers({ essentialMonthly: 1_000_000, saved: 7_000_000, incomeKind: 'variable', onlyIncomeOfHousehold: false }).current).toBeNull();
  });

  it('cómo le llega la plata', () => {
    expect(incomeKindOf([{ kind: 'salario_fijo', isVariable: false, receivesPrima: true, amount: 5 }], 'empleado')).toBe('asalariado_con_prima');
    expect(incomeKindOf([{ kind: 'honorarios', isVariable: true, receivesPrima: false, amount: 5 }], null)).toBe('variable');
    expect(incomeKindOf([{ kind: 'salario_fijo', isVariable: false, receivesPrima: false, amount: 5 }], 'independiente')).toBe('independiente');
  });
});
