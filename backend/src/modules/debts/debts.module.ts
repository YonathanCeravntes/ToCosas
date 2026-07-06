import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FinanceModule } from '../finance/finance.module';
import { RemindersModule } from '../reminders/reminders.module';
import { DebtsController } from './debts.controller';
import { DebtsService } from './debts.service';
import { DebtInsuranceService } from './debt-insurance.service';

@Module({
  imports: [FinanceModule, AuthModule, RemindersModule],
  controllers: [DebtsController],
  providers: [DebtsService, DebtInsuranceService],
  exports: [DebtsService],
})
export class DebtsModule {}
