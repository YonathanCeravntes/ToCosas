import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { FinanceModule } from './modules/finance/finance.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FinanceModule,
    // TODO (siguientes PRs): AuthModule, EntitiesModule, DebtsModule,
    // TransactionsModule, RemindersModule, WhatsappModule, SyncModule.
  ],
  controllers: [HealthController],
})
export class AppModule {}
