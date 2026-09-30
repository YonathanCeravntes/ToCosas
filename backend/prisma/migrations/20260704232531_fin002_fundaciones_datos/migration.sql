-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('efectivo', 'ahorros', 'corriente', 'billetera', 'otro');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('inmueble', 'vehiculo', 'inversion', 'negocio', 'otro');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('pending', 'processing', 'processed', 'failed');

-- CreateEnum
CREATE TYPE "MetricPeriod" AS ENUM ('day', 'month');

-- CreateEnum
CREATE TYPE "BalanceEntrySource" AS ENUM ('manual', 'import');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "account_id" UUID;

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "entity_id" UUID,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL DEFAULT 'otro',
    "currency" CHAR(3) NOT NULL DEFAULT 'COP',
    "current_balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "is_liquid" BOOLEAN NOT NULL DEFAULT true,
    "include_in_net_worth" BOOLEAN NOT NULL DEFAULT true,
    "is_emergency_fund" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_balance_entries" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "balance" DECIMAL(18,2) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "BalanceEntrySource" NOT NULL DEFAULT 'manual',

    CONSTRAINT "account_balance_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AssetType" NOT NULL DEFAULT 'otro',
    "currency" CHAR(3) NOT NULL DEFAULT 'COP',
    "current_value" DECIMAL(18,2) NOT NULL,
    "acquisition_value" DECIMAL(18,2),
    "acquisition_date" DATE,
    "is_liquid" BOOLEAN NOT NULL DEFAULT false,
    "include_in_net_worth" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_snapshots" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL,
    "net_worth" DECIMAL(18,2) NOT NULL,
    "total_assets" DECIMAL(18,2) NOT NULL,
    "total_liquid" DECIMAL(18,2) NOT NULL,
    "total_liabilities" DECIMAL(18,2) NOT NULL,
    "extra" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_readings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "metric_key" TEXT NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL,
    "period" "MetricPeriod" NOT NULL DEFAULT 'month',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_readings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE INDEX "account_balance_entries_account_id_recorded_at_idx" ON "account_balance_entries"("account_id", "recorded_at");

-- CreateIndex
CREATE INDEX "assets_user_id_idx" ON "assets"("user_id");

-- CreateIndex
CREATE INDEX "outbox_events_status_available_at_idx" ON "outbox_events"("status", "available_at");

-- CreateIndex
CREATE INDEX "financial_snapshots_user_id_captured_at_idx" ON "financial_snapshots"("user_id", "captured_at");

-- CreateIndex
CREATE INDEX "metric_readings_user_id_metric_key_captured_at_idx" ON "metric_readings"("user_id", "metric_key", "captured_at");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "financial_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_balance_entries" ADD CONSTRAINT "account_balance_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_snapshots" ADD CONSTRAINT "financial_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_readings" ADD CONSTRAINT "metric_readings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
