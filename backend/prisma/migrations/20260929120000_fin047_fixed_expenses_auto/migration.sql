-- FIN-047 · Gastos fijos automáticos: cada movimiento puede apuntar al gasto fijo que
-- representa (registrado solo el día que toca, o cruzado cuando se registra a mano).
ALTER TABLE "transactions" ADD COLUMN "fixed_item_id" UUID;
ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_fixed_item_id_fkey"
  FOREIGN KEY ("fixed_item_id") REFERENCES "fixed_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "transactions_fixed_item_id_idx" ON "transactions"("fixed_item_id");
