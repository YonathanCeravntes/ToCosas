import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FinancialEngineModule } from '../financial-engine/financial-engine.module';
import { IncomeModule } from '../income/income.module';
import { BillingModule } from '../billing/billing.module';
import { HealthScoreController } from './health.controller';
import { HealthService } from './health.service';
import { HealthProductionGuard } from './health-production.guard';

/** Capa 2 · Salud Financiera (FIN-004): Score Millo v1 + 3 indicadores. */
@Module({
  // IncomeModule (FIN-027 §5.1): nota de copy cuando el Score usa ingreso neto.
  imports: [AuthModule, FinancialEngineModule, BillingModule, IncomeModule],
  controllers: [HealthScoreController],
  providers: [HealthService, HealthProductionGuard],
})
export class HealthModule {}
