import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FinanceModule } from '../finance/finance.module';
import { InsightsModule } from '../insights/insights.module';
import { RemindersModule } from '../reminders/reminders.module';
import { SimulationsModule } from '../simulations/simulations.module';
import { DebtsController } from './debts.controller';
import { DebtsService } from './debts.service';
import { DebtInsuranceService } from './debt-insurance.service';
import { DebtOutlayModule } from './debt-outlay.module';
import { DebtPrepaymentService } from './debt-prepayment.service';
import { CardService } from './card.service';
import { UpdateReviewService } from './update-review.service';

@Module({
  // SimulationsModule: el summary expone el orden de ataque DEL MOTOR (FIN-022,
  // DEC-0022 §5.1) — nunca re-derivado aquí. DebtOutlayModule: fuente única de
  // "lo comprometido" (FIN-023). CardService: espina del SO Financiero (FIN-031).
  // InsightsModule: FIN-036 siembra el insight de confirmación (la ENTREGA la
  // gobiernan el ProactivityJob/presupuesto anti-fatiga existentes).
  imports: [FinanceModule, AuthModule, RemindersModule, SimulationsModule, DebtOutlayModule, InsightsModule],
  controllers: [DebtsController],
  providers: [DebtsService, DebtInsuranceService, DebtPrepaymentService, CardService, UpdateReviewService],
  exports: [DebtsService],
})
export class DebtsModule {}
