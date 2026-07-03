import { generateSuggestions, FinancialSnapshot } from './suggestions.engine';

const baseDebts = [
  { id: 'd1', name: 'Tarjeta BBVA', balance: 3_000_000, annualRatePct: 34 },
  { id: 'd2', name: 'Libre inversión', balance: 5_000_000, annualRatePct: 22 },
];

describe('generateSuggestions', () => {
  it('alerta de sobregiro cuando salidas > ingresos', () => {
    const snap: FinancialSnapshot = {
      income: 2_000_000,
      expense: 1_800_000,
      debtPayments: 700_000,
      debts: baseDebts,
    };
    const s = generateSuggestions(snap);
    const alert = s.find((x) => x.type === 'alerta_sobregiro');
    expect(alert).toBeDefined();
    expect(alert!.payload!.gap).toBe(500_000);
    // la alerta de sobregiro es la de mayor score
    expect(s[0].type).toBe('alerta_sobregiro');
  });

  it('prioriza la deuda de mayor tasa cuando hay tasas > 30% EA', () => {
    const snap: FinancialSnapshot = {
      income: 5_000_000,
      expense: 1_000_000,
      debtPayments: 800_000,
      debts: baseDebts,
    };
    const s = generateSuggestions(snap);
    const prio = s.find((x) => x.type === 'priorizar_deuda');
    expect(prio).toBeDefined();
    expect(prio!.payload!.debtId).toBe('d1'); // la del 34%
  });

  it('sugiere abono extra cuando hay flujo positivo', () => {
    const snap: FinancialSnapshot = {
      income: 5_000_000,
      expense: 1_000_000,
      debtPayments: 800_000,
      debts: baseDebts,
    };
    const s = generateSuggestions(snap);
    const extra = s.find((x) => x.type === 'abono_extra');
    expect(extra).toBeDefined();
    expect(extra!.payload!.suggestedExtra).toBe(3_200_000);
  });

  it('sugiere recorte en la categoría discrecional dominante', () => {
    const snap: FinancialSnapshot = {
      income: 5_000_000,
      expense: 2_000_000,
      debtPayments: 500_000,
      debts: [],
      spendByCategory: [
        { category: 'entretenimiento', amount: 800_000 },
        { category: 'servicios', amount: 300_000 },
      ],
    };
    const s = generateSuggestions(snap);
    const cut = s.find((x) => x.type === 'recorte_gasto');
    expect(cut).toBeDefined();
    expect(cut!.payload!.category).toBe('entretenimiento');
    expect(cut!.payload!.potential).toBe(160_000);
  });

  it('felicita cuando todo está sano y sin deudas caras', () => {
    const snap: FinancialSnapshot = {
      income: 5_000_000,
      expense: 1_000_000,
      debtPayments: 0,
      debts: [{ id: 'd', name: 'Hipoteca', balance: 100_000_000, annualRatePct: 12 }],
    };
    const s = generateSuggestions(snap);
    // hay flujo positivo pero solo 1 deuda (no dispara priorizar) y no es cara
    expect(s.some((x) => x.type === 'felicitacion' || x.type === 'abono_extra')).toBe(true);
  });

  it('ordena por score descendente', () => {
    const snap: FinancialSnapshot = {
      income: 2_000_000,
      expense: 1_800_000,
      debtPayments: 700_000,
      debts: baseDebts,
    };
    const s = generateSuggestions(snap);
    for (let i = 1; i < s.length; i++) {
      expect(s[i - 1].score).toBeGreaterThanOrEqual(s[i].score);
    }
  });
});
