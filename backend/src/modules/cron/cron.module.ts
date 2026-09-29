import { Module } from '@nestjs/common';
import { BudgetModule } from '../budget/budget.module';
import { DebtOutlayModule } from '../debts/debt-outlay.module';
import { TelegramModule } from '../telegram/telegram.module';
import { CashflowPlanService } from '../debts/cashflow-plan.service';
import { CashflowAlertsService } from './cashflow-alerts.service';
import { WeeklySummaryService } from './weekly-summary.service';
import { DailyPipelineService } from './daily-pipeline.service';
import { CronController } from './cron.controller';

/** FIN-046 Fase 3 · Millo proactivo: recorrido diario, "te sobró" y resumen semanal. */
@Module({
  imports: [BudgetModule, DebtOutlayModule, TelegramModule],
  controllers: [CronController],
  providers: [CashflowPlanService, CashflowAlertsService, WeeklySummaryService, DailyPipelineService],
})
export class CronModule {}
