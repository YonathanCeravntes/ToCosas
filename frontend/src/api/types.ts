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
  /** FIN-024: días de mora derivados por el backend (null = al día). */
  overdueDays?: number | null;
  projection?: DebtProjection;
}

// --- FIN-012: abono a capital y pago total anticipado (reales) ---

export type PrepayEffect = 'reducir_plazo' | 'reducir_cuota';

/** Recibo del abono único: el preview y lo persistido usan el mismo cálculo. */
export interface PrepayReceipt {
  effect: PrepayEffect;
  amount: number;
  newBalance: number;
  newMonthlyPayment: number;
  before: { months: number; totalInterest: number; payoffDate: string };
  after: { months: number; totalInterest: number; payoffDate: string };
  interestSaved: number;
  monthsSaved: number;
  paymentSaved: number;
}

// --- FIN-013: seguros asociados al crédito ---

export type DebtInsuranceKind =
  | 'vida_deudor'
  | 'incendio_terremoto'
  | 'todo_riesgo'
  | 'desempleo'
  | 'otro';

export interface DebtInsurance {
  id: string;
  kind: DebtInsuranceKind;
  name: string;
  monthlyPremium: string | number;
  /** true = la prima va dentro de la cuota del crédito. */
  financed: boolean;
  /** true = póliza propia endosada al banco. */
  endorsed: boolean;
  insurer: string | null;
  notes: string | null;
  active: boolean;
}

/** Desglose de la cuota real con seguros (solo display; no toca el Motor). */
export interface PaymentBreakdown {
  basePayment: number;
  insuranceFinanced: number;
  insuranceSeparate: number;
  insuranceMonthlyTotal: number;
  totalMonthlyOutlay: number;
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
  /** FIN-023: cuotas + seguros/cargos APARTE — igual a monthlyPaymentsTotal si no hay. */
  totalMonthlyOutlay: number;
  upcoming: Array<{ debtId: string; name: string; dueDate: string | null; amount: number }>;
  // FIN-022 P2: orden de ataque del MOTOR (null con <2 deudas o sin comparación
  // válida — el bloque se omite, §29.1).
  strategy: {
    recommended: 'avalanche' | 'snowball';
    interestDifference: number;
    months: number;
    attackOrder: Array<{
      debtId: string;
      name: string;
      ratePct: number;
      rateBasis: string;
      balance: number;
    }>;
  } | null;
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

// --- FIN-014: Dashboard de Inicio v2 ---

export interface FlowSection {
  fixed: number;
  variable: number;
  total: number;
  byCategory: CategorySpend[];
}

// FIN-017: interpretación server-side ("¿qué significa esto para mí?").
export interface Interpretation {
  level: 'verde' | 'amarillo' | 'rojo';
  text: string;
}

// FIN-020 (§32): LA definición oficial de "Te queda" — fuente única del backend
// (SpendableService). Presupuesto e Inicio muestran ESTE objeto, nunca recalculan.
export interface PendingCommitment {
  name: string;
  amount: number;
  kind: 'fijo' | 'cuota';
  date: string | null;
  /** Etiqueta NEUTRA (§4.1-bis): "ya pasó su fecha", nunca "pagado". */
  datePassed: boolean;
}

export interface TeQueda {
  amount: number;
  perDay: number | null;
  daysLeft: number;
  until: string;
  protectedTotal: number;
  pendingCommitments: PendingCommitment[];
  receivedIncome: number;
}

export interface HomeDashboard {
  period: FinancialPeriodInfo;
  interpretation: {
    cashflow: Interpretation | null;
    savings: Interpretation | null;
    debt?: Interpretation | null;
  };
  netWorth: {
    netWorth: number;
    totalAssets: number;
    totalLiquid: number;
    totalEmergencyFund: number;
    totalAccounts: number;
    totalAssetsOnly: number;
    totalLiabilities: number;
  };
  savings: {
    total: number;
    emergencyFund: number;
    accounts: Array<{ id: string; name: string; balance: number; isEmergencyFund: boolean }>;
  };
  income: FlowSection;
  expense: FlowSection;
  debtPayments: number;
  estimatedCashflow: number;
  teQueda: TeQueda;
  recentTransactions: Array<{
    id: string;
    kind: TxKind;
    amount: number;
    occurredAt: string;
    note: string | null;
    category: { name: string; icon: string; color: string } | null;
    debtName: string | null;
  }>;
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

// --- Salud Financiera (FIN-004) ---

export type ScoreBand = 'critico' | 'fragil' | 'estable' | 'saludable' | 'elite';
export type IndicatorLevel = 'verde' | 'amarillo' | 'rojo' | 'sin_datos';

export interface ScorePillar {
  key: 'liquidity' | 'debt' | 'savings' | 'wealth';
  label: string;
  weight: number;
  value: number | null;
  status: string;
  delta: number | null;
}

export interface HealthIndicator {
  key: string;
  title: string;
  value: number | null;
  display: string;
  level: IndicatorLevel;
  meaning: string;
  howComputed: string;
  ranges: string;
  actions: string[];
}

export interface HealthScore {
  period: string;
  score: number | null;
  band: ScoreBand | null;
  version: number;
  delta: number | null;
  deltaByPillar: Array<{ pillar: string; delta: number }>;
  pillars: ScorePillar[];
  coldStart: { historyDays: number; requiredDays: number; enabled: boolean; remainingDays: number };
  indicators: HealthIndicator[];
  disclaimer: string;
}

export interface ScoreHistoryPoint {
  period: string;
  score: number;
}

// --- Insights y proactividad (FIN-006) ---

export type InsightType = 'anomalia' | 'riesgo' | 'oportunidad' | 'logro' | 'cambio_tendencia';
export type InsightSeverity = 'info' | 'warning' | 'critical';

export interface Insight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  body: string;
  status: 'new' | 'seen' | 'dismissed';
  createdAt: string;
}

// --- Simulador y recomendaciones (FIN-007) ---

export type SimulationType =
  | 'abono_extra'
  | 'nueva_deuda'
  | 'reducir_gastos'
  | 'cambio_ingreso'
  | 'estrategia_deudas'
  | 'vender_activo'
  | 'refinanciar'
  | 'proyeccion_ahorro';

export interface MetricsSnapshot {
  score: number;
  band: string;
  dti: number;
  cashflow: number;
  savingsRate: number;
  liquidityRunway: number | null;
  emergencyFundMonths: number | null;
  netWorth: number;
}

export interface SimulationResult {
  type: SimulationType;
  before: MetricsSnapshot;
  after: MetricsSnapshot;
  delta: { score: number; dti: number; cashflow: number; netWorth: number };
  specifics: Record<string, number | string | null>;
}

export interface Recommendation {
  id: string;
  kind: string;
  title: string;
  body: string;
  whatIfNot: string;
  priorityScore: string | number;
  impact: Record<string, number | string | null>;
  status: 'new' | 'seen' | 'dismissed' | 'done';
}

// --- Monetización (FIN-009) ---

export interface BillingStatus {
  plan: 'free' | 'premium';
  status: 'trial' | 'active' | 'canceled' | 'expired' | null;
  provider: string | null;
  until: string | null;
  hadTrial: boolean;
  simulationQuota: { used: number; limit: number | null; allowed: boolean };
  priceCop: number | null;
}

// --- Gamificación (FIN-008) ---

export interface GamificationProfile {
  xp: number;
  level: { number: number; name: string; nextAt: number | null };
  streak: { current: number; best: number };
  achievements: Array<{
    code: string;
    title: string;
    condition: string;
    xp: number;
    unlockedAt: string | null;
    seenAt: string | null;
  }>;
  challenge: {
    code: string;
    title: string;
    body: string;
    status: 'active' | 'completed' | 'failed';
    progress: Record<string, number> | null;
  } | null;
}

// --- Copiloto Financiero (FIN-005) ---

export interface CopilotReply {
  conversationId: string;
  reply: string;
  source: 'template' | 'llm';
  aiRemainingToday: number | null;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source: 'template' | 'llm';
  createdAt: string;
}

export interface CopilotConversation {
  id: string;
  title: string | null;
  updatedAt: string;
}

export interface AiConsentStatus {
  accepted: boolean;
  acceptedAt: string | null;
  currentVersion: number;
  consentText: string;
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

// FIN-016: ciclo financiero activo (día de corte configurable 1–28).
export interface FinancialPeriodInfo {
  start: string;
  end: string;
  label: string;
  cycleStartDay: number;
}

export interface MonthlyBudget {
  period: FinancialPeriodInfo;
  teQueda: TeQueda;
  fixedIncome: number;
  fixedExpense: number;
  debtPayments: number;
  /** FIN-023: total de seguros/cargos que se pagan APARTE (0 si no hay). */
  debtChargesSeparate: number;
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
