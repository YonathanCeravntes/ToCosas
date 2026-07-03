import { api } from './client';
import {
  AmortizationEntry,
  AuthResult,
  Dashboard,
  Debt,
  DebtsSummary,
  StartLinkResult,
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

export const suggestionsApi = {
  list: () => api.get<Suggestion[]>('/suggestions'),
  compareStrategies: (extraBudget: number) =>
    api.post<StrategyComparison>('/simulator/strategy', { extraBudget }),
};

export const whatsappApi = {
  startLink: (phoneE164: string) =>
    api.post<StartLinkResult>('/whatsapp/link/start', { phoneE164 }),
  unlink: () => api.delete<{ revoked: boolean }>('/whatsapp/link'),
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

export interface CreateTransactionInput {
  kind: TxKind;
  amount: number;
  occurredAt: string;
  debtId?: string;
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
