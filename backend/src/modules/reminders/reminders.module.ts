import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { MetaCloudProvider } from '../whatsapp/whatsapp.provider';
import { NotificationsModule } from '../notifications/notifications.module';
import { TelegramModule } from '../telegram/telegram.module';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';
import { RemindersScheduler } from './reminders.scheduler';
import { WhatsAppSender } from './whatsapp-sender.interface';

@Module({
  imports: [AuthModule, WhatsappModule, NotificationsModule, TelegramModule],
  controllers: [RemindersController],
  providers: [
    RemindersService,
    RemindersScheduler,
    // La implementación concreta del envío la aporta MetaCloudProvider.
    { provide: WhatsAppSender, useExisting: MetaCloudProvider },
  ],
  exports: [RemindersService],
})
export class RemindersModule {}
