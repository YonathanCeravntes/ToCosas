import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SpendableService } from '../budget/spendable.service';
import { CashflowPlanService } from '../debts/cashflow-plan.service';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');
/** Solo se avisa "te sobró" si lo libre vale la pena mover (y queda poco del ciclo). */
export const SOBRO_MIN_AMOUNT = 100_000;
export const SOBRO_DAYS_LEFT = 5;

/**
 * FIN-046 Fase 3 · "Te sobró plata → abónala a <deuda del plan>". Cerca del cierre del
 * ciclo, si "Te queda" (§32) sigue alto, crea UN insight por ciclo con el consejo del
 * plan para liberar flujo (FIN-045). Lo entrega `ProactivityJob` con su tope anti-fatiga.
 */
@Injectable()
export class CashflowAlertsService {
  private readonly logger = new Logger(CashflowAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly spendable: SpendableService,
    private readonly plan: CashflowPlanService,
  ) {}

  async run(now = new Date()): Promise<number> {
    const users = await this.prisma.debt.findMany({
      where: { deletedAt: null, status: 'activa', user: { deletedAt: null } },
      distinct: ['userId'],
      select: { userId: true },
    });
    let created = 0;
    for (const { userId } of users) {
      try {
        if (await this.forUser(userId, now)) created += 1;
      } catch (e) {
        this.logger.warn(`Alerta de flujo falló para un usuario: ${(e as Error).message}`);
      }
    }
    if (created) this.logger.log(`Alertas "te sobró": ${created}`);
    return created;
  }

  async forUser(userId: string, now = new Date()): Promise<boolean> {
    const tq = await this.spendable.compute(userId, now);
    if (tq.daysLeft > SOBRO_DAYS_LEFT || tq.amount < SOBRO_MIN_AMOUNT) return false;
    const plan = await this.plan.forUser(userId);
    const step = plan.steps[0];
    if (!step || plan.toDebt <= 0) return false;
    const cycleKey = tq.until.slice(0, 10);
    const dedupeKey = `fin046_sobro_${cycleKey}`;
    const exists = await this.prisma.insight.findUnique({ where: { userId_dedupeKey: { userId, dedupeKey } } });
    if (exists) return false;
    await this.prisma.insight.create({
      data: {
        userId,
        type: 'oportunidad',
        severity: 'warning',
        title: `Te quedan ${fmt(tq.amount)} y el ciclo termina en ${tq.daysLeft} día${tq.daysLeft === 1 ? '' : 's'}`,
        body:
          `Si le abonas ${fmt(plan.toDebt)} a ${step.name}, la terminas antes y liberas ${fmt(step.payment)} al mes.` +
          (plan.toColchon > 0 ? ` Guarda ${fmt(plan.toColchon)} para tu colchón.` : '') +
          ' Tu plan completo: app → Salud → Ver mi plan.',
        dedupeKey,
        payload: { teQueda: Math.round(tq.amount), toDebt: plan.toDebt, toColchon: plan.toColchon, firstFrees: step.payment },
        validUntil: new Date(tq.until),
      },
    });
    return true;
  }
}
