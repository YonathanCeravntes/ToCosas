-- FIN-016 · Periodo financiero / día de corte (DEC-0011 §4.6)
-- Rango válido 1–28 (existe en todos los meses); default 1 = mes calendario
-- (retrocompatibilidad total con el comportamiento actual).
ALTER TABLE "user_settings"
  ADD COLUMN "cycle_start_day" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "user_settings"
  ADD CONSTRAINT "user_settings_cycle_start_day_range"
  CHECK ("cycle_start_day" BETWEEN 1 AND 28);
