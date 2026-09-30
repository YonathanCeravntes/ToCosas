import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AccountService } from './account.service';
import { ENGINE_TZ } from '../financial-engine/engine.constants';

/** Días de gracia entre el borrado lógico y la purga física (DEC-0040 §3: 30). */
export const ACCOUNT_PURGE_GRACE_DAYS = Number(process.env.ACCOUNT_PURGE_GRACE_DAYS ?? 30);

/**
 * Purga física diaria de cuentas eliminadas hace más de `ACCOUNT_PURGE_GRACE_DAYS`.
 * Corre a las 04:10 hora Bogotá, fuera de la ventana del Motor (03:15) y de billing
 * (05:30). Idempotente: si no hay cuentas vencidas no hace nada.
 */
@Injectable()
export class AccountPurgeScheduler {
  private readonly logger = new Logger(AccountPurgeScheduler.name);

  constructor(private readonly accounts: AccountService) {}

  @Cron('0 10 4 * * *', { timeZone: ENGINE_TZ })
  async handleDailyPurge(): Promise<void> {
    try {
      const { purged, failed } = await this.accounts.purgeExpired(ACCOUNT_PURGE_GRACE_DAYS);
      if (purged || failed) this.logger.log(`Purga de cuentas: ${purged} eliminadas, ${failed} con error.`);
    } catch (e) {
      this.logger.error(`Fallo en la purga de cuentas: ${(e as Error).message}`);
    }
  }
}
