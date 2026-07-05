-- FIN-005 (DEC-0005 v2 + adenda legal): Copiloto Financiero — conversaciones,
-- log de auditoría de IA (sin texto) y consentimiento versionado.

CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant');
CREATE TYPE "MessageSource" AS ENUM ('template', 'llm');
CREATE TYPE "AiLogDirection" AS ENUM ('request', 'response');

ALTER TABLE "user_settings"
  ADD COLUMN "ai_consent_at" TIMESTAMP(3),
  ADD COLUMN "ai_consent_version" INTEGER;

CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "conversations_user_id_updated_at_idx" ON "conversations"("user_id", "updated_at");
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "source" "MessageSource" NOT NULL DEFAULT 'template',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ai_interaction_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "conversation_id" UUID,
    "direction" "AiLogDirection" NOT NULL,
    "model" TEXT,
    "purpose" TEXT NOT NULL,
    "context_field_groups" TEXT[],
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "cost_estimate" DECIMAL(10,6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_interaction_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_interaction_logs_user_id_created_at_idx" ON "ai_interaction_logs"("user_id", "created_at");
ALTER TABLE "ai_interaction_logs" ADD CONSTRAINT "ai_interaction_logs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
