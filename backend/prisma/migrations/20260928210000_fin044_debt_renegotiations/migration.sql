-- FIN-044 · Renegociación de un crédito (escrita a mano, M11).
CREATE TABLE "debt_renegotiations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "debt_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "effective_from" DATE NOT NULL,
    "kept_cycle" BOOLEAN NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'app',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debt_renegotiations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "debt_renegotiations_debt_id_created_at_idx" ON "debt_renegotiations"("debt_id", "created_at");

ALTER TABLE "debt_renegotiations" ADD CONSTRAINT "debt_renegotiations_debt_id_fkey"
  FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
