import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEntityDto, UpdateEntityDto } from './dto/entity.dto';
import { GLOBAL_ENTITIES, GlobalEntitySeed, suggestedDebtType } from './global-entities.catalog';

@Injectable()
export class EntitiesService implements OnModuleInit {
  private readonly logger = new Logger(EntitiesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** FIN-034: siembra el catálogo global al arrancar (idempotente). */
  async onModuleInit() {
    try {
      const n = await this.seedGlobalEntities();
      if (n > 0) this.logger.log(`Catálogo global de entidades: ${n} sembradas`);
    } catch (e) {
      // La app no debe caer por la siembra (BD no lista en algunos arranques de test).
      this.logger.warn(`No se pudo sembrar el catálogo global: ${(e as Error).message}`);
    }
  }

  /**
   * FIN-034 · Siembra idempotente del catálogo global (config-sin-código). Añadir
   * una entidad = una fila en `GLOBAL_ENTITIES`; esto la publica sin duplicar y sin
   * tocar UI. Acepta un catálogo inyectado para el test de config-sin-código.
   */
  async seedGlobalEntities(catalog: GlobalEntitySeed[] = GLOBAL_ENTITIES): Promise<number> {
    let created = 0;
    for (const e of catalog) {
      const existing = await this.prisma.financialEntity.findFirst({
        where: { name: e.name, isGlobal: true, deletedAt: null },
      });
      const data = { type: e.type, typicalRate: e.typicalRate ?? null, rateType: e.rateType ?? null };
      if (existing) {
        // Mantener el config como fuente: refresca pista de tasa/tipo si cambió.
        await this.prisma.financialEntity.update({ where: { id: existing.id }, data });
        continue;
      }
      try {
        await this.prisma.financialEntity.create({
          data: { userId: null, isGlobal: true, name: e.name, ...data },
        });
        created += 1;
      } catch (err) {
        // A prueba de carreras: si otro arranque concurrente la creó primero, el
        // índice único parcial (nombre global) lanza P2002 → la tratamos como
        // existente y refrescamos, sin duplicar.
        if ((err as { code?: string }).code === 'P2002') {
          await this.prisma.financialEntity.updateMany({ where: { name: e.name, isGlobal: true }, data });
        } else {
          throw err;
        }
      }
    }
    return created;
  }

  /**
   * FIN-034 · Búsqueda/autocomplete para el selector moderno. Extiende `findAll`:
   * mezcla propias + globales (ya existía), y ENRIQUECE EL ORDEN —no la fórmula—
   * con relevancia (prefijo antes que "contiene") y recencia/pertenencia (lo del
   * usuario y lo que ya usa en sus deudas, primero). Degrada con gracia: sin `q`
   * devuelve el estado de exploración; con 0 resultados, la lista vacía (el camino
   * libre —escribir el nombre— vive en la UI). Reconocimiento, NO recomendación:
   * nunca rankea "la mejor" ni añade un campo de score/patrocinio (Independencia).
   */
  async search(userId: string, q?: string, type?: string) {
    const term = q?.trim();
    const rows = await this.prisma.financialEntity.findMany({
      where: {
        deletedAt: null,
        OR: [{ userId }, { isGlobal: true }],
        ...(term ? { name: { contains: term, mode: 'insensitive' } } : {}),
        ...(type ? { type: type as CreateEntityDto['type'] } : {}),
      },
    });

    // Recencia/pertenencia: entidades que el usuario ya usa en sus deudas.
    const used = await this.prisma.debt.findMany({
      where: { userId, deletedAt: null, entityId: { not: null } },
      select: { entityId: true },
      distinct: ['entityId'],
    });
    const usedIds = new Set(used.map((d) => d.entityId));
    const lower = (term ?? '').toLowerCase();

    const scored = rows
      .map((e) => ({
        e,
        // Señales de ORDEN (no de calidad): pertenencia/recencia, luego prefijo.
        own: e.userId === userId ? 1 : 0,
        recent: usedIds.has(e.id) ? 1 : 0,
        prefix: lower && e.name.toLowerCase().startsWith(lower) ? 1 : 0,
      }))
      .sort(
        (a, b) =>
          b.own - a.own ||
          b.recent - a.recent ||
          b.prefix - a.prefix ||
          a.e.name.localeCompare(b.e.name),
      );

    // Reconocimiento: la entidad + su tipo sugerido (pista editable), sin score.
    return scored.map(({ e }) => ({ ...e, suggestedDebtType: suggestedDebtType(e.type) }));
  }

  /** Compat: la lista completa (propias + globales) filtrable por nombre. */
  async findAll(userId: string, query?: string) {
    return this.search(userId, query);
  }

  async create(userId: string, dto: CreateEntityDto) {
    return this.prisma.financialEntity.create({
      data: { ...dto, userId, isGlobal: false },
    });
  }

  async findOne(userId: string, id: string) {
    const entity = await this.prisma.financialEntity.findFirst({
      where: { id, deletedAt: null, OR: [{ userId }, { isGlobal: true }] },
    });
    if (!entity) throw new NotFoundException('Entidad no encontrada');
    return entity;
  }

  async update(userId: string, id: string, dto: UpdateEntityDto) {
    const entity = await this.prisma.financialEntity.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!entity) {
      throw new NotFoundException('Entidad no encontrada o no editable');
    }
    return this.prisma.financialEntity.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    const entity = await this.prisma.financialEntity.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!entity) {
      throw new NotFoundException('Entidad no encontrada o no eliminable');
    }
    await this.prisma.financialEntity.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }
}
