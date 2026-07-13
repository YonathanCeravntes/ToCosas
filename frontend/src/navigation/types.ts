import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type DebtsStackParamList = {
  DebtsList: undefined;
  DebtDetail: { debtId: string; name: string };
  AddDebt: undefined;
};

export type MainTabsParamList = {
  Dashboard: undefined;
  Health: undefined;
  Debts: NavigatorScreenParams<DebtsStackParamList>;
  Budget: undefined;
  Add: undefined;
  Insights: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabsParamList>;
  LinkWhatsApp: undefined;
  LinkTelegram: undefined;
  Accounts: undefined;
  // FIN-026 P1: las jugadas llegan con la pregunta armada (escenario + params).
  Simulator: { scenario?: string; params?: Record<string, string | number> } | undefined;
  Achievements: undefined;
  MilloPlus: { source?: string } | undefined;
};
