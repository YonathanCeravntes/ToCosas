# AUD-0003 · Auditoría de ARQ-0003 (Motor Financiero — MVP)

- **Documento auditado:** `docs/arquitectura/ARQ-0003-Motor-Financiero.md`
- **Módulo/Feature:** FIN-003
- **Documentos base revisados:** `ARQ-0001/AUD-0001/DEC-0001`, `ARQ-0002/AUD-0002/DEC-0002`, `IMP-0002` (v2)
- **Referencia inmutable verificada:** commit `HEAD` de `claude/finance-app-design-pr8qd5` en el momento de esta auditoría (SHA `f9efcfa` para el propio ARQ-0003; código de FIN-002 verificado contra `622bfa1`, tal como exige la nueva regla de `GOBERNANZA.md` — no se auditó contra el working tree)
- **Fecha:** 2026-07-04
- **Auditor:** Auditor Oficial de Milla (rol de solo lectura)

> Esta auditoría no modifica el ARQ ni el código. Documenta hallazgos para que el CTO
> emita `DEC-0003`.

---

## Nota de verificación previa

Antes de auditar el contenido de ARQ-0003, se verificó contra referencia inmutable
(`git show`, no working tree) que el cierre de FIN-002 declarado como prerequisito
(§11 del ARQ) es real: `git show 622bfa1:backend/prisma/schema.prisma` contiene los 6
modelos (`Account`, `Asset`, `AccountBalanceEntry`, `OutboxEvent`, `FinancialSnapshot`,
`MetricReading`) y `git show HEAD:backend/src/modules/events/outbox.dispatcher.ts`
confirma el claim atómico (`UPDATE ... FOR UPDATE SKIP LOCKED ... RETURNING`) y el job
de purga a 30 días, tal como reporta `IMP-0002`. **El prerequisito de FIN-003 está
verificado, no solo declarado.**

(Nota aparte, no imputable a este ARQ: al leer el working tree de este entorno durante
la verificación se observó el mismo patrón de truncamiento de archivos que motivó el
rechazo original de IMP-0002 — `schema.prisma`, `app.module.ts`, `debts.service.ts`,
`budget.service.ts` aparecen incompletos en el working tree pero completos en el commit.
Esto confirma que el problema es del entorno de lectura, no del código, y refuerza que
la regla de "referencia inmutable obligatoria" de `GOBERNANZA.md` es necesaria y debe
seguir aplicándose en toda auditoría futura.)

## Resumen Ejecutivo

ARQ-0003 está bien acotado: consumidores idempotentes, 7 métricas core deterministas, snapshot diario, tendencias/anomalías con cold-start de 60 días, partición/retención de `MetricReading` (saldando la limitación declarada en IMP-0002), y explícitamente sin dependencias nuevas, sin IA, sin frontend y sin Score (correctamente diferido a FIN-004). Incluye una tabla de trazabilidad propia (§16) contra los mandatos vinculantes de DEC-0001/DEC-0002, y todos los puntos verificados son consistentes con lo decidido hasta ahora.

No se encontraron incumplimientos de mandatos obligatorios ni premisas factualmente incorrectas. Se identifican cuatro observaciones de diseño/metodología —ninguna bloqueante— relacionadas con la regla de `ingreso_mensual_ref` para DTI/savings_rate, una posible inconsistencia entre el umbral global de cold-start (60 días) y el umbral por categoría para anomalías (3 meses), ambigüedad de zona horaria en los jobs nocturnos, y el uso de `MetricReading` como contenedor provisional de anomalías.

## Hallazgos

1. **Regla `ingreso_mensual_ref` todo-o-nada puede distorsionar DTI y savings_rate.** §4.3 define: si existen ingresos fijos (`FixedItem kind=ingreso`), se usan *exclusivamente* esos; si no existen, se usan los ingresos reales del mes. Un usuario con un ingreso fijo pequeño (p. ej. un arriendo que cobra) y el resto de su ingreso real por transacciones variables (freelance, salario registrado como transacción) tendría su DTI y savings_rate calculados solo sobre ese ingreso fijo pequeño, produciendo un DTI artificialmente alto y una tasa de ahorro artificialmente negativa o absurda.
2. **Umbral de cold-start global (60 días) vs. umbral por categoría para anomalías (3 meses) no reconciliados en el texto.** §4.2 fija el umbral único de 60 días para tendencias/anomalías. El riesgo 3 (§10) menciona además "cold-start ≥60 días + mínimo 3 meses de datos por categoría" para anomalías, pero esta condición adicional por categoría no aparece en §4.2 ni en §4.3 como parte del contrato. No es necesariamente incorrecto, pero el ARQ no aclara si ambos umbrales coexisten (y cuál prevalece) o si es una redundancia de redacción.
3. **Zona horaria de los jobs nocturnos no especificada.** §4.1 fija los jobs a 1 AM/2 AM/4 AM sin indicar la zona horaria del servidor ni si se ajusta a la zona horaria del usuario (relevante para un producto enfocado en Colombia, UTC-5). Si el servidor corre en UTC (típico en despliegues gestionados), "1 AM" del servidor equivale a las 8 PM del día anterior en Colombia, lo que podría capturar un snapshot de patrimonio antes de que el usuario termine su día financiero.
4. **`Anomaly` representada como fila de `MetricReading` (`anomaly.<categoria>`) en lugar de una entidad propia.** Decisión pragmática y explícitamente declarada para no crear entidades fuera de alcance (§4.3), pero introduce una sobrecarga semántica de la tabla de métricas (mezcla series numéricas con señales de anomalía) que probablemente requerirá migración/dualidad cuando FIN-006 introduzca el modelo `Insight` real.
5. **Filtro de "usuario activo" para el `SnapshotJob` no definido.** §4.1 menciona snapshot diario "para usuarios activos" sin especificar el criterio (¿transacción en los últimos N días? ¿cualquier usuario con cuenta?). Afecta el costo/duración del job nocturno a medida que crezca la base de usuarios.

## Riesgos

- Si la regla de `ingreso_mensual_ref` (Hallazgo 1) no se ajusta, los primeros usuarios con ingreso mixto (fijo parcial + variable) verán un DTI o savings_rate poco representativo de su realidad, justo en las métricas que alimentarán el Score de FIN-004.
- La ambigüedad de zona horaria (Hallazgo 3) podría producir snapshots de patrimonio "adelantados o atrasados" un día respecto a la percepción del usuario, afectando la consistencia de las tendencias que se comparan mes a mes.
- Sin una definición de "usuario activo" (Hallazgo 5), el costo del `SnapshotJob` puede crecer de forma no acotada a medida que se sumen usuarios inactivos/de prueba.
- El uso temporal de `MetricReading` para anomalías (Hallazgo 4) es deuda técnica aceptada conscientemente; si FIN-006 no contempla la migración de estos datos, se perderá el historial de anomalías previas al introducir `Insight`.

## Fortalezas

- Verificación explícita y correcta del prerequisito (FIN-002 cerrado) citando el commit inmutable, siguiendo la nueva regla de `GOBERNANZA.md` que este mismo ciclo de gobernanza introdujo.
- Diseño de idempotencia correcto: `recompute(userId)` es una función de estado absoluto con upsert por índice único, evitando el patrón frágil de aplicar deltas por evento — resuelve de raíz el contrato de "at-least-once" que exige el outbox de FIN-002.
- Cero dependencias nuevas y cero cambios de infraestructura: reutiliza exactamente lo que FIN-002 ya deja disponible (outbox, `EventEmitter2`, `@nestjs/schedule`, `computeNetWorth`), consistente con la decisión de no usar Redis/BullMQ.
- Cold-start explícito y centralizado en una sola constante reutilizable por módulos futuros (FIN-004/FIN-005), evitando que el umbral se duplique o diverja entre capas.
- Resuelve directamente la limitación declarada en IMP-0002 (partición física de `MetricReading` diferida), en vez de postergarla indefinidamente.
- Alcance disciplinado: excluye explícitamente Score, predicciones, IA y frontend, evitando repetir el problema de sobre-alcance detectado en el ciclo de ARQ-0001.
- Tabla de trazabilidad propia (§16) contra los mandatos de DEC-0001/DEC-0002/IMP-0002, facilitando directamente esta verificación.
- El índice único de upsert incluye la columna de partición (`captured_at`), condición que PostgreSQL exige para índices únicos sobre tablas particionadas — detalle técnico correcto que evita un error de migración fácil de pasar por alto.

## Oportunidades

- Ajustar la regla de `ingreso_mensual_ref` a algo más robusto que "todo o nada" (p. ej. sumar ingresos fijos + ingresos reales no clasificados como el mismo fijo, o usar el mayor de los dos) antes de que DTI/savings_rate alimenten el Score de FIN-004.
- Reconciliar explícitamente en el ARQ (o en la implementación) si el umbral por categoría de 3 meses para anomalías es adicional al cold-start global de 60 días, y documentarlo en un solo lugar junto a `engine.constants.ts`.
- Especificar la zona horaria de ejecución de los jobs nocturnos (idealmente America/Bogota, dado el mercado objetivo) en la configuración de `@nestjs/schedule`.
- Definir el criterio de "usuario activo" para el `SnapshotJob` antes de implementarlo (p. ej. al menos una transacción en los últimos 90 días).
- Dejar una nota explícita en el ARQ de FIN-006 (memoria/proactividad) sobre la migración de las filas `anomaly.*` de `MetricReading` hacia el futuro modelo `Insight`, para no perder continuidad histórica.

## Observaciones críticas

Ninguna. No se detectaron incumplimientos de mandatos vinculantes (DEC-0001/DEC-0002) ni premisas factualmente incorrectas en este ARQ.

## Observaciones menores

- Hallazgos 2, 3 y 5 son ambigüedades de especificación que conviene cerrar antes de implementar, pero no bloquean el inicio del desarrollo ni indican un defecto de arquitectura.
- Hallazgo 4 (anomalías en `MetricReading`) es deuda técnica explícitamente reconocida por el propio ARQ, con plan de migración implícito (no explícito) hacia FIN-006.
- El nombre de archivo/módulo `financial-engine/` coincide con lo previsto originalmente en ARQ-0001 (§5), manteniendo consistencia de nomenclatura entre ciclos.

## Recomendaciones

1. Especificar una regla de `ingreso_mensual_ref` más robusta que "todo o nada" antes de implementar `dti`/`savings_rate`.
2. Reconciliar y documentar en un solo lugar (§4.2/§4.3 o `engine.constants.ts`) la relación entre el cold-start global (60 días) y el umbral por categoría (3 meses) para anomalías.
3. Fijar explícitamente la zona horaria de los jobs nocturnos (recomendado: America/Bogota).
4. Definir el criterio de "usuario activo" para el `SnapshotJob`.
5. Dejar constancia en el ARQ de FIN-006 de la necesidad de migrar `anomaly.*` desde `MetricReading` hacia `Insight` cuando ese modelo exista.

## Priorización

| Recomendación | Clasificación |
|---|---|
| Regla robusta de `ingreso_mensual_ref` (Rec. 1) | Debe hacerse antes del desarrollo (afecta directamente la corrección de DTI/savings_rate) |
| Reconciliar umbrales de cold-start (Rec. 2) | Debe hacerse antes del desarrollo (evitar ambigüedad en la implementación) |
| Zona horaria de jobs nocturnos (Rec. 3) | Debe hacerse antes del desarrollo |
| Criterio de "usuario activo" (Rec. 4) | Puede resolverse durante la implementación (FIN-003) |
| Nota de migración de anomalías para FIN-006 (Rec. 5) | Puede esperar al ARQ de FIN-006 |

## Veredicto

**APROBADO CON OBSERVACIONES.**

ARQ-0003 cumple los mandatos vinculantes aplicables de DEC-0001 y DEC-0002, verificados contra referencia inmutable, y mantiene la disciplina de alcance de los ciclos anteriores. Las observaciones (regla de ingreso de referencia, reconciliación de umbrales, zona horaria, criterio de usuario activo) son ajustes de especificación de bajo costo, no defectos de arquitectura. Se recomienda que el CTO las incorpore como cambios obligatorios de bajo costo en `DEC-0003`, sin necesidad de devolver el ARQ para una nueva iteración completa.

---
*Esta auditoría no implementa ni decide. Queda a la espera de la decisión oficial del CTO (`DEC-0003`).*
