import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_CATEGORIES } from './default-categories';
import { normalizeName } from '../budget/fixed-expense.util';

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
              isFixed: !!c.fixed,
              isGlobal: true,
              userId: null,
            },
          });
          created += 1;
        } else if (exists.isFixed !== !!c.fixed || exists.keywords.join('|') !== c.keywords.join('|')) {
          // FIN-048: las globales se mantienen alineadas con el catálogo (tipo fijo y palabras clave).
          await this.prisma.category.update({ where: { id: exists.id }, data: { isFixed: !!c.fixed, keywords: c.keywords } });
        }
      }
      if (created > 0) this.logger.log(`Categorías globales sembradas: ${created}`);
      await this.backfillFixedTypes();
    } catch (e) {
      this.logger.error(`No se pudieron sembrar categorías: ${(e as Error).message}`);
    }
  }

  /**
   * FIN-048: gastos fijos creados antes de los TIPOS quedan sin tipo; se les asigna por
   * el nombre ("Arriendo" → Arriendo, "Internet" → Internet y TV). Idempotente.
   */
  private async backfillFixedTypes(): Promise<void> {
    const untyped = await this.prisma.fixedItem.findMany({ where: { kind: 'gasto', categoryId: null, deletedAt: null } });
    if (untyped.length === 0) return;
    const types = await this.prisma.category.findMany({ where: { isGlobal: true, isFixed: true, deletedAt: null } });
    let n = 0;
    for (const f of untyped) {
      const name = ` ${normalizeName(f.name)} `;
      const hit =
        types.find((t) => name.includes(` ${normalizeName(t.name)} `)) ??
        types.find((t) => t.keywords.some((k) => normalizeName(k).length >= 3 && name.includes(` ${normalizeName(k)} `)));
      if (!hit) continue;
      await this.prisma.fixedItem.update({ where: { id: f.id }, data: { categoryId: hit.id } });
      n += 1;
    }
    if (n > 0) this.logger.log(`Gastos fijos con tipo asignado: ${n}`);
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
