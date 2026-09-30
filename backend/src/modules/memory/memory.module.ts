import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FinancialEngineModule } from '../financial-engine/financial-engine.module';
import { InsightsModule } from '../insights/insights.module';
import { IncomeModule } from '../income/income.module';
import { BudgetModule } from '../budget/budget.module';
import { MemoryService } from './memory.service';
import { MemoryJob } from './memory.job';
import { ProposalsService } from './proposals.service';
import { ProposalsController } from './proposals.controller';

/**
 * Memoria financiera estructurada (FIN-006 §4.4) — sin embeddings.
 * FIN-046 Fase 4: además convierte lo aprendido en propuestas de un toque.
 */
@Module({
  imports: [AuthModule, FinancialEngineModule, InsightsModule, IncomeModule, BudgetModule],
  controllers: [ProposalsController],
  providers: [MemoryService, MemoryJob, ProposalsService],
  exports: [MemoryService, ProposalsService],
})
export class MemoryModule {}
