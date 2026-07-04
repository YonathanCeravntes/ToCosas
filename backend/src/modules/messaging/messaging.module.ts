import { Module } from '@nestjs/common';
import { TransactionsModule } from '../transactions/transactions.module';
import { ConversationService } from './conversation.service';

@Module({
  imports: [TransactionsModule],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class MessagingModule {}
