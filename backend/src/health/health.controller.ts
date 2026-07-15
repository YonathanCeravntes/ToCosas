import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: el proceso está vivo (no depende de dependencias externas). */
  @Get('health')
  health() {
    return { status: 'ok', service: 'tocosas-backend', time: new Date().toISOString() };
  }

  /** Readiness: puede atender tráfico (verifica la conexión a Postgres). */
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', db: 'up' };
    } catch {
      return { status: 'degraded', db: 'down' };
    }
  }
}
