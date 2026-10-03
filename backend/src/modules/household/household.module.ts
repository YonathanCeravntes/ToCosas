import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DebtOutlayModule } from '../debts/debt-outlay.module';
import { IncomeModule } from '../income/income.module';
import { HouseholdController } from './household.controller';
import { HouseholdService } from './household.service';

/** FIN-059 · Millo en pareja. Exporta el servicio para Registrar, gastos fijos y el bot. */
@Module({
  imports: [AuthModule, DebtOutlayModule, IncomeModule],
  controllers: [HouseholdController],
  providers: [HouseholdService],
  exports: [HouseholdService],
})
export class HouseholdModule {}
