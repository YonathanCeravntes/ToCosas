/**
 * Tipos del motor de amortización.
 *
 * Todas las cifras monetarias se manejan en la unidad de la moneda (p. ej. pesos)
 * con 2 decimales. Internamente se redondea a centavos en cada periodo para que
 * la suma de las porciones de capital reconstruya exactamente el principal.
 */

/** Base sobre la que viene expresada la tasa de interés informada por el usuario. */
export type RateBasis =
  | 'EA' // Efectiva Anual (%)
  | 'MV' // Efectiva Mensual Vencida (%)
  | 'NMV' // Nominal Anual, capitalización Mes Vencido (%)
  | 'NAMV'; // Nominal Anual Mes Vencido (alias de NMV)

/** Sistema de amortización. El MVP implementa 'frances' y 'aleman'. */
export type AmortizationSystem = 'frances' | 'aleman';

export interface AmortizationInput {
  /** Monto del capital (saldo a amortizar). */
  principal: number;
  /** Valor de la tasa en porcentaje (p. ej. 12.5 para 12.5%). */
  interestRate: number;
  /** Base de la tasa. */
  rateBasis: RateBasis;
  /** Número total de cuotas (meses). */
  termMonths: number;
  /** Fecha de la primera cuota (ISO o Date). */
  startDate: Date;
  /** Sistema de amortización. Default: 'frances'. */
  system?: AmortizationSystem;
  /** Abono extra fijo a capital cada mes (opcional). Default: 0. */
  extraMonthly?: number;
}

export interface AmortizationEntry {
  periodNo: number;
  dueDate: string; // YYYY-MM-DD
  openingBalance: number;
  payment: number;
  interestPart: number;
  principalPart: number;
  extraPayment: number;
  closingBalance: number;
}

export interface AmortizationResult {
  /** Tasa efectiva mensual usada en el cálculo (fracción, p. ej. 0.01 = 1%). */
  monthlyRate: number;
  /** Cuota base (fija en sistema francés). */
  monthlyPayment: number;
  /** Número real de cuotas (puede ser menor al plazo si hay abonos extra). */
  numberOfPayments: number;
  /** Suma total de intereses pagados. */
  totalInterest: number;
  /** Suma total pagado (capital + intereses). */
  totalPaid: number;
  /** Fecha de la última cuota (liquidación). */
  payoffDate: string; // YYYY-MM-DD
  /** Tabla de amortización. */
  entries: AmortizationEntry[];
}
