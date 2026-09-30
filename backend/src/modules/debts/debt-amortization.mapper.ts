import { AmortizationInput } from '../finance/amortization/amortization.types';

/**
 * Entrada mínima (agnóstica de Prisma) para calcular la amortización de una deuda.
 * Mantener esto puro permite testear el mapeo sin base de datos.
 */
export interface DebtLike {
  currentBalance: number;
  interestRate: number;
  rateBasis: 'EA' | 'MV' | 'NMV' | 'NAMV';
  termMonths?: number | null;
  startDate: Date;
  amortSystem?: string | null;
  paymentDay?: number | null;
}

/**
 * Convierte una deuda a la entrada del motor de amortización.
 * - Amortiza sobre el SALDO PENDIENTE (currentBalance), no el original.
 * - La fecha de arranque de la proyección respeta el día de pago si existe.
 */
export function debtToAmortizationInput(
  debt: DebtLike,
  extraMonthly = 0,
): AmortizationInput {
  if (!debt.termMonths || debt.termMonths <= 0) {
    throw new Error('La deuda no tiene un plazo (termMonths) válido para proyectar');
  }
  const system =
    debt.amortSystem === 'aleman' ? 'aleman' : 'frances';

  return {
    principal: debt.currentBalance,
    interestRate: debt.interestRate,
    rateBasis: debt.rateBasis,
    termMonths: debt.termMonths,
    startDate: projectionStartDate(debt.startDate, debt.paymentDay),
    system,
    extraMonthly,
  };
}

/**
 * Determina la fecha base de la proyección. Si hay día de pago, usa ese día
 * del mes de la fecha de inicio.
 */
function projectionStartDate(startDate: Date, paymentDay?: number | null): Date {
  if (!paymentDay) return startDate;
  const d = new Date(startDate.getTime());
  const clampedDay = Math.min(
    Math.max(paymentDay, 1),
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(),
  );
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), clampedDay));
}
