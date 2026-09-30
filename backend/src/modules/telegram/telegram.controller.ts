import {
  Body,
  Controller,
  Delete,
  Headers,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { ConversationService } from '../messaging/conversation.service';
import { looksLikeOtp } from '../whatsapp/otp.util';
import { TelegramProvider } from './telegram.provider';
import { BotReply } from '../messaging/bot-menu';
import { TelegramLinkService } from './telegram-link.service';

@ApiTags('telegram')
@Controller()
export class TelegramController {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly provider: TelegramProvider,
    private readonly links: TelegramLinkService,
    private readonly conversation: ConversationService,
  ) {}

  // --- Endpoints de la app (autenticados) ---

  @Post('telegram/link/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  startLink(@CurrentUser() user: AuthUser) {
    return this.links.startLink(user.id);
  }

  @Delete('telegram/link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  unlink(@CurrentUser() user: AuthUser) {
    return this.links.unlink(user.id);
  }

  // --- Webhook de Telegram (público) ---

  /**
   * Recepción de updates. Telegram permite un `secret_token` que reenvía en la
   * cabecera `X-Telegram-Bot-Api-Secret-Token`; si está configurado, se valida.
   */
  @Post('webhooks/telegram')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async receive(
    @Headers('x-telegram-bot-api-secret-token') secret: string,
    @Body() body: unknown,
  ): Promise<{ status: string }> {
    const expected = this.config.get<string>('TELEGRAM_WEBHOOK_SECRET', '');
    if (expected && secret !== expected) {
      return { status: 'invalid_secret' };
    }

    for (const msg of this.provider.parseInbound(body)) {
      const externalId = `tg:${msg.updateId}`;
      const seen = await this.prisma.webhookEvent.findUnique({ where: { externalId } });
      if (seen) continue;
      await this.prisma.webhookEvent.create({
        data: { provider: 'telegram', externalId, payload: msg as unknown as object, status: 'received' },
      });

      try {
        if (msg.callbackId) await this.provider.answerCallback(msg.callbackId);
        const reply =
          msg.type === 'callback'
            ? await this.conversation.handleCallback(await this.links.resolveUserId(msg.chatId), msg.text ?? '')
            : await this.handleMessage(msg);
        await this.provider.sendReply(msg.chatId, reply);
        await this.prisma.webhookEvent.update({
          where: { externalId },
          data: { status: 'processed', processedAt: new Date() },
        });
      } catch (e) {
        await this.prisma.webhookEvent.update({
          where: { externalId },
          data: { status: 'failed', error: (e as Error).message },
        });
      }
    }
    return { status: 'ok' };
  }

  private async handleMessage(msg: {
    chatId: string;
    username?: string;
    type: 'text' | 'image' | 'document' | 'other' | 'callback';
    text?: string;
    file?: { fileId: string; mimeType: string };
  }): Promise<BotReply> {
    const userId = await this.links.resolveUserId(msg.chatId);
    const text = (msg.text ?? '').trim();

    // Vinculación por deep-link (/start <código>) o código suelto de 6 dígitos.
    if (!userId) {
      const code = this.extractCode(text);
      if (code) {
        const ok = await this.links.tryVerify(msg.chatId, msg.username, code);
        return ok
          ? {
              text: '✅ ¡Listo! Tu Telegram quedó vinculado. Ya puedes registrar gastos, ingresos y pagos escribiéndome, o tocar un botón de abajo. Escribe "ayuda" para ver ejemplos.',
              mainKeyboard: true,
            }
          : { text: '❌ Ese código no es válido o expiró. Genera uno nuevo en la app (Ajustes → Telegram).' };
      }
    }

    // FIN-042: el adjunto se descarga solo si el motor lo pide (con consentimiento).
    const file = msg.file
      ? async () => {
          const f = await this.provider.downloadFile(msg.file!.fileId);
          return { data: f.data, mimeType: f.mimeType ?? msg.file!.mimeType };
        }
      : undefined;
    return this.conversation.handleRich({
      userId,
      text,
      type: msg.type === 'callback' ? 'other' : msg.type,
      file,
      channelLabel: 'Telegram',
      source: 'telegram',
      // La vinculación ya se maneja arriba; aquí no se re-verifica.
      verify: async () => false,
    });
  }

  /** Extrae el código de "/start 123456" o de un mensaje de 6 dígitos. */
  private extractCode(text: string): string | null {
    const startMatch = /^\/start\s+(\d{6})\b/.exec(text);
    if (startMatch) return startMatch[1];
    if (looksLikeOtp(text)) return text.trim();
    return null;
  }
}
