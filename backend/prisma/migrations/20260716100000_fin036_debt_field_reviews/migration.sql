-- FIN-036 · Revisión de campos de deuda (confirmación mensual por corte).
CREATE TABLE "debt_field_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "debt_id" UUID NOT NULL,
    "field" TEXT NOT NULL,
    "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed" BOOLEAN NOT NULL DEFAULT false,
    "previous_value" DECIMAL(18,4),
    "new_value" DECIMAL(18,4),

    CONSTRAINT "debt_field_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "debt_field_reviews_debt_id_field_reviewed_at_idx"
    ON "debt_field_reviews"("debt_id", "field", "reviewed_at");

ALTER TABLE "debt_field_reviews"
    ADD CONSTRAINT "debt_field_reviews_debt_id_fkey"
    FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
