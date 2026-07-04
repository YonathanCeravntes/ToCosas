import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { EntitiesModule } from './modules/entities/entities.module';
import { DebtsModule } from './modules/debts/debts.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { FinanceModule } from './modules/finance/finance.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { SuggestionsModule } from './modules/suggestions/suggestions.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { SyncModule } from './modules/sync/sync.module';
import { CategoriesModule } from './modules/categories/categories.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    FinanceModule,
    AuthModule,
    EntitiesModule,
    DebtsModule,
    TransactionsModule,
    CategoriesModule,
    WhatsappModule,
    SuggestionsModule,
    RemindersModule,
    SyncModule,
    // TODO (siguientes PRs): LLM fallback en el parser, cola BullMQ, OCR.
  ],
  controllers: [HealthController],
})
export class AppModule {}
