import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BudgetModule } from '../budget/budget.module';
import { IncomeModule } from '../income/income.module';
import { DebtOutlayModule } from '../debts/debt-outlay.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  // BudgetModule aporta SpendableService: el "Te queda" del Inicio es la misma
  // instancia que la de Presupuesto (FIN-020, GOBERNANZA §32).
  // IncomeModule (FIN-027): "Ingresos fijos" del Inicio = ingreso NETO.
  // DebtOutlayModule (FIN-057): la cuota comprometida del mes para la fila de deudas.
  imports: [AuthModule, BudgetModule, IncomeModule, DebtOutlayModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
