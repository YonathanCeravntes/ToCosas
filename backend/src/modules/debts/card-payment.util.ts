import { Prisma } from '@prisma/client';
import { scheduleModelFor } from './product-type.descriptor';

/**
 * FIN-043 (BT-018) · Un pago a una TARJETA se aplica a sus cuotas pendientes, de la más
 * antigua a la más nueva (orden de vencimiento). Antes el pago descontaba
 * `current_balance`, que en tarjetas es 0 por diseño (FIN-031): el saldo no bajaba y la
 * tarjeta podía quedar marcada "pagada". Funciones sobre la transacción de BD abierta
 * por `TransactionsService` (misma atomicidad que el resto del pago).
 *
 * Reglas:
 *  - Cuota cubierta por completo → `paid_at` + `paid_tx_id`.
 *  - Cuota cubierta en parte → se separa la parte pagada en una fila propia
 *    (`split_of_id` = cuota original) y la original conserva lo que falta.
 *  - Sobrante (pagó más de lo que debe) → se devuelve como `leftover`; no se inventa deuda
 *    negativa.
 *  - `next_due_date` de la tarjeta = vencimiento de la cuota pendiente más próxima.
 */
type Tx = Prisma.TransactionClient;

export async function isCardDebt(tx: Tx, userId: string, debtId: string): Promise<boolean> {
  const debt = await tx.debt.findFirst({ where: { id: debtId, userId, deletedAt: null }, select: { debtType: true } });
  return !!debt && scheduleModelFor(debt.debtType) === 'cuotas_por_compra';
}

export async function applyCardPayment(
  tx: Tx,
  debtId: string,
  amount: number,
  paidTxId: string,
  paidAt: Date,
): Promise<{ applied: number; leftover: number; paidInstallments: number }> {
  const pending = await tx.cardInstallment.findMany({
    where: { purchase: { debtId, deletedAt: null }, deletedAt: null, paidAt: null },
    orderBy: [{ dueDate: 'asc' }, { periodNo: 'asc' }],
  });
  let remaining = round2(amount);
  let paidInstallments = 0;
  for (const inst of pending) {
    if (remaining <= 0.005) break;
    const due = Number(inst.amount);
    if (remaining + 0.005 >= due) {
      await tx.cardInstallment.update({ where: { id: inst.id }, data: { paidAt, paidTxId } });
      remaining = round2(remaining - due);
      paidInstallments++;
    } else {
      // Pago parcial: la parte pagada nace como fila propia; la original conserva el resto.
      await tx.cardInstallment.create({
        data: {
          cardPurchaseId: inst.cardPurchaseId,
          periodNo: inst.periodNo,
          dueDate: inst.dueDate,
          amount: remaining,
          paidAt,
          paidTxId,
          splitOfId: inst.id,
        },
      });
      await tx.cardInstallment.update({ where: { id: inst.id }, data: { amount: round2(due - remaining) } });
      remaining = 0;
    }
  }
  await refreshCardNextDue(tx, debtId);
  return { applied: round2(amount - remaining), leftover: remaining, paidInstallments };
}

/** Inverso exacto de `applyCardPayment` para el pago anulado. */
export async function revertCardPayment(tx: Tx, debtId: string, paidTxId: string): Promise<void> {
  const rows = await tx.cardInstallment.findMany({ where: { paidTxId, deletedAt: null } });
  for (const row of rows) {
    if (row.splitOfId) {
      const original = await tx.cardInstallment.findUnique({ where: { id: row.splitOfId } });
      if (original) {
        await tx.cardInstallment.update({
          where: { id: original.id },
          data: { amount: round2(Number(original.amount) + Number(row.amount)), paidAt: null, paidTxId: null },
        });
      }
      await tx.cardInstallment.delete({ where: { id: row.id } });
    } else {
      await tx.cardInstallment.update({ where: { id: row.id }, data: { paidAt: null, paidTxId: null } });
    }
  }
  await refreshCardNextDue(tx, debtId);
}

/** Próximo vencimiento de la tarjeta = la cuota pendiente más cercana (o null si no debe nada). */
export async function refreshCardNextDue(tx: Tx, debtId: string): Promise<void> {
  const next = await tx.cardInstallment.findFirst({
    where: { purchase: { debtId, deletedAt: null }, deletedAt: null, paidAt: null },
    orderBy: [{ dueDate: 'asc' }],
    select: { dueDate: true },
  });
  await tx.debt.update({ where: { id: debtId }, data: { nextDueDate: next?.dueDate ?? null, status: 'activa' } });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
