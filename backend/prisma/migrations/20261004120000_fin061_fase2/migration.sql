-- FIN-061 Fase 2 · Motor de Salida Humano: clases de gasto y protegidos, extractos
-- de tarjeta, avances, prima, gastos grandes del año y reparto de plata extra.
CREATE TYPE "SpendClass" AS ENUM ('esencial', 'gusto');

CREATE TABLE "user_category_prefs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "category_id" UUID NOT NULL,
  "spend_class" "SpendClass",
  "protected" BOOLEAN NOT NULL DEFAULT false,
  "monthly_cap" DECIMAL(18,2),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_category_prefs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_category_prefs_user_id_category_id_key" ON "user_category_prefs"("user_id", "category_id");
ALTER TABLE "user_category_prefs" ADD CONSTRAINT "user_category_prefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_category_prefs" ADD CONSTRAINT "user_category_prefs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "card_statements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "debt_id" UUID NOT NULL,
  "closing_date" DATE NOT NULL,
  "due_date" DATE,
  "statement_balance" DECIMAL(18,2) NOT NULL,
  "minimum_payment" DECIMAL(18,2),
  "total_payment" DECIMAL(18,2),
  "credit_limit" DECIMAL(18,2),
  "handling_fee" DECIMAL(18,2),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "card_statements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "card_statements_debt_id_closing_date_key" ON "card_statements"("debt_id", "closing_date");
ALTER TABLE "card_statements" ADD CONSTRAINT "card_statements_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "card_purchases" ADD COLUMN "is_cash_advance" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "card_purchases" ADD COLUMN "category_id" UUID;
ALTER TABLE "card_purchases" ADD CONSTRAINT "card_purchases_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "income_sources" ADD COLUMN "receives_prima" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "annual_expenses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "month" SMALLINT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "annual_expenses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "annual_expenses_user_id_idx" ON "annual_expenses"("user_id");
ALTER TABLE "annual_expenses" ADD CONSTRAINT "annual_expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "windfall_plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "debt_pct" SMALLINT NOT NULL,
  "cushion_pct" SMALLINT NOT NULL,
  "free_pct" SMALLINT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "windfall_plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "windfall_plans_user_id_kind_key" ON "windfall_plans"("user_id", "kind");
ALTER TABLE "windfall_plans" ADD CONSTRAINT "windfall_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
