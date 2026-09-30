import { Injectable, Logger, Module } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AuthModule } from '../auth/auth.module';
import { ENGINE_TZ } from '../financial-engine/engine.constants';
import { AdminGuard, BillingController } from './billing.controller';
import { CostReportService } from './cost-report.service';
import { EntitlementsService } from './entitlements.service';
import { PromoService } from './promo.service';
import { SubscriptionService } from './subscription.service';

/** Job diario de expiración de suscripciones (5:30 AM Bogotá). */
@Injectable()
export class BillingExpirationJob {
  private readonly logger = new Logger(BillingExpirationJob.name);
  constructor(private readonly subscriptions: SubscriptionService) {}

  @Cron('0 30 5 * * *', { timeZone: ENGINE_TZ })
  async run(): Promise<number> {
    return this.subscriptions.expireDue();
  }
}

/**
 * Monetización Millo+ (FIN-009). Fuente de verdad: Subscription (DEC-0009
 * §10.4). Pasarelas: ManualPromo (v1) + RevenueCat (webhook) — únicamente
 * (decisión de negocio DEC-0009 §4.5: solo tiendas).
 */
@Module({
  imports: [AuthModule],
  controllers: [BillingController],
  providers: [
    EntitlementsService,
    SubscriptionService,
    PromoService,
    CostReportService,
    AdminGuard,
    BillingExpirationJob,
  ],
  exports: [EntitlementsService, SubscriptionService],
})
export class BillingModule {}
