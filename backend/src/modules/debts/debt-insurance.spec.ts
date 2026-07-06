import * as fs from 'fs';
import * as path from 'path';
import { DebtInsuranceService } from './debt-insurance.service';

describe('DebtInsuranceService (FIN-013, DEC-0011 §4.1/§4.2)', () => {
  const svc = new DebtInsuranceService({} as never);

  describe('paymentBreakdown — desglose de cuota real (solo display)', () => {
    const ins = (premium: number, financed: boolean, active = true) => ({
      monthlyPremium: premium,
      financed,
      active,
      deletedAt: null,
    });

    it('sin seguros: cuota total = cuota base', () => {
      const b = svc.paymentBreakdown(500000, []);
      expect(b.totalMonthlyOutlay).toBe(500000);
      expect(b.insuranceMonthlyTotal).toBe(0);
    });

    it('prima financiada va dentro de la cuota: NO suma al desembolso total', () => {
      const b = svc.paymentBreakdown(500000, [ins(45000, true)]);
      expect(b.insuranceFinanced).toBe(45000);
      expect(b.insuranceSeparate).toBe(0);
      expect(b.totalMonthlyOutlay).toBe(500000);
    });

    it('prima aparte SÍ suma al desembolso mensual total', () => {
      const b = svc.paymentBreakdown(500000, [ins(45000, false)]);
      expect(b.insuranceSeparate).toBe(45000);
      expect(b.totalMonthlyOutlay).toBe(545000);
    });

    it('mezcla financiado + aparte + inactivo: los inactivos no cuentan', () => {
      const b = svc.paymentBreakdown(500000, [
        ins(45000, true),
        ins(30000, false),
        ins(99000, false, false), // inactivo (p. ej. endosado y reemplazado)
      ]);
      expect(b.insuranceFinanced).toBe(45000);
      expect(b.insuranceSeparate).toBe(30000);
      expect(b.insuranceMonthlyTotal).toBe(75000);
      expect(b.totalMonthlyOutlay).toBe(530000);
    });

    it('endoso típico: desactivar el del banco y crear el propio más barato baja el desembolso', () => {
      const antes = svc.paymentBreakdown(500000, [ins(60000, false)]);
      const despues = svc.paymentBreakdown(500000, [ins(60000, false, false), ins(35000, false)]);
      expect(despues.totalMonthlyOutlay).toBeLessThan(antes.totalMonthlyOutlay);
      expect(despues.totalMonthlyOutlay).toBe(535000);
    });
  });

  describe('no-impacto en el Motor (DEC-0011 §4.2 — test de no-impacto de ARQ-0011 §13)', () => {
    it('el Motor Financiero no referencia seguros en ninguna línea (verificado por fuente)', () => {
      // Mismo estándar que no-third-party-sharing.spec (FIN-009): la invariante
      // se verifica contra el código real, no solo se declara.
      const engineDir = path.join(__dirname, '..', 'financial-engine');
      const offenders: string[] = [];
      const walk = (dir: string) => {
        for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
          const p = path.join(dir, f.name);
          if (f.isDirectory()) walk(p);
          else if (f.name.endsWith('.ts') && /debtInsurance|debt_insurances|DebtInsurance/.test(fs.readFileSync(p, 'utf8'))) {
            offenders.push(f.name);
          }
        }
      };
      walk(engineDir);
      expect(offenders).toEqual([]);
    });
  });
});
