import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_CATEGORIES } from './default-categories';

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Al arrancar, siembra las categorías globales que falten (idempotente). */
  async onModuleInit(): Promise<void> {
    try {
      let created = 0;
      for (const c of DEFAULT_CATEGORIES) {
        const exists = await this.prisma.category.findFirst({
          where: { name: c.name, kind: c.kind, isGlobal: true },
        });
        if (!exists) {
          await this.prisma.category.create({
            data: {
              name: c.name,
              kind: c.kind,
              icon: c.icon,
              color: c.color,
              keywords: c.keywords,
              isGlobal: true,
              userId: null,
            },
          });
          created += 1;
        }
      }
      if (created > 0) this.logger.log(`Categorías globales sembradas: ${created}`);
    } catch (e) {
      this.logger.error(`No se pudieron sembrar categorías: ${(e as Error).message}`);
    }
  }

  /** Categorías del usuario + globales, opcionalmente filtradas por tipo. */
  async findAll(userId: string, kind?: string) {
    return this.prisma.category.findMany({
      where: {
        deletedAt: null,
        OR: [{ userId }, { isGlobal: true }],
        ...(kind ? { kind: kind as never } : {}),
      },
      orderBy: [{ isGlobal: 'desc' }, { name: 'asc' }],
    });
  }

  async create(
    userId: string,
    dto: { name: string; kind: string; icon?: string; color?: string },
  ) {
    return this.prisma.category.create({
      data: {
        userId,
        name: dto.name,
        kind: dto.kind as never,
        icon: dto.icon ?? '🏷️',
        color: dto.color ?? '#828282',
        isGlobal: false,
      },
    });
  }
}
