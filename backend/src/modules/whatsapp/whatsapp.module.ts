import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappLinkService } from './whatsapp-link.service';
import { MessageProcessorService } from './message-processor.service';
import { MetaCloudProvider } from './whatsapp.provider';

@Module({
  imports: [AuthModule, TransactionsModule],
  controllers: [WhatsappController],
  providers: [WhatsappLinkService, MessageProcessorService, MetaCloudProvider],
  exports: [WhatsappLinkService],
})
export class WhatsappModule {}
