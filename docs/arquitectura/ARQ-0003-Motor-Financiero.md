# ARQ-0003 · Motor Financiero (MVP)

- **Módulo/Feature:** FIN-003
- **Autor:** Agente de Arquitectura
- **Fecha:** 2026-07-04
- **Estado:** Propuesto — en espera de auditoría (AUD-0003) y decisión oficial (DEC-0003)
- **Documentos base:** `ARQ-0001` (umbrella) · `DEC-0001` · `ARQ-0002` · `DEC-0002` · `IMP-0002` (cerrado contra commit `622bfa1`)
- **Producto:** Millo

> Autorizado por la validación del CTO que cierra FIN-002 ("Se autoriza iniciar ARQ-0003").
> Incorpora los cambios obligatorios de DEC-0001 aplicables (#3 parcial y #4) y la
> limitación heredada de IMP-0002 (partición física de `MetricReading`). Ver §16.

---

## 1. Objetivo
Construir la primera versión operativa del **Motor Financiero** (Capa 1): los
**consumidores de eventos** que reaccionan a los cambios de dominio, el **cálculo
determinista de las métricas core**, y la **población de las series de tiempo**
(`FinancialSnapshot`, `MetricReading`) que FIN-002 dejó creadas. El Motor no tiene UI:
su salida son datos que FIN-004 (Salud/Score) leerá.

## 2. Problema que resuelve
FIN-002 dejó la infraestructura (cuentas/activos, outbox con despachador, tablas de
series) pero **sin consumidores ni cómputo**: el despachador emite eventos que nadie
escucha y las series están vacías. Hoy no existe historia financiera del usuario
(evolución de patrimonio, flujo, ahorro), ni métricas normalizadas sobre las que
construir el Score de FIN-004.

## 3. Alcance

**Incluye:**
1. **Consumidores de eventos** (listeners de `EventEmitter2` sobre el despachador de
   FIN-002) con contrato de idempotencia.
2. **Métricas core (7)** calculadas de forma determinista y persistidas en
   `MetricReading` (ver §4.3): flujo de caja, tasa de ahorro, endeudamiento (DTI),
   liquidez (runway), fondo de emergencia (meses), patrimonio, gasto esencial.
3. **Snapshot diario** de patrimonio en `FinancialSnapshot` (job nocturno).
4. **Tendencias básicas** (dirección y pendiente 3 meses de flujo, ahorro y patrimonio)
   y **anomalías básicas** (gasto mensual por categoría fuera de banda, z-score),
   ambas **detrás de cold-start ≥60 días** (DEC-0001 §10.4).
5. **Partición física de `MetricReading`** (mensual, nativa PostgreSQL) + job de
   retención (lecturas `day` >180 días), saldando la limitación de IMP-0002.
6. Endpoint interno de lectura `GET /engine/metrics` (para FIN-004 y verificación).

**No incluye (explícitamente):**
- **Score Millo e indicadores visibles** → FIN-004 (con su límite de 3 indicadores, DEC-0001 §10.9).
- **Predicciones/forecast** de flujo o saldo → se difieren a un ciclo posterior (evitar
  el sobre-alcance señalado en AUD-0001); el diseño de series ya las soporta.
- **IA/LLM, pgvector, RAG, embeddings** (rechazo DEC-0001 §5.2) — el Motor es 100% determinista.
- **Frontend**: ninguno. El Motor es la capa no visible (ARQ-0001 Capa 1).
- **Monetización** → FIN-004/FIN-005 (DEC-0001 §10.8).
- Redis/BullMQ (ratificado su rechazo en DEC-0002).

## 4. Arquitectura propuesta

### 4.1 Flujo general
```
OutboxDispatcher (FIN-002, cron 10s, claim atómico)
   │ emitter.emit('transaction.created' | 'debt.*' | 'account.*' | 'asset.changed' | 'fixed_item.changed')
   ▼
EngineListener (FIN-003)  ── marca dirty(userId) ──►  EngineService.recompute(userId)
                                                          │ (consultas agregadas deterministas)
                                                          ├─ upsert MetricReading (period=month, mes actual)
                                                          └─ registra actividad para tendencias/anomalías
Jobs nocturnos (cron):
  · SnapshotJob (1 AM): FinancialSnapshot diario por usuario activo + MetricReading day
  · TrendsJob (2 AM):   tendencias + anomalías (solo usuarios con ≥60 días de historial)
  · RetentionJob (4 AM): borra MetricReading day > 180 días
```

- **Idempotencia:** `recompute(userId)` es una función de estado absoluto (recalcula el
  mes desde las tablas fuente y hace *upsert* por `(userId, metricKey, period, mes)`),
  por lo que procesar un evento duplicado produce el mismo resultado (contrato exigido
  por FIN-002 para consumidores at-least-once).
- **Debounce:** el listener marca `dirty` en memoria y un drenaje cada 15 s recomputa
  una sola vez por usuario aunque lleguen N eventos en ráfaga (barato y sin infra nueva).
- **Clasificación (DEC-0001 §10.3):** todo el cómputo del Motor es **asíncrono diferido**
  (consistente con FIN-002); ninguna respuesta HTTP espera al Motor.

### 4.2 Cold-start (DEC-0001 §10.4 — obligatorio)
- **Umbral: 60 días** desde la primera transacción del usuario (`MIN(occurredAt)`).
- Por debajo del umbral: tendencias y anomalías **no se calculan ni se persisten**; el
  endpoint de lectura las reporta como `status: 'insufficient_history'` con los días
  restantes. Las métricas core (§4.3) sí se calculan desde el día 1 (no son inferencia,
  son aritmética del mes corriente).
- El umbral vive en un único lugar (`engine.constants.ts`) para que FIN-004/FIN-005 lo
  reutilicen.

### 4.3 Métricas core (contrato de `metricKey`)

| metricKey | Fórmula (mes calendario) | Fuentes |
|---|---|---|
| `cashflow` | ingresos − gastos − pagos_deuda | transactions |
| `savings_rate` | cashflow ÷ ingresos (0 si ingresos=0) | transactions |
| `dti` | cuotas_mensuales ÷ ingreso_mensual_ref* | debts, fixed_items, transactions |
| `liquidity_runway` | saldos_líquidos ÷ gasto_esencial_mensual | accounts, fixed_items, debts |
| `emergency_fund_months` | saldo_fondo_emergencia ÷ gasto_esencial_mensual | accounts (isEmergencyFund) |
| `net_worth` | Σ activos + Σ saldos − Σ pasivos (reusa `computeNetWorth` de FIN-002) | accounts, assets, debts |
| `essential_expense` | Σ gastos fijos + Σ cuotas de deuda | fixed_items, debts |

\* `ingreso_mensual_ref` = ingresos fijos (`FixedItem kind=ingreso`) si existen; si no,
ingresos reales del mes. Regla documentada en código y reutilizada por `dti` y
`savings_rate` para consistencia.

Tendencias: `trend.cashflow`, `trend.savings_rate`, `trend.net_worth` (pendiente de
regresión simple sobre los últimos 3 valores mensuales; se persisten como `MetricReading`).
Anomalías: `Insight` **no** se crea aún (modelo llega con FIN-004/FIN-006); en el MVP la
anomalía se persiste como `MetricReading` `anomaly.<categoria>` con el z-score, y el
endpoint la expone. Decisión conservadora para no crear entidades fuera del alcance.

### 4.4 Partición y retención de `MetricReading` (limitación IMP-0002)
- Migración SQL manual (la tabla está vacía → recreación sin riesgo): convertir
  `metric_readings` a **tabla particionada por rango sobre `captured_at`** con particiones
  mensuales; función/job que crea la partición del mes siguiente (RetentionJob la invoca).
- Retención: lecturas `period='day'` se borran a los **180 días**; `month` es indefinida
  (ratificado en DEC-0002 §4.5).

## 5. Componentes involucrados
**Nuevos (backend):** módulo `financial-engine/` → `engine.constants.ts`,
`metrics/*.ts` (funciones puras por métrica), `engine.service.ts` (recompute),
`engine.listener.ts` (suscripciones + debounce), `snapshot.job.ts`, `trends.job.ts`,
`retention.job.ts`, `engine.controller.ts` (`GET /engine/metrics`).
**Reutiliza:** outbox/despachador y `computeNetWorth` (FIN-002), `@nestjs/schedule`,
`EventEmitter2`, Prisma. **Modifica:** nada estructural en módulos existentes (los
productores ya emiten desde FIN-002).

## 6. Base de datos
- **Sin modelos nuevos.** Se puebla lo creado en FIN-002 (`FinancialSnapshot`,
  `MetricReading`).
- Migración de particionamiento de `metric_readings` (§4.4) + índice único
  `(user_id, metric_key, period, captured_at)` para el upsert idempotente.
- Job de retención (no es cambio de esquema).

## 7. Backend
NestJS puro y determinista. Listeners con `@OnEvent` de `@nestjs/event-emitter`;
jobs con `@nestjs/schedule` (todo presente desde FIN-002; **cero dependencias nuevas**).
Tests unitarios para: cada métrica (funciones puras), regla de `ingreso_mensual_ref`,
cold-start (bloquea/permite), idempotencia del upsert, tendencias (pendiente y signo),
anomalías (z-score y banda), y retención (cutoff correcto).

## 8. Frontend
**Ninguno.** El Motor es interno (Capa 1). La primera superficie visible del
conocimiento del Motor llega con FIN-004.

## 9. IA involucrada
**Ninguna.** Motor 100% determinista (principio "determinismo primero" de ARQ-0001,
ratificado en DEC-0001).

## 10. Riesgos identificados
1. **Carga por recompute en ráfagas** → mitigado con debounce por usuario (15 s) y
   consultas agregadas con índices existentes.
2. **Dirty-set en memoria se pierde en redeploy** → aceptable: el siguiente evento o el
   job nocturno reconcilian (recompute es de estado absoluto). Documentado.
3. **Falsos positivos de anomalías** con historial corto → mitigado por cold-start ≥60
   días + mínimo 3 meses de datos por categoría.
4. **Migración de particionamiento** → riesgo bajo (tabla vacía); se ejecuta con backend
   detenido, patrón ya conocido del proyecto.
5. **Deriva de contratos con FIN-004** → el catálogo `metricKey` de §4.3 es el contrato;
   cambios posteriores requieren su propio ciclo de gobernanza.

## 11. Dependencias
- **FIN-002 cerrado** (commit `622bfa1`) — outbox, cuentas/activos, tablas de series. ✅
- Ninguna dependencia nueva de infraestructura ni de paquetes.

## 12. Impacto esperado
Convierte la infraestructura de FIN-002 en **conocimiento financiero vivo**: historia de
patrimonio y métricas listas para que FIN-004 construya el Score y los 3 indicadores del
primer hito. Cierra el vacío "el despachador emite y nadie escucha".

## 13. Criterios de aceptación
- Crear/editar transacción, deuda, cuenta, activo o gasto fijo → el Motor recalcula y
  persiste las 7 métricas del mes (verificable en `MetricReading` y por `GET /engine/metrics`).
- `FinancialSnapshot` diario generado por el job nocturno para usuarios activos.
- Usuario con <60 días: tendencias/anomalías reportan `insufficient_history`; con ≥60
  días: se calculan (verificable con datos sembrados).
- Recompute idempotente: reprocesar el mismo evento no duplica filas (índice único + upsert).
- `metric_readings` particionada por mes; job de retención borra `day` >180 días.
- Typecheck + suite completa verde; **IMP-0003 con SHA de commit** (regla nueva de GOBERNANZA).

## 14. Plan de implementación (tras DEC-0003)
1. Migración: particionamiento de `metric_readings` + índice único de upsert.
2. `financial-engine/`: constantes (cold-start), funciones puras de métricas + tests.
3. `EngineService.recompute` + upsert idempotente + tests.
4. `EngineListener` (suscripciones + debounce) + tests.
5. Jobs: snapshot (1 AM), tendencias/anomalías (2 AM, con cold-start), retención (4 AM) + tests.
6. `GET /engine/metrics` (autenticado) para lectura/verificación.
7. Verificación end-to-end (sembrar datos → eventos → métricas → snapshot) y commit.
8. `IMP-0003-Motor-Financiero.md` con SHA + actualización de BACKLOG.

## 15. Estimación de complejidad
**Media.** Sin infra nueva ni dependencias; el riesgo se concentra en la corrección de
las fórmulas (mitigado con funciones puras + tests) y la migración de particionamiento
(tabla vacía).

## 16. Cumplimiento de decisiones vinculantes (para AUD-0003)

| Mandato | Origen | Cómo lo cumple este ARQ |
|---|---|---|
| Cold-start explícito (≥60 días) para anomalías/predicciones/tendencias | DEC-0001 §10.4 | §4.2 (umbral único, comportamiento por debajo/encima, exposición en API) |
| Clasificación síncrono/asíncrono | DEC-0001 §10.3 · DEC-0002 §10.2 | §4.1: todo el cómputo del Motor es asíncrono diferido |
| Sin pgvector/RAG en FIN-003 | DEC-0001 §5.2 | §3 (excluido), §9 (sin IA) |
| Sin Redis/BullMQ | DEC-0001 §5.1 · DEC-0002 §4.1 | §3, §7 (cero dependencias nuevas; cron + EventEmitter2 existentes) |
| Partición/retención de `MetricReading` | DEC-0002 §4.5 · IMP-0002 §7 (limitación) | §4.4 y §6 (migración + jobs) |
| Score acotado a 3 indicadores (aplica a FIN-004) | DEC-0001 §10.9 | §3 "No incluye": Score/indicadores quedan fuera; §4.3 deja las métricas fuente listas |
| Consumidores idempotentes (contrato outbox) | ARQ-0002 §4.1 | §4.1 (recompute de estado absoluto + upsert con índice único) |
| Referencia inmutable en IMP | GOBERNANZA (regla nueva) | §13 y §14.8: IMP-0003 declarará SHA |

---
*Documento sujeto a gobernanza — ver [../GOBERNANZA.md](../GOBERNANZA.md). En espera de
AUD-0003 y DEC-0003. **No iniciar implementación de código.***
