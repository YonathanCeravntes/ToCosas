import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { EntitiesModule } from './modules/entities/entities.module';
import { DebtsModule } from './modules/debts/debts.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { FinanceModule } from './modules/finance/finance.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    FinanceModule,
    AuthModule,
    EntitiesModule,
    DebtsModule,
    TransactionsModule,
    WhatsappModule,
    // TODO (siguientes PRs): RemindersModule, SyncModule, SuggestionsModule.
  ],
  controllers: [HealthController],
})
export class AppModule {}
