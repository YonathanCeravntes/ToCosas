import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FinancialEngineModule } from '../financial-engine/financial-engine.module';
import { SimulationsModule } from '../simulations/simulations.module';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsJob } from './recommendations.job';

/** Recomendaciones con impacto (FIN-007 §4.3). Supersede al legacy `suggestions/`
 * como fuente de la UI (deprecación formal anotada en DEC-0007 §4.6). */
@Module({
  imports: [AuthModule, SimulationsModule, FinancialEngineModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService, RecommendationsJob],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
