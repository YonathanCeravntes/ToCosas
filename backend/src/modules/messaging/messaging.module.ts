import { Module } from '@nestjs/common';
import { TransactionsModule } from '../transactions/transactions.module';
import { DebtOutlayModule } from '../debts/debt-outlay.module';
import { SimulationsModule } from '../simulations/simulations.module';
import { ConversationService } from './conversation.service';
import { DocumentExtractionService } from './document-extraction.service';
import { CopilotModule } from '../copilot/copilot.module';

@Module({
  // DebtOutlayModule (FIN-023 P5): módulo hoja — sin ciclo con Whatsapp/Reminders.
  // SimulationsModule (FIN-029 §5.3): el bot invoca el simulador del dominio.
  // CopilotModule (FIN-042): consentimiento e IA para leer documentos. DebtsModule NO se
  // importa (Debts → Reminders → Telegram → Messaging haría ciclo): el alta de deudas se
  // resuelve en runtime con ModuleRef (ver ConversationService.applyProposal).
  imports: [TransactionsModule, DebtOutlayModule, SimulationsModule, CopilotModule],
  providers: [ConversationService, DocumentExtractionService],
  exports: [ConversationService],
})
export class MessagingModule {}
