import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DebtOutlayModule } from '../debts/debt-outlay.module';
import { IncomeModule } from '../income/income.module';
import { SimulationsModule } from '../simulations/simulations.module';
import { BillingModule } from '../billing/billing.module';
import { AnthropicClient } from './anthropic.client';
import { ConsentService } from './consent.service';
import { ContextAssembler } from './context-assembler';
import { CopilotService } from './copilot.service';
import { CopilotController, CopilotProductionGuard } from './copilot.controller';
import { CopilotRetentionJob } from './copilot-retention.job';
import { BrainViewsService } from './brain-views.service';
import { BudgetModule } from '../budget/budget.module';
import { CashflowPlanService } from '../debts/cashflow-plan.service';

/**
 * Capa 3 · Copiloto Financiero (FIN-005). Primera integración LLM del producto,
 * bajo DEC-0005 v2 + adenda legal: consentimiento opt-in, vistas minimizadas,
 * plantilla-primero, y datos reales bloqueados hasta DPA+PIA.
 */
@Module({
  // DebtOutlayModule (FIN-023 P5): el contexto razona con el desembolso real.
  // IncomeModule (FIN-027): el ingreso fijo del contexto es el NETO.
  imports: [AuthModule, SimulationsModule, BillingModule, DebtOutlayModule, IncomeModule, BudgetModule],
  controllers: [CopilotController],
  providers: [
    ConsentService,
    ContextAssembler,
    AnthropicClient,
    CopilotService,
    CopilotProductionGuard,
    CopilotRetentionJob,
    // FIN-046: vistas del cerebro (plan de flujo, Te queda, próximos pagos, acciones).
    BrainViewsService,
    CashflowPlanService,
  ],
  // FIN-042: el bot (MessagingModule) reutiliza el consentimiento y el cliente de IA.
  // FIN-046 Fase 2: el bot conversa con el MISMO cerebro (CopilotService).
  exports: [ConsentService, AnthropicClient, CopilotService],
})
export class CopilotModule {}
