-- FIN-039 · Cuenta y datos (escrita a mano: el diff automático arrastraba deriva
-- ajena — DROP DEFAULT gen_random_uuid() y re-creación de FKs de FIN-027/031/036 —
-- que NO forma parte de esta FIN y no debe tocarse en producción).

-- 1) Tabla `suggestions` sin uso en código (BLUEPRINT-0001 M1).
ALTER TABLE "suggestions" DROP CONSTRAINT IF EXISTS "suggestions_user_id_fkey";
DROP TABLE IF EXISTS "suggestions";
DROP TYPE IF EXISTS "SuggestionType";

-- 2) Códigos de recuperación de contraseña (solo hash, 15 min, un uso).
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "password_reset_tokens_user_id_expires_at_idx" ON "password_reset_tokens"("user_id", "expires_at");

ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
