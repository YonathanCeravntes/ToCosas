/**
 * Puerto de envío de WhatsApp para recordatorios. Se usa como token de DI
 * (clase abstracta) para desacoplar el módulo de recordatorios del proveedor
 * concreto (Meta/Twilio). La implementación real la aporta WhatsappModule.
 */
export abstract class WhatsAppSender {
  abstract sendText(toPhoneE164: string, body: string): Promise<void>;
}
