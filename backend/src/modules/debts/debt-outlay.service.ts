import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paymentBreakdown } from './payment-breakdown.util';

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
      include: { insurances: { where: { deletedAt: null } } },
    });
    const byDebt = new Map<string, DebtOutlay>();
    let total = 0;
    for (const d of debts) {
      const b = paymentBreakdown(Number(d.monthlyPayment ?? 0), d.insurances);
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
