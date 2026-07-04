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

/** Proyección del crédito calculada desde la tabla de amortización. */
export interface DebtProjection {
  totalInterest: number;
  totalPaid: number;
  numberOfPayments: number;
  payoffDate: string | null;
}

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
  projection?: DebtProjection;
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

export interface CategorySpend {
  name: string;
  icon: string;
  color: string;
  amount: number;
  percent: number;
}

export interface Dashboard {
  period: string;
  income: number;
  expense: number;
  debtPayments: number;
  estimatedCashflow: number;
  byCategory: CategorySpend[];
}

export interface Category {
  id: string;
  name: string;
  kind: TxKind;
  icon: string | null;
  color: string | null;
  isGlobal: boolean;
}

export type AccountType = 'efectivo' | 'ahorros' | 'corriente' | 'billetera' | 'otro';
export type AssetType = 'inmueble' | 'vehiculo' | 'inversion' | 'negocio' | 'otro';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  currentBalance: string | number;
  isLiquid: boolean;
  includeInNetWorth: boolean;
  isEmergencyFund: boolean;
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  currency: string;
  currentValue: string | number;
  includeInNetWorth: boolean;
}

export interface NetWorth {
  netWorth: number;
  totalAssets: number;
  totalLiquid: number;
  totalEmergencyFund: number;
  totalAccounts: number;
  totalAssetsOnly: number;
  totalLiabilities: number;
  accounts: Array<{ id: string; name: string; type: AccountType; currentBalance: number; isLiquid: boolean; isEmergencyFund: boolean }>;
  assets: Array<{ id: string; name: string; type: AssetType; currentValue: number }>;
  liabilities: Array<{ id: string; name: string; currentBalance: number }>;
}

export type FixedKind = 'ingreso' | 'gasto';

export interface FixedItem {
  id: string;
  kind: FixedKind;
  name: string;
  amount: string | number;
  currency: string;
  dayOfMonth: number | null;
  categoryId: string | null;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}

export interface MonthlyBudget {
  fixedIncome: number;
  fixedExpense: number;
  debtPayments: number;
  committed: number;
  available: number;
  committedRatio: number;
  debts: Array<{ debtId: string; name: string; amount: number; nextDueDate: string | null }>;
  expenses: Array<{ id: string; name: string; amount: number; dayOfMonth: number | null }>;
  incomes: Array<{ id: string; name: string; amount: number; dayOfMonth: number | null }>;
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

export interface StartTelegramLinkResult {
  otp: string;
  botUsername: string;
  deepLink: string;
  expiresAt: string;
}

/** Convierte los Decimal (que Prisma serializa como string) a número. */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : parseFloat(value);
}
