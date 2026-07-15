-- FIN-034 · El catálogo global no puede tener nombres duplicados. Deduplica lo ya
-- sembrado (conserva una fila por nombre) y añade un índice único PARCIAL para que
-- la siembra sea idempotente y a prueba de carreras (dos arranques concurrentes no
-- crean duplicados: el 2º choca con el índice y la siembra lo trata como existente).
DELETE FROM financial_entities
 WHERE is_global = true
   AND ctid NOT IN (
     SELECT min(ctid) FROM financial_entities WHERE is_global = true GROUP BY name
   );

CREATE UNIQUE INDEX IF NOT EXISTS financial_entities_global_name_key
  ON financial_entities (name) WHERE is_global = true;
