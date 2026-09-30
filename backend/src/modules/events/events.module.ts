import { Global, Module } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { OutboxDispatcher } from './outbox.dispatcher';

/**
 * Módulo de eventos de dominio (outbox + despachador). Global para que cualquier
 * productor (transactions, debts, budget, accounts) pueda inyectar `OutboxService`
 * sin importar el módulo explícitamente.
 */
@Global()
@Module({
  providers: [OutboxService, OutboxDispatcher],
  exports: [OutboxService],
})
export class EventsModule {}
