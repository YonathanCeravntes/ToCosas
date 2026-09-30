import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Registra (o actualiza) el token push de un dispositivo del usuario. */
  async register(userId: string, dto: RegisterDeviceDto) {
    const device = await this.prisma.device.upsert({
      where: { userId_fcmToken: { userId, fcmToken: dto.pushToken } },
      create: {
        userId,
        platform: dto.platform ?? 'unknown',
        fcmToken: dto.pushToken,
        appVersion: dto.appVersion ?? null,
        lastSyncedAt: new Date(),
      },
      update: {
        platform: dto.platform ?? undefined,
        appVersion: dto.appVersion ?? undefined,
        lastSyncedAt: new Date(),
      },
    });
    return { id: device.id, registered: true };
  }

  /** Elimina un token (p. ej. al desactivar notificaciones o cerrar sesión). */
  async unregister(userId: string, pushToken: string) {
    await this.prisma.device.deleteMany({ where: { userId, fcmToken: pushToken } });
    return { removed: true };
  }
}
