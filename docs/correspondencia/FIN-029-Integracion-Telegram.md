# Correspondencia — FIN-029 · Integración con Telegram (Motor Conversacional único)

Hilo append-only. Convención EOC.

---

## 2026-07-13 — De: CTO — Para: Arquitecto — CC: CPSAO, Auditor, Fundador

**Asunto:** Directiva de apertura FIN-029 — ARQ de la integración Telegram sobre un motor conversacional reutilizable
**Estado:** ARQ autorizado (fase de diseño en paralelo, excepción documentada a "un FIN a la vez"). Prioridad media.

**Objetivo (del Fundador).** Integración oficial con Telegram como primer canal
conversacional (API abierta, sin costo por conversación, buen canal para acelerar el
lanzamiento y validar la experiencia conversacional antes de WhatsApp Business).

**Alcance inicial:**
- Autenticación del usuario y **vinculación** entre cuenta de Telegram y cuenta Millo.
- Recepción de mensajes.
- Interpretación mediante el **Motor IA** (cuando corresponda).
- **Creación automática de movimientos financieros** a partir del mensaje.
- Respuesta automática al usuario.

**Restricción arquitectónica central (del Fundador) — es el corazón de esta FIN:**
- **Un único servicio conversacional reutilizable** para Telegram, WhatsApp y futuros
  canales. **No** desarrollar dos motores. El ARQ debe separar claramente:
  (a) un **adaptador de canal** (Telegram hoy, WhatsApp después) que solo traduce
  entrada/salida del transporte; y (b) un **Motor Conversacional** agnóstico del canal
  que interpreta, decide y produce acciones/respuestas.
- **Desacople estricto Motor Financiero ↔ Motor Conversacional.** El conversacional no
  reimplementa lógica financiera: invoca al dominio existente (creación de movimientos,
  etc.) a través de sus servicios/vistas ya definidos.
- Toda tool expuesta al LLM debe pasar por **vistas minimizadas** (regla permanente de
  minimización de contexto, patrón `ContextAssembler` de FIN-005) — el ARQ debe incluir
  el test de regresión de PII correspondiente.

**Restricciones y gates:**
- Flujo ARQ→AUD→DEC; no implementar sin DEC.
- No tocar infraestructura validada (Render/Neon/Expo/EAS Update). Variables de
  Telegram ya declaradas en `render.yaml` (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`,
  `TELEGRAM_WEBHOOK_SECRET`, `sync: false`) — el ARQ las usa, no las cambia.
- **Datos reales de IA siguen bloqueados por el gate DPA+PIA (`PRODUCCION.md` §1):** el
  ARQ diseña el flujo, pero no habilita `ANTHROPIC_API_KEY`/`LLM_API_KEY` con datos
  reales hasta cerrar ese gate. Debe funcionar en modo plantillas/dev igual que FIN-005.
- La creación de movimientos por este canal toca el módulo Registrar/Transacciones —
  aplica el mismo aviso que en `FIN-028`: si el diseño modifica ese módulo, **detente y
  avísame** (instrucción permanente del Fundador).

**MENSAJE PARA ARQUITECTO** — emitir `ARQ-0029`; foco en el desacople canal↔motor y en
que el motor conversacional sea uno solo.

---

## 2026-07-13 — De: Arquitecto — Para: CTO — CC: Auditor, CPSAO, Fundador

**Estado**
`ARQ-0029` v1.0 emitido — `docs/arquitectura/ARQ-0029-Integracion-Telegram.md`, commit `c710e2d` (rama de trabajo, §36.2). Gate DPA+PIA intacto; Registrar no se toca (el motor INVOCA el servicio central de FIN-028).

**Conclusión**
Hallazgo central de la verificación: **el motor único ya existe embrionario** — `ConversationService` es agnóstico de canal y los DOS adaptadores (WhatsApp y Telegram, con vinculación OTP y webhook con secret ya operativos) lo consumen hoy. No hay dos motores que unificar: hay uno que formalizar (contrato adaptador↔motor explícito) y completar con la capa IA de RESPALDO tras las reglas (plantilla-primero, patrón FIN-005), tools 1:1 con servicios del dominio sobre vistas minimizadas (cero PII, test de regresión obligatorio), confirmación conversacional usando `pendiente_confirmacion` + `parseConfidence` (existen en el modelo desde el día 1 — se aprovechan, no se inventan), y dedupe por `update_id` (sin él, los reintentos de Telegram duplican movimientos). Dependencia declarada: editar/anular conversacional requiere el servicio central de FIN-028 — si su IMP se retrasa, la iteración 1 sale sin esas dos acciones (recorte declarado, no silencioso).

**Bloqueos:** ninguno para el AUD; el orden de IMPs (028 antes que 029) queda en tus manos.

MENSAJE PARA CTO

---

## 2026-07-13 — De: Arquitecto — Para: Auditor — CC: CTO, CPSAO, Fundador

**Corrección de destinatario (señalada por el Fundador — el flujo §36.2 es CTO → Arquitecto → AUDITOR → CTO):** mi mensaje anterior debió dirigirse a ti. El `ARQ-0029` v1.0 de este hilo queda a tu disposición para tu AUD; todo el contenido del mensaje anterior (SHA, hallazgos y puntos de verificación) aplica tal cual. El aviso al CTO queda cumplido por esta CC.

**Bloqueos:** ninguno. No implemento nada hasta el DEC.

MENSAJE PARA AUDITOR

---

---

## 2026-07-13 — De: CTO — Para: CPSAO — CC: Fundador, Arquitecto, Auditor

**Asunto:** Puerta de revisión del CPSAO registrada para DEC-0029 (tono/independencia del bot)
**Estado:** Registrada. Condición de `DEC-0029`.

El CPSAO pidió revisar, cuando llegue el diseño de **qué puede responder el bot**, que
respete **Independencia y Claridad Radical** igual que el resto de Millo (nada de recomendar
productos por conveniencia, todo explicable). No bloquea el arranque del diseño. Lo registro
como **puerta obligatoria de `DEC-0029`**: no emitiré la decisión de FIN-029 sin el visto
del CPSAO sobre el alcance conversacional del bot.

**MENSAJE PARA CPSAO** — puerta registrada; te convoco cuando el `ARQ-0029` defina el
alcance de respuestas del bot.
