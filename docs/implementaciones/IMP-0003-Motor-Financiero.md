# IMP-0003 · Motor Financiero (MVP)

- **Módulo/Feature:** FIN-003
- **Documentos base:** `ARQ-0003-Motor-Financiero.md` · `AUD-0003-...` · `DEC-0003-Motor-Financiero.md`
- **Autor:** Agente Desarrollador
- **Fecha:** 2026-07-05
- **Referencia inmutable (regla GOBERNANZA):** commit **`bbf9654431bef402564149e140b505908c2cc82e`** (rama `claude/finance-app-design-pr8qd5`)
- **Estado:** Entregado — a la espera de validación del CTO contra DEC-0003

---

## 1. Resumen de implementación
Se implementó el Motor Financiero MVP (Capa 1): consumidores idempotentes de los eventos
del outbox de FIN-002, cálculo determinista de las **7 métricas core**, series de tiempo
pobladas (con `metric_readings` **físicamente particionada por mes**), jobs nocturnos en
zona horaria **America/Bogota**, cold-start dual (60 días global + 3 meses por categoría)
y endpoint de lectura `GET /engine/metrics`. Los **5 cambios obligatorios de DEC-0003 §10**
están aplicados. Cero dependencias nuevas, cero IA, cero frontend (conforme al alcance).

## 2. Archivos modificados/creados
**Nuevos** (`backend/src/modules/financial-engine/`):
- `engine.constants.ts` — cold-start dual documentado junto (§10.2), TZ (§10.3), usuario activo 90d (§10.4), contrato `MetricKey`, prefijo `anomaly.`.
- `metrics/core-metrics.ts` (+ spec) — 7 métricas puras con `incomeRef = max(fijo, real)` (§10.1).
- `metrics/series.util.ts` (+ spec) — pendiente de regresión, z-score, utilidades de fecha.
- `engine.service.ts` (+ spec) — `recompute` de estado absoluto + upsert idempotente + `coldStartStatus`.
- `engine.listener.ts` — 11 eventos suscritos, dirty-set con debounce 15s, reintento en fallo.
- `jobs/snapshot.job.ts` · `jobs/trends.job.ts` · `jobs/retention.job.ts` (+ `jobs.spec.ts`).
- `engine.controller.ts` — `GET /engine/metrics` (métricas, tendencias y anomalías con gating de cold-start).
- `financial-engine.module.ts`.

**Modificados:** `prisma/schema.prisma` (PK compuesta `(id, capturedAt)` + índice único de
upsert en `MetricReading`), `src/app.module.ts` (registro del módulo).
**Migración:** `20260705010000_fin003_partition_metric_readings` — recrea `metric_readings`
como tabla particionada por rango mensual (partición DEFAULT + jul/ago 2026).

## 3. Funcionalidades implementadas
- **Pipeline evento→métrica:** cambio de dominio → outbox (misma tx) → dispatcher (10s,
  claim atómico) → listener (debounce 15s) → `recompute(userId)` → upsert en serie mensual.
- **7 métricas core** (`cashflow`, `savings_rate`, `dti`, `liquidity_runway`,
  `emergency_fund_months`, `net_worth`, `essential_expense`); `runway`/`fondo` se omiten
  con gasto esencial 0 (documentado).
- **SnapshotJob** (1 AM Bogotá): `FinancialSnapshot` + lectura `day` de patrimonio para
  usuarios activos (actividad ≤90 días en tx/deudas/cuentas/activos).
- **TrendsJob** (2 AM Bogotá): pendiente 3 meses de cashflow/ahorro/patrimonio + anomalías
  z-score por categoría (`anomaly.<categoria>` en `MetricReading`, decisión temporal
  DEC-0003 §4.6) con **cold-start dual**.
- **RetentionJob** (4 AM Bogotá): purga lecturas `day` >180 días + asegura la partición
  del mes siguiente.
- **`GET /engine/metrics`**: métricas del mes + `coldStart` + tendencias/anomalías o
  `insufficient_history` con días restantes.

## 4. Cambios obligatorios DEC-0003 §10 — cumplimiento
1. **`ingreso_mensual_ref = max(fijo, real)`** ✅ — `core-metrics.ts`; test reproduce el
   caso del hallazgo (fijo 300k + real 5M → DTI 0.2, no 3.33).
2. **Cold-start dual reconciliado** ✅ — ambas constantes juntas y documentadas en
   `engine.constants.ts`; TrendsJob exige 60d global Y ≥3 meses por categoría.
3. **TZ America/Bogota** ✅ — los 3 crons con `{ timeZone: ENGINE_TZ }`.
4. **Usuario activo (90 días)** ✅ — `SnapshotJob.activeUserIds` une tx/deuda/cuenta/activo; test verifica el cutoff.
5. **Nota para FIN-006** ✅ — dejada en `engine.constants.ts` (`ANOMALY_PREFIX`) y aquí:
   **el ARQ de FIN-006 debe incluir el plan de migración de las filas `anomaly.*` de
   `MetricReading` hacia el modelo `Insight`** para no perder historial.

## 5. Pruebas realizadas
- **Unitarias: 155/155 verdes** (20 suites; 26 nuevas): regla `max()` (incl. caso del
  hallazgo y mes flojo), división por cero, runway/fondo, pendientes (±/plana), z-score
  (banda, sin varianza), fechas UTC, recompute+upsert idempotente (ancla de mes, misma
  salida al repetir), cold-start (habilitado/nuevo/sin datos), criterio usuario activo
  (cutoff 90d), retención (cutoff 180d, solo `day`).
- **Typecheck:** backend exit 0.
- **End-to-end (API real):** sembrado salario/arriendo/cuenta/activo/deuda/2 tx →
  esperado outbox+debounce → `GET /engine/metrics` devolvió las 7 métricas correctas
  (cashflow 3.1M; dti 0.0764; runway 3.3211; net_worth 7M; savings 0.775) con
  `insufficient_history` (usuario nuevo). Usuario con tx retrofechada 91 días →
  `enabled:true` y tendencias/anomalías como arrays.
- **Jobs ejecutados de verdad** (script efímero con contexto Nest, luego eliminado):
  SnapshotJob → **10 snapshots** + 10 lecturas `day`; TrendsJob → 1 usuario elegible, 0
  anomalías (correcto); RetentionJob → 0 purgadas + **partición 2026_08 asegurada**.
- **Particionamiento verificado en PostgreSQL:** `metric_readings` `relkind='p'`; las
  filas del mes caen en `metric_readings_2026_07` (7) y **0 en DEFAULT**; outbox 12/12
  `processed`.

## 6. Incidencias encontradas
- `prisma migrate dev --create-only` no funciona en entorno no interactivo → la migración
  de particionamiento se escribió a mano y se aplicó con `migrate deploy` (resultado
  idéntico; queda registrada en el historial de migraciones).
- Un borrador inicial de `RetentionJob.ensureNextMonthPartition` usaba una construcción
  inválida de `$executeRaw`; corregido a `$executeRawUnsafe` con identificadores generados
  internamente (sin input de usuario) antes de commitear.

## 7. Limitaciones
- **Prisma y particiones hijas:** Prisma no modela las particiones (`metric_readings_YYYY_MM`,
  `_default`). Futuras `prisma migrate dev` podrían reportar drift sobre esas tablas hijas;
  las migraciones deben revisarse con `--create-only` (o a mano, como aquí) antes de aplicar.
- **Anomalías en `MetricReading`** (deuda técnica aceptada, DEC-0003 §8): migrarán a
  `Insight` en FIN-006 (§10.5).
- **Predicciones/forecast**: fuera de alcance por diseño (diferidas).
- El dirty-set del listener es en memoria (riesgo aceptado DEC-0003 §8): un redeploy lo
  pierde y el siguiente evento/job reconcilia.
- `transaction.updated/deleted` están suscritos en el listener pero hoy ningún productor
  los emite (la edición/borrado de transacciones no encola evento — comportamiento
  heredado de FIN-002, no ampliado por estar fuera del plan autorizado).

## 8. Resultado final
**FIN-003 entregado y verificado** contra el commit `bbf9654431bef402564149e140b505908c2cc82e`
(+ este informe en el commit siguiente), cumpliendo el plan de DEC-0003 §11 y los 5
cambios obligatorios §10. El Motor convierte eventos de dominio en series de métricas
listas para FIN-004 (Salud/Score). Pendiente de validación del CTO.

**Cómo reproducir la validación:**
```bash
git checkout bbf9654431bef402564149e140b505908c2cc82e
cd backend && npx tsc --noEmit && npx jest   # exit 0 · 155/155
```

---
*Informe de implementación — proceso de gobernanza `docs/GOBERNANZA.md`.*
