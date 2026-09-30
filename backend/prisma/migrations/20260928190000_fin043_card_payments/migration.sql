-- FIN-043 · Pagos de tarjeta aplicados a cuotas (BT-018). Escrita a mano (M11).
ALTER TABLE "card_installments" ADD COLUMN IF NOT EXISTS "paid_tx_id" UUID;
ALTER TABLE "card_installments" ADD COLUMN IF NOT EXISTS "split_of_id" UUID;
CREATE INDEX IF NOT EXISTS "card_installments_paid_tx_id_idx" ON "card_installments"("paid_tx_id");
