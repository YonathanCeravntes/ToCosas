import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Mensaje entrante de Telegram, normalizado. */
export interface TelegramInbound {
  updateId: string; // idempotencia
  chatId: string;
  username?: string;
  /** FIN-042: `image` (foto o imagen adjunta) y `document` (PDF) se envían a la IA con consentimiento. */
  type: 'text' | 'image' | 'document' | 'other';
  text?: string;
  /** Archivo adjunto (foto de mayor resolución o documento), si lo hay. */
  file?: { fileId: string; mimeType: string; sizeBytes?: number };
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
        caption?: string;
        photo?: Array<{ file_id: string; file_size?: number; width?: number }>;
        document?: { file_id: string; mime_type?: string; file_size?: number };
      };
    };
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
