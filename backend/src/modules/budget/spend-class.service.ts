import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoryClass, classify, SpendClassValue } from './spend-class.util';

export interface SpendClassRow extends CategoryClass {
  categoryId: string;
  name: string;
  icon: string | null;
  isFixed: boolean;
  monthlyCap: number | null;
}

const capOf = (p?: { monthlyCap: unknown } | null) => (p?.monthlyCap != null ? Number(p.monthlyCap) : null);

/**
 * FIN-061 Fase 2.2 · Qué es esencial y qué es gusto para cada persona, y qué la
 * sostiene (protegido). Fuente única para la línea base, el análisis de consumo y el
 * colchón (§32).
 */
@Injectable()
export class SpendClassService {
  constructor(private readonly prisma: PrismaService) {}

  /** Mapa categoría → clase efectiva de la persona (incluye las globales). */
  async classMap(userId: string): Promise<Map<string, CategoryClass>> {
    const rows = await this.list(userId);
    return new Map(rows.map((r) => [r.categoryId, r]));
  }

  async list(userId: string): Promise<SpendClassRow[]> {
    const [cats, prefs] = await Promise.all([
      this.prisma.category.findMany({
        where: { deletedAt: null, kind: 'gasto', OR: [{ userId }, { isGlobal: true }] },
        orderBy: [{ isGlobal: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.userCategoryPref.findMany({ where: { userId } }),
    ]);
    const byCat = new Map(prefs.map((p) => [p.categoryId, p]));
    return cats.map((c) => ({
      categoryId: c.id,
      name: c.name,
      icon: c.icon,
      isFixed: c.isFixed,
      monthlyCap: capOf(byCat.get(c.id)),
      ...classify(c, byCat.get(c.id) ?? null),
    }));
  }

  /**
   * Cambia la clase o el "esto me sostiene" de una categoría. `spendClass: null`
   * vuelve a la sugerencia de Millo.
   */
  async update(
    userId: string,
    categoryId: string,
    dto: { spendClass?: SpendClassValue | null; protected?: boolean; monthlyCap?: number | null },
  ): Promise<SpendClassRow> {
    const cat = await this.prisma.category.findFirst({
      where: { id: categoryId, deletedAt: null, OR: [{ userId }, { isGlobal: true }] },
    });
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    if (cat.kind !== 'gasto') throw new BadRequestException('Solo las categorías de gasto se clasifican');
    const data = {
      ...(dto.spendClass !== undefined ? { spendClass: dto.spendClass } : {}),
      ...(dto.protected !== undefined ? { protected: dto.protected } : {}),
      ...(dto.monthlyCap !== undefined ? { monthlyCap: dto.monthlyCap && dto.monthlyCap > 0 ? dto.monthlyCap : null } : {}),
    };
    const pref = await this.prisma.userCategoryPref.upsert({
      where: { userId_categoryId: { userId, categoryId } },
      create: { userId, categoryId, spendClass: dto.spendClass ?? null, protected: dto.protected ?? false, monthlyCap: data.monthlyCap ?? null },
      update: data,
    });
    return { categoryId: cat.id, name: cat.name, icon: cat.icon, isFixed: cat.isFixed, monthlyCap: capOf(pref), ...classify(cat, pref) };
  }
}
