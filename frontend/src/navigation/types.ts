import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  // BT-025: el correo viaja entre Ingresar y Crear cuenta (no se vuelve a escribir).
  Login: { email?: string } | undefined;
  Register: { email?: string } | undefined;
  // FIN-039: recuperar contraseña (correo → código → nueva clave).
  ForgotPassword: { email?: string } | undefined;
};

export type DebtsStackParamList = {
  DebtsList: undefined;
  DebtDetail: { debtId: string; name: string };
  AddDebt: undefined;
  RenegotiateDebt: { debtId: string; name: string };
  // FIN-056: editar datos de la deuda (nombre, entidad, cupo, día de pago).
  EditDebt: { debtId: string; name: string };
};

/**
 * FIN-038 · Navegación 5 + 1: Inicio · Deudas · Registrar (centro) · Salud · Más.
 * Presupuesto, Copiloto y Ajustes viven en el stack raíz y se alcanzan desde
 * Inicio (hero → Presupuesto), Salud (puente → Copiloto) y la pestaña Más.
 */
export type MainTabsParamList = {
  Dashboard: undefined;
  Debts: NavigatorScreenParams<DebtsStackParamList>;
  Add: undefined;
  Health: undefined;
  More: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: undefined;
  Main: NavigatorScreenParams<MainTabsParamList>;
  Budget: undefined;
  // FIN-054: facturas, extractos y certificados.
  Documents: undefined;
  // FIN-056: gastos del ciclo por categoría ("En qué se te va" completo).
  /** FIN-057: pestaña inicial — gastos ("En qué se te va") o ingresos ("Cómo te llega la plata"). */
  Categories: { tab?: 'gastos' | 'ingresos' } | undefined;
  Copilot: undefined;
  Settings: undefined;
  // FIN-038: historial completo de movimientos con filtros.
  Transactions: { kind?: string; debtId?: string; categoryId?: string } | undefined;
  LinkWhatsApp: undefined;
  LinkTelegram: undefined;
  Accounts: undefined;
  /** FIN-045: plan para liberar flujo de caja. */
  CashflowPlan: undefined;
  IncomeProfile: undefined;
  // FIN-026 P1: las jugadas llegan con la pregunta armada (escenario + params).
  Simulator: { scenario?: string; params?: Record<string, string | number> } | undefined;
  Achievements: undefined;
  MilloPlus: { source?: string } | undefined;
};
