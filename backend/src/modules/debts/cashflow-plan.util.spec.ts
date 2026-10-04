import { buildCashflowPlan, orderByCashflow, PlanDebt } from './cashflow-plan.util';

const ea = (pct: number) => Math.pow(1 + pct / 100, 1 / 12) - 1;
// Caso real del Fundador (2026-09-29).
const finandina: PlanDebt = { id: 'fin', name: 'Finandina', balance: 57_755_579, payment: 1_763_632, monthlyRate: ea(28.3), annualRatePct: 28.3 };
const serfinanza: PlanDebt = { id: 'ser', name: 'Serfinanza', balance: 3_983_020, payment: 331_918, monthlyRate: 0, annualRatePct: 29.2 };
const davivienda: PlanDebt = { id: 'dav', name: 'Davivienda', balance: 63_253_744, payment: 1_043_340, monthlyRate: ea(15.4), annualRatePct: 15.4 };

describe('FIN-045 · plan para liberar flujo', () => {
  it('ordena por cuota liberada por peso: Serfinanza → Finandina → Davivienda', () => {
    expect(orderByCashflow([davivienda, finandina, serfinanza]).map((d) => d.id)).toEqual(['ser', 'fin', 'dav']);
  });

  it('empate (±2 %) en flujo → gana la tasa más alta', () => {
    const a = { id: 'a', balance: 1_000_000, payment: 100_000, annualRatePct: 20 };
    const b = { id: 'b', balance: 1_000_000, payment: 101_000, annualRatePct: 30 };
    expect(orderByCashflow([a, b]).map((d) => d.id)).toEqual(['b', 'a']);
    const c = { id: 'c', balance: 1_000_000, payment: 150_000, annualRatePct: 10 };
    expect(orderByCashflow([b, c]).map((d) => d.id)).toEqual(['c', 'b']);
  });

  it('propone la mitad de lo libre y, sin colchón, separa el 30 % para el fondo de emergencia', () => {
    const p = buildCashflowPlan({ free: 2_116_109, essential: 3_138_891, emergencyBalance: 0, debts: [finandina, serfinanza, davivienda] });
    expect(p.proposal).toBe(1_058_000);
    expect(p.toColchon).toBe(317_000);
    expect(p.toDebt).toBe(741_000);
    expect(p.colchonMonths).toBe(Math.ceil(3_138_891 / 317_000));
    expect(p.steps[0].debtId).toBe('ser');
    expect(p.firstFrees).toBe(331_918);
  });

  it('con el colchón completo, todo el abono va a la deuda', () => {
    const p = buildCashflowPlan({ free: 2_000_000, essential: 1_000_000, emergencyBalance: 1_500_000, debts: [serfinanza] });
    expect(p.toColchon).toBe(0);
    expect(p.toDebt).toBe(1_000_000);
  });

  it('el plan termina antes que pagar solo la cuota, y el rollover acelera la siguiente', () => {
    const p = buildCashflowPlan({ free: 2_116_109, essential: 3_138_891, emergencyBalance: 0, debts: [finandina, serfinanza, davivienda] });
    for (const s of p.steps) {
      expect(s.monthWithPlan).not.toBeNull();
      if (s.monthWithout !== null) expect(s.monthWithPlan!).toBeLessThanOrEqual(s.monthWithout);
    }
    const ser = p.steps[0];
    expect(ser.monthWithPlan!).toBeLessThan(ser.monthWithout!);
    const fin = p.steps[1];
    expect(fin.monthWithPlan!).toBeLessThan(fin.monthWithout!);
  });

  it('sin plata libre no inventa abono: propuesta 0 y las deudas siguen su curso', () => {
    const p = buildCashflowPlan({ free: -50_000, essential: 1_000_000, emergencyBalance: 0, debts: [serfinanza] });
    expect(p.proposal).toBe(0);
    expect(p.toDebt).toBe(0);
    expect(p.steps[0].monthWithPlan).toBe(p.steps[0].monthWithout);
  });

  it('el monto que escribe la persona reemplaza la propuesta', () => {
    const p = buildCashflowPlan({ free: 2_000_000, essential: 0, emergencyBalance: 0, debts: [serfinanza], monthlyOverride: 500_000 });
    expect(p.proposal).toBe(500_000);
    expect(p.toDebt).toBe(500_000);
  });

  it('una deuda cuya cuota no cubre el interés no se da por pagada sin abono', () => {
    const bad: PlanDebt = { id: 'x', name: 'X', balance: 10_000_000, payment: 10_000, monthlyRate: 0.02, annualRatePct: 26.8 };
    const p = buildCashflowPlan({ free: 0, essential: 0, emergencyBalance: 0, debts: [bad] });
    expect(p.steps[0].monthWithout).toBeNull();
  });

  it('FIN-061 decisión 3: muestra cuánto costaría pagar primero la de mayor tasa', () => {
    // Libera flujo: la de cuota alta y saldo bajo (tasa baja) va primero.
    const corta: PlanDebt = { id: 'c', name: 'Corta', balance: 1_000_000, payment: 500_000, monthlyRate: 0.01, annualRatePct: 12.7 };
    const cara: PlanDebt = { id: 't', name: 'Cara', balance: 5_000_000, payment: 150_000, monthlyRate: 0, annualRatePct: 28.6, compareRate: 0.021 };
    const p = buildCashflowPlan({ free: 800_000, essential: 0, emergencyBalance: 0, debts: [cara, corta] });
    expect(p.steps[0].debtId).toBe('c');
    expect(p.alternative!.sameOrder).toBe(false);
    expect(p.alternative!.interestHighestRate).toBeLessThanOrEqual(p.alternative!.interestPlan);
    expect(p.alternative!.difference).toBe(p.alternative!.interestPlan - p.alternative!.interestHighestRate);
    expect(buildCashflowPlan({ free: 800_000, essential: 0, emergencyBalance: 0, debts: [corta] }).alternative).toBeNull();
  });
});
