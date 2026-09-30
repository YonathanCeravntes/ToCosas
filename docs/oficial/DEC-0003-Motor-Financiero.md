# DEC-0003 · Motor Financiero (MVP)

- **Documentos base:** `docs/arquitectura/ARQ-0003-Motor-Financiero.md` · `docs/auditoria/AUD-0003-Motor-Financiero.md`
- **Módulo/Feature:** FIN-003
- **Decide:** CTO/CPO/Principal Architect de Millo
- **Fecha:** 2026-07-04

---

## 1. Resumen ejecutivo

ARQ-0003 diseña la primera versión operativa del Motor Financiero: consumidores
idempotentes del outbox de FIN-002, 7 métricas core deterministas, snapshot diario,
tendencias/anomalías con cold-start, y resuelve la limitación de particionamiento que
IMP-0002 dejó pendiente. Cero dependencias nuevas, cero IA, alcance disciplinado (Score
correctamente diferido a FIN-004). AUD-0003 lo confirma: **APROBADO CON OBSERVACIONES**,
sin incumplimientos de mandatos vinculantes ni premisas falsas — y, siguiendo la regla de
`GOBERNANZA.md` que este propio ciclo introdujo, el auditor verificó el cierre de FIN-002
contra el commit inmutable `622bfa1`, no contra el working tree. Buena disciplina, se
reconoce explícitamente.

Concuerdo con el veredicto. Las cuatro observaciones (regla de ingreso de referencia,
reconciliación de umbrales de cold-start, zona horaria de jobs, criterio de "usuario
activo") son ajustes de especificación de bajo costo; se resuelven en este DEC sin
devolver el ARQ.

## 2. Arquitecturas revisadas

- `docs/arquitectura/ARQ-0003-Motor-Financiero.md` — v. 2026-07-04.

## 3. Auditorías revisadas

- `docs/auditoria/AUD-0003-Motor-Financiero.md` — veredicto: **APROBADO CON OBSERVACIONES**.

## 4. Decisiones aprobadas

1. **Arquitectura del Motor:** listeners de `EventEmitter2` sobre el despachador de
   FIN-002, `recompute(userId)` como función de estado absoluto con upsert idempotente,
   debounce de 15s por usuario. Aprobado.
2. **7 métricas core** (`cashflow`, `savings_rate`, `dti`, `liquidity_runway`,
   `emergency_fund_months`, `net_worth`, `essential_expense`) y su contrato de
   `metricKey`: aprobado como contrato estable para FIN-004.
3. **Cold-start de 60 días** para tendencias/anomalías, con métricas core calculadas
   desde el día 1: aprobado.
4. **Partición física de `metric_readings`** (mensual, nativa PostgreSQL) + retención de
   180 días para lecturas `day`: aprobado, salda la limitación de IMP-0002.
5. **Cero dependencias/infraestructura nueva** (reutiliza outbox, `EventEmitter2`,
   `@nestjs/schedule`, `computeNetWorth`): aprobado, consistente con DEC-0002.
6. **Anomalías como filas `MetricReading` (`anomaly.<categoria>`)** en este MVP: aprobado
   como decisión pragmática y temporal, con condición (ver Cambios obligatorios #5).
7. **Exclusión de Score, predicciones, IA/pgvector, frontend y monetización** del alcance
   de FIN-003: confirmado, coherente con DEC-0001.

## 5. Decisiones rechazadas

- Ninguna decisión de fondo del ARQ se rechaza. Se ajustan cuatro puntos de
  especificación (ver sección 10), no se rechaza el diseño.

## 6. Observaciones aceptadas

- Hallazgo 1 (`ingreso_mensual_ref` todo-o-nada distorsiona DTI/savings_rate) — aceptado,
  se corrige la regla en este DEC.
- Hallazgo 2 (umbral global de 60 días vs. umbral por categoría de 3 meses no
  reconciliados) — aceptado, se fija la relación entre ambos.
- Hallazgo 3 (zona horaria de jobs nocturnos no especificada) — aceptado, se fija
  America/Bogota.
- Hallazgo 5 (criterio de "usuario activo" no definido) — aceptado, se define aquí.
- Hallazgo 4 (anomalías como fila de `MetricReading`) — aceptado como deuda técnica
  consciente, con condición de trazabilidad hacia FIN-006 (ver Cambios obligatorios #5).

## 7. Observaciones descartadas

- Ninguna. Las cinco observaciones de AUD-0003 se incorporan como cambios obligatorios o
  decisiones explícitas en este DEC.

## 8. Riesgos aceptados

- **Dirty-set en memoria se pierde en redeploy** (riesgo 2 del ARQ): aceptado, el Motor
  reconcilia en el siguiente evento o en el job nocturno por ser de estado absoluto.
- **Deuda técnica de anomalías en `MetricReading`** (Hallazgo 4): aceptada
  conscientemente, con la condición de la sección 10 §5 para no perder continuidad
  histórica cuando llegue `Insight` en FIN-006.

## 9. Riesgos pendientes

- Ninguno nuevo específico de FIN-003 que quede sin mitigación tras los cambios
  obligatorios de este DEC.

## 10. Cambios obligatorios

1. **Regla de `ingreso_mensual_ref` corregida:** en lugar de "todo o nada", usar
   `max(ingresos_fijos_totales, ingresos_reales_del_mes)`. Evita que un ingreso fijo
   pequeño (p. ej. arriendo) opaque un ingreso variable real mayor (freelance/salario
   registrado como transacción), sin perder el piso de estabilidad que dan los ingresos
   fijos en un mes flojo. Aplica a `dti` y `savings_rate` por igual.
2. **Reconciliación de umbrales de cold-start:** el umbral de **60 días** (global, desde
   la primera transacción del usuario) es la condición de entrada para activar
   tendencias/anomalías en general. El umbral de **3 meses por categoría** es una
   condición **adicional**, específica de la anomalía de esa categoría (se necesitan
   ambos: ≥60 días de historial global Y ≥3 meses de datos en esa categoría puntual).
   Documentar ambas constantes juntas en `engine.constants.ts`.
3. **Zona horaria de jobs nocturnos:** fijar explícitamente `America/Bogota` en la
   configuración de `@nestjs/schedule` para `SnapshotJob`, `TrendsJob` y `RetentionJob`.
4. **Criterio de "usuario activo"** para `SnapshotJob`: al menos una transacción, cambio
   de deuda, o actualización de saldo/activo en los últimos 90 días.
5. **Nota de migración obligatoria en el futuro ARQ de FIN-006:** el ARQ que introduzca
   el modelo `Insight` debe incluir explícitamente el plan de migración de las filas
   `anomaly.*` actualmente almacenadas en `MetricReading`, para no perder el historial de
   anomalías previas. Se deja constancia aquí para que no se pierda de vista.

## 11. Plan técnico oficial

Se autoriza al agente Desarrollador a iniciar la implementación de FIN-003 siguiendo el
plan de la sección 14 de `ARQ-0003`, incorporando los 5 cambios obligatorios de la
sección 10 de este DEC:

1. Migración: particionamiento de `metric_readings` + índice único de upsert
   `(user_id, metric_key, period, captured_at)`.
2. `financial-engine/engine.constants.ts`: cold-start global (60 días) **y** umbral por
   categoría (3 meses) documentados juntos (cambio obligatorio #2); zona horaria
   `America/Bogota` (cambio obligatorio #3); criterio de usuario activo de 90 días
   (cambio obligatorio #4).
3. Funciones puras de las 7 métricas core, con `ingreso_mensual_ref` corregido (cambio
   obligatorio #1) para `dti`/`savings_rate`. Tests unitarios por métrica.
4. `EngineService.recompute` (idempotente, upsert) + `EngineListener` (debounce 15s) + tests.
5. Jobs: `SnapshotJob` (1 AM Bogotá), `TrendsJob` (2 AM Bogotá, con ambos umbrales de
   cold-start), `RetentionJob` (4 AM Bogotá) + tests.
6. `GET /engine/metrics` autenticado.
7. Verificación end-to-end (sembrar datos → eventos → métricas → snapshot).
8. Cierre con `docs/implementaciones/IMP-0003-Motor-Financiero.md`, **declarando el SHA
   de commit exacto** (regla de `GOBERNANZA.md`), actualizando `docs/roadmap/BACKLOG.md`.

No se autoriza ninguna funcionalidad fuera de este plan (Score, indicadores visibles,
predicciones, IA/pgvector, frontend, monetización) dentro del ciclo de FIN-003.

## 12. Prioridad

**Alta.** Es la dependencia directa de FIN-004 (Salud Financiera + Score Millo).

## 13. Estado final

**APROBADO CON AJUSTES.** Se autoriza iniciar la implementación de FIN-003 bajo el plan
de la sección 11 y los 5 cambios obligatorios de la sección 10. El cierre de FIN-003
requiere `IMP-0003-Motor-Financiero.md` con SHA de commit verificable, que validaré
contra este DEC (en checkout aislado, no contra working tree) antes de autorizar el
cierre del desarrollo.

---
*Documento oficial — no modificar. Corresponde al ciclo de gobernanza de `docs/GOBERNANZA.md`.*
