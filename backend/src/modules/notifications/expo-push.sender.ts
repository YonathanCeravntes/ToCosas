import { Injectable, Logger } from '@nestjs/common';
import { PushMessage, PushSender } from './push-sender.interface';

/**
 * Implementación de PushSender sobre la Expo Push API. Envía a los tokens de tipo
 * `ExponentPushToken[...]`. Sin tokens válidos (dev), solo loguea lo que enviaría.
 */
@Injectable()
export class ExpoPushSender extends PushSender {
  private readonly logger = new Logger(ExpoPushSender.name);
  private static readonly ENDPOINT = 'https://exp.host/--/api/v2/push/send';

  async sendToTokens(tokens: string[], msg: PushMessage): Promise<void> {
    const valid = tokens.filter((t) => t && t.startsWith('ExponentPushToken'));
    if (valid.length === 0) {
      this.logger.log(`[PUSH dev] (sin tokens) ${msg.title} — ${msg.body}`);
      return;
    }
    const messages = valid.map((to) => ({
      to,
      title: msg.title,
      body: msg.body,
      sound: 'default',
      data: msg.data ?? {},
    }));
    try {
      const res = await fetch(ExpoPushSender.ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
      if (!res.ok) {
        this.logger.error(`Error Expo Push: ${res.status} ${await res.text()}`);
      }
    } catch (e) {
      this.logger.error(`Fallo enviando push: ${(e as Error).message}`);
    }
  }
}
