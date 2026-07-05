import { api } from './client';
import {
  AiConsentStatus,
  AmortizationEntry,
  Account,
  Asset,
  AuthResult,
  CopilotConversation,
  CopilotMessage,
  CopilotReply,
  Category,
  Dashboard,
  Debt,
  DebtsSummary,
  FixedItem,
  FixedKind,
  GamificationProfile,
  HealthScore,
  Insight,
  MonthlyBudget,
  Recommendation,
  SimulationResult,
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
  get: (id: string) => api.get<Debt & { amortization: AmortizationEntry[] }>(`/debts/${id}`),
  amortization: (id: string) => api.get<AmortizationEntry[]>(`/debts/${id}/amortization`),
  create: (input: CreateDebtInput) => api.post<{ debt: Debt }>('/debts', input),
  simulateExtra: (id: string, extraMonthly: number) =>
    api.post<SimulateResult>(`/debts/${id}/simulate-extra`, { extraMonthly }),
};

export const transactionsApi = {
  list: (params?: string) => api.get<Transaction[]>(`/transactions${params ?? ''}`),
  dashboard: () => api.get<Dashboard>('/transactions/dashboard'),
  create: (input: CreateTransactionInput) =>
    api.post<Transaction>('/transactions', input),
};

export const categoriesApi = {
  list: (kind?: string) =>
    api.get<Category[]>(`/categories${kind ? `?kind=${kind}` : ''}`),
};

export const gamificationApi = {
  profile: () => api.get<GamificationProfile>('/gamification/profile'),
  markSeen: () => api.post<{ ok: boolean }>('/gamification/achievements/seen'),
};

export const simulationsApi = {
  run: (input: { type: SimulationType } & Record<string, number | string | undefined>) =>
    api.post<SimulationResult>('/simulations', input),
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
  termMonths: number;
  interestRate: number;
  rateBasis: string;
  paymentDay?: number;
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
