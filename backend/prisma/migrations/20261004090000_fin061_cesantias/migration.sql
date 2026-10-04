-- FIN-061: las cesantías son patrimonio, pero no plata disponible (solo vivienda,
-- educación o al terminar el contrato). Tipo de activo propio, siempre no líquido.
ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'cesantias';
