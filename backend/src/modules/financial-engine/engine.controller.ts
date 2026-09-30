import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { EngineService } from './engine.service';
import { ANOMALY_PREFIX } from './engine.constants';
import { monthStart } from './metrics/series.util';

/**
 * Lectura del conocimiento del Motor (FIN-003 §3.6). Consumidor principal:
 * FIN-004 (Salud/Score). También sirve para verificación end-to-end.
 */
@ApiTags('engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('engine')
export class EngineController {
  constructor(
    private readonly engine: EngineService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('metrics')
  async metrics(@CurrentUser() user: AuthUser) {
    const now = new Date();
    const current = monthStart(now);
    const [cold, readings] = await Promise.all([
      this.engine.coldStartStatus(user.id, now),
      this.prisma.metricReading.findMany({
        where: { userId: user.id, period: 'month', capturedAt: current },
        orderBy: { metricKey: 'asc' },
      }),
    ]);

    const core = readings.filter(
      (r) => !r.metricKey.startsWith('trend.') && !r.metricKey.startsWith(ANOMALY_PREFIX),
    );
    const trends = readings.filter((r) => r.metricKey.startsWith('trend.'));
    const anomalies = readings.filter((r) => r.metricKey.startsWith(ANOMALY_PREFIX));

    return {
      period: current.toISOString().slice(0, 7),
      coldStart: cold,
      metrics: core.map((r) => ({ metricKey: r.metricKey, value: Number(r.value) })),
      // Con cold-start global no superado, tendencias/anomalías se reportan como
      // historial insuficiente (DEC-0001 §10.4 / DEC-0003 §10.2).
      trends: cold.enabled
        ? trends.map((r) => ({ metricKey: r.metricKey, value: Number(r.value) }))
        : { status: 'insufficient_history', remainingDays: cold.remainingDays },
      anomalies: cold.enabled
        ? anomalies.map((r) => ({
            category: r.metricKey.slice(ANOMALY_PREFIX.length),
            zScore: Number(r.value),
          }))
        : { status: 'insufficient_history', remainingDays: cold.remainingDays },
    };
  }
}
