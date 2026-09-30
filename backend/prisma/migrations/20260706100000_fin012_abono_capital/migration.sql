-- FIN-012 · Abono a capital y pago total anticipado (DEC-0012 §11.1)
-- Tipo de pago de deuda para trazabilidad; default retrocompatible 'cuota'.
CREATE TYPE "PaymentType" AS ENUM ('cuota', 'abono_capital', 'pago_total');

ALTER TABLE "transactions"
  ADD COLUMN "payment_type" "PaymentType" NOT NULL DEFAULT 'cuota';
