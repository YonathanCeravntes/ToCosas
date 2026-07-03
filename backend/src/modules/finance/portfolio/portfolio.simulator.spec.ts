import {
  compareStrategies,
  PortfolioDebt,
  simulatePortfolio,
} from './portfolio.simulator';

const debts: PortfolioDebt[] = [
  { id: 'tarjeta', name: 'Tarjeta', balance: 2_000_000, monthlyRate: 0.025, minPayment: 100_000 },
  { id: 'libre', name: 'Libre inversión', balance: 5_000_000, monthlyRate: 0.015, minPayment: 200_000 },
  { id: 'carro', name: 'Carro', balance: 8_000_000, monthlyRate: 0.01, minPayment: 300_000 },
];

describe('simulatePortfolio', () => {
  it('avalanche salda primero la deuda de mayor tasa (tarjeta)', () => {
    const r = simulatePortfolio(debts, 300_000, 'avalanche');
    expect(r.feasible).toBe(true);
    expect(r.payoffOrder[0]).toBe('tarjeta');
  });

  it('snowball salda primero la deuda de menor saldo (tarjeta aquí también)', () => {
    const r = simulatePortfolio(debts, 300_000, 'snowball');
    expect(r.payoffOrder[0]).toBe('tarjeta');
  });

  it('snowball difiere del avalanche cuando menor saldo ≠ mayor tasa', () => {
    const alt: PortfolioDebt[] = [
      { id: 'a', name: 'A', balance: 1_000_000, monthlyRate: 0.01, minPayment: 50_000 },
      { id: 'b', name: 'B', balance: 4_000_000, monthlyRate: 0.03, minPayment: 100_000 },
    ];
    expect(simulatePortfolio(alt, 200_000, 'avalanche').payoffOrder[0]).toBe('b'); // mayor tasa
    expect(simulatePortfolio(alt, 200_000, 'snowball').payoffOrder[0]).toBe('a'); // menor saldo
  });

  it('avalanche paga igual o menos interés total que snowball', () => {
    const { avalanche, snowball } = compareStrategies(debts, 300_000);
    expect(avalanche.totalInterest).toBeLessThanOrEqual(snowball.totalInterest);
  });

  it('todas las deudas quedan saldadas (orden completo)', () => {
    const r = simulatePortfolio(debts, 300_000, 'avalanche');
    expect(r.payoffOrder.sort()).toEqual(['carro', 'libre', 'tarjeta']);
  });

  it('un presupuesto mayor reduce los meses', () => {
    const slow = simulatePortfolio(debts, 100_000, 'avalanche');
    const fast = simulatePortfolio(debts, 1_000_000, 'avalanche');
    expect(fast.months).toBeLessThan(slow.months);
  });

  it('marca infeasible si el presupuesto no cubre ni los intereses', () => {
    const heavy: PortfolioDebt[] = [
      { id: 'x', name: 'X', balance: 10_000_000, monthlyRate: 0.05, minPayment: 1_000 },
    ];
    const r = simulatePortfolio(heavy, 0, 'avalanche');
    expect(r.feasible).toBe(false);
  });

  it('compareStrategies recomienda la de menor interés', () => {
    const cmp = compareStrategies(debts, 300_000);
    const expected =
      cmp.avalanche.totalInterest <= cmp.snowball.totalInterest ? 'avalanche' : 'snowball';
    expect(cmp.recommended).toBe(expected);
  });
});
