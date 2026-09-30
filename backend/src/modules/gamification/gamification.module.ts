import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FinancialEngineModule } from '../financial-engine/financial-engine.module';
import { InsightsModule } from '../insights/insights.module';
import { GamificationService } from './gamification.service';
import {
  GamificationController,
  GamificationJob,
  GamificationListener,
} from './gamification.support';

/**
 * Gamificación (FIN-008). Sin senders propios: la celebración viaja por
 * InsightsService (cero rutas nuevas de notificación, DEC-0008 §4.5).
 */
@Module({
  imports: [AuthModule, InsightsModule, FinancialEngineModule],
  controllers: [GamificationController],
  providers: [GamificationService, GamificationListener, GamificationJob],
})
export class GamificationModule {}
