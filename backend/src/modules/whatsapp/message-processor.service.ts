import { Injectable } from '@nestjs/common';
import { ConversationService } from '../messaging/conversation.service';
import { WhatsappLinkService } from './whatsapp-link.service';
import { InboundMessage } from './whatsapp.provider';

/**
 * Adaptador de WhatsApp sobre el núcleo conversacional compartido
 * ({@link ConversationService}). Resuelve identidad por número de teléfono y
 * delega la interpretación del mensaje.
 */
@Injectable()
export class MessageProcessorService {
  constructor(
    private readonly links: WhatsappLinkService,
    private readonly conversation: ConversationService,
  ) {}

  async process(msg: InboundMessage): Promise<string> {
    const phone = msg.fromPhoneE164;
    const userId = await this.links.resolveUserId(phone);
    return this.conversation.handle({
      userId,
      text: msg.text ?? '',
      type: msg.type,
      channelLabel: 'WhatsApp',
      source: 'whatsapp',
      verify: (code) => this.links.tryVerify(phone, code),
    });
  }
}
