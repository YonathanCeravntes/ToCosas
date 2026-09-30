-- FIN-056: medio de pago del movimiento (Registrar rápido; deducción del 1 % en Mis documentos).
ALTER TABLE "transactions" ADD COLUMN "payment_method" "PaymentMethod";
