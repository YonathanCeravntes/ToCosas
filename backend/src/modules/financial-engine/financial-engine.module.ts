import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DebtOutlayModule } from '../debts/debt-outlay.module';
import { InsightsModule } from '../insights/insights.module';
import { EngineController } from './engine.controller';
import { EngineService } from './engine.service';
import { EngineListener } from './engine.listener';
import { InsightsGenerator } from './insights.generator';
import { SnapshotJob } from './jobs/snapshot.job';
import { TrendsJob } from './jobs/trends.job';
import { RetentionJob } from './jobs/retention.job';

/**
 * Motor Financiero (FIN-003, Capa 1 de ARQ-0001). Sin UI: consume eventos de
 * dominio, calcula métricas deterministas, puebla las series de tiempo y (desde
 * FIN-006) genera insights accionables.
 */
@Module({
  // DebtOutlayModule (FIN-023): `debtMonthly` del Motor = desembolso REAL.
  imports: [AuthModule, InsightsModule, DebtOutlayModule],
  controllers: [EngineController],
  providers: [EngineService, EngineListener, InsightsGenerator, SnapshotJob, TrendsJob, RetentionJob],
  exports: [EngineService, SnapshotJob],
})
export class FinancialEngineModule {}
