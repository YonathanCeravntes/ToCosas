import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TelegramModule } from '../telegram/telegram.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { MetaCloudProvider } from '../whatsapp/whatsapp.provider';
import { WhatsAppSender } from '../reminders/whatsapp-sender.interface';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { ProactivityJob } from './proactivity.job';

/** Insights (FIN-006 §4.1) + proactividad anti-fatiga (§4.5). */
@Module({
  imports: [AuthModule, NotificationsModule, TelegramModule, WhatsappModule],
  controllers: [InsightsController],
  providers: [
    InsightsService,
    ProactivityJob,
    // Mismo patrón de DI que RemindersModule: el sender WA concreto es Meta.
    { provide: WhatsAppSender, useExisting: MetaCloudProvider },
  ],
  exports: [InsightsService],
})
export class InsightsModule {}
