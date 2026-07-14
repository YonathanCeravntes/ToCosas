import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { IncomeModule } from '../income/income.module';
import { SimulationsController } from './simulations.controller';
import { SimulationsService } from './simulations.service';

/** Simulador financiero (FIN-007): "¿qué pasa si…?" sin tocar datos reales. */
@Module({
  // IncomeModule (FIN-027): el ingreso fijo del estado simulado es el NETO.
  imports: [AuthModule, BillingModule, IncomeModule],
  controllers: [SimulationsController],
  providers: [SimulationsService],
  exports: [SimulationsService],
})
export class SimulationsModule {}
