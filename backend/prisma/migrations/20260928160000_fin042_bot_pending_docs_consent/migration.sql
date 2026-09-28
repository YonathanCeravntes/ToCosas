-- FIN-042 · Lectura de extractos/comprobantes por foto o PDF vía bot (escrita a mano, M11).

-- 1) Consentimiento específico para enviar documentos a la IA.
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "docs_ai_consent_at" TIMESTAMP(3);

-- 2) Propuesta pendiente de confirmación por usuario y canal.
CREATE TABLE "bot_pending_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_pending_actions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bot_pending_actions_user_id_source_key" ON "bot_pending_actions"("user_id", "source");

ALTER TABLE "bot_pending_actions" ADD CONSTRAINT "bot_pending_actions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
