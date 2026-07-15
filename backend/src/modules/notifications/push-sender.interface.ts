/**
 * Puerto de envío de notificaciones push. Se usa como token de DI (clase
 * abstracta) para desacoplar el dominio del proveedor concreto (Expo/FCM).
 */
export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export abstract class PushSender {
  abstract sendToTokens(tokens: string[], msg: PushMessage): Promise<void>;
}
