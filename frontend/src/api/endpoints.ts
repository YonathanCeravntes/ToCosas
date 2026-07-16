import { api } from './client';
import {
  AiConsentStatus,
  BillingStatus,
  AmortizationEntry,
  Account,
  Asset,
  AuthResult,
  CopilotConversation,
  CopilotMessage,
  CopilotReply,
  Category,
  Dashboard,
  CardSummary,
  Debt,
  FinancialEntity,
  PendingReview,
  ProductTypeDescriptor,
  DebtInsurance,
  DebtsSummary,
  HomeDashboard,
  PaymentBreakdown,
  PrepayEffect,
  PrepayReceipt,
  FixedItem,
  FixedKind,
  GamificationProfile,
  HealthScore,
  IncomeProfile,
  IncomeSource,
  Insight,
  MonthlyBudget,
  NetIncomeSummary,
  Recommendation,
  SimulationResult,
  SimulationHistoryEntry,
  SimulationType,
  ScoreHistoryPoint,
  NetWorth,
  StartLinkResult,
  StartTelegramLinkResult,
  Suggestion,
  Transaction,
  TxKind,
} from './types';

export const authApi = {
  register: (email: string, password: string, fullName?: string) =>
    api.post<AuthResult>('/auth/register', { email, password, fullName }),
  login: (email: string, password: string) =>
    api.post<AuthResult>('/auth/login', { email, password }),
};

export const debtsApi = {
  list: () => api.get<Debt[]>('/debts'),
  summary: () => api.get<DebtsSummary>('/debts/summary'),
  // FIN-032: el catálogo de tipos (la única autoridad de tipo) que arma el alta.
  catalog: () => api.get<ProductTypeDescriptor[]>('/debts/catalog'),
  get: (id: string) =>
    api.get<
      Debt & {
        amortization: AmortizationEntry[];
        insurances: DebtInsurance[];
        paymentBreakdown: PaymentBreakdown;
      }
    >(`/debts/${id}`),
  amortization: (id: string) => api.get<AmortizationEntry[]>(`/debts/${id}/amortization`),
  create: (input: CreateDebtInput) => api.post<{ debt: Debt }>('/debts', input),
  simulateExtra: (id: string, extraMonthly: number) =>
    api.post<SimulateResult>(`/debts/${id}/simulate-extra`, { extraMonthly }),
  // FIN-012: abono a capital y pago total anticipado (reales).
  prepayPreview: (id: string, amount: number, effect: PrepayEffect) =>
    api.post<PrepayReceipt>(`/debts/${id}/prepay-preview`, { amount, effect }),
  prepay: (id: string, amount: number, effect: PrepayEffect) =>
    api.post<PrepayReceipt & { transactionId: string }>(`/debts/${id}/prepay`, { amount, effect }),
  payoff: (id: string) =>
    api.post<{ paidAmount: number; status: string; transactionId: string }>(`/debts/${id}/payoff`, {}),
  // FIN-013: seguros del crédito.
  listInsurances: (id: string) => api.get<DebtInsurance[]>(`/debts/${id}/insurances`),
  createInsurance: (id: string, input: CreateDebtInsuranceInput) =>
    api.post<DebtInsurance>(`/debts/${id}/insurances`, input),
  updateInsurance: (insuranceId: string, input: Partial<CreateDebtInsuranceInput> & { active?: boolean }) =>
    api.patch<DebtInsurance>(`/debts/insurances/${insuranceId}`, input),
  removeInsurance: (insuranceId: string) =>
    api.delete<{ deleted: boolean }>(`/debts/insurances/${insuranceId}`),
  // FIN-036: confirmación de actualización por corte (nivel 2, §42).
  pendingReviews: () => api.get<PendingReview[]>('/debts/reviews'),
  answerReview: (debtId: string, field: string, input: { changed: boolean; newValue?: number }) =>
    api.post<{ reviewed: boolean; changed: boolean; acknowledgment: string }>(
      `/debts/${debtId}/reviews/${field}`,
      input,
    ),
  // FIN-031: tarjeta de crédito — cupo y compras a cuotas.
  cardSummary: (debtId: string) => api.get<CardSummary>(`/debts/cards/${debtId}`),
  registerPurchase: (debtId: string, input: { amount: number; installments: number; withInterest?: boolean; note?: string }) =>
    api.post<{ acknowledgment: string; summary: CardSummary }>(`/debts/cards/${debtId}/purchases`, input),
  voidPurchase: (purchaseId: string) =>
    api.delete<{ voided: boolean }>(`/debts/cards/purchases/${purchaseId}`),
};

// FIN-034: catálogo de entidades (reconocimiento, no recomendación).
export const entitiesApi = {
  search: (q?: string, type?: string) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (type) params.set('type', type);
    const qs = params.toString();
    return api.get<FinancialEntity[]>(`/entities${qs ? `?${qs}` : ''}`);
  },
  create: (input: { name: string; type: string; typicalRate?: number }) =>
    api.post<FinancialEntity>('/entities', input),
};

export const transactionsApi = {
  list: (params?: string) => api.get<Transaction[]>(`/transactions${params ?? ''}`),
  dashboard: () => api.get<Dashboard>('/transactions/dashboard'),
  create: (input: CreateTransactionInput) =>
    api.post<Transaction>('/transactions', input),
  // FIN-028: editar (parcial) y anular (deletedAt) — servicio central único.
  update: (id: string, input: Partial<CreateTransactionInput>) =>
    api.patch<Transaction>(`/transactions/${id}`, input),
  remove: (id: string) => api.delete<{ deleted: boolean }>(`/transactions/${id}`),
};

export const categoriesApi = {
  list: (kind?: string) =>
    api.get<Category[]>(`/categories${kind ? `?kind=${kind}` : ''}`),
};

// FIN-014: Dashboard de Inicio v2 (el endpoint clásico se conserva).
export const dashboardApi = {
  home: () => api.get<HomeDashboard>('/dashboard/home'),
};

export const billingApi = {
  me: () => api.get<BillingStatus>('/billing/me'),
  redeem: (code: string) => api.post<{ redeemed: boolean; days: number }>('/billing/redeem', { code }),
  funnel: (event: 'paywall_view' | 'upgrade_intent', source?: string) =>
    api.post<void>('/billing/funnel', { event, source }),
};

export const gamificationApi = {
  profile: () => api.get<GamificationProfile>('/gamification/profile'),
  markSeen: () => api.post<{ ok: boolean }>('/gamification/achievements/seen'),
};

export const simulationsApi = {
  run: (input: { type: SimulationType } & Record<string, number | string | undefined>) =>
    api.post<SimulationResult>('/simulations', input),
  // FIN-026 P5: lo persistido por fin visible (últimas 20 del backend).
  history: () => api.get<SimulationHistoryEntry[]>('/simulations'),
};

export const recommendationsApi = {
  list: () => api.get<Recommendation[]>('/recommendations'),
  setStatus: (id: string, status: 'seen' | 'dismissed' | 'done') =>
    api.patch<Recommendation>(`/recommendations/${id}`, { status }),
};

export const insightsApi = {
  list: () => api.get<Insight[]>('/insights'),
  setStatus: (id: string, status: 'seen' | 'dismissed') =>
    api.patch<Insight>(`/insights/${id}`, { status }),
  preferences: () => api.get<{ proactiveEnabled: boolean }>('/insights/preferences'),
  setProactive: (enabled: boolean) =>
    api.patch<{ proactiveEnabled: boolean }>('/insights/preferences', { proactiveEnabled: enabled }),
};

export const copilotApi = {
  send: (content: string, conversationId?: string) =>
    api.post<CopilotReply>('/copilot/messages', { content, conversationId }),
  conversations: () => api.get<CopilotConversation[]>('/copilot/conversations'),
  messages: (id: string) => api.get<CopilotMessage[]>(`/copilot/conversations/${id}/messages`),
  deleteHistory: () => api.delete<{ deletedConversations: number }>('/copilot/history'),
  consentStatus: () => api.get<AiConsentStatus>('/copilot/consent'),
  grantConsent: () => api.post<{ accepted: boolean }>('/copilot/consent'),
  revokeConsent: () => api.delete<{ accepted: boolean }>('/copilot/consent'),
};

export const healthApi = {
  score: () => api.get<HealthScore>('/health/score'),
  history: () => api.get<ScoreHistoryPoint[]>('/health/score/history'),
};

export const accountsApi = {
  netWorth: () => api.get<NetWorth>('/net-worth'),
  listAccounts: () => api.get<Account[]>('/accounts'),
  createAccount: (input: CreateAccountInput) => api.post<Account>('/accounts', input),
  updateBalance: (id: string, balance: number) =>
    api.patch<Account>(`/accounts/${id}/balance`, { balance }),
  removeAccount: (id: string) => api.delete<{ deleted: boolean }>(`/accounts/${id}`),
  listAssets: () => api.get<Asset[]>('/assets'),
  createAsset: (input: CreateAssetInput) => api.post<Asset>('/assets', input),
  removeAsset: (id: string) => api.delete<{ deleted: boolean }>(`/assets/${id}`),
};

export const budgetApi = {
  monthly: () => api.get<MonthlyBudget>('/budget/monthly'),
  listFixed: () => api.get<FixedItem[]>('/budget/fixed-items'),
  createFixed: (input: CreateFixedItemInput) =>
    api.post<FixedItem>('/budget/fixed-items', input),
  removeFixed: (id: string) => api.delete<{ deleted: boolean }>(`/budget/fixed-items/${id}`),
  setCycleDay: (cycleStartDay: number) =>
    api.patch<{ cycleStartDay: number }>('/budget/period', { cycleStartDay }),
};

export const incomeApi = {
  summary: () => api.get<NetIncomeSummary>('/income/summary'),
  getProfile: () => api.get<IncomeProfile | null>('/income/profile'),
  setProfile: (workProfile: string) => api.post<IncomeProfile>('/income/profile', { workProfile }),
  listSources: () => api.get<IncomeSource[]>('/income/sources'),
  createSource: (input: CreateIncomeSourceInput) => api.post<IncomeSource>('/income/sources', input),
  removeSource: (id: string) => api.delete<{ deleted: boolean }>(`/income/sources/${id}`),
  createDeduction: (sourceId: string, input: CreateDeductionInput) =>
    api.post(`/income/sources/${sourceId}/deductions`, input),
  removeDeduction: (id: string) => api.delete<{ deleted: boolean }>(`/income/deductions/${id}`),
};

export const suggestionsApi = {
  list: () => api.get<Suggestion[]>('/suggestions'),
  compareStrategies: (extraBudget: number) =>
    api.post<StrategyComparison>('/simulator/strategy', { extraBudget }),
};

export const devicesApi = {
  register: (pushToken: string, platform?: string, appVersion?: string) =>
    api.post<{ id: string; registered: boolean }>('/devices', {
      pushToken,
      platform,
      appVersion,
    }),
};

export const whatsappApi = {
  startLink: (phoneE164: string) =>
    api.post<StartLinkResult>('/whatsapp/link/start', { phoneE164 }),
  unlink: () => api.delete<{ revoked: boolean }>('/whatsapp/link'),
};

export const telegramApi = {
  startLink: () => api.post<StartTelegramLinkResult>('/telegram/link/start'),
  unlink: () => api.delete<{ revoked: boolean }>('/telegram/link'),
};

// --- Tipos de entrada ---

export interface CreateDebtInput {
  name: string;
  debtType: string;
  originalAmount: number;
  currentBalance: number;
  startDate: string;
  // FIN-032: opcionales — el servicio exige plazo solo para tipos amortizados y
  // cuota pactada solo para informales (según el descriptor).
  termMonths?: number;
  interestRate?: number;
  rateBasis?: string;
  rateKind?: 'fija' | 'variable';
  monthlyPayment?: number;
  paymentDay?: number;
  // FIN-031: cupo de la tarjeta de crédito (el saldo se deriva de sus compras).
  creditLimit?: number;
  // FIN-034: la entidad reconocida (opcional — el camino libre no la exige).
  entityId?: string;
}

export interface CreateAccountInput {
  name: string;
  type: string;
  currentBalance?: number;
  isLiquid?: boolean;
  isEmergencyFund?: boolean;
  includeInNetWorth?: boolean;
}

export interface CreateAssetInput {
  name: string;
  type: string;
  currentValue: number;
  includeInNetWorth?: boolean;
}

export interface CreateIncomeSourceInput {
  kind?: string;
  name: string;
  amount: number;
  isVariable?: boolean;
  dayOfMonth?: number;
}

export interface CreateDeductionInput {
  kind?: string;
  name: string;
  percent?: number;
  fixedAmount?: number;
  base?: string;
  baseAmount?: number;
  withheldAtSource?: boolean;
}

export interface CreateFixedItemInput {
  kind: FixedKind;
  name: string;
  amount: number;
  dayOfMonth?: number;
  categoryId?: string;
  notes?: string;
}

export interface CreateTransactionInput {
  kind: TxKind;
  amount: number;
  occurredAt: string;
  debtId?: string;
  categoryId?: string;
  note?: string;
}

export interface CreateDebtInsuranceInput {
  kind?: string;
  name: string;
  monthlyPremium: number;
  financed?: boolean;
  endorsed?: boolean;
  insurer?: string;
  notes?: string;
}

export interface SimulateResult {
  baseline: { months: number; totalInterest: number; payoffDate: string };
  withExtra: { months: number; totalInterest: number; payoffDate: string };
  interestSaved: number;
  monthsSaved: number;
}

export interface StrategyComparison {
  avalanche: { months: number; totalInterest: number; order: string[] };
  snowball: { months: number; totalInterest: number; order: string[] };
  recommended: string;
  interestDifference: number;
}
