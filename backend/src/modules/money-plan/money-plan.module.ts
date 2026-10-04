import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BudgetModule } from '../budget/budget.module';
import { DebtsModule } from '../debts/debts.module';
import { MoneyPlanController } from './money-plan.controller';

@Module({
  imports: [AuthModule, BudgetModule, DebtsModule],
  controllers: [MoneyPlanController],
})
export class MoneyPlanModule {}
