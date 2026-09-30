-- FIN-046 Fase 4 · Categorías aprendidas por comercio.
CREATE TABLE "category_hints" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "category_hints_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "category_hints_user_id_key_key" ON "category_hints"("user_id", "key");
ALTER TABLE "category_hints" ADD CONSTRAINT "category_hints_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "category_hints" ADD CONSTRAINT "category_hints_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
