import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MessagingModule } from '../messaging/messaging.module';
import { TelegramController } from './telegram.controller';
import { TelegramLinkService } from './telegram-link.service';
import { TelegramProvider, TelegramSender } from './telegram.provider';

@Module({
  imports: [AuthModule, MessagingModule],
  controllers: [TelegramController],
  providers: [
    TelegramProvider,
    TelegramLinkService,
    { provide: TelegramSender, useExisting: TelegramProvider },
  ],
  exports: [TelegramProvider, TelegramSender, TelegramLinkService],
})
export class TelegramModule {}
