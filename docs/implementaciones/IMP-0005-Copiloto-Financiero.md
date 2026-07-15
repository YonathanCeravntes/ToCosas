# IMP-0005 · Copiloto Financiero (evolución de "Consejos")

- **Módulo/Feature:** FIN-005
- **Documentos base:** `ARQ-0005-Copiloto-Financiero.md` (v2) · `AUD-0005-...-v2.md` · `DEC-0005-Copiloto-Financiero.md` (v2 + adenda legal)
- **Autor:** Agente Desarrollador
- **Fecha:** 2026-07-05
- **Referencia inmutable (regla GOBERNANZA):** commit **`919f7c2481b0e8971f49c32954b570f68da90f3b`** (rama `claude/finance-app-design-pr8qd5`)
- **Estado:** Entregado — a la espera de validación del CTO contra DEC-0005 (v2 + adenda)

---

## 1. Resumen de implementación
Primera integración LLM del producto, implementada bajo el marco aprobado: consentimiento
**opt-in versionado con los elementos de Ley 1581/2012**, `ContextAssembler` con **4
vistas minimizadas** como única vía hacia el LLM (tipos + validación runtime + test de PII
sembrada), plantillas deterministas como base funcional, cliente Anthropic resiliente y
chat móvil con onboarding de consentimiento. Opera en **modo plantillas** (sin
`ANTHROPIC_API_KEY`), cumpliendo el bloqueo de datos reales hasta DPA+PIA (§14.3).

## 2. Archivos modificados/creados
**Backend — nuevos** (`src/modules/copilot/`):
- `copilot.constants.ts` — versión+texto legal del consentimiento (§14.1), system prompt
  con restricción de genericidad (§14.2), límites 10/100, retenciones 12/24 meses,
  parámetros de resiliencia, lista de marcas prohibidas para el test.
- `minimized-views.ts` — vistas tipadas con marca `__minimized` + `assertMinimized` (runtime).
- `context-assembler.ts` (+ spec) — único constructor de contexto; "deuda #N (tipo)",
  "gasto fijo #N", "categoría personalizada #N"; allowlist de §4.3.
- `templates.ts` — router de intención + 6 plantillas deterministas (greeting, score_why,
  month_summary, debt_priority, glossary, help).
- `anthropic.client.ts` (+ spec) — fetch a Messages API, tool-use restringido a vistas,
  prompt caching, timeout 30s, 1 retry (red/5xx), 429 sin retry, circuit breaker 5/5min.
- `consent.service.ts` — opt-in/estado/revocación con log de auditoría.
- `copilot.service.ts` — orquestador (consentimiento → plantilla-primero → LLM →
  persistencia + `AiInteractionLog` sin texto); límites diarios por plan; borrado autónomo.
- `copilot.controller.ts` — endpoints + `CopilotProductionGuard` (503 en producción).
- `copilot-retention.job.ts` — purga conversaciones 24m + logs 12m (5 AM Bogotá).
- `copilot-policies.spec.ts` — tests de consentimiento legal, genericidad y router.
- `copilot.module.ts`.

**Backend — modificados:** `prisma/schema.prisma` (+`Conversation`, `Message`,
`AiInteractionLog`, `UserSettings.aiConsentAt/aiConsentVersion`, 3 enums), migración
`20260705030000_fin005_copilot`, `app.module.ts`, `.env.example`/`.env`
(`ANTHROPIC_API_KEY=""`, `COPILOT_PRODUCTION_ENABLED="false"` + advertencia DPA).

**Frontend:** `CopilotScreen.tsx` (chat con burbujas ⚡/🤖, arrancadores, banner de modo,
modal de consentimiento con el texto legal completo, contador de mensajes IA, disclaimer),
`SettingsScreen.tsx` (estado/revocación de IA + borrar historial), pestaña Consejos →
**Copiloto** (`MainTabs`), `api/types.ts`, `api/endpoints.ts`.

## 3. Funcionalidades implementadas
- Consentimiento: `GET/POST/DELETE /copilot/consent` (opt-in versionado; revocación
  inmediata; eventos en el log).
- Chat: `POST /copilot/messages` (plantilla-primero → LLM si hay consentimiento+key+cupo),
  `GET /copilot/conversations(/:id/messages)`, `DELETE /copilot/history` (borrado autónomo §4.7).
- Minimización: las 4 vistas del `ContextAssembler` son el único camino al LLM; el
  ejecutor de tools valida la marca en runtime y **bloquea** objetos crudos.
- Monetización: límite diario 10 (free) / 100 (premium) con CTA Millo+ y telemetría
  `premium_intent`.
- Gate de producción: 503 si `NODE_ENV=production` sin `COPILOT_PRODUCTION_ENABLED=true`.

## 4. Cumplimiento de cambios obligatorios
**DEC-0005 §10 (diseño, verificado en código):**
1. ✅ Tools por la misma vía minimizada — `assertMinimized` en el ejecutor + test que
   bloquea objetos crudos + spec de las 4 vistas.
2. ✅ Regla de GOBERNANZA "vistas minimizadas obligatorias" reflejada en
   `minimized-views.ts` (documentada para tools futuras).

**DEC-0005 §14 (adenda legal) — estado declarado como exige §15:**
1. ✅ **Texto de consentimiento reescrito** con: responsable (Millo), finalidad
   IA/Anthropic, transferencia internacional a EE.UU. sin nivel adecuado (criterio SIC),
   derechos ARCO, revocación, no-asesoría. **Test verifica los 8 elementos.**
2. ✅ **Recomendación genérica**: restricción explícita en el system prompt + test que
   verifica que ni plantillas ni consentimiento nombran ninguna marca de la lista.
3. ⏳ **DPA con Anthropic — PENDIENTE (acción externa del fundador).** Cumplido en
   código: `ANTHROPIC_API_KEY` vacía y advertencia en `.env.example`; el sistema opera
   100% en modo plantillas. **No activar la key con datos reales hasta el DPA.**
4. ⏳ **PIA — PENDIENTE (la produce el CTO).** No bloquea este desarrollo (modo
   plantillas); bloquea la activación de la API con datos reales.
- 🔒 **Producción**: `COPILOT_PRODUCTION_ENABLED=false` (bloqueada hasta revisión legal final).

## 5. Pruebas realizadas
- **Unitarias: 203/203 verdes** (25 suites; 32 nuevas):
  - **Minimización (DEC §10.1):** PII sembrada en TODOS los campos libres (nombres de
    deudas/cuentas/activos/categorías, notas, email, teléfono, userId) → ninguna aparece
    en ninguna de las 4 vistas; identificadores "deuda #1 (tipo)"/"gasto fijo #N"/
    "categoría personalizada #N"; marca runtime presente; `assertMinimized` bloquea crudos.
  - **Consentimiento (§14.1):** los 8 elementos legales presentes en el texto.
  - **Genericidad (§14.2):** system prompt con la restricción; 0 marcas en plantillas.
  - **Cliente (§4.8/§10.4):** request bien formada (prompt caching, 3 tools), tool
    round-trip, tool cruda bloqueada, retry 5xx, 429 sin retry, circuit breaker, isConfigured.
  - **Router:** 6 intenciones → plantilla; pregunta abierta → LLM.
- **Typecheck:** backend y frontend exit 0. **Bundle Android:** sin errores (6.48 MB).
- **End-to-end (API real, modo plantillas):** deudas creadas con PII deliberada en el
  nombre → respuesta usa "deuda #2 (tarjeta_credito)" sin PII y prioriza por tasa (32%);
  consent status con texto legal; pregunta abierta sin consentimiento → plantilla;
  grant/revoke ✓; **`ai_interaction_logs` contiene SOLO `consent_granted`/`consent_revoked`
  — cero entradas `chat`, prueba de que ningún dato salió hacia el LLM**; borrar historial ✓.

**Cómo reproducir la validación:**
```bash
git checkout 919f7c2481b0e8971f49c32954b570f68da90f3b
cd backend && npx tsc --noEmit && npx jest   # exit 0 · 203/203
cd ../frontend && npx tsc --noEmit           # exit 0
```

## 6. Incidencias encontradas
- Ninguna significativa. (Helper `recentHistory` omitido en el primer borrador del
  servicio; detectado por typecheck y corregido antes de commit.)

## 7. Limitaciones
- **Vía LLM no ejercitada contra la API real de Anthropic**: por diseño (§14.3, sin DPA
  no hay key). El cliente está cubierto por tests con fetch mockeado; la primera
  activación real requerirá una verificación funcional adicional (recomendada como parte
  del checklist de activación post-DPA).
- El mapeo "deuda #N"→deuda real se deriva del orden de creación (determinista); si se
  borrara una deuda a mitad de conversación, la numeración puede desplazarse en el turno
  siguiente (aceptable en v1; documentado).
- Título de conversación = primeros 60 caracteres del primer mensaje (sin resumen IA).
- WhatsApp/Telegram siguen con el NLP por reglas (fuera de alcance, §3).

## 8. Resultado final
**FIN-005 entregado y verificado** contra `919f7c2481b0e8971f49c32954b570f68da90f3b` en el
modo autorizado (plantillas/dev). El Copiloto conversa hoy con costo cero y sin exponer
ningún dato a terceros; la vía IA queda lista para activarse **solo** cuando el fundador
cierre el DPA (§14.3) y exista la PIA (§14.4), y producción cuando pase la revisión legal
final. Pendiente de validación del CTO.

---
*Informe de implementación — proceso de gobernanza `docs/GOBERNANZA.md`.*
