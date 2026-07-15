# DEC-0006 · Memoria financiera + Proactividad (sin RAG/embeddings)

- **Documentos base:** `docs/arquitectura/ARQ-0006-Memoria-y-Proactividad.md` · `docs/auditoria/AUD-0006-Memoria-y-Proactividad.md`
- **Módulo/Feature:** FIN-006
- **Decide:** CTO/CPO/Principal Architect de Millo
- **Fecha:** 2026-07-05

---

## 1. Resumen ejecutivo

ARQ-0006 resuelve con disciplina dos mandatos que arrastraba el proyecto: el plan de
migración de `anomaly.*` hacia el modelo `Insight` (DEC-0003 §10.5) y la revisión del
contenedor de series que pedí en DEC-0004 §8. Define además un criterio de evidencia
explícito y medible para cuándo revisitar el rechazo de pgvector/RAG (DEC-0001 §5.2), y
extiende correctamente la regla de vistas minimizadas nacida del incidente de FIN-005a
la nueva superficie de memoria hacia el Copiloto.

AUD-0006 encontró una afirmación verificablemente falsa: el ARQ dice que las filas
`anomaly.*` huérfanas "saldrán naturalmente por la retención de la serie", pero
verifiqué directamente contra el código (`trends.job.ts`, `retention.job.ts`) que esas
lecturas se escriben con `period: 'month'`, y el `RetentionJob` solo purga `period:
'day'` — las de `month` tienen retención indefinida por diseño (DEC-0002 §4.5). Confirmo
el hallazgo de forma independiente: es correcto.

A diferencia del ciclo de FIN-005, este defecto está en un detalle de especificación
(qué pasa con datos migrados), no en el mecanismo central de arquitectura del ARQ. Por
eso, igual que el auditor, no lo trato como motivo de rechazo — lo resuelvo como cambio
obligatorio de bajo costo, junto con las otras tres observaciones.

## 2. Arquitecturas revisadas

- `docs/arquitectura/ARQ-0006-Memoria-y-Proactividad.md` — v. 2026-07-05.

## 3. Auditorías revisadas

- `docs/auditoria/AUD-0006-Memoria-y-Proactividad.md` — veredicto: **APROBADO CON
  OBSERVACIONES**.

## 4. Decisiones aprobadas

1. **Modelo `Insight`** (anomalía/riesgo/oportunidad/logro/cambio de tendencia) con
   severidad, estado y ciclo de vida, como entidad propia separada de `MetricReading`:
   aprobado. Resuelve directamente la inquietud que dejé abierta en DEC-0004 §8.
2. **Migración `anomaly.* → Insight`** (datos + corte de escritura): aprobada, con la
   corrección de la sección 10.
3. **Memoria financiera 100% estructurada** (`FinancialMemoryFact`, SQL + tags, sin
   embeddings) y **criterio de evidencia explícito** para revisar pgvector/RAG (§4.6):
   aprobado. Es exactamente la disciplina que exigía DEC-0001 §5.2.
4. **Proactividad anti-fatiga** (tope 1 notificación/día, quiet hours, toggle): aprobada.
5. **`MinimizedMemoryView`** integrada al test de PII (ahora 5 vistas) bajo la regla de
   GOBERNANZA de vistas minimizadas: aprobada, cumplimiento correcto del estándar nacido
   del incidente de FIN-005.
6. **Memoria generada solo por plantilla determinista** (nunca lee el chat del usuario
   con IA para "aprender"): aprobado — evita costo, alucinación y una nueva superficie de
   consentimiento.
7. **Sin cambios a los gates heredados de FIN-005** (DPA/PIA/producción): confirmado.

## 5. Decisiones rechazadas

- Ninguna. No hay rechazo de diseño; se corrige una afirmación específica (sección 10).

## 6. Observaciones aceptadas

- Hallazgo 1 (afirmación falsa sobre retención de `anomaly.*` huérfanas, verificada
  independientemente contra el código) — aceptado, elevado a cambio obligatorio.
- Hallazgo 2 (asimetría: hay generador de logro cuando el Score sube de banda, pero no de
  riesgo cuando baja) — aceptado, se corrige.
- Hallazgo 3 (regla anti-fatiga solo local al módulo, no agregada entre canales) —
  aceptado como riesgo pendiente para FIN-007/FIN-008, no bloqueante aquí.
- Hallazgo 4 (clave de idempotencia ambigua para insights de evento único como "Deuda
  saldada") — aceptado, se aclara.

## 7. Observaciones descartadas

- Ninguna.

## 8. Riesgos aceptados

- **Volumen bajo de usuarios hoy**: la ausencia de un límite agregado de notificaciones
  cross-canal (Hallazgo 3) no es crítica en esta etapa; se acepta diferirla.

## 9. Riesgos pendientes

1. **Límite agregado de notificaciones cross-canal** (recordatorios + proactividad +
   WhatsApp/Telegram): pendiente, a resolver en el ciclo de FIN-007 o FIN-008 — dejo
   constancia para que no se pierda de vista, igual que hice con la migración de
   anomalías en su momento.
2. **DPA/PIA/validación legal final** (heredados de DEC-0005): siguen pendientes, sin
   cambios por este ciclo. FIN-006 no introduce IA nueva, así que no agrava el bloqueo,
   pero tampoco lo resuelve.

## 10. Cambios obligatorios

1. **Corregir §4.2.3**: en vez de afirmar que las filas `anomaly.*` "salen por
   retención", la migración debe **purgarlas explícitamente** (`DELETE` sobre
   `metric_readings` donde `metric_key LIKE 'anomaly.%'`) en la misma migración que las
   traslada a `Insight` — ya no tienen razón para persistir una vez migradas.
2. **Generador simétrico de riesgo**: agregar "Score baja de banda → riesgo/warning"
   junto al ya definido para cuando sube, coherente con el objetivo declarado del propio
   ARQ ("avisa antes de que duela").
3. **Clarificar la clave de idempotencia para insights de evento único** (p. ej. "Deuda
   saldada"): usar `debtId` (o el identificador de la entidad disparadora) como parte de
   la clave natural en vez de `metricKey`/`mes`, documentado explícitamente en el modelo
   `Insight` y cubierto por test.
4. **Registrar el límite agregado de notificaciones cross-canal como riesgo pendiente
   explícito** en el propio código/documentación (comentario en `ProactivityJob` o nota
   en el IMP), para que FIN-007/FIN-008 lo hereden como pendiente conocido, no lo
   redescubran.

## 11. Plan técnico oficial

Se autoriza al agente Desarrollador a iniciar la implementación de FIN-006 siguiendo el
plan de la sección 14 de `ARQ-0006`, incorporando los 4 cambios obligatorios de la
sección 10 de este DEC:

1. Migración: modelos `Insight`/`FinancialMemoryFact` + enums + `proactiveEnabled` +
   migración de datos `anomaly.*` **con purga explícita** (cambio obligatorio #1).
2. `insights/` (servicio + endpoints + idempotencia, incluyendo la clave clarificada del
   cambio obligatorio #3) + tests.
3. Generadores en el Motor (incluyendo el simétrico del cambio obligatorio #2) + corte de
   escritura en `TrendsJob` + tests.
4. `memory/` (detector de recurrencias + `MemoryJob` + ciclo stale) + tests.
5. `ProactivityJob` (anti-fatiga + canales + deep-link + nota del cambio obligatorio #4) + tests.
6. `MinimizedMemoryView` + tool `get_memory_and_insights` + extensión del test de PII a 5 vistas.
7. Frontend: tarjetas de insights + toggle proactivo.
8. Verificación end-to-end (sembrar → generar → entregar → ver en app) + bundle.
9. Cierre con `docs/implementaciones/IMP-0006-Memoria-y-Proactividad.md`, **con SHA de
   commit** (regla de GOBERNANZA), declarando el estado heredado de DPA/PIA/producción
   (sin cambios), y actualizando `docs/roadmap/BACKLOG.md`.

No se autoriza ninguna funcionalidad fuera de este plan (pgvector/RAG, metas formales,
simulador/recomendaciones, gamificación, billing) dentro del ciclo de FIN-006.

## 12. Prioridad

**Media-Alta.** Habilita proactividad y memoria, base de FIN-007 (simulador/
recomendaciones) y mejora la utilidad longitudinal del Copiloto ya cerrado en FIN-005.

## 13. Estado final

**APROBADO CON AJUSTES.** Se autoriza iniciar la implementación de FIN-006 bajo el plan
de la sección 11 y los 4 cambios obligatorios de la sección 10. Los gates heredados de
FIN-005 (DPA, PIA, producción bloqueada) siguen vigentes sin cambios. El cierre de
FIN-006 requiere `IMP-0006` con SHA de commit verificable, que validaré en checkout
aislado antes de autorizar el cierre.

---
*Documento oficial — no modificar. Corresponde al ciclo de gobernanza de `docs/GOBERNANZA.md`.*
