import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FinancialEngineModule } from '../financial-engine/financial-engine.module';
import { HealthScoreController } from './health.controller';
import { HealthService } from './health.service';
import { HealthProductionGuard } from './health-production.guard';

/** Capa 2 · Salud Financiera (FIN-004): Score Millo v1 + 3 indicadores. */
@Module({
  imports: [AuthModule, FinancialEngineModule],
  controllers: [HealthScoreController],
  providers: [HealthService, HealthProductionGuard],
})
export class HealthModule {}
