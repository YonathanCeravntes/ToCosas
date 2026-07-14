import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DebtOutlayModule } from '../debts/debt-outlay.module';
import { IncomeModule } from '../income/income.module';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import { SpendableService } from './spendable.service';

@Module({
  // DebtOutlayModule (FIN-023): las cuotas comprometidas son el desembolso REAL.
  // IncomeModule (FIN-027): el ingreso fijo es el NETO de la fuente única.
  imports: [AuthModule, DebtOutlayModule, IncomeModule],
  controllers: [BudgetController],
  providers: [BudgetService, SpendableService],
  // SpendableService se exporta para que Inicio consuma LA MISMA fuente de
  // "Te queda" (GOBERNANZA §32 — prohibidas las implementaciones paralelas).
  exports: [BudgetService, SpendableService],
})
export class BudgetModule {}
