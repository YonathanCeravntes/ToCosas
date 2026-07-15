import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RemindersService } from './reminders.service';

/**
 * Dispara los recordatorios una vez al día. En producción conviene alinear la
 * hora con la zona horaria del usuario y respetar `quiet_hours`; para el MVP se
 * ejecuta a las 8:00 del servidor.
 */
@Injectable()
export class RemindersScheduler {
  private readonly logger = new Logger(RemindersScheduler.name);

  constructor(private readonly reminders: RemindersService) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleDailyReminders(): Promise<void> {
    try {
      const { sent } = await this.reminders.dispatchDue();
      this.logger.log(`Job de recordatorios completado. Enviados: ${sent}`);
    } catch (e) {
      this.logger.error(`Fallo en el job de recordatorios: ${(e as Error).message}`);
    }
  }
}
