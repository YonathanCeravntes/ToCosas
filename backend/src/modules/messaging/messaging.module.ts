import { Module } from '@nestjs/common';
import { TransactionsModule } from '../transactions/transactions.module';
import { DebtOutlayModule } from '../debts/debt-outlay.module';
import { SimulationsModule } from '../simulations/simulations.module';
import { ConversationService } from './conversation.service';
import { DocumentExtractionService } from './document-extraction.service';
import { CopilotModule } from '../copilot/copilot.module';
import { BudgetModule } from '../budget/budget.module';

@Module({
  // DebtOutlayModule (FIN-023 P5): módulo hoja — sin ciclo con Whatsapp/Reminders.
  // SimulationsModule (FIN-029 §5.3): el bot invoca el simulador del dominio.
  // CopilotModule (FIN-042): consentimiento e IA para leer documentos. DebtsModule NO se
  // importa (Debts → Reminders → Telegram → Messaging haría ciclo): el alta de deudas se
  // resuelve en runtime con ModuleRef (ver ConversationService.applyProposal).
  // BudgetModule: alta de gastos fijos por chat (pedido del Fundador 2026-09-28).
  imports: [TransactionsModule, DebtOutlayModule, SimulationsModule, CopilotModule, BudgetModule],
  providers: [ConversationService, DocumentExtractionService],
  exports: [ConversationService],
})
export class MessagingModule {}
