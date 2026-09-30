import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomInt } from 'node:crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from './password.service';

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export type RecoveryChannel = 'email' | 'telegram' | 'none';

/**
 * FIN-039 · Recuperación de contraseña sin tercero de confianza adicional.
 *
 * Genera un código de 6 dígitos (solo se guarda su hash), lo entrega por el mejor
 * canal disponible y lo consume una sola vez:
 *  1. Correo (SMTP) si `SMTP_URL` está configurado (Resend/Brevo/Gmail App Password…).
 *  2. Telegram si el usuario tiene el bot vinculado y verificado (FIN-029).
 *  3. Si no hay canal, en desarrollo se loguea; en producción la respuesta sigue
 *     siendo 202 (no revelamos si el correo existe) y el Fundador debe configurar SMTP.
 */
@Injectable()
export class PasswordRecoveryService {
  private readonly logger = new Logger(PasswordRecoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly passwords: PasswordService,
  ) {}

  private hash(code: string, userId: string): string {
    return createHash('sha256').update(`${userId}:${code}`).digest('hex');
  }

  /** Siempre resuelve — nunca revela si el correo existe. */
  async requestCode(emailRaw: string): Promise<{ ok: true; channels: RecoveryChannel[] }> {
    const email = emailRaw.toLowerCase().trim();
    const user = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
    const channels = this.availableChannels();
    if (!user) return { ok: true, channels };

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.$transaction([
      // Un código vigente a la vez: invalida los anteriores.
      this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.create({
        data: { userId: user.id, codeHash: this.hash(code, user.id), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
      }),
    ]);

    const text =
      `Tu código para cambiar la contraseña de Millo es ${code}. ` +
      'Vence en 15 minutos. Si no lo pediste, ignora este mensaje.';
    const delivered: RecoveryChannel[] = [];
    if (await this.sendEmail(email, text)) delivered.push('email');
    if (await this.sendTelegram(user.id, text)) delivered.push('telegram');
    if (delivered.length === 0) {
      this.logger.warn(
        `Sin canal de entrega para recuperación (userId=${user.id}). ` +
          (process.env.NODE_ENV === 'production' ? 'Configura SMTP_URL.' : `Código DEV: ${code}`),
      );
    }
    return { ok: true, channels };
  }

  async resetWithCode(emailRaw: string, code: string, newPassword: string): Promise<{ ok: true }> {
    const email = emailRaw.toLowerCase().trim();
    const user = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
    const invalid = () => new BadRequestException('Código inválido o vencido');
    if (!user) throw invalid();

    const token = await this.prisma.passwordResetToken.findFirst({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!token || token.attempts >= MAX_ATTEMPTS) throw invalid();

    if (token.codeHash !== this.hash(code.trim(), user.id)) {
      await this.prisma.passwordResetToken.update({ where: { id: token.id }, data: { attempts: { increment: 1 } } });
      throw invalid();
    }

    const passwordHash = await this.passwords.hash(newPassword);
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    ]);
    return { ok: true };
  }

  availableChannels(): RecoveryChannel[] {
    const out: RecoveryChannel[] = [];
    if (this.config.get<string>('SMTP_URL')) out.push('email');
    if (this.config.get<string>('TELEGRAM_BOT_TOKEN')) out.push('telegram');
    return out.length ? out : ['none'];
  }

  private async sendEmail(to: string, text: string): Promise<boolean> {
    const url = this.config.get<string>('SMTP_URL');
    if (!url) return false;
    try {
      const transport = nodemailer.createTransport(url);
      await transport.sendMail({
        from: this.config.get<string>('MAIL_FROM', 'Millo <no-reply@millo.app>'),
        to,
        subject: 'Tu código para cambiar la contraseña · Millo',
        text,
      });
      return true;
    } catch (e) {
      this.logger.warn(`SMTP falló: ${(e as Error).message}`);
      return false;
    }
  }

  private async sendTelegram(userId: string, text: string): Promise<boolean> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) return false;
    const link = await this.prisma.telegramLink.findFirst({
      where: { userId, status: 'verified', chatId: { not: null } },
    });
    if (!link?.chatId) return false;
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: link.chatId, text }),
      });
      return res.ok;
    } catch (e) {
      this.logger.warn(`Telegram falló: ${(e as Error).message}`);
      return false;
    }
  }
}
