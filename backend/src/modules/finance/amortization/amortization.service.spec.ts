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
