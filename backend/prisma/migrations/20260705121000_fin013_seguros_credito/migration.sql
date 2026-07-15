-- FIN-013 · Seguros asociados al crédito (DEC-0011 §4.1/§4.2)
-- Modelo mínimo: prima mensual plana, financiado/endosable, soft-delete.

CREATE TYPE "DebtInsuranceKind" AS ENUM (
  'vida_deudor',
  'incendio_terremoto',
  'todo_riesgo',
  'desempleo',
  'otro'
);

CREATE TABLE "debt_insurances" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "debt_id" UUID NOT NULL,
  "kind" "DebtInsuranceKind" NOT NULL DEFAULT 'otro',
  "name" TEXT NOT NULL,
  "monthly_premium" DECIMAL(18,2) NOT NULL,
  "financed" BOOLEAN NOT NULL DEFAULT true,
  "endorsed" BOOLEAN NOT NULL DEFAULT false,
  "insurer" TEXT,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),

  CONSTRAINT "debt_insurances_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "debt_insurances_debt_id_fkey" FOREIGN KEY ("debt_id")
    REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "debt_insurances_debt_id_active_idx"
  ON "debt_insurances"("debt_id", "active");
