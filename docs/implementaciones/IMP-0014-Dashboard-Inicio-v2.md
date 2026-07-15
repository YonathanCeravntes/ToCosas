# IMP-0014 · Dashboard de Inicio v2

- **Módulo/Feature:** FIN-014
- **Documentos base:** `ARQ-0014-Dashboard-Inicio-v2.md` (derivado de `ARQ-0011`)  · umbrella `ARQ-0011` §4.3/§13 · `AUD-0011` · `DEC-0011` §4.3 (autorizado)
- **Autor:** Agente Desarrollador · **Fecha:** 2026-07-05
- **Referencia inmutable:** commit **`1af29b1650cacc3d346f105bba39d1a6fb94dcf1`**
- **Estado:** Entregado — a la espera de validación del CTO

## 1. Resumen
`GET /dashboard/home`: agregador **thin** que compone en paralelo fuentes ya
auditadas — `computeNetWorth` (FIN-002), `FixedItem`, transacciones del ciclo
(FIN-016) — **cero lógica financiera nueva**. `/transactions/dashboard` se conserva
sin cambios (no breaking).

## 2. Archivos
- `backend/src/modules/dashboard/` — service (agregador), controller, module
  (registrado en `app.module`); sin cambios de BD.
- `dashboard.spec.ts` — **test de consistencia** (§13): el `netWorth` del home es
  IGUAL al del util auditado con la misma entrada; sumas fijo/variable; flujo =
  ingresos − gastos − pagos de deuda; buckets por categoría.
- Frontend: tipos `HomeDashboard`/`FlowSection`, `dashboardApi.home`, Inicio v2:
  tarjetas patrimonio + ahorro total (con CTA a la proyección FIN-015), ingresos y
  gastos con desglose fijo/variable, sección nueva "¿De dónde llega la plata?",
  etiqueta del ciclo en el flujo, movimientos completos del servidor (categoría/
  deuda) con la caché local como respaldo offline.

## 3. Funcionalidades
Secciones: periodo (FIN-016), patrimonio (misma fuente que `/net-worth`), ahorro
total (cuentas `ahorros` + fondo de emergencia, sin doble conteo), ingresos
fijo+variable+por categoría, gastos fijo+variable+por categoría, pagos de deuda,
flujo estimado del ciclo, 10 movimientos recientes completos.

## 4. Pruebas
- Suite completa **287/287** en el commit (286 + 1 de consistencia).
- E2E real: `home.netWorth === /net-worth` exacto (11.500.000); ahorro 3.5M con
  1.5M de emergencias; income {f:4M, v:500k, t:4.5M}; expense {f:1.2M, v:250k};
  flujo 3.050.000; con corte 20 el periodo del home pasa a "20 jun – 19 jul".

## 5. Incidencias
Ninguna.

## 6. Limitaciones
El home muestra 10 movimientos; la lista completa sigue en `/transactions`
(pantalla existente), según lo propuesto en ARQ-0011 §15.6 y ratificado.

## 7. Resultado
Completo conforme a DEC-0011 §4.3.
