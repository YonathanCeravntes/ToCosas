# AUD-0002 · Auditoría de ARQ-0002 (Fundaciones de Datos — Cuentas/Activos + eventos con outbox + series)

- **Documento auditado:** `docs/arquitectura/ARQ-0002-Fundaciones-de-Datos.md`
- **Módulo/Feature:** FIN-002
- **Documentos base revisados:** `ARQ-0001-Inteligencia-Financiera.md`, `AUD-0001-Inteligencia-Financiera.md`, `DEC-0001-Inteligencia-Financiera.md`
- **Fecha:** 2026-07-04
- **Auditor:** Auditor Oficial de Milla (rol de solo lectura)

> Esta auditoría no modifica el ARQ ni el código. Documenta hallazgos para que el CTO
> emita `DEC-0002`.

---

## Resumen Ejecutivo

ARQ-0002 corrige el hallazgo más grave detectado en el ciclo anterior: ya no afirma que Redis/BullMQ están disponibles, sino que decide explícitamente (§4.1) adoptar un patrón outbox sobre PostgreSQL con despacho por cron, descartando Redis/BullMQ con justificación basada en evidencia real del código y de `render.yaml`. El documento también incorpora clasificación evento-por-evento (síncrono/asíncrono), particionamiento/retención de `MetricReading`, y deja registradas —aunque no implementadas— las decisiones de cifrado de PII en reposo y rate limiting, tal como exigía `DEC-0001 §10`.

DEC-0001 §11 instruye explícitamente al Auditor a verificar el cumplimiento de los 10 cambios obligatorios antes de emitir veredicto. Esa verificación se detalla a continuación; el resultado es que **los puntos aplicables a FIN-002 (#1, #2, #3, #5, y soporte de #4) están cumplidos**. Los puntos #4 (implementación), #6, #7, #8 y #9 no aplican a este ARQ (pertenecen a FIN-003/FIN-004/FIN-005) y el documento lo declara correctamente en su propia tabla de trazabilidad (§16).

Más allá del cumplimiento del DEC, esta auditoría identifica dos observaciones técnicas nuevas, no bloqueantes, sobre el propio diseño del outbox/dispatcher (seguridad de concurrencia y una inconsistencia menor en la clasificación de `AccountBalanceUpdated`), y una omisión menor (política de purga del outbox procesado).

## Verificación de cumplimiento de DEC-0001 §10 (exigida por DEC-0001 §11)

| # | Cambio obligatorio | Aplica a FIN-002 | Cumplimiento verificado |
|---|---|---|---|
| 1 | Decidir infra de colas/eventos explícitamente, sin "ya disponible" | Sí | ✅ Cumple — §4.1 decide (a) cron+outbox sobre PostgreSQL, descarta Redis/BullMQ con evidencia (`package.json`, `render.yaml`) |
| 2 | Patrón outbox en el alcance | Sí | ✅ Cumple — §3, §4.1, §6 (`OutboxEvent`), §7 (`OutboxService`/`OutboxDispatcher`) |
| 3 | Clasificación síncrono crítico vs. asíncrono diferido | Sí | ✅ Cumple — §4.2, tabla completa por tipo de evento |
| 4 | Cold-start explícito para anomalías/predicciones | No (corresponde a FIN-003) | ➖ No aplica — ARQ-0002 correctamente declara "soporte" únicamente (timestamps disponibles) y remite el umbral a FIN-003 (§16) |
| 5 | Cifrado de PII en reposo + rate limiting evaluados y decididos | Sí | ✅ Cumple — §11: rate limiting decidido "adoptar @nestjs/throttler"; cifrado a nivel de campo evaluado y diferido explícitamente con justificación (impacto en consultas agregadas de patrimonio) |
| 6 | Consentimiento/minimización para LLM externo | No (corresponde a FIN-005) | ➖ No aplica — §9 confirma "Ninguna IA" en este módulo |
| 7 | Validación legal del encuadre regulatorio | No (corresponde a FIN-004/FIN-005) | ➖ No aplica |
| 8 | Señal de monetización simple | No (corresponde a FIN-004/FIN-005) | ➖ No aplica — §3 lo declara explícitamente excluido |
| 9 | Primer hito de Salud Financiera acotado a 3 indicadores | No (corresponde a FIN-004) | ➖ No aplica |
| 10 | Convención única de carpeta `docs/auditoria/` | Sí (administrativo) | ✅ Cumple — referenciada en encabezado y pie del documento |

**Conclusión de la verificación:** no se detecta ningún cambio obligatorio aplicable incumplido.

## Hallazgos

1. **Seguridad de concurrencia del `OutboxDispatcher` no especificada.** El diseño (§4.1, §7) describe un cron que lee filas `pending` y las marca `processing`, pero no especifica un mecanismo de claim atómico (p. ej. `SELECT ... FOR UPDATE SKIP LOCKED` o un `claimed_by`/lease con expiración). Si el backend llegara a correr en más de una instancia, o si una ejecución del cron se solapa con la siguiente por una corrida lenta, dos despachadores podrían leer y procesar la misma fila antes de que el marcado `processing` se persista.
2. **Inconsistencia menor en la clasificación de `AccountBalanceUpdated`.** La tabla de §4.2 lo marca como "síncrono crítico (<100ms) para patrimonio inmediato en UI", pero el párrafo siguiente aclara que el patrimonio "inmediato" en realidad se calcula on-read con una consulta agregada, no depende del despachador. Esto sugiere que el evento no necesitaría ser síncrono crítico para ese propósito — la clasificación síncrona parece heredada de una necesidad que el propio diseño ya resuelve de otra forma (lectura directa).
3. **Sin política de purga/archivo para `OutboxEvent` procesados.** El modelo (§6) no define retención para filas en estado `processed`; sin una purga periódica, la tabla outbox crecerá indefinidamente incluso después de que los eventos ya no tengan utilidad operativa.
4. **`AccountBalanceEntry` sin regla explícita de cuándo se escribe.** El modelo existe (§6) pero el ARQ no aclara si cada actualización de `Account.currentBalance` genera automáticamente una fila en `AccountBalanceEntry`, ni si hay validación de rangos (p. ej. saldos negativos en cuentas que no deberían tenerlos).

## Riesgos

- Si el proyecto migra a múltiples instancias del backend (autoescalado, o simplemente pasar del plan free de Render a uno con réplicas) sin resolver el Hallazgo 1, se introduce riesgo de procesamiento duplicado de eventos de dominio — mitigado parcialmente por el contrato de idempotencia exigido a los consumidores, pero ese contrato no sustituye un claim atómico correcto en el propio dispatcher.
- Sin purga del outbox (Hallazgo 3), el crecimiento no acotado de la tabla puede degradar las consultas del propio dispatcher (`WHERE status='pending'`) a medida que la tabla crece, incluso con índice sobre `(status, availableAt)`.
- El aplazamiento del cifrado a nivel de campo (§11, decisión ya aceptada por DEC-0001) implica que `Account.currentBalance` y `Asset.currentValue` — datos tan sensibles como los saldos bancarios — quedarán en texto plano en esta fase. Es un riesgo ya aceptado explícitamente por el DEC anterior, no nuevo, pero se reitera aquí para que no se pierda de vista antes de ampliar la exposición del sistema.

## Fortalezas

- Corrección completa y verificable del hallazgo más grave del ciclo anterior (premisa de Redis/BullMQ), con evidencia concreta (`package.json`, `render.yaml`) citada en el propio ARQ.
- Decisión de infraestructura (outbox sobre PostgreSQL, sin costo nuevo) bien justificada y con ruta de evolución explícita si la escala lo exige, sin comprometer productores/consumidores actuales.
- Clasificación evento-por-evento (síncrono/asíncrono) es exactamente el tipo de decisión de diseño que evita el problema de fan-out síncrono señalado en la auditoría del ciclo anterior.
- Alcance bien acotado: excluye explícitamente pgvector, Score, derivación automática de saldos y monetización, evitando repetir el problema de sobre-alcance del ARQ-0001.
- Incluye tabla de trazabilidad propia (§16) contra los cambios obligatorios del DEC — facilita directamente la verificación de esta auditoría.
- Contempla particionamiento/retención de `MetricReading` desde el diseño (respuesta directa al Hallazgo 9 del ciclo anterior), en vez de dejarlo como mejora futura.
- Documenta explícitamente el riesgo de doble contabilidad (saldo manual vs. transacciones) y lo resuelve con una regla simple (saldo manual como fuente de verdad, sin auto-derivación en esta fase).

## Oportunidades

- Especificar en la implementación un mecanismo de claim atómico para el `OutboxDispatcher` (p. ej. `UPDATE ... SET status='processing' WHERE status='pending' ... RETURNING`, o `SELECT FOR UPDATE SKIP LOCKED`), documentándolo como parte del contrato de `OutboxService`/`OutboxDispatcher` antes de implementar.
- Aclarar si `AccountBalanceUpdated` necesita seguir clasificado como síncrono crítico dado que el patrimonio ya se resuelve on-read; si no aporta valor, simplificar la clasificación.
- Añadir una política simple de purga/archivo para `OutboxEvent` procesados (p. ej. borrar o archivar filas `processed` con más de N días).
- Precisar en el ARQ (o dejarlo para la implementación) si `AccountBalanceEntry` se escribe automáticamente en cada cambio de saldo y si existe validación de consistencia por tipo de cuenta.

## Observaciones críticas

Ninguna. No se detectaron incumplimientos de los cambios obligatorios de DEC-0001 ni premisas factualmente incorrectas en este ARQ.

## Observaciones menores

- Hallazgo 1 (concurrencia del dispatcher) y Hallazgo 3 (purga del outbox) son observaciones de robustez a mediano plazo, no bloqueantes para iniciar el desarrollo de FIN-002, dado que el plan actual (Render free tier) corre una sola instancia.
- Hallazgo 2 (clasificación de `AccountBalanceUpdated`) es una inconsistencia de redacción/diseño, no un defecto funcional: no impide avanzar, pero conviene aclararla para que la implementación no hereda ambigüedad.
- Hallazgo 4 (regla de escritura de `AccountBalanceEntry`) es un detalle de implementación razonable de resolver durante el desarrollo, no en el ARQ.

## Recomendaciones

1. Documentar (en el ARQ o en el propio código, antes de mergear) el mecanismo de claim atómico del `OutboxDispatcher`.
2. Resolver la inconsistencia de clasificación de `AccountBalanceUpdated` — simplificar a asíncrono si el patrimonio ya se calcula on-read, o justificar por qué se mantiene síncrono.
3. Definir una política mínima de purga para `OutboxEvent.status = 'processed'`.
4. Aclarar la regla de escritura de `AccountBalanceEntry` (automática vs. explícita) antes de implementar el endpoint de actualización de saldo.
5. Mantener, como ya lo hace el ARQ, la trazabilidad explícita contra los cambios obligatorios del DEC en los próximos ARQ hijos (FIN-003 en adelante) — buena práctica a preservar.

## Priorización

| Recomendación | Clasificación |
|---|---|
| Mecanismo de claim atómico en OutboxDispatcher (Rec. 1) | Debe hacerse antes del desarrollo (evitar duplicar trabajo de diseño después) |
| Resolver clasificación de AccountBalanceUpdated (Rec. 2) | Debe hacerse antes del desarrollo (aclarar antes de implementar) |
| Política de purga del outbox (Rec. 3) | Puede esperar una versión futura, pero diseñarse antes de producción |
| Regla de escritura de AccountBalanceEntry (Rec. 4) | Puede resolverse durante la implementación (FIN-002) |
| Trazabilidad contra cambios obligatorios en ARQ hijos futuros (Rec. 5) | Práctica a mantener, no requiere acción adicional ahora |

## Veredicto

**APROBADO CON OBSERVACIONES.**

ARQ-0002 cumple íntegramente los cambios obligatorios de DEC-0001 aplicables a FIN-002 y corrige el hallazgo crítico del ciclo anterior. Las observaciones nuevas (concurrencia del dispatcher, purga del outbox, clasificación de `AccountBalanceUpdated`) son de robustez y claridad de diseño, no bloqueantes dado el contexto actual (instancia única en Render free tier). Se recomienda que el CTO las incorpore como ajustes menores en `DEC-0002`, sin necesidad de devolver el ARQ para una nueva iteración completa.

---
*Esta auditoría no implementa ni decide. Queda a la espera de la decisión oficial del CTO (`DEC-0002`).*
