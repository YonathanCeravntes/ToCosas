-- FIN-008 (DEC-0008): gamificación — Streak, Achievement, Challenge.

CREATE TYPE "StreakKind" AS ENUM ('registro_semanal');
CREATE TYPE "ChallengeStatus" AS ENUM ('active', 'completed', 'failed');

CREATE TABLE "streaks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "StreakKind" NOT NULL DEFAULT 'registro_semanal',
    "current" INTEGER NOT NULL DEFAULT 0,
    "best" INTEGER NOT NULL DEFAULT 0,
    "last_period" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "streaks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "streaks_user_id_kind_key" ON "streaks"("user_id", "kind");
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "achievements" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seen_at" TIMESTAMP(3),
    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "achievements_user_id_code_key" ON "achievements"("user_id", "code");
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "challenges" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "target" JSONB,
    "progress" JSONB,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "challenges_user_id_code_month_key" ON "challenges"("user_id", "code", "month");
CREATE INDEX "challenges_user_id_month_idx" ON "challenges"("user_id", "month");
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
