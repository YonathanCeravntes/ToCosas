-- FIN-007 (DEC-0007): Simulation, Recommendation y NotificationLog.

CREATE TYPE "SimulationType" AS ENUM ('abono_extra', 'nueva_deuda', 'reducir_gastos', 'cambio_ingreso', 'estrategia_deudas', 'vender_activo', 'refinanciar');
CREATE TYPE "SimulationSource" AS ENUM ('app', 'copilot');
CREATE TYPE "RecommendationStatus" AS ENUM ('new', 'seen', 'dismissed', 'done');
CREATE TYPE "NotificationChannel" AS ENUM ('push', 'whatsapp', 'telegram');
CREATE TYPE "NotificationKind" AS ENUM ('recordatorio', 'proactivo');

CREATE TABLE "simulations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "SimulationType" NOT NULL,
    "params" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "source" "SimulationSource" NOT NULL DEFAULT 'app',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "simulations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "simulations_user_id_created_at_idx" ON "simulations"("user_id", "created_at");
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "recommendations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "what_if_not" TEXT NOT NULL,
    "priority_score" DECIMAL(6,4) NOT NULL,
    "impact" JSONB NOT NULL,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'new',
    "dismiss_reason" TEXT,
    "dedupe_key" TEXT NOT NULL,
    "valid_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "recommendations_user_id_dedupe_key_key" ON "recommendations"("user_id", "dedupe_key");
CREATE INDEX "recommendations_user_id_status_idx" ON "recommendations"("user_id", "status");
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "notification_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notification_logs_user_id_sent_at_idx" ON "notification_logs"("user_id", "sent_at");
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
