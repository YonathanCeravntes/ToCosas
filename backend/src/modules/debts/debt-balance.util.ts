import { PrismaService } from '../../prisma/prisma.service';
import { scheduleModelFor } from './product-type.descriptor';

type DebtRow = { id: string; debtType: string; currentBalance: unknown };

/**
 * BT-021 · Saldo REAL de cada deuda para sumar pasivos (patrimonio, Motor, Copiloto).
 * Una tarjeta (`cuotas_por_compra`) guarda currentBalance = 0 por diseño (FIN-031): su
 * saldo son las cuotas pendientes de sus compras. Sumar `currentBalance` a secas
 * dejaba el patrimonio sin la tarjeta (misma causa que BT-016 en "Deuda total").
 */
export async function effectiveDebtBalances(prisma: PrismaService, debts: DebtRow[]): Promise<Map<string, number>> {
  const out = new Map(debts.map((d) => [d.id, Number(d.currentBalance ?? 0)]));
  const cardIds = debts.filter((d) => scheduleModelFor(d.debtType) === 'cuotas_por_compra').map((d) => d.id);
  if (cardIds.length === 0) return out;
  const purchases = await prisma.cardPurchase.findMany({
    where: { debtId: { in: cardIds }, deletedAt: null },
    include: { installments: { where: { deletedAt: null, paidAt: null } } },
  });
  for (const id of cardIds) out.set(id, 0);
  for (const p of purchases) {
    const pending = p.installments.reduce((a, i) => a + Number(i.amount), 0);
    out.set(p.debtId, (out.get(p.debtId) ?? 0) + pending);
  }
  return out;
}

/** Σ saldos reales (tarjetas incluidas) — el pasivo de `computeNetWorth`. */
export async function totalLiabilities(prisma: PrismaService, debts: DebtRow[]): Promise<number> {
  const m = await effectiveDebtBalances(prisma, debts);
  let total = 0;
  for (const v of m.values()) total += v;
  return total;
}
