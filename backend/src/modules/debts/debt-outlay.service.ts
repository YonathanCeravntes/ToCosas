import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paymentBreakdown } from './payment-breakdown.util';
import { scheduleModelFor } from './product-type.descriptor';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** FIN-023: desembolso real por deuda — LA medida de "lo comprometido" (§32). */
export interface DebtOutlay {
  /** Cuota del crédito (contrato). */
  basePayment: number;
  /** Seguros/cargos activos que se pagan APARTE (los financiados YA van dentro). */
  separate: number;
  /** basePayment + separate = lo que de verdad sale del bolsillo al mes. */
  outlay: number;
}

/**
 * FIN-023 (DEC-0023 P2 Alt A) · Fuente ÚNICA de "lo comprometido" por deuda:
 * UNA consulta (deudas activas + seguros/cargos vivos) y UN cálculo (el
 * `paymentBreakdown` puro auditado de FIN-013). La inyectan teQueda, el Motor,
 * Presupuesto, el Copiloto, la mensajería y el summary de Deudas — cualquier
 * otra suma de `monthlyPayment` como compromiso viola §32.
 *
 * Vive en módulo HOJA propio (`DebtOutlayModule`) para que todas las capas
 * puedan importarlo sin el ciclo Messaging→Debts→Reminders→Whatsapp→Messaging.
 * Sin cargos aparte, `outlay === basePayment` (regresión fijada por test).
 */
@Injectable()
export class DebtOutlayService {
  constructor(private readonly prisma: PrismaService) {}

  async outlaysByUser(userId: string): Promise<{ byDebt: Map<string, DebtOutlay>; totalOutlay: number }> {
    const debts = await this.prisma.debt.findMany({
      where: { userId, deletedAt: null, status: 'activa' },
      include: {
        insurances: { where: { deletedAt: null } },
        // FIN-031 (DEC-0031 §3.1): para una tarjeta, "lo comprometido" son sus
        // CUOTAS de compra, no `monthlyPayment`. Esta es la ÚNICA ruta — todos
        // los consumidores (teQueda/presupuesto/Copiloto/Motor) las heredan por
        // inyección. Prohibida una 2ª ruta en CardService o el monthlyPayment
        // de la tarjeta como segundo origen.
        cardPurchases: {
          where: { deletedAt: null },
          include: { installments: { where: { deletedAt: null, paidAt: null }, orderBy: { periodNo: 'asc' } } },
        },
      },
    });
    const byDebt = new Map<string, DebtOutlay>();
    let total = 0;
    for (const d of debts) {
      // FIN-032: el compromiso base se despacha por `scheduleModel`, nunca por el
      // tipo. Para `cuotas_por_compra` (tarjeta/fintech) es la suma de la PRÓXIMA
      // cuota no pagada de cada compra viva (la factura del mes); sin compras cae a
      // monthlyPayment (regresión). Para `amortizado` y `saldo_y_cuota_pactada`
      // (informal, cuota pactada) es `monthlyPayment`. Una sola autoridad (§32).
      const cardMonthly = d.cardPurchases.reduce((acc, p) => {
        const next = p.installments[0];
        return acc + (next ? Number(next.amount) : 0);
      }, 0);
      const base =
        scheduleModelFor(d.debtType) === 'cuotas_por_compra' && d.cardPurchases.length > 0
          ? cardMonthly
          : Number(d.monthlyPayment ?? 0);
      const b = paymentBreakdown(base, d.insurances);
      byDebt.set(d.id, {
        basePayment: b.basePayment,
        separate: b.insuranceSeparate,
        outlay: b.totalMonthlyOutlay,
      });
      total += b.totalMonthlyOutlay;
    }
    return { byDebt, totalOutlay: round2(total) };
  }
}
