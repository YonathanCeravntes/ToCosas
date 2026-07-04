import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { EntitiesModule } from './modules/entities/entities.module';
import { DebtsModule } from './modules/debts/debts.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { FinanceModule } from './modules/finance/finance.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { SuggestionsModule } from './modules/suggestions/suggestions.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { SyncModule } from './modules/sync/sync.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BudgetModule } from './modules/budget/budget.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EventsModule } from './modules/events/events.module';
import { AccountsModule } from './modules/accounts/accounts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    // Rate limiting (DEC-0002 §4.6): 120 req/min por IP como baseline.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    EventsModule,
    FinanceModule,
    AuthModule,
    EntitiesModule,
    DebtsModule,
    TransactionsModule,
    CategoriesModule,
    WhatsappModule,
    TelegramModule,
    SuggestionsModule,
    RemindersModule,
    SyncModule,
    BudgetModule,
    NotificationsModule,
    AccountsModule,
    // TODO (siguientes PRs): LLM fallback en el parser, OCR.
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
