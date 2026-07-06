import { AmortizationService } from './amortization.service';
import { AmortizationInput } from './amortization.types';
import { round2 } from '../../../common/money.util';

/** Suma capital programado + abono extra de todas las cuotas. */
function totalPrincipal(entries: { principalPart: number; extraPayment: number }[]): number {
  return round2(
    entries.reduce((acc, e) => acc + e.principalPart + e.extraPayment, 0),
  );
}

describe('AmortizationService', () => {
  let service: AmortizationService;
  const startDate = new Date(Date.UTC(2026, 6, 5)); // 2026-07-05

  beforeEach(() => {
    service = new AmortizationService();
  });

  describe('computeMonthlyPayment', () => {
    it('sistema francés: P=1.000.000, i=1% mensual, n=12 → ~88.849', () => {
      const payment = service.computeMonthlyPayment(1_000_000, 0.01, 12);
      expect(payment).toBeCloseTo(88_848.79, 0);
    });

    it('tasa 0 → cuota = P/n', () => {
      expect(service.computeMonthlyPayment(1_200_000, 0, 12)).toBe(100_000);
    });

    it('lanza error con plazo 0', () => {
      expect(() => service.computeMonthlyPayment(1000, 0.01, 0)).toThrow();
    });
  });

  describe('buildSchedule (sistema francés)', () => {
    const input: AmortizationInput = {
      principal: 1_000_000,
      interestRate: 12.6825, // ≈ 1% mensual efectivo
      rateBasis: 'EA',
      termMonths: 12,
      startDate,
    };

    it('genera exactamente termMonths cuotas', () => {
      const res = service.buildSchedule(input);
      expect(res.numberOfPayments).toBe(12);
      expect(res.entries).toHaveLength(12);
    });

    it('la última cuota cierra el saldo en 0', () => {
      const res = service.buildSchedule(input);
      expect(res.entries[res.entries.length - 1].closingBalance).toBe(0);
    });

    it('la suma de capital reconstruye el principal (sin fugas de redondeo)', () => {
      const res = service.buildSchedule(input);
      expect(totalPrincipal(res.entries)).toBeCloseTo(1_000_000, 2);
    });

    it('total pagado = capital + intereses', () => {
      const res = service.buildSchedule(input);
      expect(res.totalPaid).toBeCloseTo(round2(1_000_000 + res.totalInterest), 1);
    });

    it('encadena saldos: closing[n] == opening[n+1]', () => {
      const res = service.buildSchedule(input);
      for (let i = 1; i < res.entries.length; i++) {
        expect(res.entries[i].openingBalance).toBeCloseTo(
          res.entries[i - 1].closingBalance,
          2,
        );
      }
    });

    it('en cada cuota: payment ≈ interés + capital + extra', () => {
      const res = service.buildSchedule(input);
      for (const e of res.entries) {
        expect(e.payment).toBeCloseTo(
          round2(e.interestPart + e.principalPart + e.extraPayment),
          2,
        );
      }
    });

    it('las fechas de vencimiento avanzan mes a mes', () => {
      const res = service.buildSchedule(input);
      expect(res.entries[0].dueDate).toBe('2026-08-05');
      expect(res.entries[1].dueDate).toBe('2026-09-05');
      expect(res.entries[11].dueDate).toBe('2027-07-05');
    });
  });

  describe('buildSchedule con tasa 0', () => {
    it('reparte capital uniforme y sin intereses', () => {
      const res = service.buildSchedule({
        principal: 1_200_000,
        interestRate: 0,
        rateBasis: 'EA',
        termMonths: 12,
        startDate,
      });
      expect(res.totalInterest).toBe(0);
      expect(res.numberOfPayments).toBe(12);
      expect(totalPrincipal(res.entries)).toBeCloseTo(1_200_000, 2);
      expect(res.entries[0].payment).toBeCloseTo(100_000, 2);
    });
  });

  describe('sistema alemán', () => {
    it('el abono a capital es constante y los intereses decrecen', () => {
      const res = service.buildSchedule({
        principal: 1_200_000,
        interestRate: 24,
        rateBasis: 'NMV', // 2% mensual
        termMonths: 12,
        startDate,
        system: 'aleman',
      });
      const capital = res.entries.map((e) => e.principalPart);
      // capital constante ≈ 100.000
      capital.forEach((c) => expect(c).toBeCloseTo(100_000, 2));
      // intereses estrictamente decrecientes
      for (let i = 1; i < res.entries.length; i++) {
        expect(res.entries[i].interestPart).toBeLessThan(
          res.entries[i - 1].interestPart,
        );
      }
      expect(res.entries[res.entries.length - 1].closingBalance).toBe(0);
    });
  });

  describe('abonos extra a capital', () => {
    const base: AmortizationInput = {
      principal: 10_000_000,
      interestRate: 30,
      rateBasis: 'EA',
      termMonths: 36,
      startDate,
    };

    it('un abono extra reduce el plazo y los intereses', () => {
      const withExtra = service.buildSchedule({ ...base, extraMonthly: 200_000 });
      const baseline = service.buildSchedule(base);
      expect(withExtra.numberOfPayments).toBeLessThan(baseline.numberOfPayments);
      expect(withExtra.totalInterest).toBeLessThan(baseline.totalInterest);
      expect(withExtra.entries[withExtra.entries.length - 1].closingBalance).toBe(0);
      expect(totalPrincipal(withExtra.entries)).toBeCloseTo(10_000_000, 2);
    });

    it('simulateExtraPayment reporta ahorro de intereses y meses', () => {
      const sim = service.simulateExtraPayment(base, 200_000);
      expect(sim.interestSaved).toBeGreaterThan(0);
      expect(sim.monthsSaved).toBeGreaterThan(0);
      expect(sim.withExtra.months).toBe(base.termMonths - sim.monthsSaved);
    });
  });

  describe('validaciones', () => {
    it('rechaza principal <= 0', () => {
      expect(() =>
        service.buildSchedule({
          principal: 0,
          interestRate: 10,
          rateBasis: 'EA',
          termMonths: 12,
          startDate,
        }),
      ).toThrow();
    });

    it('rechaza extraMonthly negativo', () => {
      expect(() =>
        service.buildSchedule({
          principal: 1000,
          interestRate: 10,
          rateBasis: 'EA',
          termMonths: 12,
          startDate,
          extraMonthly: -1,
        }),
      ).toThrow();
    });
  });
});

describe('FIN-012 · abono único a capital (DEC-0012 §10 — 3 tests obligatorios)', () => {
  const svc = new AmortizationService();
  const from = new Date(Date.UTC(2026, 6, 1));
  const i = 0.01; // 1% mensual (ancla oficial del DEC)
  const cuota = svc.computeMonthlyPayment(10_000_000, i, 24); // 470.734,72

  it('obligatorio #1a — ancla a mano: reducir_plazo con abono de 2M → 19 cuotas restantes (antes 24)', () => {
    const r = svc.prepaymentReceipt(10_000_000, i, cuota, 24, 2_000_000, 'reducir_plazo', from);
    expect(cuota).toBe(470_734.72);
    expect(r.before.months).toBe(24);
    expect(r.after.months).toBe(19); // n = −ln(1−80.000/470.734,72)/ln(1,01) ≈ 18,72 → 19
    expect(r.newMonthlyPayment).toBe(cuota); // la cuota NO cambia
    expect(r.interestSaved).toBeGreaterThan(0);
    expect(r.newBalance).toBe(8_000_000);
  });

  it('obligatorio #1b — ancla a mano: reducir_cuota con abono de 2M → nueva cuota 376.587,78 (fórmula cerrada)', () => {
    const r = svc.prepaymentReceipt(10_000_000, i, cuota, 24, 2_000_000, 'reducir_cuota', from);
    // Verificado a mano por el Auditor como ≈376.587,79 (proporcionalidad 0,8×cuota);
    // el valor exacto por fórmula cerrada redondeado a centavos es 376.587,78 —
    // diferencia de 1 centavo por cadena de redondeo, declarada en IMP-0012.
    expect(r.newMonthlyPayment).toBe(svc.computeMonthlyPayment(8_000_000, i, 24));
    expect(r.newMonthlyPayment).toBeCloseTo(376_587.79, 0);
    expect(r.newMonthlyPayment).toBe(376_587.78);
    expect(r.after.months).toBe(24); // el plazo NO cambia
    expect(r.paymentSaved).toBeCloseTo(cuota - 376_587.78, 2);
  });

  it('obligatorio #2 — NO-inflación: el ahorro del abono ÚNICO es estrictamente MENOR que el de simulateExtraPayment (recurrente)', () => {
    // Esta es la confusión que originó el bloqueo de FIN-012 en DEC-0011:
    // simulateExtraPayment modela 2M EXTRA CADA MES, no un abono único de 2M.
    const unico = svc.prepaymentReceipt(10_000_000, i, cuota, 24, 2_000_000, 'reducir_plazo', from);
    const recurrente = svc.simulateExtraPayment(
      { principal: 10_000_000, interestRate: 12.6825, rateBasis: 'NMV', termMonths: 24, startDate: from },
      2_000_000,
    );
    expect(unico.interestSaved).toBeLessThan(recurrente.interestSaved);
  });

  it('obligatorio #3 — regresión de semántica: simulateExtraPayment devuelve EXACTAMENTE lo mismo que antes de este ciclo (snapshot de valores)', () => {
    const r = svc.simulateExtraPayment(
      { principal: 10_000_000, interestRate: 24, rateBasis: 'EA', termMonths: 36, startDate: from },
      300_000,
    );
    expect(r.baseline).toEqual({ months: 36, totalInterest: 3_693_701.88, payoffDate: '2029-07-01' });
    expect(r.withExtra).toEqual({ months: 18, totalInterest: 1_730_564.42, payoffDate: '2028-01-01' });
    expect(r.interestSaved).toBe(1_963_137.46);
    expect(r.monthsSaved).toBe(18);
  });

  it('remainingSchedule: valida cuota insuficiente y absorbe residuo de redondeo ≤ $1 en la última cuota', () => {
    expect(() => svc.remainingSchedule(1_000_000, 0.02, 20_000, from)).toThrow(/no cubre/);
    const plan = svc.remainingSchedule(10_000_000, i, cuota, from);
    expect(plan.months).toBe(24); // sin "cuota fantasma" de centavos
    expect(plan.entries[plan.entries.length - 1].closingBalance).toBe(0);
  });

  it('prepaymentReceipt: rechaza abono ≥ saldo (debe usarse payoff) y abono no positivo', () => {
    expect(() => svc.prepaymentReceipt(1_000_000, i, 100_000, 12, 1_000_000, 'reducir_plazo', from)).toThrow(/pago total/);
    expect(() => svc.prepaymentReceipt(1_000_000, i, 100_000, 12, 0, 'reducir_plazo', from)).toThrow(/mayor a 0/);
  });
});
