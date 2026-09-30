-- FIN-032 · Catálogo de tipos de deuda de 1ª clase (extensión pura del enum).
-- ALTER TYPE ADD VALUE es válido dentro de la transacción de migración en PG 12+
-- siempre que el valor no se USE en la misma transacción (aquí solo se declara).
ALTER TYPE "DebtType" ADD VALUE IF NOT EXISTS 'libranza';
ALTER TYPE "DebtType" ADD VALUE IF NOT EXISTS 'compra_a_cuotas';
ALTER TYPE "DebtType" ADD VALUE IF NOT EXISTS 'fintech';
