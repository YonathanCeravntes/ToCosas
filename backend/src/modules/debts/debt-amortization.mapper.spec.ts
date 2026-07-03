import { debtToAmortizationInput, DebtLike } from './debt-amortization.mapper';

describe('debtToAmortizationInput', () => {
  const base: DebtLike = {
    currentBalance: 5_000_000,
    interestRate: 24,
    rateBasis: 'EA',
    termMonths: 24,
    startDate: new Date(Date.UTC(2026, 0, 10)),
    amortSystem: 'frances',
    paymentDay: 5,
  };

  it('amortiza sobre el saldo pendiente, no el original', () => {
    const input = debtToAmortizationInput(base);
    expect(input.principal).toBe(5_000_000);
  });

  it('respeta el día de pago en la fecha base de proyección', () => {
    const input = debtToAmortizationInput(base);
    expect(input.startDate.getUTCDate()).toBe(5);
  });

  it('mapea el sistema alemán', () => {
    const input = debtToAmortizationInput({ ...base, amortSystem: 'aleman' });
    expect(input.system).toBe('aleman');
  });

  it('cae a francés ante sistemas no soportados', () => {
    const input = debtToAmortizationInput({ ...base, amortSystem: 'tarjeta_rotativo' });
    expect(input.system).toBe('frances');
  });

  it('propaga el abono extra', () => {
    const input = debtToAmortizationInput(base, 100_000);
    expect(input.extraMonthly).toBe(100_000);
  });

  it('lanza error si no hay plazo válido', () => {
    expect(() => debtToAmortizationInput({ ...base, termMonths: null })).toThrow();
    expect(() => debtToAmortizationInput({ ...base, termMonths: 0 })).toThrow();
  });
});
