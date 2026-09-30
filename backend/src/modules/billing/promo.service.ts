import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionService } from './subscription.service';

interface RedeemedRow {
  id: string;
  duration_days: number;
}

/**
 * Códigos promocionales y activación administrativa (ARQ-0009 §4.3,
 * ManualPromoProvider). Superficie de fraude más directa del ciclo →
 * cambios obligatorios DEC-0009 §10.1/§10.2/§10.6 aplicados aquí.
 */
@Injectable()
export class PromoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionService,
  ) {}

  static hash(code: string): string {
    return createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
  }

  /**
   * Canje ATÓMICO (DEC-0009 §10.1 — mismo patrón validado del outbox): el
   * UPDATE incrementa `used_count` SOLO si quedan usos y no expiró, en un único
   * statement con RETURNING. Dos canjes concurrentes en el límite → exactamente
   * uno tiene éxito (test de concurrencia obligatorio).
   */
  async redeem(userId: string, code: string): Promise<{ days: number }> {
    const codeHash = PromoService.hash(code);
    const rows = await this.prisma.$queryRaw<RedeemedRow[]>`
      UPDATE promo_codes
      SET used_count = used_count + 1
      WHERE code_hash = ${codeHash}
        AND used_count < max_uses
        AND (expires_at IS NULL OR expires_at > now())
      RETURNING id, duration_days;
    `;
    if (rows.length === 0) {
      throw new BadRequestException('Código inválido, agotado o vencido.');
    }
    const days = rows[0].duration_days;
    await this.subscriptions.activate(userId, 'promo', days, rows[0].id);
    return { days };
  }

  /**
   * Crea un código (solo admin). DEC-0009 §10.6: `maxUses` es OBLIGATORIO a
   * nivel de servicio — un código sin tope es fraude sin límite.
   */
  async createCode(input: {
    code?: string;
    durationDays?: number;
    maxUses: number;
    expiresAt?: Date;
  }): Promise<{ code: string; maxUses: number; durationDays: number }> {
    if (!Number.isInteger(input.maxUses) || input.maxUses <= 0) {
      throw new BadRequestException('maxUses es obligatorio y debe ser un entero positivo.');
    }
    const code = (input.code ?? `MILLO-${randomBytes(4).toString('hex').toUpperCase()}`).trim().toUpperCase();
    const durationDays = input.durationDays ?? 30;
    await this.prisma.promoCode.create({
      data: {
        codeHash: PromoService.hash(code),
        durationDays,
        maxUses: input.maxUses,
        expiresAt: input.expiresAt ?? null,
      },
    });
    return { code, maxUses: input.maxUses, durationDays };
  }

  /**
   * Activación administrativa (DEC-0009 §10.2): requiere AdminGuard en el
   * endpoint y deja registro INMUTABLE (solo inserción) en AdminActionLog.
   */
  async adminActivate(adminUserId: string, targetUserId: string, days: number, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('El motivo (reason) es obligatorio.');
    if (!Number.isInteger(days) || days <= 0) throw new BadRequestException('days inválido.');
    const sub = await this.subscriptions.activate(targetUserId, 'manual', days);
    await this.prisma.adminActionLog.create({
      data: {
        adminUserId,
        targetUserId,
        action: `activate_premium_${days}d`,
        reason: reason.trim(),
      },
    });
    return sub;
  }
}
