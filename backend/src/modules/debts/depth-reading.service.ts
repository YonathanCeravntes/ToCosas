import { Injectable } from '@nestjs/common';
import { toMonthlyEffectiveRate } from '../finance/amortization/interest.util';
import { CardService } from './card.service';
import { descriptorFor, DepthReadingKind } from './product-type.descriptor';

const money = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

/** Una lectura de profundidad: derivado honesto, display-only (§29.2). */
export interface DepthReading {
  kind: DepthReadingKind;
  severity: 'info' | 'warning';
  title: string;
  body: string;
}

/** Lo que la lectura necesita del Debt ya cargado (agnóstico de Prisma, testeable). */
export interface DebtForReading {
  id: string;
  debtType: string;
  currentBalance: unknown;
  monthlyPayment: unknown;
  interestRate: unknown;
  rateBasis: 'EA' | 'MV' | 'NMV' | 'NAMV';
}

/**
 * FIN-037 (DEC-0037) · La ÚNICA autoridad de las lecturas de profundidad (§32).
 *
 * Cada lectura COMPONE funciones puras / derivados existentes — cero fórmula
 * nueva: `toMonthlyEffectiveRate` (FIN-012) para el costo del informal;
 * `usedAmount`/`creditLimit` de `CardService` (FIN-031) para el sobrecupo.
 * Qué lectura aplica a qué modalidad lo declara `descriptor.depthReadings`
 * (config-sin-código). El copy informa SIN culpar ni recomendar contratar
 * (§29.2 / Independencia) — patrón del aviso de mora (FIN-024).
 */
@Injectable()
export class DepthReadingService {
  constructor(private readonly cards: CardService) {}

  async forDebt(userId: string, debt: DebtForReading): Promise<DepthReading[]> {
    const kinds = descriptorFor(debt.debtType).depthReadings;
    const readings: DepthReading[] = [];
    for (const kind of kinds) {
      const r =
        kind === 'costo_real_informal'
          ? this.costoRealInformal(debt)
          : await this.sobrecupo(userId, debt);
      if (r) readings.push(r);
    }
    return readings;
  }

  /**
   * Lectura 1 (la semilla del CPSAO) · El costo real del préstamo informal.
   * Tres bordes honestos (DEC-0037 §3.1) — jamás se inventa una cifra:
   *  - sin tasa declarada → invitación a declararla;
   *  - cuota > interés → cuánto de la cuota es interés y cuánto baja la deuda;
   *  - cuota ≤ interés → la verdad brutal sin juicio, con el puente al abono.
   */
  private costoRealInformal(debt: DebtForReading): DepthReading | null {
    const balance = Number(debt.currentBalance ?? 0);
    const cuota = Number(debt.monthlyPayment ?? 0);
    const rate = Number(debt.interestRate ?? 0);
    if (balance <= 0 || cuota <= 0) return null;

    if (rate <= 0) {
      return {
        kind: 'costo_real_informal',
        severity: 'info',
        title: '¿Cuánto te cuesta de verdad?',
        body:
          'Si este préstamo cobra interés, decláralo en la deuda (editar → tasa) y te muestro cuánto de tu cuota es interés y cuánto baja tu deuda de verdad.',
      };
    }

    // Composición pura (FIN-012): tasa mensual efectiva → interés del mes.
    const monthlyRate = toMonthlyEffectiveRate(rate, debt.rateBasis);
    const interes = Math.round(balance * monthlyRate);
    const capital = Math.round(cuota - interes);

    if (capital <= 0) {
      return {
        kind: 'costo_real_informal',
        severity: 'warning',
        title: 'Tu cuota no está bajando la deuda',
        body: `Con la tasa pactada, el interés de este mes es ~${money(interes)} y tu cuota es ${money(cuota)} — a este ritmo el saldo no baja y la deuda no termina. Cada peso extra que abones sí la baja.`,
      };
    }
    return {
      kind: 'costo_real_informal',
      severity: 'info',
      title: 'El costo real de este préstamo',
      body: `De tu cuota de ${money(cuota)}, ~${money(interes)} son interés este mes y ~${money(capital)} bajan tu deuda.`,
    };
  }

  /**
   * Lectura 2 · Sobrecupo visible (tarjeta/fintech). Se activa EXACTAMENTE
   * cuando el saldo utilizado (derivado, FIN-031) supera el cupo declarado.
   * Aviso, no juicio (§29.2).
   */
  private async sobrecupo(userId: string, debt: DebtForReading): Promise<DepthReading | null> {
    const summary = await this.cards.summary(userId, debt.id);
    if (summary.creditLimit == null || summary.usedAmount <= summary.creditLimit) return null;
    const over = summary.usedAmount - summary.creditLimit;
    return {
      kind: 'sobrecupo',
      severity: 'warning',
      title: 'Estás por encima de tu cupo',
      body: `Estás usando ${money(over)} por encima de tu cupo de ${money(summary.creditLimit)}. Los bancos suelen cobrar un cargo por sobrecupo — tenerlo presente te evita la sorpresa en el extracto.`,
    };
  }
}
