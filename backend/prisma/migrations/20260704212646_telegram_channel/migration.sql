-- AlterEnum
ALTER TYPE "ReminderChannel" ADD VALUE 'telegram';

-- AlterEnum
ALTER TYPE "TxSource" ADD VALUE 'telegram';

-- CreateTable
CREATE TABLE "telegram_links" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "chat_id" TEXT NOT NULL,
    "username" TEXT,
    "status" "WaLinkStatus" NOT NULL DEFAULT 'pending',
    "otp_code_hash" TEXT,
    "otp_expires_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "opt_in" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_links_chat_id_key" ON "telegram_links"("chat_id");

-- CreateIndex
CREATE INDEX "telegram_links_user_id_idx" ON "telegram_links"("user_id");

-- AddForeignKey
ALTER TABLE "telegram_links" ADD CONSTRAINT "telegram_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
