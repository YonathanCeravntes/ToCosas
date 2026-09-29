-- FIN-048 · Tipos de gasto fijo separados de las categorías del día a día.
ALTER TABLE "categories" ADD COLUMN "is_fixed" BOOLEAN NOT NULL DEFAULT false;

-- Globales existentes: se renombran (mismo id → el historial conserva su categoría).
UPDATE "categories" SET "name" = 'Servicios públicos'
  WHERE "is_global" = true AND "kind" = 'gasto' AND "name" = 'Servicios';
UPDATE "categories" SET "name" = 'Salidas y entretenimiento'
  WHERE "is_global" = true AND "kind" = 'gasto' AND "name" = 'Entretenimiento';
UPDATE "categories" SET "is_fixed" = true
  WHERE "is_global" = true AND "kind" = 'gasto' AND "name" IN ('Arriendo', 'Servicios públicos', 'Educación');
