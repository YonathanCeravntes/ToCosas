import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { DAY_READING_RETENTION_DAYS, ENGINE_TZ } from '../engine.constants';

/**
 * Retención de series (FIN-003 §4.4), a las 4 AM de Bogotá (DEC-0003 §10.3):
 *  - Borra lecturas `day` con más de 180 días (DEC-0002 §4.5); `month` es indefinida.
 *  - Crea por adelantado la partición mensual siguiente de `metric_readings`
 *    (la partición DEFAULT cubre cualquier hueco, pero mantener particiones
 *    mensuales reales conserva la ventaja de partition pruning).
 */
@Injectable()
export class RetentionJob {
  private readonly logger = new Logger(RetentionJob.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 0 4 * * *', { timeZone: ENGINE_TZ })
  async run(now: Date = new Date()): Promise<number> {
    const deleted = await this.purgeDayReadings(now);
    await this.ensureNextMonthPartition(now);
    return deleted;
  }

  async purgeDayReadings(now: Date): Promise<number> {
    const cutoff = new Date(now.getTime() - DAY_READING_RETENTION_DAYS * 86_400_000);
    const { count } = await this.prisma.metricReading.deleteMany({
      where: { period: 'day', capturedAt: { lt: cutoff } },
    });
    if (count > 0) this.logger.log(`Retención: ${count} lecturas 'day' purgadas`);
    return count;
  }

  /** Crea la partición del mes siguiente si no existe (idempotente). */
  async ensureNextMonthPartition(now: Date): Promise<void> {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 1));
    const suffix = `${start.getUTCFullYear()}_${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
    const name = `metric_readings_${suffix}`;
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    try {
      // Nombre y fechas generados internamente (no input de usuario).
      await this.prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "${name}" PARTITION OF "metric_readings" FOR VALUES FROM ('${fmt(start)}') TO ('${fmt(end)}')`,
      );
      this.logger.log(`Partición asegurada: ${name}`);
    } catch (e) {
      // Si el rango choca con DEFAULT (hay filas futuras allí), se registra y se
      // continúa: DEFAULT sigue absorbiendo escrituras sin pérdida.
      this.logger.warn(`No se pudo crear la partición ${name}: ${(e as Error).message}`);
    }
  }
}
