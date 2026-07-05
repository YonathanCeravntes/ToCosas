-- FIN-009 (DEC-0009): Subscription, PromoCode, AdminActionLog, User.isAdmin.

CREATE TYPE "SubscriptionStatus" AS ENUM ('trial', 'active', 'canceled', 'expired');
CREATE TYPE "PaymentProviderKind" AS ENUM ('manual', 'promo', 'revenuecat');

ALTER TABLE "users" ADD COLUMN "is_admin" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'premium',
    "status" "SubscriptionStatus" NOT NULL,
    "provider" "PaymentProviderKind" NOT NULL,
    "provider_ref" TEXT,
    "current_period_end" TIMESTAMP(3),
    "trial_ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "subscriptions_user_id_status_idx" ON "subscriptions"("user_id", "status");
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "promo_codes" (
    "id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "duration_days" INTEGER NOT NULL DEFAULT 30,
    "max_uses" INTEGER NOT NULL,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "promo_codes_code_hash_key" ON "promo_codes"("code_hash");

CREATE TABLE "admin_action_logs" (
    "id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "target_user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_action_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "admin_action_logs_admin_user_id_created_at_idx" ON "admin_action_logs"("admin_user_id", "created_at");
