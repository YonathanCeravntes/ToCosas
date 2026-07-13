import { round2 } from '../../../common/money.util';

/**
 * Simulador de estrategias de pago de deudas (avalanche vs snowball).
 *
 * - **Avalanche**: prioriza la deuda de mayor tasa (minimiza intereses).
 * - **Snowball**: prioriza la deuda de menor saldo (gana motivación temprana).
 *
 * Modelo: presupuesto mensual constante = suma de cuotas mínimas + extra. Cada
 * mes se acreditan intereses, se pagan las cuotas mínimas de las deudas activas
 * y el remanente se dirige a la deuda "objetivo" según la estrategia. Cuando una
 * deuda se salda, su cuota se reinvierte automáticamente (efecto bola de nieve).
 */

export type Strategy = 'avalanche' | 'snowball';

export interface PortfolioDebt {
  id: string;
  name: string;
  balance: number;
  /** Tasa efectiva mensual (fracción, p. ej. 0.02 = 2%). */
  monthlyRate: number;
  /** Cuota mínima mensual. */
  minPayment: number;
}

export interface PortfolioResult {
  strategy: Strategy;
  months: number;
  totalInterest: number;
  /** Orden en que las deudas quedan saldadas. */
  payoffOrder: string[];
  feasible: boolean; // false si el presupuesto no alcanza (amortización negativa)
}

const MAX_MONTHS = 1200; // 100 años: tope de seguridad

export function simulatePortfolio(
  debts: PortfolioDebt[],
  extraBudget = 0,
  strategy: Strategy = 'avalanche',
): PortfolioResult {
  // Copia de trabajo.
  const working = debts
    .filter((d) => d.balance > 0)
    .map((d) => ({ ...d }));

  const constantBudget = round2(
    extraBudget + working.reduce((a, d) => a + d.minPayment, 0),
  );

  let totalInterest = 0;
  let months = 0;
  const payoffOrder: string[] = [];

  while (working.some((d) => d.balance > 0.005)) {
    if (months >= MAX_MONTHS) {
      return {
        strategy,
        months,
        totalInterest: round2(totalInterest),
        payoffOrder,
        feasible: false,
      };
    }
    months += 1;

    // 1) Acreditar intereses.
    for (const d of working) {
      if (d.balance <= 0) continue;
      const interest = round2(d.balance * d.monthlyRate);
      d.balance = round2(d.balance + interest);
      totalInterest += interest;
    }

    let available = constantBudget;

    // 2) Pagar cuotas mínimas de deudas activas.
    for (const d of working) {
      if (d.balance <= 0 || available <= 0) continue;
      const pay = Math.min(d.minPayment, d.balance, available);
      d.balance = round2(d.balance - pay);
      available = round2(available - pay);
    }

    // 3) Dirigir el remanente a la deuda objetivo (según estrategia).
    while (available > 0.005 && working.some((d) => d.balance > 0.005)) {
      const target = pickTarget(working, strategy);
      if (!target) break;
      const pay = Math.min(available, target.balance);
      target.balance = round2(target.balance - pay);
      available = round2(available - pay);
    }

    // 4) Registrar deudas recién saldadas.
    for (const d of working) {
      if (d.balance <= 0.005 && !payoffOrder.includes(d.id)) {
        d.balance = 0;
        payoffOrder.push(d.id);
      }
    }
  }

  return {
    strategy,
    months,
    totalInterest: round2(totalInterest),
    payoffOrder,
    feasible: true,
  };
}

/**
 * FIN-022 (DEC-0022 §5.1) · El ORDEN DE ATAQUE: a qué deuda dirigir el excedente
 * primero según la estrategia. ÚNICO punto que lo define — `pickTarget` (el paso
 * 3 de la simulación) y cualquier consumidor externo (resumen de Deudas,
 * Simulador) lo comparten por construcción: no puede divergir.
 * Nota: distinto de `payoffOrder` (el orden en que las deudas QUEDAN saldadas).
 */
export function attackOrder<T extends { balance: number; monthlyRate: number }>(
  debts: T[],
  strategy: Strategy,
): T[] {
  const active = debts.filter((d) => d.balance > 0.005);
  // sort es estable: ante empate se conserva el orden de entrada (mismo criterio
  // que tenía el reduce original con comparación estricta).
  return [...active].sort((a, b) =>
    strategy === 'avalanche' ? b.monthlyRate - a.monthlyRate : a.balance - b.balance,
  );
}

function pickTarget(
  debts: PortfolioDebt[],
  strategy: Strategy,
): PortfolioDebt | null {
  return attackOrder(debts, strategy)[0] ?? null;
}

/** Compara ambas estrategias y recomienda la de menor interés total. */
export function compareStrategies(
  debts: PortfolioDebt[],
  extraBudget = 0,
): {
  avalanche: PortfolioResult;
  snowball: PortfolioResult;
  recommended: Strategy;
} {
  const avalanche = simulatePortfolio(debts, extraBudget, 'avalanche');
  const snowball = simulatePortfolio(debts, extraBudget, 'snowball');
  const recommended =
    avalanche.totalInterest <= snowball.totalInterest ? 'avalanche' : 'snowball';
  return { avalanche, snowball, recommended };
}
