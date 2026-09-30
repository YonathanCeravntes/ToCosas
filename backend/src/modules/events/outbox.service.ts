import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainEventInput } from './domain-events';

/** Cliente Prisma que puede ser el base o el de una transacción interactiva. */
type PrismaLike = PrismaService | Prisma.TransactionClient;

/**
 * Escribe eventos de dominio en el outbox. La clave del patrón es llamar a
 * `enqueue(tx, ...)` con el MISMO cliente de transacción que el cambio de negocio,
 * de modo que el evento y el cambio se confirman (o revierten) juntos.
 */
@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  /** Encola un evento dentro de la transacción `tx` (garantía transaccional). */
  async enqueue(tx: PrismaLike, event: DomainEventInput): Promise<void> {
    await tx.outboxEvent.create({
      data: {
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        payload: (event.payload ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  /** Azúcar: ejecuta `fn` en una transacción y encola el evento en la misma. */
  async withEvent<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<{ result: T; event: DomainEventInput }>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const { result, event } = await fn(tx);
      await this.enqueue(tx, event);
      return result;
    });
  }
}
