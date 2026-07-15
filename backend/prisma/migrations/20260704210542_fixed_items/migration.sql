-- CreateEnum
CREATE TYPE "FixedKind" AS ENUM ('ingreso', 'gasto');

-- CreateTable
CREATE TABLE "fixed_items" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "FixedKind" NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'COP',
    "day_of_month" SMALLINT,
    "category_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" DATE,
    "end_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "fixed_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fixed_items_user_id_is_active_idx" ON "fixed_items"("user_id", "is_active");

-- AddForeignKey
ALTER TABLE "fixed_items" ADD CONSTRAINT "fixed_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
