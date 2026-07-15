-- FIN-003 (DEC-0003): convierte metric_readings en tabla particionada por rango
-- mensual sobre captured_at, con PK compuesta e índice único de upsert.
-- La tabla está vacía (creada en FIN-002, poblada recién por FIN-003), por lo
-- que el drop/recreate es seguro.

DROP TABLE "metric_readings";

CREATE TABLE "metric_readings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "metric_key" TEXT NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL,
    "period" "MetricPeriod" NOT NULL DEFAULT 'month',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_readings_pkey" PRIMARY KEY ("id", "captured_at")
) PARTITION BY RANGE ("captured_at");

-- Índice único del upsert idempotente (incluye la columna de partición).
CREATE UNIQUE INDEX "metric_readings_user_id_metric_key_period_captured_at_key"
    ON "metric_readings"("user_id", "metric_key", "period", "captured_at");

CREATE INDEX "metric_readings_user_id_metric_key_captured_at_idx"
    ON "metric_readings"("user_id", "metric_key", "captured_at");

ALTER TABLE "metric_readings"
    ADD CONSTRAINT "metric_readings_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partición DEFAULT: red de seguridad para que ninguna escritura falle si aún
-- no existe la partición mensual correspondiente (RetentionJob crea la del mes
-- siguiente por adelantado).
CREATE TABLE "metric_readings_default" PARTITION OF "metric_readings" DEFAULT;

-- Particiones del mes actual y el siguiente.
CREATE TABLE "metric_readings_2026_07" PARTITION OF "metric_readings"
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE "metric_readings_2026_08" PARTITION OF "metric_readings"
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
