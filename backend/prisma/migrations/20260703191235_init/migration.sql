-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('banco', 'cooperativa', 'fintech', 'prestamista_particular', 'tarjeta', 'otro');

-- CreateEnum
CREATE TYPE "TxKind" AS ENUM ('ingreso', 'gasto', 'pago_deuda', 'transferencia');

-- CreateEnum
CREATE TYPE "DebtType" AS ENUM ('tarjeta_credito', 'credito_personal', 'hipotecario', 'libre_inversion', 'vehiculo', 'educativo', 'gota_a_gota', 'prestamo_familiar', 'otro');

-- CreateEnum
CREATE TYPE "RateKind" AS ENUM ('fija', 'variable');

-- CreateEnum
CREATE TYPE "RateBasis" AS ENUM ('EA', 'NMV', 'NAMV', 'MV');

-- CreateEnum
CREATE TYPE "DebtStatus" AS ENUM ('activa', 'en_mora', 'pagada', 'refinanciada', 'cancelada');

-- CreateEnum
CREATE TYPE "AmortSystem" AS ENUM ('frances', 'aleman', 'americano', 'cuota_fija', 'tarjeta_rotativo');

-- CreateEnum
CREATE TYPE "TxSource" AS ENUM ('app', 'whatsapp', 'ocr', 'import', 'system');

-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('confirmada', 'pendiente_confirmacion', 'descartada');

-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('push', 'whatsapp', 'email');

-- CreateEnum
CREATE TYPE "WaLinkStatus" AS ENUM ('pending', 'verified', 'revoked');

-- CreateEnum
CREATE TYPE "SuggestionType" AS ENUM ('priorizar_deuda', 'recorte_gasto', 'alerta_sobregiro', 'abono_extra', 'felicitacion', 'otro');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "phone_e164" TEXT,
    "password_hash" TEXT,
    "full_name" TEXT,
    "auth_provider" TEXT NOT NULL DEFAULT 'local',
    "external_uid" TEXT,
    "currency" CHAR(3) NOT NULL DEFAULT 'COP',
    "locale" TEXT NOT NULL DEFAULT 'es-CO',
    "timezone" TEXT NOT NULL DEFAULT 'America/Bogota',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_done" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_entities" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "type" "EntityType" NOT NULL DEFAULT 'otro',
    "contact_phone" TEXT,
    "website" TEXT,
    "typical_rate" DECIMAL(6,3),
    "rate_type" TEXT,
    "logo_url" TEXT,
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "financial_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "kind" "TxKind" NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "keywords" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "entity_id" UUID,
    "name" TEXT NOT NULL,
    "debt_type" "DebtType" NOT NULL DEFAULT 'otro',
    "currency" CHAR(3) NOT NULL DEFAULT 'COP',
    "original_amount" DECIMAL(18,2) NOT NULL,
    "current_balance" DECIMAL(18,2) NOT NULL,
    "start_date" DATE NOT NULL,
    "term_months" INTEGER,
    "interest_rate" DECIMAL(7,4) NOT NULL,
    "rate_kind" "RateKind" NOT NULL DEFAULT 'fija',
    "rate_basis" "RateBasis" NOT NULL DEFAULT 'EA',
    "amort_system" "AmortSystem" NOT NULL DEFAULT 'frances',
    "monthly_payment" DECIMAL(18,2),
    "payment_day" SMALLINT,
    "next_due_date" DATE,
    "status" "DebtStatus" NOT NULL DEFAULT 'activa',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "debts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amortization_entries" (
    "id" UUID NOT NULL,
    "debt_id" UUID NOT NULL,
    "period_no" INTEGER NOT NULL,
    "due_date" DATE NOT NULL,
    "opening_bal" DECIMAL(18,2) NOT NULL,
    "payment" DECIMAL(18,2) NOT NULL,
    "interest_part" DECIMAL(18,2) NOT NULL,
    "principal_part" DECIMAL(18,2) NOT NULL,
    "extra_payment" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "closing_bal" DECIMAL(18,2) NOT NULL,
    "is_projected" BOOLEAN NOT NULL DEFAULT true,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "amortization_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "TxKind" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'COP',
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "category_id" UUID,
    "entity_id" UUID,
    "debt_id" UUID,
    "note" TEXT,
    "tags" TEXT[],
    "source" "TxSource" NOT NULL DEFAULT 'app',
    "status" "TxStatus" NOT NULL DEFAULT 'confirmada',
    "raw_message" TEXT,
    "attachment_url" TEXT,
    "parse_confidence" DECIMAL(4,3),
    "wa_message_id" TEXT,
    "client_uuid" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "debt_id" UUID,
    "title" TEXT NOT NULL,
    "due_date" DATE NOT NULL,
    "offsets_days" INTEGER[] DEFAULT ARRAY[3, 1, 0]::INTEGER[],
    "channels" "ReminderChannel"[] DEFAULT ARRAY['push']::"ReminderChannel"[],
    "amount" DECIMAL(18,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_links" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "phone_e164" TEXT NOT NULL,
    "wa_id" TEXT,
    "status" "WaLinkStatus" NOT NULL DEFAULT 'pending',
    "otp_code_hash" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "opt_in" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "platform" TEXT NOT NULL,
    "fcm_token" TEXT,
    "app_version" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suggestions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "SuggestionType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "payload" JSONB,
    "score" DECIMAL(5,2),
    "status" TEXT NOT NULL DEFAULT 'new',
    "valid_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "user_id" UUID NOT NULL,
    "reminder_defaults" INTEGER[] DEFAULT ARRAY[3, 1, 0]::INTEGER[],
    "notif_push" BOOLEAN NOT NULL DEFAULT true,
    "notif_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "quiet_hours" JSONB,
    "suggestion_strategy" TEXT NOT NULL DEFAULT 'avalanche',
    "data_consent_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'whatsapp',
    "external_id" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "error" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_e164_key" ON "users"("phone_e164");

-- CreateIndex
CREATE INDEX "financial_entities_user_id_idx" ON "financial_entities"("user_id");

-- CreateIndex
CREATE INDEX "categories_user_id_idx" ON "categories"("user_id");

-- CreateIndex
CREATE INDEX "debts_user_id_idx" ON "debts"("user_id");

-- CreateIndex
CREATE INDEX "debts_next_due_date_idx" ON "debts"("next_due_date");

-- CreateIndex
CREATE INDEX "amortization_entries_debt_id_idx" ON "amortization_entries"("debt_id");

-- CreateIndex
CREATE UNIQUE INDEX "amortization_entries_debt_id_period_no_key" ON "amortization_entries"("debt_id", "period_no");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_wa_message_id_key" ON "transactions"("wa_message_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_occurred_at_idx" ON "transactions"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "transactions_debt_id_idx" ON "transactions"("debt_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_user_id_client_uuid_key" ON "transactions"("user_id", "client_uuid");

-- CreateIndex
CREATE INDEX "reminders_due_date_idx" ON "reminders"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_links_phone_e164_key" ON "whatsapp_links"("phone_e164");

-- CreateIndex
CREATE UNIQUE INDEX "devices_user_id_fcm_token_key" ON "devices"("user_id", "fcm_token");

-- CreateIndex
CREATE INDEX "suggestions_user_id_status_idx" ON "suggestions"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_external_id_key" ON "webhook_events"("external_id");

-- AddForeignKey
ALTER TABLE "financial_entities" ADD CONSTRAINT "financial_entities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debts" ADD CONSTRAINT "debts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debts" ADD CONSTRAINT "debts_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "financial_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amortization_entries" ADD CONSTRAINT "amortization_entries_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "financial_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_links" ADD CONSTRAINT "whatsapp_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
