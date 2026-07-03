import { Module } from '@nestjs/common';
import { AmortizationService } from './amortization/amortization.service';

/**
 * Módulo de dominio financiero. Aquí vivirán los servicios de cálculo puro
 * (amortización, proyecciones, motor de sugerencias). No dependen de la DB,
 * por lo que son 100% testeables y reutilizables desde controladores REST,
 * del worker de WhatsApp y del scheduler de recordatorios.
 */
@Module({
  providers: [AmortizationService],
  exports: [AmortizationService],
})
export class FinanceModule {}
