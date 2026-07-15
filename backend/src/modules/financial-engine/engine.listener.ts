import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { EngineService } from './engine.service';
import { DEBOUNCE_MS } from './engine.constants';

/**
 * Consumidor de eventos de dominio del Motor (FIN-003). Los eventos llegan del
 * OutboxDispatcher (at-least-once). En vez de recomputar por cada evento, marca
 * el usuario como `dirty` y un drenaje periódico recomputa UNA vez por usuario
 * (debounce, DEC-0003 §4.1). `recompute` es de estado absoluto → idempotente.
 *
 * El dirty-set vive en memoria: si se pierde en un redeploy, el siguiente
 * evento o el job nocturno reconcilian (riesgo aceptado en DEC-0003 §8).
 */
@Injectable()
export class EngineListener {
  private readonly logger = new Logger(EngineListener.name);
  private readonly dirty = new Set<string>();
  private draining = false;

  constructor(private readonly engine: EngineService) {}

  @OnEvent('transaction.created')
  @OnEvent('transaction.updated')
  @OnEvent('transaction.deleted')
  @OnEvent('debt.created')
  @OnEvent('debt.updated')
  @OnEvent('debt.deleted')
  @OnEvent('fixed_item.changed')
  @OnEvent('account.created')
  @OnEvent('account.balance_updated')
  @OnEvent('account.deleted')
  @OnEvent('asset.changed')
  onDomainEvent(payload: { userId?: string }): void {
    if (payload?.userId) this.dirty.add(payload.userId);
  }

  /** Drenaje del dirty-set: una recomputación por usuario por ventana. */
  @Interval(DEBOUNCE_MS)
  async drain(): Promise<void> {
    if (this.draining || this.dirty.size === 0) return;
    this.draining = true;
    const users = [...this.dirty];
    this.dirty.clear();
    try {
      for (const userId of users) {
        try {
          await this.engine.recompute(userId);
        } catch (e) {
          // Reencolar al usuario fallido; el próximo drain reintenta.
          this.dirty.add(userId);
          this.logger.error(`recompute(${userId}) falló: ${(e as Error).message}`);
        }
      }
      if (users.length > 0) {
        this.logger.log(`Motor: métricas recalculadas para ${users.length} usuario(s)`);
      }
    } finally {
      this.draining = false;
    }
  }
}
