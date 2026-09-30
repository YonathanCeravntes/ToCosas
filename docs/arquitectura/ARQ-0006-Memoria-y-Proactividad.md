# ARQ-0006 · Memoria financiera + Proactividad (sin RAG/embeddings)

- **Módulo/Feature:** FIN-006
- **Autor:** Agente de Arquitectura
- **Fecha:** 2026-07-05
- **Estado:** Propuesto — en espera de AUD-0006 y DEC-0006
- **Documentos base:** `ARQ-0001` · `DEC-0001` · `DEC-0003` (§10.5) · `DEC-0004` (§8) · `DEC-0005` (v2 + adenda) · `IMP-0005` (FIN-005 cerrado contra `919f7c2`)
- **Producto:** Millo

> Autorizado por la validación del CTO que cierra FIN-005. Dos mandatos condicionan este
> diseño desde el título: (1) **DEC-0001 §5.2** — pgvector/RAG rechazado hasta evidencia
> de que la memoria estructurada es insuficiente → este ARQ diseña memoria **100%
> estructurada (SQL + tags, cero embeddings)** y define el criterio de evidencia (§4.6);
> (2) **DEC-0003 §10.5** — plan de migración obligatorio de las filas `anomaly.*` de
> `MetricReading` hacia el modelo `Insight` → resuelto en **§4.2**. Trazabilidad en §16.

---

## 1. Objetivo
Darle a Millo **memoria** (hechos financieros persistentes del usuario: hábitos,
recurrencias, fechas clave, cambios de tendencia) y **proactividad** (avisos que Millo
inicia cuando detecta riesgos, logros o cambios relevantes), con el modelo `Insight`
como entidad propia — sacando las anomalías del contenedor provisional `MetricReading`.

## 2. Problema que resuelve
1. Las anomalías viven como filas `anomaly.*` en `MetricReading` (deuda técnica aceptada
   en DEC-0003 §4.6): sin estado, sin severidad, sin ciclo de vida, mezcladas con series
   numéricas — DEC-0004 §8 ya pidió revisar el contenedor.
2. Millo no recuerda nada del usuario entre sesiones más allá de sus datos crudos: no
   sabe que "cobra quincenal", que "paga arriendo el día 5" ni que su tendencia cambió.
3. La IA es 100% reactiva: el Copiloto solo habla si le hablan. Los eventos del Motor
   (`RiskDetected`-like) no llegan nunca al usuario.

## 3. Alcance

**Incluye:**
1. **Modelo `Insight`** (anomalía/riesgo/oportunidad/logro/cambio de tendencia) con
   severidad, estado y ciclo de vida — §4.1.
2. **Migración `anomaly.*` → `Insight`** (mandato DEC-0003 §10.5) — §4.2.
3. **Detección de logros y riesgos deterministas** (nuevos generadores en el Motor) — §4.3.
4. **Memoria financiera estructurada** (`FinancialMemoryFact`, SQL + tags, sin
   embeddings) + detector de recurrencias (módulos Hábitos/Patrones de ARQ-0001,
   pendientes desde FIN-003) — §4.4.
5. **Proactividad anti-fatiga**: job diario que entrega los insights relevantes por
   push/WhatsApp/Telegram con tope diario y quiet hours — §4.5.
6. **Integración con el Copiloto**: vista minimizada nueva (`MinimizedMemoryView`) para
   que memoria+insights entren al contexto — bajo la regla obligatoria de GOBERNANZA
   (allowlist + test de PII extendido) — §4.7.
7. Frontend: tarjetas de insights en la pestaña Copiloto (reemplazan a las sugerencias
   estáticas como arrancadores de conversación con contexto).

**No incluye:**
- **pgvector/embeddings/RAG vectorial** (DEC-0001 §5.2): la recuperación es SQL
  (kind/tags/recencia). §4.6 define la evidencia que justificaría revisarlo.
- **Extracción de memoria vía LLM** (leer el chat con IA para "aprender"): diferida — en
  v1 la memoria nace SOLO de análisis determinista del Motor. Evita costo, alucinación y
  una nueva superficie de consentimiento.
- **Metas (`Goal`) formales**: pertenecen a un ciclo propio (o FIN-007); aquí solo se
  registra el vacío.
- Simulador/recomendaciones con impacto (FIN-007), gamificación (FIN-008), billing (FIN-009).
- Cambios al gate legal: siguen vigentes DPA/PIA para datos reales y bloqueo de producción.

## 4. Arquitectura propuesta

### 4.1 Modelo `Insight`
`id, userId, type (anomalia|riesgo|oportunidad|logro|cambio_tendencia), severity
(info|warning|critical), title, body` (generados por **plantilla determinista**),
`metricKey?, payload Json` (números de soporte: z-score, deltas), `status (new|seen|
dismissed), validUntil?, deliveredAt?, deliveredChannels String[], createdAt`.
- Índices: `(userId, status, createdAt)`.
- Retención: insights `dismissed`/vencidos se purgan a los 6 meses (job existente de
  retención del Motor).
- Idempotencia: clave natural `(userId, type, metricKey, mes)` vía índice único parcial —
  el generador puede re-correr sin duplicar.

### 4.2 Migración `anomaly.*` → `Insight` (DEC-0003 §10.5)
1. **Migración de datos** (script en la migración Prisma, SQL puro): por cada
   `MetricReading` con `metric_key LIKE 'anomaly.%'` se crea un `Insight`
   `{type: anomalia, severity: warning, metricKey, payload: {zScore: value,
   category: substring(metric_key)}, createdAt: captured_at}`. Idempotente
   (`ON CONFLICT DO NOTHING` sobre la clave natural).
2. **Corte de escritura**: `TrendsJob.computeAnomalies` deja de upsertear
   `anomaly.*` en `MetricReading` y crea `Insight` (misma condición de cold-start dual).
3. **Las filas históricas `anomaly.*` NO se borran** (historial inmutable de la serie);
   quedan huérfanas de nuevos escritores y salen naturalmente por la retención de la
   serie. El endpoint `/engine/metrics` deja de exponerlas (las expone `/insights`).

### 4.3 Generadores deterministas de insights (en el Motor)
Corren dentro del ciclo nightly existente (TrendsJob → generadores → §4.5 entrega):

| Generador | Dispara | Tipo/severidad |
|---|---|---|
| Anomalía de gasto | z-score ≥2 por categoría (ya existe, migra de destino) | anomalia/warning |
| Sobregiro del mes | cashflow del mes < 0 | riesgo/critical |
| DTI en zona roja | dti > 0.35 (cruce de umbral vs mes anterior) | riesgo/warning |
| Fondo de emergencia logrado | emergency_fund_months cruza ≥6 | logro/info |
| Deuda saldada | `DebtUpdated` (el payload actual no trae balance: el generador consulta la deuda y dispara si `currentBalance=0`/`status=pagada`) | logro/info |
| Score sube de banda | banda(mes) > banda(mes−1) | logro/info |
| Cambio de tendencia | signo de trend.cashflow/net_worth se invierte | cambio_tendencia/info |

Todos con cold-start heredado de FIN-003 donde aplique (tendencias/anomalías) y textos
por plantilla (cero IA, cero marcas — la restricción §14.2 de DEC-0005 aplica).

### 4.4 Memoria financiera estructurada (sin embeddings — DEC-0001 §5.2)
**Modelo `FinancialMemoryFact`:** `id, userId, kind (recurrencia|fecha_clave|habito|
cambio), content` (SIEMPRE generado por plantilla del Motor — **nunca texto libre del
usuario**, lo que lo hace seguro para el LLM), `tags String[], payload Json,
confidence Decimal, observedAt, lastConfirmedAt, staleAt?, createdAt, deletedAt`.
- **Detector de recurrencias** (job semanal, módulos Hábitos/Patrones de ARQ-0001):
  agrupa transacciones por (categoría global o "personalizada #N", banda de monto ±15%,
  día del mes ±3) sobre 3+ meses → hechos como *"gasto recurrente: Mercado, ~$800.000,
  cerca del día 15"* o *"ingreso recurrente quincenal ~$2.500.000"*.
- **Fechas clave**: derivadas de `paymentDay` de deudas y `dayOfMonth` de fijos.
- **Ciclo de vida**: un hecho no re-confirmado en 2 ciclos se marca `staleAt` y deja de
  usarse en contexto; purga a 12 meses de stale.
- **Recuperación:** SQL por `kind`/`tags`/recencia con tope (p. ej. 12 hechos más
  relevantes). Sin similitud semántica: el vocabulario es controlado (generado por
  nosotros), así que los tags son suficientes por diseño.

### 4.5 Proactividad anti-fatiga
- **ProactivityJob** (7 AM `America/Bogota`, patrón cron aprobado): toma `Insight` con
  `status=new`, `deliveredAt=null`, no vencidos; aplica reglas y entrega.
- **Reglas anti-fatiga** (mitiga el riesgo 5 de ARQ-0001):
  1. Tope: **máx. 1 notificación proactiva/día** por usuario (la de mayor severidad;
     el resto queda visible en la app sin push).
  2. `UserSettings.quietHours` respetado; canales según `notifPush/notifWhatsapp` +
     opt-in de Telegram existentes. Nuevo toggle `proactiveEnabled` (default `true`).
  3. Los `logro` no desplazan a un `critical`; empatan por severidad → más reciente.
- **Canales**: reutiliza `PushSender`/`WhatsAppSender`/`TelegramSender` (FIN-003/…).
  Mensajes por plantilla (sin IA → sin exigencias de consentimiento LLM; el
  consentimiento de §4.2 de FIN-005 solo gobierna el envío de datos a Anthropic).
- **Deep-link**: la notificación abre la pestaña Copiloto con el insight como arrancador.

### 4.6 Criterio de evidencia para revisar RAG (cierra el gate de DEC-0001 §5.2)
Se revisará pgvector/RAG **solo si** se documenta al menos uno de:
1. Usuarios con >200 hechos de memoria activos donde la recuperación por tags devuelva
   >30% de hechos irrelevantes para la pregunta (medido en evaluación manual periódica).
2. Necesidad real de buscar sobre texto libre (p. ej. historial de chat) — hoy excluido.
Sin esa evidencia, cualquier ARQ futuro que proponga embeddings debe citar este criterio.

### 4.7 Integración con el Copiloto (regla de GOBERNANZA de tools LLM)
- Nueva vista `MinimizedMemoryView` en el `ContextAssembler`: insights recientes
  (título/tipo/severidad/números de payload) + hechos de memoria (content templado +
  tags). **Seguro por construcción**: todo el texto es generado por plantillas del Motor;
  aún así, la vista entra al **test de regresión de PII** (pasa a cubrir 5 vistas) y el
  ejecutor de tools la valida con la misma marca runtime.
- Tool nueva de solo lectura: `get_memory_and_insights`.
- El contexto inicial incluye un resumen (top 3 insights activos + 5 hechos), acotado
  para no crecer el costo (~+300 bytes).

## 5. Componentes involucrados
**Nuevos (backend):** `insights/` (modelo+servicio+endpoints `GET /insights`,
`PATCH /insights/:id` seen/dismiss), generadores en `financial-engine/insights/*.ts`,
`memory/` (detector de recurrencias + `MemoryJob` semanal), `ProactivityJob`,
`MinimizedMemoryView` + tool en `copilot/`.
**Modificados:** `TrendsJob` (§4.2 corte de escritura), `ContextAssembler` (+1 vista),
`UserSettings` (+`proactiveEnabled`), pestaña Copiloto (tarjetas de insight).
**Reutiliza:** outbox/eventos, senders de notificación, patrón cron/TZ, retención.

## 6. Base de datos
- `Insight` y `FinancialMemoryFact` (nuevos) + enums; índice único parcial de
  idempotencia; `UserSettings.proactiveEnabled Boolean @default(true)`.
- Migración de datos `anomaly.*` (SQL en la misma migración, idempotente).
- **Sin pgvector.** Sin cambios en `MetricReading`.

## 7. Backend
NestJS, cero dependencias nuevas. Tests: migración de anomalías (SQL sobre datos
sembrados), cada generador (umbral/cruce/idempotencia), detector de recurrencias
(bandas de monto/día, 3+ meses, categorías anónimas), reglas anti-fatiga (tope diario,
quiet hours, prioridad por severidad), vista de memoria dentro del **test de PII de 5
vistas**, ciclo de vida stale.

## 8. Frontend
Pestaña Copiloto: sección "Novedades" (tarjetas de insight con icono por tipo, tap →
arrancador de conversación con el insight como tema; dismiss). Ajustes: toggle
"Avisos proactivos". Sin pantallas nuevas.

## 9. IA involucrada
**Ninguna llamada nueva al LLM.** Insights, memoria y notificaciones son 100%
deterministas (plantillas). El único contacto con IA es pasivo: la vista minimizada
nueva enriquece el contexto del Copiloto **bajo el mismo consentimiento y gates de
FIN-005** (sin API key/DPA sigue todo en modo plantillas).

## 10. Riesgos identificados
1. **Fatiga de notificaciones** → tope 1/día + quiet hours + toggle + severidad (§4.5).
2. **Falsos positivos de recurrencia** → 3+ meses de datos, confidence, ciclo stale.
3. **Doble fuente de anomalías durante la transición** → migración + corte de escritura
   en el mismo despliegue; test de la migración.
4. **Crecimiento del contexto LLM** → resumen acotado (top 3 + 5) y presupuesto de bytes.
5. **Privacidad** → memoria solo con texto templado (sin texto libre); vista cubierta por
   el test de PII (regla GOBERNANZA).

## 11. Dependencias
FIN-003 (motor/series/jobs) y FIN-005 (ContextAssembler/consentimiento) cerrados ✅.
Cero dependencias externas nuevas.

## 12. Impacto esperado
Millo pasa de reactivo a **proactivo**: avisa antes de que duela (sobregiro, DTI rojo),
celebra logros (retención/gamificación futura se apoyará aquí) y el Copiloto gana
contexto longitudinal ("tu gasto de Mercado suele ser ~$800.000; este mes va en $1.2M").

## 13. Criterios de aceptación
- Migración: filas `anomaly.*` existentes aparecen como `Insight` (conteo igual, payload
  con z-score/categoría); re-ejecutar no duplica; TrendsJob ya no escribe `anomaly.*`.
- Generadores: sembrar condiciones (cashflow<0, dti>0.35, fondo≥6m, deuda a 0, cambio de
  banda) produce el insight correcto una sola vez.
- Recurrencias: dataset sintético de 3 meses produce el hecho esperado con categoría
  anónima si es de usuario.
- Proactividad: con 3 insights nuevos, entrega SOLO el de mayor severidad, respeta quiet
  hours y `proactiveEnabled=false`, marca `deliveredAt/deliveredChannels`.
- Copiloto: contexto incluye memoria/insights; **test de PII en verde sobre las 5 vistas**.
- `GET /insights` + seen/dismiss funcionando; tarjetas visibles en la app.
- Typecheck + suite verde; bundle Android OK; **IMP-0006 con SHA** declarando el estado
  de las condiciones heredadas (DPA/PIA/producción, sin cambios).

## 14. Plan de implementación (tras DEC-0006)
1. Migración: modelos + enums + `proactiveEnabled` + migración de datos `anomaly.*`.
2. `insights/` (servicio + endpoints + idempotencia) + tests.
3. Generadores en el Motor + corte de escritura en TrendsJob + tests.
4. `memory/` (detector de recurrencias + MemoryJob + ciclo stale) + tests.
5. `ProactivityJob` (anti-fatiga + canales + deep-link) + tests.
6. `MinimizedMemoryView` + tool + **extensión del test de PII a 5 vistas**.
7. Frontend: tarjetas de insights + toggle proactivo.
8. E2E (sembrar → generar → entregar → ver en app) + bundle.
9. Commit + `IMP-0006-Memoria-y-Proactividad.md` con SHA + BACKLOG.

## 15. Estimación de complejidad
**Media-Alta.** Muchas piezas pero todas sobre patrones ya aprobados (cron/TZ, outbox,
plantillas, vistas minimizadas); el riesgo se concentra en la calidad de los detectores
(mitigado con tests por umbral y datasets sintéticos).

## 16. Cumplimiento de decisiones vinculantes (para AUD-0006)

| Mandato | Origen | Cómo lo cumple este ARQ |
|---|---|---|
| **Sin pgvector/RAG hasta evidencia** | DEC-0001 §5.2 | §3 (excluido), §4.4 (SQL+tags), **§4.6 (criterio de evidencia definido)** |
| **Plan de migración `anomaly.*` → `Insight`** | DEC-0003 §10.5 | **§4.2 completo** (datos + corte de escritura + destino de históricos) + test §13 |
| Revisar contenedor de series | DEC-0004 §8 | §4.1 (`Insight` como entidad propia; `MetricReading` vuelve a ser solo series numéricas) |
| Vistas minimizadas obligatorias para tools LLM | GOBERNANZA (DEC-0005 §10.2) | §4.7 (vista nueva + marca runtime + test de PII a 5 vistas) |
| Consentimiento/DPA/PIA y gates de producción | DEC-0005 §14 | §9 (sin IA nueva; el enriquecimiento de contexto hereda los gates de FIN-005) |
| Recomendación genérica (sin marcas) | DEC-0005 §14.2 | §4.3 (plantillas de insights bajo la misma restricción y test) |
| Cold-start dual | DEC-0003 §10.2 | §4.3 (generadores de tendencia/anomalía lo heredan) |
| Sin Redis/BullMQ; cero infra nueva | DEC-0002 §4.1 | §5/§11 |
| Zona horaria de jobs | DEC-0003 §10.3 | §4.5 (7 AM America/Bogota) |
| Fatiga de notificaciones | ARQ-0001 riesgo 5 (DEC-0001) | §4.5 (tope 1/día + quiet hours + toggle) |
| Referencia inmutable en IMP | GOBERNANZA | §13/§14.9 |

## 17. Pendientes declarados (no bloquean este DEC)
- DPA + PIA y revisión legal final: heredados de DEC-0005, sin cambios aquí.
- `Goal` (metas formales): vacío registrado; requerirá su propio ciclo.
- Ratificaciones menores: tope proactivo (1/día), retención de insights (6 meses),
  parámetros del detector (±15% monto, ±3 días, 3 meses), criterio de evidencia §4.6.

---
*Documento sujeto a gobernanza — ver [../GOBERNANZA.md](../GOBERNANZA.md). En espera de
AUD-0006 y DEC-0006. **No iniciar implementación de código.***
