import { Controller, Get, Injectable, Logger, Post, UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { ENGINE_TZ } from '../financial-engine/engine.constants';
import { SnapshotJob } from '../financial-engine/jobs/snapshot.job';
import { GamificationService } from './gamification.service';

/** Listener de eventos: racha + logros inmediatos (FIN-008 §4.1/§4.2). */
@Injectable()
export class GamificationListener {
  constructor(private readonly gamification: GamificationService) {}

  @OnEvent('transaction.created')
  async onTransaction(payload: { userId?: string }): Promise<void> {
    if (!payload?.userId) return;
    await this.gamification.registerActivity(payload.userId).catch(() => undefined);
    await this.gamification.unlock(payload.userId, 'primer_movimiento').catch(() => undefined);
  }

  @OnEvent('debt.created')
  async onDebt(payload: { userId?: string }): Promise<void> {
    if (payload?.userId) await this.gamification.unlock(payload.userId, 'primera_deuda').catch(() => undefined);
  }

  @OnEvent('account.created')
  @OnEvent('asset.changed')
  async onAccount(payload: { userId?: string }): Promise<void> {
    if (payload?.userId) await this.gamification.unlock(payload.userId, 'primera_cuenta').catch(() => undefined);
  }

  @OnEvent('fixed_item.changed')
  async onFixed(payload: { userId?: string }): Promise<void> {
    if (payload?.userId) await this.gamification.unlock(payload.userId, 'primer_presupuesto').catch(() => undefined);
  }
}

/**
 * Job nightly (3:15 AM Bogotá): asigna reto (día 1 o si falta), evalúa
 * progreso/cierre y logros derivados de métricas. Usuarios activos (90d).
 */
@Injectable()
export class GamificationJob {
  private readonly logger = new Logger(GamificationJob.name);

  constructor(
    private readonly gamification: GamificationService,
    private readonly snapshot: SnapshotJob,
  ) {}

  @Cron('0 15 3 * * *', { timeZone: ENGINE_TZ })
  async run(now: Date = new Date()): Promise<{ users: number; unlocked: number }> {
    const userIds = await this.snapshot.activeUserIds(now);
    let unlocked = 0;
    for (const userId of userIds) {
      try {
        await this.gamification.assignChallenge(userId, now);
        await this.gamification.evaluateChallenge(userId, now);
        unlocked += await this.gamification.evaluateAchievements(userId, now);
      } catch (e) {
        this.logger.error(`gamificación(${userId}) falló: ${(e as Error).message}`);
      }
    }
    this.logger.log(`Gamificación: ${unlocked} logro(s) nuevos en ${userIds.length} usuario(s)`);
    return { users: userIds.length, unlocked };
  }
}

@ApiTags('gamification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  @Get('profile')
  profile(@CurrentUser() user: AuthUser) {
    return this.gamification.profile(user.id);
  }

  /** Cierra la celebración in-app (marca los logros como vistos). */
  @Post('achievements/seen')
  async seen(@CurrentUser() user: AuthUser) {
    await this.gamification.markSeen(user.id);
    return { ok: true };
  }
}
