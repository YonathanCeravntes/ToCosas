-- FIN-027 (DEC-0027): modelo de ingresos personales.
-- DEC §5.2: los FixedItem(kind='ingreso') existentes se MIGRAN a IncomeSource
-- (fuente fija, sin deducciones) — sin coexistencia. Los FixedItem originales
-- quedan marcados con deleted_at (recuperables por auditoría, nunca borrados
-- físicamente) en vez de eliminarse — mismo criterio de FIN-028.

CREATE TYPE "WorkProfile" AS ENUM ('empleado', 'independiente', 'empresario', 'pensionado', 'estudiante', 'otro');
CREATE TYPE "IncomeSourceKind" AS ENUM ('salario_fijo', 'salario_variable', 'comisiones', 'bonificaciones', 'honorarios', 'otro');
CREATE TYPE "DeductionKind" AS ENUM ('salud', 'pension', 'otra');
CREATE TYPE "DeductionBase" AS ENUM ('total', 'parcial');

CREATE TABLE "income_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "work_profile" "WorkProfile" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "income_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "income_profiles_user_id_key" UNIQUE ("user_id"),
  CONSTRAINT "income_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE "income_sources" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "kind" "IncomeSourceKind" NOT NULL DEFAULT 'otro',
  "name" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "is_variable" BOOLEAN NOT NULL DEFAULT false,
  "day_of_month" SMALLINT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "income_sources_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "income_sources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX "income_sources_user_id_is_active_idx" ON "income_sources"("user_id", "is_active");

CREATE TABLE "deductions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "income_source_id" UUID NOT NULL,
  "kind" "DeductionKind" NOT NULL DEFAULT 'otra',
  "name" TEXT NOT NULL,
  "percent" DECIMAL(5,2),
  "fixed_amount" DECIMAL(18,2),
  "base" "DeductionBase" NOT NULL DEFAULT 'total',
  "base_amount" DECIMAL(18,2),
  "withheld_at_source" BOOLEAN NOT NULL DEFAULT true,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "deductions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "deductions_income_source_id_fkey" FOREIGN KEY ("income_source_id") REFERENCES "income_sources"("id") ON DELETE CASCADE
);
CREATE INDEX "deductions_income_source_id_is_active_idx" ON "deductions"("income_source_id", "is_active");

-- Migración de datos (DEC §5.2): cada FixedItem(kind='ingreso', deleted_at IS
-- NULL) se convierte en una IncomeSource fija sin deducciones, preservando
-- nombre/monto/día. El FixedItem original se marca deleted_at (recuperable,
-- nunca se pierde) para que deje de ser leído como ingreso — sin coexistencia.
INSERT INTO "income_sources" ("id", "user_id", "kind", "name", "amount", "is_variable", "day_of_month", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid(), "user_id", 'otro', "name", "amount", false, "day_of_month", "is_active", "created_at", now()
FROM "fixed_items"
WHERE "kind" = 'ingreso' AND "deleted_at" IS NULL;

UPDATE "fixed_items"
SET "deleted_at" = now()
WHERE "kind" = 'ingreso' AND "deleted_at" IS NULL;
