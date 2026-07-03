/** Tipos compartidos con la API del backend (deben reflejar los DTOs de NestJS). */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface User {
  id: string;
  email: string | null;
  fullName: string | null;
  currency?: string;
}

export interface AuthResult {
  user: User;
  tokens: AuthTokens;
}

export type DebtType =
  | 'tarjeta_credito'
  | 'credito_personal'
  | 'hipotecario'
  | 'libre_inversion'
  | 'vehiculo'
  | 'educativo'
  | 'gota_a_gota'
  | 'prestamo_familiar'
  | 'otro';

export type RateBasis = 'EA' | 'MV' | 'NMV' | 'NAMV';

export interface Debt {
  id: string;
  name: string;
  debtType: DebtType;
  currency: string;
  originalAmount: string | number;
  currentBalance: string | number;
  startDate: string;
  termMonths: number | null;
  interestRate: string | number;
  rateBasis: RateBasis;
  monthlyPayment: string | number | null;
  nextDueDate: string | null;
  status: string;
}

export interface AmortizationEntry {
  periodNo: number;
  dueDate: string;
  openingBal: string | number;
  payment: string | number;
  interestPart: string | number;
  principalPart: string | number;
  closingBal: string | number;
}

export interface DebtsSummary {
  debtsCount: number;
  totalDebt: number;
  monthlyPaymentsTotal: number;
  upcoming: Array<{ debtId: string; name: string; dueDate: string | null; amount: number }>;
}

export type TxKind = 'ingreso' | 'gasto' | 'pago_deuda' | 'transferencia';

export interface Transaction {
  id: string;
  kind: TxKind;
  amount: string | number;
  occurredAt: string;
  note: string | null;
  debtId: string | null;
  source: string;
}

export interface Dashboard {
  period: string;
  income: number;
  expense: number;
  debtPayments: number;
  estimatedCashflow: number;
}

export interface Suggestion {
  type: string;
  title: string;
  body: string;
  score: number;
  payload?: Record<string, unknown>;
}

export interface StartLinkResult {
  otp: string;
  phoneE164: string;
  expiresAt: string;
}

/** Convierte los Decimal (que Prisma serializa como string) a número. */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : parseFloat(value);
}
