import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { generateOtp, hashOtp } from './otp.util';

const OTP_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class WhatsappLinkService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Inicia la vinculación: genera un OTP que el usuario verá en la app y deberá
   * escribir por WhatsApp. Devuelve el OTP (solo para mostrarlo en la app).
   */
  async startLink(userId: string, phoneE164: string) {
    if (!/^\+\d{8,15}$/.test(phoneE164)) {
      throw new BadRequestException('Teléfono inválido (formato E.164, ej: +573001112222)');
    }
    const code = generateOtp();
    const otpCodeHash = hashOtp(code, phoneE164);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

    await this.prisma.whatsappLink.upsert({
      where: { phoneE164 },
      create: { userId, phoneE164, status: 'pending', otpCodeHash, otpExpiresAt },
      update: { userId, status: 'pending', otpCodeHash, otpExpiresAt },
    });

    return { otp: code, phoneE164, expiresAt: otpExpiresAt };
  }

  /** Intenta verificar un OTP recibido por WhatsApp desde `phoneE164`. */
  async tryVerify(phoneE164: string, code: string): Promise<boolean> {
    const link = await this.prisma.whatsappLink.findUnique({ where: { phoneE164 } });
    if (!link || link.status === 'verified') return link?.status === 'verified';
    if (!link.otpCodeHash || !link.otpExpiresAt || link.otpExpiresAt < new Date()) {
      return false;
    }
    if (hashOtp(code, phoneE164) !== link.otpCodeHash) return false;

    await this.prisma.whatsappLink.update({
      where: { phoneE164 },
      data: {
        status: 'verified',
        optIn: true,
        verifiedAt: new Date(),
        otpCodeHash: null,
        otpExpiresAt: null,
      },
    });
    return true;
  }

  /** Devuelve el userId vinculado y verificado para un número, o null. */
  async resolveUserId(phoneE164: string): Promise<string | null> {
    const link = await this.prisma.whatsappLink.findFirst({
      where: { phoneE164, status: 'verified' },
    });
    return link?.userId ?? null;
  }

  async unlink(userId: string) {
    await this.prisma.whatsappLink.updateMany({
      where: { userId },
      data: { status: 'revoked', optIn: false },
    });
    return { revoked: true };
  }
}
