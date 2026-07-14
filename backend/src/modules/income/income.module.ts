import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IncomeController } from './income.controller';
import { IncomeService } from './income.service';
import { NetIncomeService } from './net-income.service';

/**
 * FIN-027 · Módulo HOJA (patrón DebtOutlayModule): `NetIncomeService` no
 * importa nada más allá de Prisma (global) — Motor, Presupuesto, Copiloto y
 * Simulaciones pueden inyectarlo sin ciclos de módulos.
 */
@Module({
  imports: [AuthModule],
  controllers: [IncomeController],
  providers: [IncomeService, NetIncomeService],
  exports: [NetIncomeService],
})
export class IncomeModule {}
