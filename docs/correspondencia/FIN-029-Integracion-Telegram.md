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
