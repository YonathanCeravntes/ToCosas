import { isSalaryCategory, splitIncomeBase } from './income-split.util';

describe('splitIncomeBase (FIN-057, base de "Te queda" por partes)', () => {
  const declared = { netFixedTotal: 3_200_000, selfPaidDeductionsTotal: 0, grossVariableEstimate: 0 };

  it('caso del Fundador: salario declarado sin registrar + carreras de Didi → las carreras SÍ cuentan', () => {
    const r = splitIncomeBase({ ...declared, receivedSalary: 0, receivedExtra: 224_000 });
    expect(r).toEqual({ fixedBase: 3_200_000, variableBase: 224_000, incomeBase: 3_424_000 });
  });

  it('salario declarado Y registrado como movimiento: no se cuenta doble', () => {
    const r = splitIncomeBase({ ...declared, receivedSalary: 3_200_000, receivedExtra: 224_000 });
    expect(r.incomeBase).toBe(3_424_000);
  });

  it('si llegó MÁS salario del declarado (prima, horas extra en nómina) manda lo recibido', () => {
    const r = splitIncomeBase({ ...declared, receivedSalary: 3_500_000, receivedExtra: 0 });
    expect(r.fixedBase).toBe(3_500_000);
  });

  it('con estimado variable declarado, la parte variable es el mayor entre estimado y recibido', () => {
    expect(splitIncomeBase({ ...declared, grossVariableEstimate: 300_000, receivedSalary: 0, receivedExtra: 224_000 }).variableBase).toBe(300_000);
    expect(splitIncomeBase({ ...declared, grossVariableEstimate: 300_000, receivedSalary: 0, receivedExtra: 410_000 }).variableBase).toBe(410_000);
  });

  it('sin perfil de ingresos todo sale de lo recibido (regresión FIN-020 Alt A)', () => {
    const r = splitIncomeBase({ netFixedTotal: 0, selfPaidDeductionsTotal: 0, grossVariableEstimate: 0, receivedSalary: 0, receivedExtra: 500_000 });
    expect(r.incomeBase).toBe(500_000);
  });

  it('deducciones auto-pagadas forman parte del take-home fijo (FIN-027 P2)', () => {
    const r = splitIncomeBase({ netFixedTotal: 3_680_000, selfPaidDeductionsTotal: 160_000, grossVariableEstimate: 0, receivedSalary: 0, receivedExtra: 0 });
    expect(r.fixedBase).toBe(3_840_000);
  });

  it('isSalaryCategory reconoce Salario/Sueldo/Nómina sin importar tildes ni mayúsculas', () => {
    expect(isSalaryCategory('Salario')).toBe(true);
    expect(isSalaryCategory('NÓMINA')).toBe(true);
    expect(isSalaryCategory('Plataformas')).toBe(false);
    expect(isSalaryCategory(null)).toBe(false);
  });
});
