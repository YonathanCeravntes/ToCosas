import { Module } from '@nestjs/common';
import { TransactionsModule } from '../transactions/transactions.module';
import { DebtOutlayModule } from '../debts/debt-outlay.module';
import { SimulationsModule } from '../simulations/simulations.module';
import { ConversationService } from './conversation.service';

@Module({
  // DebtOutlayModule (FIN-023 P5): módulo hoja — sin ciclo con Whatsapp/Reminders.
  // SimulationsModule (FIN-029 §5.3): el bot invoca el simulador del dominio.
  imports: [TransactionsModule, DebtOutlayModule, SimulationsModule],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class MessagingModule {}
