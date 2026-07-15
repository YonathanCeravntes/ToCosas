import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { HealthService } from './health.service';
import { HealthProductionGuard } from './health-production.guard';

/**
 * Salud Financiera (FIN-004). Protegido por auth + gate técnico de producción
 * (DEC-0004 §10.3): en producción responde 503 hasta la validación legal.
 */
@ApiTags('health-score')
@ApiBearerAuth()
@UseGuards(HealthProductionGuard, JwtAuthGuard)
@Controller('health')
export class HealthScoreController {
  constructor(private readonly health: HealthService) {}

  @Get('score')
  score(@CurrentUser() user: AuthUser) {
    return this.health.score(user.id);
  }

  @Get('score/history')
  history(@CurrentUser() user: AuthUser) {
    return this.health.scoreHistory(user.id);
  }
}
