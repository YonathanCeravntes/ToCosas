-- FIN-006 (DEC-0006): Insight + FinancialMemoryFact + proactiveEnabled,
-- con migración de datos anomaly.* → Insight y PURGA EXPLÍCITA (DEC-0006 §10.1).

CREATE TYPE "InsightType" AS ENUM ('anomalia', 'riesgo', 'oportunidad', 'logro', 'cambio_tendencia');
CREATE TYPE "InsightSeverity" AS ENUM ('info', 'warning', 'critical');
CREATE TYPE "InsightStatus" AS ENUM ('new', 'seen', 'dismissed');
CREATE TYPE "MemoryFactKind" AS ENUM ('recurrencia', 'fecha_clave', 'habito', 'cambio');

ALTER TABLE "user_settings" ADD COLUMN "proactive_enabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "insights" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "InsightType" NOT NULL,
    "severity" "InsightSeverity" NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metric_key" TEXT,
    "dedupe_key" TEXT NOT NULL,
    "payload" JSONB,
    "status" "InsightStatus" NOT NULL DEFAULT 'new',
    "valid_until" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "delivered_channels" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "insights_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "insights_user_id_dedupe_key_key" ON "insights"("user_id", "dedupe_key");
CREATE INDEX "insights_user_id_status_created_at_idx" ON "insights"("user_id", "status", "created_at");
ALTER TABLE "insights" ADD CONSTRAINT "insights_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "financial_memory_facts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "MemoryFactKind" NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "dedupe_key" TEXT NOT NULL,
    "payload" JSONB,
    "confidence" DECIMAL(4,3) NOT NULL DEFAULT 0.8,
    "observed_at" TIMESTAMP(3) NOT NULL,
    "last_confirmed_at" TIMESTAMP(3) NOT NULL,
    "stale_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "financial_memory_facts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "financial_memory_facts_user_id_dedupe_key_key" ON "financial_memory_facts"("user_id", "dedupe_key");
CREATE INDEX "financial_memory_facts_user_id_kind_idx" ON "financial_memory_facts"("user_id", "kind");
ALTER TABLE "financial_memory_facts" ADD CONSTRAINT "financial_memory_facts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migración de datos (DEC-0003 §10.5): anomaly.* → Insight. Idempotente.
INSERT INTO "insights" ("id", "user_id", "type", "severity", "title", "body", "metric_key", "dedupe_key", "payload", "status", "created_at")
SELECT
  gen_random_uuid(),
  mr."user_id",
  'anomalia'::"InsightType",
  'warning'::"InsightSeverity",
  'Gasto inusual en ' || substring(mr."metric_key" from 9),
  'Tu gasto del mes en esta categoría se salió de tu patrón habitual (z=' || round(mr."value", 1) || ').',
  mr."metric_key",
  'anomalia:' || substring(mr."metric_key" from 9) || ':' || to_char(mr."captured_at", 'YYYY-MM'),
  jsonb_build_object('zScore', mr."value", 'category', substring(mr."metric_key" from 9), 'migratedFrom', 'metric_readings'),
  'seen'::"InsightStatus",
  mr."captured_at"
FROM "metric_readings" mr
WHERE mr."metric_key" LIKE 'anomaly.%'
ON CONFLICT ("user_id", "dedupe_key") DO NOTHING;

-- PURGA EXPLÍCITA (DEC-0006 §10.1): las filas migradas no tienen razón de persistir
-- (period='month' tiene retención indefinida y ya nadie las escribe ni las lee).
DELETE FROM "metric_readings" WHERE "metric_key" LIKE 'anomaly.%';
