/**
 * FIN-013/FIN-023 · EL cálculo del desglose de cuota real — función PURA única.
 * La consumen DebtInsuranceService (display del detalle) y DebtOutlayService
 * (la fuente de "lo comprometido", §32): un solo cálculo, cero copias.
 */
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface BreakdownCharge {
  monthlyPremium: unknown;
  financed: boolean;
  active: boolean;
  deletedAt?: Date | null;
}

export function paymentBreakdown(
  monthlyPayment: number,
  charges: BreakdownCharge[],
) {
  const activos = charges.filter((i) => i.active && !i.deletedAt);
  const financed = activos
    .filter((i) => i.financed)
    .reduce((acc, i) => acc + Number(i.monthlyPremium), 0);
  const separate = activos
    .filter((i) => !i.financed)
    .reduce((acc, i) => acc + Number(i.monthlyPremium), 0);
  return {
    basePayment: round2(monthlyPayment),
    insuranceFinanced: round2(financed),
    insuranceSeparate: round2(separate),
    insuranceMonthlyTotal: round2(financed + separate),
    // Los financiados YA van dentro de la cuota: no se doble-cuentan.
    totalMonthlyOutlay: round2(monthlyPayment + separate),
  };
}
