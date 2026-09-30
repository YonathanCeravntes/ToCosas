# IMP-0016 · Periodo financiero / día de corte (Presupuesto y Dashboard)

- **Módulo/Feature:** FIN-016
- **Documentos base:** `ARQ-0016-Periodo-Financiero.md` (derivado de `ARQ-0011`)  · umbrella `ARQ-0011` §4.6/§13 · `AUD-0011` · `DEC-0011` §4.6 (autorizado, con parámetros ratificados en §4)
- **Autor:** Agente Desarrollador · **Fecha:** 2026-07-05
- **Referencia inmutable:** commit **`40700bcc36ea5e9edcf3a28ca283f8536a10fd70`**
- **Estado:** Entregado — a la espera de validación del CTO

## 1. Resumen
Día de inicio del ciclo financiero configurable (1–28, default 1 = mes calendario,
retrocompatibilidad total). Utilidad **pura** `financialPeriod()` consumida SOLO por
Presupuesto y Dashboard — la invariante (b) del fundador queda verificable por grep.

## 2. Archivos
- `backend/prisma/migrations/20260705120000_fin016_periodo_financiero/` —
  `user_settings.cycle_start_day` + CHECK 1–28.
- `backend/src/modules/budget/financial-period.util.ts` (+`.spec.ts`, 8 tests de
  bordes: año nuevo, febrero con corte 28, contigüidad exacta de ciclos, clamp).
- `budget.service.ts` — `period{start,end,label,cycleStartDay}` en `GET /budget/monthly`;
  `setCycleStartDay`. `budget.controller.ts` — `PATCH /budget/period` (DTO 1–28).
- Frontend: tipo `FinancialPeriodInfo`, `budgetApi.setCycleDay`, etiqueta del ciclo en
  Presupuesto, stepper 1–28 en Ajustes con nota "tu Score sigue el mes calendario".

## 3. Funcionalidades
Ciclo activo calculado en UTC: si hoy ≥ día de corte, el ciclo empezó este mes; si no,
el mes pasado. Etiqueta legible ("15 jun – 14 jul"; "jul 2026" si es mes completo).

## 4. Pruebas
- Suite completa **280/280** en el commit (272 previas + 8 nuevas).
- **Invariante por grep:** `financial-period` solo aparece en `budget/` (y luego
  `dashboard/` en FIN-014, consumidor autorizado). Score/Motor/Gamificación/
  Recomendaciones/Memoria: cero referencias.
- E2E real: default = mes calendario exacto; `PATCH {cycleStartDay:15}` → periodo
  "15 jun – 14 jul" (hoy 5 jul → ciclo empezó 15 jun ✓); `{cycleStartDay:31}` → 400.

## 5. Incidencias
Ninguna.

## 6. Limitaciones
El Presupuesto usa el ciclo solo como etiqueta/contexto (sus rubros son compromisos
fijos sin filtro temporal); el filtro real por ciclo lo aplica el Dashboard (FIN-014).

## 7. Resultado
Completo conforme a DEC-0011 §4.6. Con `cycleStartDay=1` el comportamiento es
byte-a-byte el actual.
