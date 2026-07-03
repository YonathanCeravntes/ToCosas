import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { verifyMetaSignature } from './signature.util';
import { MetaCloudProvider } from './whatsapp.provider';
import { WhatsappLinkService } from './whatsapp-link.service';
import { MessageProcessorService } from './message-processor.service';
import { StartLinkDto } from './dto/whatsapp.dto';

@ApiTags('whatsapp')
@Controller()
export class WhatsappController {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly provider: MetaCloudProvider,
    private readonly links: WhatsappLinkService,
    private readonly processor: MessageProcessorService,
  ) {}

  // --- Endpoints de la app (autenticados) ---

  @Post('whatsapp/link/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  startLink(@CurrentUser() user: AuthUser, @Body() dto: StartLinkDto) {
    return this.links.startLink(user.id, dto.phoneE164);
  }

  @Delete('whatsapp/link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  unlink(@CurrentUser() user: AuthUser) {
    return this.links.unlink(user.id);
  }

  // --- Webhook de Meta (públicos) ---

  /** Verificación del webhook (Meta hace un GET con un challenge). */
  @Get('webhooks/whatsapp')
  @ApiExcludeEndpoint()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    const expected = this.config.get<string>('WHATSAPP_VERIFY_TOKEN');
    if (mode === 'subscribe' && token === expected) {
      return challenge;
    }
    return 'forbidden';
  }

  /**
   * Recepción de mensajes. Valida la firma, deduplica y procesa.
   * Responde 200 rápido (Meta reintenta ante errores/timeout).
   */
  @Post('webhooks/whatsapp')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async receive(
    @Req() req: Request,
    @Headers('x-hub-signature-256') signature: string,
    @Body() body: unknown,
  ): Promise<{ status: string }> {
    const appSecret = this.config.get<string>('WHATSAPP_APP_SECRET', '');
    // rawBody lo expone main.ts (ver bootstrap). Si no hay secreto configurado
    // (dev), se omite la validación de firma.
    const raw = (req as Request & { rawBody?: Buffer }).rawBody;
    if (appSecret) {
      const ok = raw ? verifyMetaSignature(raw, signature, appSecret) : false;
      if (!ok) return { status: 'invalid_signature' };
    }

    const messages = this.provider.parseInbound(body);
    for (const msg of messages) {
      // Idempotencia: si ya vimos este message_id, lo ignoramos.
      const seen = await this.prisma.webhookEvent.findUnique({
        where: { externalId: msg.providerMessageId },
      });
      if (seen) continue;
      await this.prisma.webhookEvent.create({
        data: {
          externalId: msg.providerMessageId,
          payload: msg as unknown as object,
          status: 'received',
        },
      });

      try {
        const reply = await this.processor.process(msg);
        await this.provider.sendText(msg.fromPhoneE164, reply);
        await this.prisma.webhookEvent.update({
          where: { externalId: msg.providerMessageId },
          data: { status: 'processed', processedAt: new Date() },
        });
      } catch (e) {
        await this.prisma.webhookEvent.update({
          where: { externalId: msg.providerMessageId },
          data: { status: 'failed', error: (e as Error).message },
        });
      }
    }
    return { status: 'ok' };
  }
}
