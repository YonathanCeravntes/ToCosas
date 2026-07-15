-- FIN-031 (DEC-0031): espina del SO Financiero — compra con tarjeta.
-- Cupo de la tarjeta (null para el resto de tipos; saldo/cupo se DERIVAN, §32).
ALTER TABLE "debts" ADD COLUMN "credit_limit" DECIMAL(18,2);

CREATE TABLE "card_purchases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "debt_id" UUID NOT NULL,
  "source_transaction_id" UUID NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL,
  "installments_count" INTEGER NOT NULL,
  "with_interest" BOOLEAN NOT NULL DEFAULT false,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "card_purchases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "card_purchases_source_transaction_id_key" UNIQUE ("source_transaction_id"),
  CONSTRAINT "card_purchases_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE CASCADE,
  CONSTRAINT "card_purchases_source_transaction_id_fkey" FOREIGN KEY ("source_transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE
);
CREATE INDEX "card_purchases_debt_id_deleted_at_idx" ON "card_purchases"("debt_id", "deleted_at");

CREATE TABLE "card_installments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "card_purchase_id" UUID NOT NULL,
  "period_no" INTEGER NOT NULL,
  "due_date" DATE NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "paid_at" TIMESTAMP(3),
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "card_installments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "card_installments_card_purchase_id_fkey" FOREIGN KEY ("card_purchase_id") REFERENCES "card_purchases"("id") ON DELETE CASCADE
);
CREATE INDEX "card_installments_card_purchase_id_deleted_at_idx" ON "card_installments"("card_purchase_id", "deleted_at");
