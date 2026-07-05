# ARQ-0005 · Copiloto Financiero (v2 — evolución de "Consejos")

- **Módulo/Feature:** FIN-005
- **Autor:** Agente de Arquitectura
- **Fecha:** 2026-07-05
- **Estado:** Propuesto — en espera de AUD-0005 y DEC-0005
- **Documentos base:** `ARQ-0001` · `DEC-0001` · `DEC-0003` · `DEC-0004` · `IMP-0004` (FIN-004 cerrado contra `c85117e`)
- **Producto:** Millo

> Autorizado por la validación del CTO que cierra FIN-004, **con condiciones de bloqueo
> explícitas para el DEC**: por DEC-0001 §10.6/§10.7, el DEC-0005 no se emitirá hasta que
> este ARQ especifique consentimiento/minimización hacia el LLM (lo hace en **§4.2–§4.4**,
> núcleo del documento) y hasta que exista **validación legal** del encuadre (acción
> externa del CTO — ver §17 "Bloqueos del DEC"). Trazabilidad en §16.

---

## 1. Objetivo
Evolucionar la pestaña "Consejos" hacia el **Copiloto Financiero**: un compañero que
**interpreta** el conocimiento ya calculado por el Motor (no calcula), explica, enseña
con los datos reales del usuario, responde preguntas y mantiene conversaciones — con
**consentimiento explícito**, **minimización auditable** de datos hacia el LLM y
estrategia agresiva de reducción de costo.

## 2. Problema que resuelve
Millo ya produce conocimiento (métricas, Score, indicadores, sugerencias por reglas) pero
la interacción es de una sola vía. El usuario no puede preguntar "¿por qué bajó mi
score?", "¿qué deuda pago primero?" o "explícame qué es DTI" y recibir una respuesta con
sus propios números. Además, DEC-0001 exige resolver el diseño de consentimiento y
minimización **antes** de cualquier integración con LLM — este ARQ lo resuelve.

## 3. Alcance

**Incluye:**
1. **Consentimiento explícito de IA** (opt-in versionado, revocable) — §4.2.
2. **Minimización auditable** (allowlist de campos + redacción de PII + log de
   interacciones) — §4.3–§4.4.
3. **Orquestador del Copiloto**: Context Assembler → Router (plantilla determinista
   primero, LLM solo si aporta) → LLM con tool-use de **solo lectura** al Motor — §4.5.
4. **Persistencia de conversaciones** (`Conversation`/`Message`) — §6.
5. **Modo sin IA**: sin consentimiento (o sin API key) el Copiloto opera 100% con
   plantillas deterministas — nunca se degrada a "no disponible".
6. **Límite de mensajes free/premium** (continúa la señal de monetización de FIN-004).
7. **Gate técnico de producción propio** (`COPILOT_PRODUCTION_ENABLED`, mismo patrón
   aprobado en DEC-0004 §10.3).
8. Frontend: pestaña **Copiloto** (chat + onboarding de consentimiento + toggle en Ajustes).

**No incluye:**
- **Memoria financiera persistente, proactividad y RAG/pgvector** → FIN-006 (rechazo
  DEC-0001 §5.2 sigue vigente; la memoria estructurada se evaluará allí).
- **Simulador conversacional y motor de recomendaciones con impacto** → FIN-007. Las
  tools del LLM en FIN-005 son **solo lectura** (ninguna acción de escritura).
- Billing real; embeddings; modelos de escalado automático (Haiku fijo en v1).
- Integración del Copiloto en WhatsApp/Telegram (el NLP por reglas actual se mantiene
  intacto; unificarlos es decisión futura).

## 4. Arquitectura propuesta

### 4.1 Visión del turno de conversación
```
Usuario escribe → CopilotService
  1) ConsentGuard: ¿aiConsentAt vigente? NO → responde SOLO con plantillas
  2) Router: ¿la intención tiene plantilla determinista? SÍ → responde sin LLM (costo 0)
  3) LLM (Anthropic claude-haiku-4-5):
       system (cacheado) + contexto mínimo (ContextAssembler) + historial acotado
       + tools de SOLO LECTURA → respuesta
  4) Persistencia: Message(s) + AiInteractionLog (auditoría §4.4)
```

### 4.2 Consentimiento explícito (mandato DEC-0001 §10.6 — parte 1)
- **Opt-in, nunca opt-out.** El Copiloto con IA está **apagado por defecto**.
- Pantalla de consentimiento (antes del primer uso con IA) que informa en lenguaje claro:
  qué datos se comparten (la lista de §4.3 mostrada al usuario), con quién (Anthropic,
  procesador), para qué (generar respuestas), qué NO se comparte, y que es revocable.
- Persistencia: `UserSettings.aiConsentAt (DateTime?)` + `aiConsentVersion (Int?)`.
  El texto del consentimiento es versionado (`AI_CONSENT_VERSION` en código); si la
  versión vigente > versión aceptada → se vuelve a pedir consentimiento.
- **Revocación** en Ajustes (un toque): pone `aiConsentAt = null`, conserva el registro
  histórico del consentimiento en `AiInteractionLog` (evento `consent_revoked`) y el
  Copiloto cae a modo plantillas.
- Endpoints: `POST /copilot/consent` (acepta, con versión) · `DELETE /copilot/consent`.

### 4.3 Minimización de datos (mandato DEC-0001 §10.6 — parte 2)
**Principio: allowlist, no blocklist.** El `ContextAssembler` es **el único módulo** que
puede construir contexto para el LLM, y solo puede emitir los campos de esta tabla:

| Grupo | Campos permitidos (exactos) | Justificación |
|---|---|---|
| Identidad | — ninguno — (userId nunca; se usa "el usuario") | innecesario para interpretar |
| Score | score, banda, versión, pilares (clave, valor 0–100, status), delta por pilar | núcleo del propósito |
| Métricas | las 7 core + tendencias (valores numéricos del mes) | núcleo del propósito |
| Deudas | nombre dado por el usuario, tipo, saldo, tasa+base, cuota, fecha fin proyectada | necesarios para explicar deuda |
| Presupuesto | ingresos fijos (total), gastos fijos (total y top 3 por nombre+monto), disponible | necesarios para explicar flujo |
| Patrimonio | totales (activos, líquidos, fondo emergencia, pasivos, neto) | necesarios |
| Transacciones | SOLO agregados por categoría del mes (nombre categoría + monto). Nunca movimientos individuales ni notas | las notas son texto libre del usuario (PII potencial) |

**Prohibido enviar (verificado por test):** email, teléfono, nombre completo,
`userId`/ids internos, tokens, `note`/`rawMessage` de transacciones, números/nombres de
cuenta bancaria, chatIds de Telegram, mensajes de WhatsApp. El spec del ContextAssembler
incluye un test que serializa el contexto y **asegura que ninguno de estos campos
aparece** (regresión automática de minimización).

### 4.4 Auditoría (hace la minimización *demostrable*)
- Tabla `AiInteractionLog`: `id, userId, conversationId?, direction (request|response),
  model, purpose (chat|explain_indicator), contextFieldGroups (string[] — grupos de §4.3
  efectivamente incluidos), inputTokens, outputTokens, costEstimate, createdAt`.
  **No almacena el texto enviado al LLM** (minimiza también el log); almacena qué grupos
  de campos se incluyeron, lo que permite auditar cumplimiento sin duplicar datos.
- Retención: 12 meses; job de purga (mismo patrón cron aprobado).
- Métrica agregada de costo/uso por usuario/día (soporta el límite free/premium).

### 4.5 Orquestación y reducción de costo
- **Plantilla primero:** el detalle de indicadores (FIN-004) ya es determinista; el
  Copiloto añade plantillas para: "por qué cambió mi score", "resumen del mes", "qué es
  X" (glosario). El LLM se usa solo para preguntas abiertas/seguimiento.
- **Proveedor/modelo:** Anthropic `claude-haiku-4-5` (aprobado en principio DEC-0001
  §4.4). Integración por **`fetch` directo a la Messages API** (cero dependencias nuevas,
  consistente con DEC-0002; el SDK oficial queda como alternativa si el CTO la prefiere —
  decisión explícita para el DEC).
- **Prompt caching** del system prompt (bloque estable con instrucciones + disclaimers).
- **Contexto compacto:** JSON estructurado ≤ ~1.5 KB (solo §4.3), historial acotado a los
  últimos N=10 mensajes.
- **Tool-use SOLO LECTURA:** `get_financial_snapshot`, `get_debts`, `get_score_breakdown`
  — resuelven en proceso contra los servicios existentes (Motor/Salud); ninguna tool
  escribe ni dispara acciones.
- **Límites:** free = 10 mensajes IA/día (plantillas ilimitadas); premium = 100/día.
  Al agotar: respuesta plantilla + CTA Millo+ (misma señal de monetización de FIN-004).
- **System prompt con encuadre:** instrucciones fijas de tono educativo, "no eres asesor
  financiero regulado", siempre anclar en los números del contexto, nunca inventar datos,
  responder en español.

### 4.6 Gate técnico de producción
`COPILOT_PRODUCTION_ENABLED` (default `false`) con guard 503 en producción — mismo patrón
ya aprobado y testeado en DEC-0004 §10.3. Independiente del flag de Salud (se activan por
separado tras validación legal).

## 5. Componentes involucrados
**Nuevos (backend, módulo `copilot/`):** `consent.service.ts`, `context-assembler.ts`
(+ spec de minimización), `templates.ts` (respuestas deterministas), `anthropic.client.ts`
(fetch + tool-use + prompt caching), `copilot.service.ts` (router/orquestador),
`copilot.controller.ts`, `copilot-production.guard.ts`, `ai-interaction.logger.ts`,
`copilot.module.ts`, job de purga del log.
**Modificados:** `UserSettings` (2 columnas), Ajustes y pestaña Consejos (frontend).
**Reutiliza:** `EngineService`/`HealthService` (lecturas), `suggestions` (las sugerencias
por reglas se muestran como tarjetas/arrancadores de conversación), guard-pattern DEC-0004.

## 6. Base de datos
- `Conversation`: `id, userId, title?, createdAt, updatedAt`.
- `Message`: `id, conversationId, role (user|assistant), content, source
  (template|llm), createdAt` (índice por conversación).
- `AiInteractionLog` (§4.4).
- `UserSettings.aiConsentAt DateTime?` + `aiConsentVersion Int?`.
- Migración additiva; sin pgvector (FIN-006 lo evaluará).

## 7. Backend
NestJS. `ANTHROPIC_API_KEY` en `.env` (vacía en dev → modo plantillas, mismo patrón
degradable de WhatsApp/Telegram). Sin API key o sin consentimiento el sistema es
completamente funcional en modo determinista. Tests: consentimiento (opt-in/re-versión/
revocación), **minimización (test de allowlist/prohibidos)**, router (plantilla vs LLM),
límites free/premium, guard de producción, cliente Anthropic (mock de fetch: request
bien formado, tool-use round-trip, manejo de error → fallback a plantilla).

## 8. Frontend
- Pestaña **Consejos → Copiloto** (💬): chat con historial, arrancadores ("¿Por qué está
  así mi Score?", "¿Qué deuda pago primero?", "Explícame mi mes"), tarjetas de
  sugerencias existentes arriba, indicador de "respuesta instantánea" (plantilla) vs "IA".
- **Onboarding de consentimiento** (modal antes del primer mensaje con IA) con la lista
  clara de datos compartidos y botón "Usar solo modo básico".
- Ajustes: toggle "Inteligencia artificial" (estado del consentimiento + revocar).
- Contador de mensajes restantes (free) + CTA Millo+.
- Disclaimer educativo persistente en el chat.

## 9. IA involucrada
**Sí — primera integración LLM del producto**, bajo las condiciones de §4.2–§4.6:
Anthropic `claude-haiku-4-5`, tool-use de solo lectura, prompt caching, contexto mínimo
allowlisted, consentimiento opt-in versionado, log auditable sin texto, límites por plan,
modo degradado sin IA siempre disponible. La IA **interpreta** datos del Motor; **nunca
calcula** cifras nuevas (instrucción de sistema + tools deterministas).

## 10. Riesgos identificados
1. **Alucinación de cifras** → mitigado: contexto con números exactos + tools + instrucción
   "nunca inventes datos"; las plantillas cubren lo crítico.
2. **Costo IA** → mitigado: router plantilla-primero, Haiku, caching, límites diarios,
   telemetría de costo por usuario en `AiInteractionLog`.
3. **Fuga de PII** → mitigado: allowlist + test de regresión + log auditable + un único
   punto de construcción de contexto.
4. **Percepción de privacidad** → mitigado: opt-in transparente con lista visible, modo
   básico digno, revocación de un toque.
5. **Riesgo regulatorio** → gate técnico propio + encuadre en system prompt + disclaimer;
   validación legal bloquea el DEC (§17).
6. **Dependencia de un proveedor** → cliente aislado tras interfaz; cambiar proveedor no
   toca el orquestador.

## 11. Dependencias
- FIN-003/FIN-004 cerrados (✅ `bbf9654`, `c85117e`). Motor y Salud son las fuentes del contexto.
- `ANTHROPIC_API_KEY` (secreto de entorno; sin costo hasta que se configure).
- **Cero dependencias npm nuevas** (fetch nativo), salvo que el DEC prefiera el SDK oficial.

## 12. Impacto esperado
Convierte a Millo de "app que muestra" a "compañero que conversa": el diferenciador
central de la visión (ARQ-0001 Capa 3). Habilita FIN-006 (memoria/proactividad) y FIN-007
(simulador conversacional) sobre una base de consentimiento y costo ya resuelta.

## 13. Criterios de aceptación
- Sin consentimiento: el Copiloto responde con plantillas y **ninguna llamada sale** al LLM
  (verificable en `AiInteractionLog` vacío).
- Consentimiento: opt-in versionado registrado; revocación de un toque; re-consentimiento
  al subir la versión.
- **Test de minimización en verde**: el contexto serializado no contiene ninguno de los
  campos prohibidos (§4.3).
- Pregunta estándar → plantilla (sin tokens); pregunta abierta (con consentimiento y API
  key) → respuesta LLM anclada en números reales, con log de grupos de campos y tokens.
- Límite free alcanzado → plantilla + CTA (y log del intento).
- `COPILOT_PRODUCTION_ENABLED=false` + `NODE_ENV=production` → 503.
- Conversaciones persistidas y recuperables; typecheck + suite verde; bundle Android OK;
  **IMP-0005 con SHA**.

## 14. Plan de implementación (tras DEC-0005)
1. Migración: `Conversation`, `Message`, `AiInteractionLog`, columnas de consentimiento.
2. `consent.service` + endpoints + tests (opt-in/versión/revocación).
3. `context-assembler` + **spec de minimización** (allowlist/prohibidos).
4. `templates.ts` (score-delta, resumen del mes, glosario) + router + tests.
5. `anthropic.client` (fetch, tool-use, caching, fallback) + tests con fetch mockeado.
6. `copilot.service/controller` + límites por plan + guard de producción + purga del log.
7. Frontend: chat, onboarding de consentimiento, toggle en Ajustes, contador/CTA.
8. E2E (modo plantillas sin key; modo IA con key si está disponible) + bundle.
9. Commit + `IMP-0005-Copiloto-Financiero.md` con SHA + BACKLOG.

## 15. Estimación de complejidad
**Alta.** Primera integración LLM (cliente, tool-use, fallbacks) + superficie de chat +
requisitos de privacidad con tests. Mitigada por: modo degradado como base, plantillas
reutilizando FIN-004, y patrones ya aprobados (guard, jobs, gates de plan).

## 16. Cumplimiento de decisiones vinculantes (para AUD-0005)

| Mandato | Origen | Cómo lo cumple este ARQ |
|---|---|---|
| **Consentimiento explícito + minimización auditable** (requisito de entrada del ARQ) | DEC-0001 §10.6 | §4.2 (opt-in versionado/revocable) · §4.3 (allowlist con test de regresión) · §4.4 (log auditable sin texto) |
| Validación legal bloquea el DEC | DEC-0001 §10.7 + cierre FIN-004 | §17 (bloqueo declarado; encuadre propuesto para revisión legal) |
| Anthropic Haiku aprobado en principio, condicionado | DEC-0001 §4.4 | §4.5/§9 (Haiku fijo, condiciones cumplidas en este ARQ) |
| Sin pgvector/RAG hasta evidencia | DEC-0001 §5.2 | §3 "No incluye" (memoria/RAG → FIN-006) |
| Señal de monetización | DEC-0001 §10.8 | §4.5 (límite de mensajes free/premium, reutiliza `plan` de FIN-004) |
| Cero infra nueva / sin Redis | DEC-0002 §4.1 | §7/§11 (fetch nativo, cron existente) |
| Contrato `metricKey` estable | DEC-0003 §4.2 | §4.3 (el contexto consume las claves sin modificarlas) |
| Gate técnico de producción (patrón) | DEC-0004 §10.3 | §4.6 (flag propio + guard 503) |
| Referencia inmutable en IMP | GOBERNANZA | §13/§14.9 |
| La IA interpreta, no calcula | ARQ-0001 (DEC-0001 §4.2) | §4.5/§9 (tools deterministas de solo lectura; instrucción de sistema) |

## 17. Bloqueos del DEC-0005 (declarados, no resueltos por este ARQ)
1. **Validación legal del encuadre regulatorio** (DEC-0001 §10.7): acción externa del CTO.
   Este ARQ aporta el material a revisar: disclaimers (§4.5/§8), encuadre "información/
   educación" en system prompt, gates técnicos (§4.6), consentimiento y minimización
   (§4.2–§4.4). **Sin esa validación, el DEC-0005 no debe emitirse.**
2. Ratificación de: proveedor sin SDK (fetch) vs SDK oficial; límites free/premium (10/100);
   retención del log (12 meses); versión inicial del texto de consentimiento.

---
*Documento sujeto a gobernanza — ver [../GOBERNANZA.md](../GOBERNANZA.md). En espera de
AUD-0005, validación legal y DEC-0005. **No iniciar implementación de código.***
