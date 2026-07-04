/**
 * Cálculo determinista de patrimonio (FIN-002). Puro y testeable: no toca la DB.
 *
 *   netWorth = Σ activos + Σ saldos de cuentas − Σ pasivos (deudas)
 *
 * Solo cuentan las cuentas/activos con `includeInNetWorth = true`. La liquidez
 * suma únicamente cuentas marcadas `isLiquid`.
 */
export interface AccountLike {
  currentBalance: number;
  isLiquid: boolean;
  includeInNetWorth: boolean;
  isEmergencyFund: boolean;
}

export interface AssetLike {
  currentValue: number;
  includeInNetWorth: boolean;
}

export interface NetWorthResult {
  netWorth: number;
  totalAssets: number; // activos + saldos incluidos en patrimonio
  totalLiquid: number; // saldos líquidos incluidos en patrimonio
  totalEmergencyFund: number; // saldos en cuentas marcadas como fondo de emergencia
  totalAccounts: number; // saldos de cuentas incluidos en patrimonio
  totalAssetsOnly: number; // solo activos incluidos en patrimonio
  totalLiabilities: number; // deudas
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function computeNetWorth(
  accounts: AccountLike[],
  assets: AssetLike[],
  liabilities: number,
): NetWorthResult {
  let totalAccounts = 0;
  let totalLiquid = 0;
  let totalEmergencyFund = 0;
  for (const a of accounts) {
    if (a.isEmergencyFund) totalEmergencyFund += a.currentBalance;
    if (!a.includeInNetWorth) continue;
    totalAccounts += a.currentBalance;
    if (a.isLiquid) totalLiquid += a.currentBalance;
  }

  let totalAssetsOnly = 0;
  for (const asset of assets) {
    if (!asset.includeInNetWorth) continue;
    totalAssetsOnly += asset.currentValue;
  }

  const totalAssets = totalAccounts + totalAssetsOnly;
  const totalLiabilities = liabilities;
  return {
    netWorth: r2(totalAssets - totalLiabilities),
    totalAssets: r2(totalAssets),
    totalLiquid: r2(totalLiquid),
    totalEmergencyFund: r2(totalEmergencyFund),
    totalAccounts: r2(totalAccounts),
    totalAssetsOnly: r2(totalAssetsOnly),
    totalLiabilities: r2(totalLiabilities),
  };
}
