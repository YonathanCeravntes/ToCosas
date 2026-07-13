import { Module } from '@nestjs/common';
import { TransactionsModule } from '../transactions/transactions.module';
import { DebtOutlayModule } from '../debts/debt-outlay.module';
import { ConversationService } from './conversation.service';

@Module({
  // DebtOutlayModule (FIN-023 P5): módulo hoja — sin ciclo con Whatsapp/Reminders.
  imports: [TransactionsModule, DebtOutlayModule],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class MessagingModule {}
