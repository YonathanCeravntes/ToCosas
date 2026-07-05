import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EngineController } from './engine.controller';
import { EngineService } from './engine.service';
import { EngineListener } from './engine.listener';
import { SnapshotJob } from './jobs/snapshot.job';
import { TrendsJob } from './jobs/trends.job';
import { RetentionJob } from './jobs/retention.job';

/**
 * Motor Financiero (FIN-003, Capa 1 de ARQ-0001). Sin UI: consume eventos de
 * dominio, calcula métricas deterministas y puebla las series de tiempo.
 */
@Module({
  imports: [AuthModule],
  controllers: [EngineController],
  providers: [EngineService, EngineListener, SnapshotJob, TrendsJob, RetentionJob],
  exports: [EngineService],
})
export class FinancialEngineModule {}
