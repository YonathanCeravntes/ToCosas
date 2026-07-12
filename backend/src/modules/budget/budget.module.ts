import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import { SpendableService } from './spendable.service';

@Module({
  imports: [AuthModule],
  controllers: [BudgetController],
  providers: [BudgetService, SpendableService],
  // SpendableService se exporta para que Inicio consuma LA MISMA fuente de
  // "Te queda" (GOBERNANZA §32 — prohibidas las implementaciones paralelas).
  exports: [BudgetService, SpendableService],
})
export class BudgetModule {}
