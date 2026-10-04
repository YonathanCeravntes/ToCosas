/**
 * FIN-057 · La BASE de ingreso de "Te queda" se arma POR PARTES (decisión del Fundador
 * 2026-10-02, que corrige el efecto no deseado de BT-004):
 *
 *   parte fija     = max( salario neto declarado + deducciones auto-pagadas , salario RECIBIDO )
 *   parte variable = max( ingreso variable estimado , ingreso extra RECIBIDO )
 *   base           = parte fija + parte variable
 *
 * Antes la base era max(declarado total, recibido total): si el salario estaba declarado y
 * no se registraba como movimiento, lo recibido (solo el rebusque: Didi, ventas…) nunca
 * superaba lo declarado y esa plata desaparecía de la cuenta. Comparar salario con salario
 * y extra con extra sigue evitando el doble conteo y hace que lo extra siempre cuente.
 *
 * "Salario recibido" = movimientos de ingreso cuya categoría es la de salario (la global
 * "Salario" o una propia que se llame así) O SIN categoría: un ingreso sin categoría es
 * ambiguo ("me pagaron 3.200.000" por el bot) y se compara con el salario, como antes, para
 * no contarlo doble. "Extra" = ingresos con cualquier otra categoría (Plataformas, Ventas,
 * Freelance, Regalo…). Por eso el bot y Registrar ponen la categoría del rebusque solos.
 * Este util es la ÚNICA definición de esa separación (§32): la usan "Te queda" e Inicio.
 */
const round2 = (n: number) => Math.round(n * 100) / 100;

export function isSalaryCategory(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = name.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  return n === 'salario' || n === 'sueldo' || n === 'nomina';
}

export interface IncomeSplitInput {
  /** Salario neto declarado (fuente única de FIN-027). */
  netFixedTotal: number;
  /** Deducciones que la persona paga ella misma (siguen como compromiso; FIN-027 P2). */
  selfPaidDeductionsTotal: number;
  /** Estimado mensual de las fuentes variables declaradas. */
  grossVariableEstimate: number;
  /** Ingresos del ciclo en la categoría de salario o sin categoría. */
  receivedSalary: number;
  /** Ingresos del ciclo con otra categoría (rebusque, ventas, regalos…). */
  receivedExtra: number;
}

export interface IncomeSplit {
  fixedBase: number;
  variableBase: number;
  incomeBase: number;
}

export function splitIncomeBase(i: IncomeSplitInput): IncomeSplit {
  const declaredFixed = round2(i.netFixedTotal + i.selfPaidDeductionsTotal);
  const fixedBase = round2(Math.max(declaredFixed, i.receivedSalary));
  const variableBase = round2(Math.max(i.grossVariableEstimate, i.receivedExtra));
  return { fixedBase, variableBase, incomeBase: round2(fixedBase + variableBase) };
}
