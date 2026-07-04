import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';

interface ClaimedRow {
  id: string;
  eventType: string;
  payload: unknown;
  attempts: number;
}

/** Días de retención de eventos ya procesados (DEC-0002 §10.3). */
const PURGE_AFTER_DAYS = 30;
/** Reintentos máximos antes de marcar el evento como `failed`. */
const MAX_ATTEMPTS = 5;
/** Filas reclamadas por corrida. */
const BATCH = 50;

/**
 * Despachador del outbox. Reclama filas `pending` con **claim atómico**
 * (`UPDATE ... FOR UPDATE SKIP LOCKED ... RETURNING`, DEC-0002 §10.1) — seguro
 * ante solapamiento de corridas o múltiples instancias — y las emite por
 * EventEmitter2. En FIN-002 aún no hay consumidores (llegan en FIN-003).
 */
@Injectable()
export class OutboxDispatcher {
  private readonly logger = new Logger(OutboxDispatcher.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async tick(): Promise<void> {
    if (this.running) return; // evita solapamiento de corridas lentas
    this.running = true;
    try {
      let processed = 0;
      // Vacía el outbox en tandas hasta que no queden pendientes.
      for (;;) {
        const n = await this.drainOnce();
        processed += n;
        if (n < BATCH) break;
      }
      if (processed > 0) this.logger.log(`Outbox: ${processed} eventos despachados`);
    } catch (e) {
      this.logger.error(`Fallo en el despachador: ${(e as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  /** Reclama y procesa una tanda. Devuelve cuántas filas reclamó. */
  async drainOnce(limit = BATCH): Promise<number> {
    const rows = await this.claim(limit);
    for (const row of rows) {
      await this.handle(row);
    }
    return rows.length;
  }

  /** Claim atómico: marca `processing` y devuelve las filas en un solo statement. */
  private async claim(limit: number): Promise<ClaimedRow[]> {
    return this.prisma.$queryRaw<ClaimedRow[]>`
      UPDATE outbox_events
      SET status = 'processing'::"OutboxStatus", attempts = attempts + 1
      WHERE id IN (
        SELECT id FROM outbox_events
        WHERE status = 'pending'::"OutboxStatus" AND available_at <= now()
        ORDER BY available_at
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
      )
      RETURNING id, event_type AS "eventType", payload, attempts;
    `;
  }

  private async handle(row: ClaimedRow): Promise<void> {
    try {
      // Emisión in-process. Sin listeners en FIN-002; los añade FIN-003.
      this.emitter.emit(row.eventType, row.payload);
      await this.prisma.outboxEvent.update({
        where: { id: row.id },
        data: { status: 'processed', processedAt: new Date(), error: null },
      });
    } catch (e) {
      const message = (e as Error).message;
      if (row.attempts >= MAX_ATTEMPTS) {
        await this.prisma.outboxEvent.update({
          where: { id: row.id },
          data: { status: 'failed', error: message },
        });
        this.logger.error(`Evento ${row.id} falló definitivamente: ${message}`);
      } else {
        // Backoff exponencial simple; vuelve a 'pending' para reintentar.
        const delayMs = Math.min(60_000, 1000 * 2 ** row.attempts);
        await this.prisma.outboxEvent.update({
          where: { id: row.id },
          data: {
            status: 'pending',
            error: message,
            availableAt: new Date(Date.now() + delayMs),
          },
        });
      }
    }
  }

  /** Purga diaria de eventos procesados con más de 30 días (DEC-0002 §10.3). */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purge(): Promise<number> {
    const cutoff = new Date(Date.now() - PURGE_AFTER_DAYS * 86_400_000);
    const { count } = await this.prisma.outboxEvent.deleteMany({
      where: { status: 'processed', processedAt: { lt: cutoff } },
    });
    if (count > 0) this.logger.log(`Outbox: purgados ${count} eventos procesados`);
    return count;
  }
}
