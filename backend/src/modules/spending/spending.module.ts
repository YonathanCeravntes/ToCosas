import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BudgetModule } from '../budget/budget.module';
import { DebtOutlayModule } from '../debts/debt-outlay.module';
import { ConsumptionService } from './consumption.service';
import { SpendingController } from './spending.controller';

@Module({
  imports: [AuthModule, BudgetModule, DebtOutlayModule],
  controllers: [SpendingController],
  providers: [ConsumptionService],
  exports: [ConsumptionService],
})
export class SpendingModule {}
