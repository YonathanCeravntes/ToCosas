import { Module } from '@nestjs/common';
import { DebtOutlayService } from './debt-outlay.service';

/**
 * FIN-023 · Módulo HOJA de la fuente única de "lo comprometido" por deuda.
 * No importa nada (Prisma es global): Budget, Motor, Copiloto, Mensajería y
 * Debts pueden consumirlo sin crear ciclos de módulos.
 */
@Module({
  providers: [DebtOutlayService],
  exports: [DebtOutlayService],
})
export class DebtOutlayModule {}
