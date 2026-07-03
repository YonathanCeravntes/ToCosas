import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEntityDto, UpdateEntityDto } from './dto/entity.dto';

@Injectable()
export class EntitiesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Entidades propias del usuario + catálogo global precargado. */
  async findAll(userId: string, query?: string) {
    return this.prisma.financialEntity.findMany({
      where: {
        deletedAt: null,
        OR: [{ userId }, { isGlobal: true }],
        ...(query
          ? { name: { contains: query, mode: 'insensitive' } }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
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
