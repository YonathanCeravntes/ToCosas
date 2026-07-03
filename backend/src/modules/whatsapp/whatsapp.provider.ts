import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Mensaje entrante normalizado (agnóstico del proveedor). */
export interface InboundMessage {
  providerMessageId: string; // id único del mensaje (idempotencia)
  fromPhoneE164: string; // remitente en formato +57...
  type: 'text' | 'image' | 'other';
  text?: string;
  mediaId?: string;
}

/**
 * Abstracción del proveedor de WhatsApp. Permite alternar entre Meta Cloud API
 * (producción) y Twilio (prototipo) sin tocar el dominio.
 */
export interface WhatsAppProvider {
  /** Normaliza el payload crudo del webhook a una lista de mensajes. */
  parseInbound(rawBody: unknown): InboundMessage[];
  /** Envía un mensaje de texto libre (dentro de la ventana de 24 h). */
  sendText(toPhoneE164: string, body: string): Promise<void>;
}

/** Implementación para WhatsApp Business Cloud API (Meta). */
@Injectable()
export class MetaCloudProvider implements WhatsAppProvider {
  private readonly logger = new Logger(MetaCloudProvider.name);

  constructor(private readonly config: ConfigService) {}

  parseInbound(rawBody: unknown): InboundMessage[] {
    const out: InboundMessage[] = [];
    // Estructura de Meta: entry[].changes[].value.messages[]
    const body = rawBody as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            messages?: Array<{
              id: string;
              from: string;
              type: string;
              text?: { body: string };
              image?: { id: string };
            }>;
          };
        }>;
      }>;
    };
    for (const entry of body?.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const msg of change.value?.messages ?? []) {
          out.push({
            providerMessageId: msg.id,
            fromPhoneE164: normalizePhone(msg.from),
            type: msg.type === 'text' ? 'text' : msg.type === 'image' ? 'image' : 'other',
            text: msg.text?.body,
            mediaId: msg.image?.id,
          });
        }
      }
    }
    return out;
  }

  async sendText(toPhoneE164: string, body: string): Promise<void> {
    const phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    const token = this.config.get<string>('WHATSAPP_ACCESS_TOKEN');
    if (!phoneNumberId || !token) {
      // En dev sin credenciales, solo logueamos lo que se enviaría.
      this.logger.log(`[DEV] → ${toPhoneE164}: ${body}`);
      return;
    }
    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toPhoneE164.replace('+', ''),
        type: 'text',
        text: { body },
      }),
    });
    if (!res.ok) {
      this.logger.error(`Error enviando WhatsApp: ${res.status} ${await res.text()}`);
    }
  }
}

/** Meta entrega el número sin '+'; lo normalizamos a E.164. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  return digits.startsWith('+') ? digits : `+${digits}`;
}

export const WHATSAPP_PROVIDER = Symbol('WHATSAPP_PROVIDER');
