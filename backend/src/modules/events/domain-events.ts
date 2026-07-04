/**
 * Catálogo de eventos de dominio de Millo (FIN-002).
 *
 * Los eventos se escriben en el outbox dentro de la misma transacción que el
 * cambio de negocio (garantía transaccional) y un despachador los emite luego.
 *
 * Clasificación (DEC-0002 §10.2): en FIN-002 **todos** los consumidores son
 * asíncronos diferidos. El patrimonio en UI se resuelve on-read (consulta
 * agregada), por lo que `account.balance_updated` y `asset.changed` NO son
 * síncronos críticos. Los consumidores reales llegan en FIN-003.
 */
export const DomainEventType = {
  TransactionCreated: 'transaction.created',
  TransactionUpdated: 'transaction.updated',
  TransactionDeleted: 'transaction.deleted',
  DebtCreated: 'debt.created',
  DebtUpdated: 'debt.updated',
  DebtDeleted: 'debt.deleted',
  FixedItemChanged: 'fixed_item.changed',
  AccountCreated: 'account.created',
  AccountBalanceUpdated: 'account.balance_updated',
  AccountDeleted: 'account.deleted',
  AssetChanged: 'asset.changed',
} as const;

export type DomainEventType =
  (typeof DomainEventType)[keyof typeof DomainEventType];

/** Modo de entrega por evento. En FIN-002 todo es asíncrono diferido. */
export type DeliveryMode = 'async';

export const EVENT_DELIVERY: Record<DomainEventType, DeliveryMode> = {
  'transaction.created': 'async',
  'transaction.updated': 'async',
  'transaction.deleted': 'async',
  'debt.created': 'async',
  'debt.updated': 'async',
  'debt.deleted': 'async',
  'fixed_item.changed': 'async',
  'account.created': 'async',
  'account.balance_updated': 'async',
  'account.deleted': 'async',
  'asset.changed': 'async',
};

export interface DomainEventInput {
  aggregateType: string; // 'transaction' | 'debt' | 'account' | 'asset' | 'fixed_item'
  aggregateId: string;
  eventType: DomainEventType;
  payload?: Record<string, unknown>;
}
