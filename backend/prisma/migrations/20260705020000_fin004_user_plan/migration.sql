-- FIN-004 (DEC-0004): señal de monetización — plan free/premium en UserSettings.
CREATE TYPE "Plan" AS ENUM ('free', 'premium');
ALTER TABLE "user_settings" ADD COLUMN "plan" "Plan" NOT NULL DEFAULT 'free';
