# AUD-0029 · Integración Telegram — Motor Conversacional único

- **Documento auditado:** `docs/arquitectura/ARQ-0029-Integracion-Telegram.md` v1.0 (commit `c710e2d`)
- **Insumos:** `docs/correspondencia/FIN-029-Integracion-Telegram.md` · `DEC-0005` v2 (gate DPA+PIA) · `PRODUCCION.md` §1 · `GOBERNANZA.md` v3.14 §31/§32/§36 · código verificado contra `HEAD`
- **Realiza:** Auditor de Milla
- **Fecha:** 2026-07-13

---

## 1. Resumen Ejecutivo

`ARQ-0029` formaliza el motor conversacional único (agnóstico de canal) que ya existe
embrionario, añade la interpretación IA como capa de respaldo bajo el gate DPA+PIA con
vistas minimizadas, y confirma acciones de baja confianza. La disciplina "formalizar, no
inventar" es correcta y verificada. **Un hallazgo de precisión importante: la pieza de
dedupe que el ARQ propone añadir YA EXISTE y está activa.** Sin hallazgos bloqueantes del
diseño.

## 2. Estado real verificado

- **Un solo motor, ambos adaptadores:** `ConversationService` es agnóstico
  (`ChannelSource = 'whatsapp' | 'telegram'`, `conversation.service.ts:12`) y
  `telegram.controller.ts:110` lo invoca (`this.conversation.handle({...})`). No hay dos
  motores que unificar — hay uno que formalizar. Confirmado.
- **Piezas de FIN-005 presentes:** `context-assembler.ts`, `anthropic.client.ts`.
  `TxStatus.pendiente_confirmacion` y `parseConfidence` **existen desde el día 1**
  (`schema.prisma:82,491`) — el flujo de confirmación (P3) se monta sobre lo que ya hay,
  no inventa estado. Correcto.

## 3. Hallazgo de precisión — el dedupe (P4/§7) YA EXISTE

El ARQ lista el dedupe de webhooks como algo que **falta** ("(a) … dedupe de webhooks";
P4: "**dedupe por `update_id`** … sin esto, movimientos dobles"; §7: "registro del último
`update_id` procesado … a fijar en AUD"). **Verificado: ya está implementado y activo.**
`telegram.controller.ts:66-72`:

```
const externalId = `tg:${msg.updateId}`;
const seen = await this.prisma.webhookEvent.findUnique({ where: { externalId } });
if (seen) continue;            // ← dedupe: salta updates ya vistos
await this.prisma.webhookEvent.create({ ... externalId ... });
```

La tabla `webhookEvent` (con `externalId` único) deduplica por `tg:${updateId}`; WhatsApp
usa el mismo patrón (`whatsapp.controller.ts:94`, por `providerMessageId`). **Consecuencia
para el `DEC`/`IMP`:** NO construir un segundo mecanismo (campo "último update_id" en el
link, tabla nueva) — sería redundante y podría conflictuar. El único gap real es el **test
e2e** del dedupe (criterio §13.3), no el mecanismo. P4/§7 deben reescribirse como
"verificar y testear el dedupe existente", no "añadirlo".

## 4. Diseño por pieza

- **P1 contrato adaptador↔motor (Alt A):** correcto — conserva lo auditado (parser,
  resumen, deshacer), WhatsApp queda alineado gratis (la prueba de canal-agnóstico es no
  tener que tocarlo). Alt B (motor nuevo) correctamente rechazada por el riesgo de dos
  motores en transición — lo que el Fundador prohibió.
- **P2 IA como intérprete de INTENCIÓN con tools minimizadas (Alt A):** correcto y es la
  clave del desacople Motor Financiero ↔ Conversacional: el LLM decide, el dominio ejecuta;
  las tools mapean 1:1 a servicios (`registrar/editar/anular_movimiento` = servicio central
  FIN-028; `simular` = FIN-007). Alt B (LLM redacta y el backend interpreta su texto) bien
  rechazada — sería segunda lógica financiera implícita. **Exige (regla permanente FIN-005):
  test de regresión PII por cada vista/tool y test de genericidad** — el ARQ lo incluye
  (§13.2); es requisito de aprobación, la Validación lo verificará.
- **P3 confirmación sobre `pendiente_confirmacion`:** correcto — baja confianza/IA →
  `pendiente_confirmacion` → "sí" confirma vía servicio central, "no" descarta; alta
  confianza (parser determinista) sigue directo, cero fricción nueva. Paridad con
  DEC-028-003 en la anulación.
- **P4 seguridad:** secret ya existe; dedupe ya existe (§3); solo vinculados (OTP
  existente); cuota IA = el MISMO contador del Copiloto (no multiplica cuota); gate DPA+PIA
  intacto (dev = plantillas, patrón FIN-005). El ARQ **diseña, no habilita claves reales**
  — correcto, el gate legal se respeta.

## 5. §32 y dependencia de FIN-028

- El motor conversacional invoca servicios existentes, cero fórmulas propias (§32). La
  coordinación con FIN-028 es consistente: **un** servicio central de movimientos, el motor
  lo invoca — verificado en ambos ARQ. Secuencia de IMPs 028→029 correcta (029 depende del
  servicio central).
- Recorte declarado honesto: si el `IMP` de FIN-028 se retrasa, la iteración 1 puede salir
  sin editar/anular conversacional (solo registrar+resumen+deshacer existentes) — no
  silencioso.

## 6. Filtro §31

Sustantiva — "Milla en el bolsillo sin abrir la app; mismo cerebro, otro oído". El registro
conversacional captura la vida financiera donde pasa (la caja, la calle) y es la puerta de
menor fricción al hábito que sostiene el producto. Cumple.

## 7. Observaciones (no bloqueantes)

1. **Dedupe ya existe (§3):** reescribir P4/§7 — verificar/testear, no construir. El `DEC`
   debe fijar que el `IMP` reusa `webhookEvent`, no un mecanismo nuevo.
2. **PII/genericidad (P2):** los tests de regresión PII por vista/tool y de genericidad son
   requisito permanente (FIN-005) — condición de aprobación del `IMP`, no opcional.
3. **Gate DPA+PIA:** el `IMP` debe demostrar por config que el pipeline completo funciona en
   dev con plantillas SIN claves reales (criterio §13.4).

## 8. Veredicto

**APROBADO CON OBSERVACIONES.**

Formaliza un motor único que ya existe (sin inventar un segundo), con IA de respaldo
correctamente desacoplada (intención con tools minimizadas, no lógica financiera) y el gate
legal intacto. El hallazgo con peso es que el **dedupe de `update_id` ya está implementado
y activo** (`webhookEvent.externalId`): el `IMP` debe verificarlo y testearlo, nunca
duplicarlo — P4/§7 deben reescribirse en ese sentido. Los tests de PII/genericidad por tool
son condición permanente de aprobación. Ninguna observación exige rehacer el diseño.
