import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { generateOtp, hashOtp } from '../whatsapp/otp.util';
import { TelegramProvider } from './telegram.provider';

const OTP_TTL_MS = 10 * 60 * 1000;
// Salt constante: en Telegram no conocemos el chatId al generar el código, así
// que el pending se busca por hash del código (código de 6 dígitos + TTL 10 min).
const TG_SALT = 'telegram';

@Injectable()
export class TelegramLinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: TelegramProvider,
  ) {}

  /**
   * Inicia la vinculación: genera un OTP que el usuario verá en la app y enviará
   * al bot. Devuelve el código y un deep-link `https://t.me/<bot>?start=<code>`.
   */
  async startLink(userId: string) {
    // Limpia intentos pendientes previos de este usuario (sin chat aún).
    await this.prisma.telegramLink.deleteMany({
      where: { userId, status: 'pending', chatId: null },
    });

    const code = generateOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
    await this.prisma.telegramLink.create({
      data: {
        userId,
        chatId: null,
        status: 'pending',
        otpCodeHash: hashOtp(code, TG_SALT),
        otpExpiresAt,
      },
    });

    const bot = this.provider.botUsername();
    return {
      otp: code,
      botUsername: bot,
      deepLink: `https://t.me/${bot}?start=${code}`,
      expiresAt: otpExpiresAt,
    };
  }

  /**
   * Verifica un código recibido desde un chat. Como el pending no tiene chatId,
   * lo buscamos por hash del código; si es único y no expiró, lo vinculamos.
   */
  async tryVerify(chatId: string, username: string | undefined, code: string): Promise<boolean> {
    const hash = hashOtp(code.trim(), TG_SALT);
    const candidates = await this.prisma.telegramLink.findMany({
      where: {
        status: 'pending',
        chatId: null,
        otpCodeHash: hash,
        otpExpiresAt: { gt: new Date() },
      },
    });
    if (candidates.length !== 1) return false;
    const pending = candidates[0];

    // Si este chat ya estaba vinculado a otra cuenta, se libera.
    await this.prisma.telegramLink.deleteMany({
      where: { chatId, id: { not: pending.id } },
    });

    await this.prisma.telegramLink.update({
      where: { id: pending.id },
      data: {
        chatId,
        username: username ?? null,
        status: 'verified',
        optIn: true,
        verifiedAt: new Date(),
        otpCodeHash: null,
        otpExpiresAt: null,
      },
    });
    return true;
  }

  /** userId vinculado y verificado para un chat, o null. */
  async resolveUserId(chatId: string): Promise<string | null> {
    const link = await this.prisma.telegramLink.findFirst({
      where: { chatId, status: 'verified' },
    });
    return link?.userId ?? null;
  }

  async unlink(userId: string) {
    await this.prisma.telegramLink.updateMany({
      where: { userId, status: 'verified' },
      data: { status: 'revoked', optIn: false },
    });
    await this.prisma.telegramLink.deleteMany({
      where: { userId, status: 'pending' },
    });
    return { revoked: true };
  }
}
