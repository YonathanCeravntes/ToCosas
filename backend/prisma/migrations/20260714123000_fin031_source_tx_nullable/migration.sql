-- FIN-031: la compra a cuotas es su propio origen trazable — NO crea un gasto
-- en efectivo (la caja sale por las cuotas, no ahora). source_transaction_id
-- pasa a opcional (queda para un futuro asiento de liquidación).
ALTER TABLE "card_purchases" ALTER COLUMN "source_transaction_id" DROP NOT NULL;
ALTER TABLE "card_purchases" DROP CONSTRAINT "card_purchases_source_transaction_id_fkey";
ALTER TABLE "card_purchases" ADD CONSTRAINT "card_purchases_source_transaction_id_fkey"
  FOREIGN KEY ("source_transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL;
