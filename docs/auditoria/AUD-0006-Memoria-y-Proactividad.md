# AUD-0006 · Auditoría de ARQ-0006 (Memoria financiera + Proactividad, sin RAG/embeddings)

- **Documento auditado:** `docs/arquitectura/ARQ-0006-Memoria-y-Proactividad.md`
- **Módulo/Feature:** FIN-006
- **Documentos base revisados:** `ARQ-0001/DEC-0001`, `DEC-0002`, `DEC-0003`, `DEC-0004`, `ARQ-0005 v2/AUD-0005 v2/DEC-0005` (+ adenda legal), `IMP-0005`, `GOBERNANZA.md` (reglas de referencia inmutable y vistas minimizadas)
- **Referencia inmutable verificada:** `git show HEAD:backend/src/modules/financial-engine/jobs/trends.job.ts` para el comportamiento real de las lecturas `anomaly.*` (período y escritura) — no se auditó contra working tree (se confirmó nuevamente desincronización del working tree en este entorno; `GOBERNANZA.md` en disco no coincide con `git show HEAD`, mismo patrón ya documentado en ciclos anteriores).
- **Fecha:** 2026-07-05
- **Auditor:** Auditor Oficial de Milla (rol de solo lectura)

> Esta auditoría no modifica el ARQ ni el código. Documenta hallazgos para que el CTO
> emita `DEC-0006`.

---

## Resumen Ejecutivo

ARQ-0006 resuelve con disciplina los dos mandatos que arrastraba desde ciclos anteriores: el plan de migración de `anomaly.*` hacia el modelo `Insight` (exigido por DEC-0003 §10.5) y la revisión del contenedor de series que DEC-0004 §8 pidió evaluar antes de este ciclo. La memoria financiera se diseña deliberadamente sin embeddings, con un criterio de evidencia explícito y verificable para cuándo revisitar esa decisión (§4.6) — exactamente la disciplina que el rechazo de pgvector en DEC-0001 §5.2 pedía. La nueva superficie hacia el Copiloto (`MinimizedMemoryView`) sigue correctamente la regla de gobernanza que nació del incidente de FIN-005 (vistas minimizadas obligatorias para toda tool de LLM), y la memoria se construye exclusivamente con texto generado por plantilla, nunca texto libre del usuario — coherente con el patrón ya validado en el ciclo anterior.

Se verificó contra el código real de FIN-003 (`trends.job.ts`) una afirmación concreta del ARQ: que las filas históricas `anomaly.*` "salen naturalmente por la retención de la serie" tras el corte de escritura. **Esta afirmación es incorrecta**: esas lecturas se persisten con `period: 'month'`, y el job de retención existente (`RetentionJob`) solo purga lecturas con `period: 'day'` a los 180 días — las lecturas mensuales tienen retención indefinida por diseño (DEC-0002 §4.5). Sin una regla de purga nueva, las filas `anomaly.*` huérfanas quedarán como residuo permanente en `MetricReading`, no "saliendo naturalmente" como el documento afirma. Además de este hallazgo, se identifican dos observaciones de completitud de producto (asimetría entre "logro" y "riesgo" en los generadores, y gestión de fatiga de notificaciones solo local al módulo) que no son errores, pero merecen resolverse antes de considerar el diseño terminado.

## Hallazgos

1. **Afirmación incorrecta sobre la retención de las filas `anomaly.*` huérfanas (verificada contra código).** §4.2.3 del ARQ afirma que las filas históricas no se borran pero "salen naturalmente por la retención de la serie". Verificado en `backend/src/modules/financial-engine/jobs/trends.job.ts` (línea ~130-133): las anomalías se escriben con `period: 'month'`. El `RetentionJob` (FIN-003, `DAY_READING_RETENTION_DAYS`) solo purga lecturas con `period: 'day'`; las de `period: 'month'` son de retención indefinida por diseño ratificado en DEC-0002 §4.5. Por lo tanto, tras el corte de escritura, las filas `anomaly.*` no saldrán nunca por retención — permanecerán indefinidamente como datos huérfanos.
2. **Asimetría entre generadores de "logro" y de "riesgo" para el Score.** La tabla de §4.3 incluye "Score sube de banda → logro/info" pero no un generador equivalente para cuando el Score **baja** de banda, que encajaría naturalmente como "riesgo/warning". Esto es inconsistente con el objetivo declarado del propio documento en §12 ("avisa antes de que duela"): el diseño celebra las mejoras de Score pero no alerta proactivamente sobre su deterioro, que es precisamente el escenario donde la proactividad aporta más valor.
3. **La regla anti-fatiga (§4.5) es local al módulo, no holística sobre el total de notificaciones del usuario.** El tope de "máx. 1 notificación proactiva/día" solo cuenta las notificaciones que este módulo genera; no considera el volumen total que el usuario ya recibe por otros canales existentes (recordatorios de vencimiento de deudas, mensajes de WhatsApp/Telegram). Un usuario podría recibir el insight proactivo del día **más** un recordatorio de deuda el mismo día, sin que ningún mecanismo limite el total agregado — el riesgo de fatiga de notificaciones (que el propio ARQ-0001 señaló como riesgo 5) se mitiga solo parcialmente.
4. **La clave natural de idempotencia `(userId, type, metricKey, mes)` no encaja con claridad en insights disparados por evento único (no mensual).** "Deuda saldada" se dispara por un evento (`DebtUpdated` con saldo 0) ligado a un `debtId`, no a un ciclo mensual ni a un `metricKey` de los ya definidos. El ARQ no aclara qué valor tomaría `metricKey`/`mes` para este caso ni cómo se garantiza que el mismo evento no produzca un insight duplicado si el listener se reintenta (contrato de idempotencia que FIN-003 exige a todo consumidor del outbox).

## Riesgos

- Sin corregir el Hallazgo 1, `MetricReading` acumulará filas `anomaly.*` huérfanas indefinidamente — justo el tipo de "deuda técnica silenciosa" que DEC-0004 §8 quiso identificar a tiempo al pedir revisar el contenedor de series antes de este ciclo.
- El Hallazgo 2 deja una asimetría de producto visible para el usuario: Millo celebra cuando el Score sube pero no dice nada cuando baja, lo que contradice la promesa central de "avisar antes de que duela".
- El Hallazgo 3, aunque no crítico hoy (volumen bajo de usuarios), se vuelve más relevante a medida que crecen los canales de notificación existentes; conviene resolverlo antes de que la fatiga de notificaciones sea un problema real reportado por usuarios, no después.

## Fortalezas

- Resuelve íntegramente el mandato pendiente de DEC-0003 §10.5 (migración de `anomaly.*` a `Insight`) con un plan concreto de datos + corte de escritura + destino de los históricos, no solo una declaración de intención.
- Responde directamente a la inquietud que el propio CTO dejó abierta en DEC-0004 §8 sobre si `MetricReading` seguía siendo el contenedor adecuado — la separación de `Insight` como entidad propia es la solución correcta y oportuna.
- El criterio de evidencia para revisar pgvector/RAG (§4.6) es específico y medible (umbral de hechos activos + tasa de irrelevancia, o necesidad real de buscar sobre texto libre), evitando que la discusión de "cuándo sí embeddings" quede en el aire indefinidamente.
- Cumple con disciplina la nueva regla de gobernanza de vistas minimizadas para tools de LLM (nacida del incidente de FIN-005): la nueva vista se integra al mismo test de PII, ahora extendido a 5 vistas, en vez de tratarse como una excepción por ser "supuestamente segura".
- La memoria financiera nace exclusivamente de análisis determinista sobre datos ya existentes, nunca de leer el chat del usuario con un LLM para "aprender" — decisión explícita que evita abrir una nueva superficie de consentimiento y una fuente de alucinación, coherente con "determinismo primero".
- Reutiliza consistentemente el mismo esquema de anonimización de texto libre (categorías personalizadas por usuario) ya establecido en FIN-005, en lugar de inventar un criterio nuevo para memoria.
- El detector de recurrencias exige 3+ meses de datos antes de generar un hecho, evitando el mismo tipo de falso positivo temprano que ya se corrigió para anomalías/tendencias en FIN-003.

## Oportunidades

- Añadir una regla de purga explícita para las filas `anomaly.*` huérfanas (p. ej. borrarlas en la misma migración que las traslada a `Insight`, ya que quedan sin utilidad una vez migradas, en vez de dejarlas "salir por retención").
- Añadir un generador simétrico "Score baja de banda → riesgo/warning" junto al ya definido para cuando sube.
- Evaluar, aunque sea en un ciclo posterior, un límite agregado de notificaciones por usuario/día que abarque todos los canales (recordatorios + proactividad + WhatsApp/Telegram), no solo el de este módulo.
- Aclarar la clave de idempotencia para insights disparados por evento único (p. ej. usar `debtId` en el payload como parte de la clave natural en lugar de `metricKey`/`mes` para ese tipo de insight).

## Observaciones críticas

- **Hallazgo 1** se eleva a observación crítica: es una afirmación verificablemente falsa sobre el comportamiento del sistema (contrastada directamente contra el código de FIN-003), no una omisión de diseño. El estándar aplicado en ciclos anteriores (p. ej. la premisa de Redis/BullMQ en ARQ-0001) trata las afirmaciones factualmente incorrectas sobre infraestructura existente con ese mismo nivel de severidad.

## Observaciones menores

- Hallazgos 2, 3 y 4 son de completitud de producto y de especificación, no defectos de arquitectura ni incumplimientos de mandatos vinculantes.

## Recomendaciones

1. Corregir §4.2.3: en vez de afirmar que las filas `anomaly.*` "salen por retención", incluir una purga explícita de esas filas como parte de la misma migración (dado que ya fueron trasladadas a `Insight`, no tienen razón para persistir).
2. Añadir el generador simétrico de riesgo para caída de banda del Score.
3. Registrar como riesgo pendiente (no necesariamente resuelto en este ciclo) la necesidad de un límite agregado de notificaciones cross-canal, para que no se pierda de vista en FIN-007/FIN-008.
4. Aclarar la clave de idempotencia para insights de evento único como "Deuda saldada".

## Priorización

| Recomendación | Clasificación |
|---|---|
| Purga explícita de `anomaly.*` huérfanas en la migración (Rec. 1) | Debe hacerse antes del desarrollo |
| Aclarar idempotencia de insights de evento único (Rec. 4) | Debe hacerse antes del desarrollo |
| Generador simétrico de riesgo por caída de banda (Rec. 2) | Debe hacerse antes de producción (mejora de completitud, no bloquea el desarrollo del resto) |
| Límite agregado de notificaciones cross-canal (Rec. 3) | Puede esperar a FIN-007/FIN-008; registrar como riesgo pendiente |

## Veredicto

**APROBADO CON OBSERVACIONES.**

ARQ-0006 cumple los mandatos vinculantes de DEC-0001 §5.2 (criterio de evidencia para RAG), DEC-0003 §10.5 (plan de migración de anomalías) y DEC-0004 §8 (revisión del contenedor de series), y respeta con disciplina la nueva regla de gobernanza de vistas minimizadas. La observación crítica (Hallazgo 1) es una corrección de especificación verificable y de bajo costo — no un defecto de diseño del mecanismo central, a diferencia del ciclo de FIN-005 — por lo que no amerita rechazo, pero sí debe corregirse en el documento (o resolverse explícitamente como cambio obligatorio del DEC) antes de implementar la migración, para no heredar datos huérfanos permanentes desde el primer despliegue.

---
*Esta auditoría no implementa ni decide. Queda a la espera de la decisión oficial del CTO (`DEC-0006`).*
