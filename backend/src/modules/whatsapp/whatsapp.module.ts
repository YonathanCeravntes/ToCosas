import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MessagingModule } from '../messaging/messaging.module';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappLinkService } from './whatsapp-link.service';
import { MessageProcessorService } from './message-processor.service';
import { MetaCloudProvider } from './whatsapp.provider';

@Module({
  imports: [AuthModule, MessagingModule],
  controllers: [WhatsappController],
  providers: [WhatsappLinkService, MessageProcessorService, MetaCloudProvider],
  exports: [WhatsappLinkService, MetaCloudProvider],
})
export class WhatsappModule {}
