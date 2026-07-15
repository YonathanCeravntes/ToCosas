import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Mensaje entrante de Telegram, normalizado. */
export interface TelegramInbound {
  updateId: string; // idempotencia
  chatId: string;
  username?: string;
  type: 'text' | 'other';
  text?: string;
}

/**
 * Puerto de envío de Telegram (usado por recordatorios). Clase abstracta como
 * token de DI para desacoplar el dominio del proveedor.
 */
export abstract class TelegramSender {
  abstract sendText(chatId: string, body: string): Promise<void>;
}

/** Implementación sobre la Bot API de Telegram. */
@Injectable()
export class TelegramProvider extends TelegramSender {
  private readonly logger = new Logger(TelegramProvider.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  /** Normaliza un update de Telegram a nuestro formato. */
  parseInbound(rawBody: unknown): TelegramInbound[] {
    const body = rawBody as {
      update_id?: number;
      message?: {
        message_id?: number;
        chat?: { id?: number | string };
        from?: { username?: string };
        text?: string;
      };
    };
    const msg = body?.message;
    if (!msg || msg.chat?.id == null) return [];
    return [
      {
        updateId: String(body.update_id ?? msg.message_id ?? `${msg.chat.id}:${Date.now()}`),
        chatId: String(msg.chat.id),
        username: msg.from?.username,
        type: typeof msg.text === 'string' ? 'text' : 'other',
        text: msg.text,
      },
    ];
  }

  async sendText(chatId: string, body: string): Promise<void> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.log(`[DEV] → chat ${chatId}: ${body}`);
      return;
    }
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: body }),
      });
      if (!res.ok) {
        this.logger.error(`Error enviando Telegram: ${res.status} ${await res.text()}`);
      }
    } catch (e) {
      this.logger.error(`Fallo enviando Telegram: ${(e as Error).message}`);
    }
  }

  /** Nombre del bot para construir el deep-link de vinculación. */
  botUsername(): string {
    return this.config.get<string>('TELEGRAM_BOT_USERNAME', 'MilloBot');
  }
}
