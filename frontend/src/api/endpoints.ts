import { api } from './client';
import {
  AmortizationEntry,
  Account,
  Asset,
  AuthResult,
  Category,
  Dashboard,
  Debt,
  DebtsSummary,
  FixedItem,
  FixedKind,
  MonthlyBudget,
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
