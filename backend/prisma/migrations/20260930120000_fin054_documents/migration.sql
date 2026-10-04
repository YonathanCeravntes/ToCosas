-- FIN-054 · Mis documentos (facturas, extractos, comprobantes, certificados).
CREATE TYPE "DocumentKind" AS ENUM ('extracto_tarjeta', 'extracto_credito', 'extracto_cuenta', 'factura', 'comprobante', 'certificado');
CREATE TYPE "PaymentMethod" AS ENUM ('tarjeta', 'transferencia', 'efectivo', 'desconocido');

ALTER TABLE "user_settings" ADD COLUMN "docs_storage_consent_at" TIMESTAMP(3);
ALTER TABLE "user_settings" ADD COLUMN "docs_health_consent" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "issuer" TEXT,
    "issuer_nit" TEXT,
    "number" TEXT,
    "cufe" TEXT,
    "doc_date" DATE,
    "subtotal" DECIMAL(18,2),
    "tax" DECIMAL(18,2),
    "total" DECIMAL(18,2),
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'desconocido',
    "is_health" BOOLEAN NOT NULL DEFAULT false,
    "certificate_type" TEXT,
    "year" INTEGER NOT NULL,
    "transaction_id" UUID,
    "debt_id" UUID,
    "storage_key" TEXT,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "source" "TxSource" NOT NULL DEFAULT 'app',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "documents_user_id_year_kind_idx" ON "documents"("user_id", "year", "kind");
-- Una factura electrónica (CUFE) se guarda una sola vez por usuario.
CREATE UNIQUE INDEX "documents_user_cufe_key" ON "documents"("user_id", "cufe") WHERE "cufe" IS NOT NULL AND "deleted_at" IS NULL;
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
