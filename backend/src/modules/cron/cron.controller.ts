import { Controller, Get, Headers, HttpCode, Post, Query, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { DailyPipelineService } from './daily-pipeline.service';

/**
 * FIN-046 Fase 3 · Punto de entrada del "despertador" (GitHub Actions). Protegido por
 * `CRON_SECRET` (cabecera `x-cron-secret`); sin secreto configurado, está apagado.
 */
@Controller('internal/cron')
export class CronController {
  constructor(
    private readonly config: ConfigService,
    private readonly pipeline: DailyPipelineService,
  ) {}

  private check(secret?: string) {
    const expected = this.config.get<string>('CRON_SECRET');
    if (!expected || !secret) throw new UnauthorizedException();
    const a = Buffer.from(secret);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException();
  }

  /** Despierta el servidor y lanza el recorrido diario. `wait=1` espera y devuelve el detalle. */
  @Post('daily')
  @HttpCode(202)
  async daily(@Headers('x-cron-secret') secret?: string, @Query('wait') wait?: string) {
    this.check(secret);
    if (wait === '1') return { started: true, steps: await this.pipeline.run() };
    if (!this.pipeline.isRunning()) void this.pipeline.run();
    return { started: true };
  }

  /** Solo despertar (sin trabajo): útil para calentar el servidor antes de usar la app. */
  @Get('ping')
  ping(@Headers('x-cron-secret') secret?: string) {
    this.check(secret);
    return { ok: true };
  }
}
