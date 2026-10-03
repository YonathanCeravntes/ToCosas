-- FIN-059 · Millo en pareja (Fundador, 2026-10-03). Solo lo nuevo (sin la deriva M11).
CREATE TYPE "HouseholdSplit" AS ENUM ('proporcional', 'mitad');

ALTER TABLE "transactions" ADD COLUMN "household_id" UUID;
ALTER TABLE "fixed_items" ADD COLUMN "household_id" UUID;
ALTER TABLE "debts" ADD COLUMN "household_id" UUID;
CREATE INDEX "transactions_household_id_occurred_at_idx" ON "transactions"("household_id", "occurred_at");

CREATE TABLE "households" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_by_id" UUID NOT NULL,
    "split_mode" "HouseholdSplit" NOT NULL DEFAULT 'proporcional',
    "monthly_budget" DECIMAL(18,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "household_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "household_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "consent_at" TIMESTAMP(3) NOT NULL,
    "share_income" BOOLEAN NOT NULL DEFAULT false,
    "share_debts" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    CONSTRAINT "household_members_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "household_members_user_id_left_at_idx" ON "household_members"("user_id", "left_at");
CREATE INDEX "household_members_household_id_idx" ON "household_members"("household_id");
-- Un hogar activo por persona.
CREATE UNIQUE INDEX "household_members_one_active_per_user" ON "household_members"("user_id") WHERE "left_at" IS NULL;

CREATE TABLE "household_invites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "household_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "created_by_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "household_invites_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "household_invites_code_key" ON "household_invites"("code");

CREATE TABLE "household_goals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "household_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "target_amount" DECIMAL(18,2) NOT NULL,
    "target_date" DATE,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "household_goals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "household_goals_household_id_idx" ON "household_goals"("household_id");

CREATE TABLE "household_goal_contributions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "goal_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "household_goal_contributions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "household_goal_contributions_goal_id_idx" ON "household_goal_contributions"("goal_id");

ALTER TABLE "household_members" ADD CONSTRAINT "household_members_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "household_invites" ADD CONSTRAINT "household_invites_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "household_goals" ADD CONSTRAINT "household_goals_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "household_goal_contributions" ADD CONSTRAINT "household_goal_contributions_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "household_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
