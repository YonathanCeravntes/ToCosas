import { computeNetWorth } from './networth.util';

describe('computeNetWorth', () => {
  it('patrimonio = activos + saldos − pasivos', () => {
    const r = computeNetWorth(
      [
        { currentBalance: 1_000_000, isLiquid: true, includeInNetWorth: true, isEmergencyFund: false },
        { currentBalance: 500_000, isLiquid: true, includeInNetWorth: true, isEmergencyFund: true },
      ],
      [{ currentValue: 250_000_000, includeInNetWorth: true }],
      80_000_000,
    );
    expect(r.totalAccounts).toBe(1_500_000);
    expect(r.totalAssetsOnly).toBe(250_000_000);
    expect(r.totalAssets).toBe(251_500_000);
    expect(r.totalLiabilities).toBe(80_000_000);
    expect(r.netWorth).toBe(171_500_000);
  });

  it('liquidez suma solo cuentas líquidas', () => {
    const r = computeNetWorth(
      [
        { currentBalance: 1_000_000, isLiquid: true, includeInNetWorth: true, isEmergencyFund: false },
        { currentBalance: 9_000_000, isLiquid: false, includeInNetWorth: true, isEmergencyFund: false },
      ],
      [],
      0,
    );
    expect(r.totalLiquid).toBe(1_000_000);
    expect(r.totalAccounts).toBe(10_000_000);
  });

  it('fondo de emergencia se totaliza aunque no cuente para patrimonio', () => {
    const r = computeNetWorth(
      [
        { currentBalance: 3_000_000, isLiquid: true, includeInNetWorth: false, isEmergencyFund: true },
      ],
      [],
      0,
    );
    expect(r.totalEmergencyFund).toBe(3_000_000);
    expect(r.totalAccounts).toBe(0); // excluido de patrimonio
    expect(r.netWorth).toBe(0);
  });

  it('excluye cuentas/activos con includeInNetWorth=false', () => {
    const r = computeNetWorth(
      [{ currentBalance: 1_000_000, isLiquid: true, includeInNetWorth: false, isEmergencyFund: false }],
      [{ currentValue: 5_000_000, includeInNetWorth: false }],
      0,
    );
    expect(r.netWorth).toBe(0);
  });

  it('patrimonio negativo cuando los pasivos superan los activos', () => {
    const r = computeNetWorth(
      [{ currentBalance: 1_000_000, isLiquid: true, includeInNetWorth: true, isEmergencyFund: false }],
      [],
      5_000_000,
    );
    expect(r.netWorth).toBe(-4_000_000);
  });
});
