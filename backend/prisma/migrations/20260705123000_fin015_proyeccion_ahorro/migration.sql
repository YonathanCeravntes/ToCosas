-- FIN-015 · Proyección de ahorro con interés compuesto (DEC-0011 §4.4)
-- Cambio ADITIVO: nuevo valor del enum para el registro Simulation.
-- (El escenario es puro: no escribe en cuentas/series reales.)
ALTER TYPE "SimulationType" ADD VALUE 'proyeccion_ahorro';
