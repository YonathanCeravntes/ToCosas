import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BOT_COMMANDS, BOT_DESCRIPTION, BOT_NAME, BOT_SHORT_DESCRIPTION, BotReply, MAIN_KEYBOARD } from '../messaging/bot-menu';

/** Mensaje entrante de Telegram, normalizado. */
export interface TelegramInbound {
  updateId: string; // idempotencia
  chatId: string;
  username?: string;
  /** FIN-042: `image` (foto o imagen adjunta) y `document` (PDF) se envían a la IA con consentimiento. */
  type: 'text' | 'image' | 'document' | 'other' | 'callback';
  text?: string;
  /** Archivo adjunto (foto de mayor resolución o documento), si lo hay. */
  file?: { fileId: string; mimeType: string; sizeBytes?: number };
  /** FIN-055: id del toque en un botón (hay que responderlo para quitar el "cargando"). */
  callbackId?: string;
}

/** Tamaño máximo que se descarga y envía a la IA (fotos de extracto pesan < 3 MB). */
export const TELEGRAM_FILE_MAX_BYTES = 8 * 1024 * 1024;

/**
 * Puerto de envío de Telegram (usado por recordatorios). Clase abstracta como
 * token de DI para desacoplar el dominio del proveedor.
 */
export abstract class TelegramSender {
  abstract sendText(chatId: string, body: string): Promise<void>;
}

/** Implementación sobre la Bot API de Telegram. */
@Injectable()
export class TelegramProvider extends TelegramSender implements OnApplicationBootstrap {
  private readonly logger = new Logger(TelegramProvider.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  /**
   * FIN-055 · Perfil del bot (nombre, descripción, "Acerca de" y menú) desde el código,
   * al arrancar. La foto solo se cambia en @BotFather. Nunca bloquea el arranque.
   */
  onApplicationBootstrap(): void {
    if (!this.config.get<string>('TELEGRAM_BOT_TOKEN') || process.env.NODE_ENV === 'test') return;
    void this.setupProfile().catch((e) => this.logger.warn(`Perfil del bot: ${(e as Error).message}`));
  }

  async setupProfile(): Promise<void> {
    const current = await this.call<{ name?: string }>('getMyName', {});
    // setMyName tiene límite de uso: solo se llama si cambió.
    if (current?.name !== BOT_NAME) await this.call('setMyName', { name: BOT_NAME });
    await this.call('setMyDescription', { description: BOT_DESCRIPTION });
    await this.call('setMyShortDescription', { short_description: BOT_SHORT_DESCRIPTION });
    await this.call('setMyCommands', { commands: BOT_COMMANDS });
    await this.call('setChatMenuButton', { menu_button: { type: 'commands' } });
    this.logger.log('Perfil del bot de Telegram actualizado.');
  }

  /** Llamada genérica a la Bot API; registra el error y devuelve null si falla. */
  private async call<T = unknown>(method: string, payload: object): Promise<T | null> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) return null;
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string };
    if (!json.ok) {
      this.logger.warn(`Telegram ${method} falló: ${res.status} ${json.description ?? ''}`);
      return null;
    }
    return json.result ?? null;
  }

  /** Normaliza un update de Telegram a nuestro formato. */
  parseInbound(rawBody: unknown): TelegramInbound[] {
    const body = rawBody as {
      update_id?: number;
      callback_query?: {
        id: string;
        data?: string;
        from?: { username?: string };
        message?: { chat?: { id?: number | string } };
      };
      message?: {
        message_id?: number;
        chat?: { id?: number | string };
        from?: { username?: string };
        text?: string;
        caption?: string;
        photo?: Array<{ file_id: string; file_size?: number; width?: number }>;
        document?: { file_id: string; mime_type?: string; file_size?: number };
      };
    };
    const cq = body?.callback_query;
    if (cq?.message?.chat?.id != null) {
      return [
        {
          updateId: String(body.update_id ?? cq.id),
          chatId: String(cq.message.chat.id),
          username: cq.from?.username,
          type: 'callback',
          text: cq.data ?? '',
          callbackId: cq.id,
        },
      ];
    }
    const msg = body?.message;
    if (!msg || msg.chat?.id == null) return [];
    const base = {
      updateId: String(body.update_id ?? msg.message_id ?? `${msg.chat.id}:${Date.now()}`),
      chatId: String(msg.chat.id),
      username: msg.from?.username,
    };
    if (typeof msg.text === 'string') return [{ ...base, type: 'text', text: msg.text }];
    // Foto: Telegram manda varias resoluciones; la última es la mayor.
    if (msg.photo?.length) {
      const best = msg.photo[msg.photo.length - 1];
      return [{ ...base, type: 'image', text: msg.caption, file: { fileId: best.file_id, mimeType: 'image/jpeg', sizeBytes: best.file_size } }];
    }
    if (msg.document?.file_id) {
      const mime = msg.document.mime_type ?? 'application/octet-stream';
      const type = mime === 'application/pdf' ? 'document' : mime.startsWith('image/') ? 'image' : 'other';
      return [{ ...base, type, text: msg.caption, file: { fileId: msg.document.file_id, mimeType: mime, sizeBytes: msg.document.file_size } }];
    }
    return [{ ...base, type: 'other' }];
  }

  /**
   * FIN-042 · Descarga un adjunto (getFile → file_path → descarga). Devuelve el binario
   * en memoria; NUNCA se guarda en disco ni en BD: se envía a la IA y se descarta.
   */
  async downloadFile(fileId: string): Promise<{ data: Buffer; mimeType?: string }> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) throw new Error('telegram_not_configured');
    const meta = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const json = (await meta.json()) as { ok: boolean; result?: { file_path?: string; file_size?: number } };
    if (!json.ok || !json.result?.file_path) throw new Error('telegram_getfile_failed');
    if ((json.result.file_size ?? 0) > TELEGRAM_FILE_MAX_BYTES) throw new Error('file_too_large');
    const res = await fetch(`https://api.telegram.org/file/bot${token}/${json.result.file_path}`);
    if (!res.ok) throw new Error('telegram_download_failed');
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > TELEGRAM_FILE_MAX_BYTES) throw new Error('file_too_large');
    const ext = json.result.file_path.split('.').pop()?.toLowerCase();
    const mimeType = ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : undefined;
    return { data: buf, mimeType };
  }

  /** FIN-055 · Responde el toque de un botón (quita el reloj de "cargando"). */
  async answerCallback(callbackId: string): Promise<void> {
    await this.call('answerCallbackQuery', { callback_query_id: callbackId }).catch(() => null);
  }

  /** FIN-055 · Mensaje con botones bajo el texto o con el teclado fijo. */
  async sendReply(chatId: string, reply: BotReply): Promise<void> {
    const markup = reply.buttons?.length
      ? { inline_keyboard: reply.buttons.map((row) => row.map((b) => ({ text: b.text, callback_data: b.data }))) }
      : reply.mainKeyboard
        ? { keyboard: MAIN_KEYBOARD.map((row) => row.map((text) => ({ text }))), resize_keyboard: true, is_persistent: true }
        : undefined;
    return this.sendText(chatId, reply.text, markup);
  }

  async sendText(chatId: string, body: string, replyMarkup?: object): Promise<void> {
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
        body: JSON.stringify({ chat_id: chatId, text: body, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) }),
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
