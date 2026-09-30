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

---

## 2026-07-14 — De: CTO — Para: CPSAO — CC: Fundador, Arquitecto, Auditor

**Asunto:** Convocatoria — revisión de alcance del bot (puerta de `DEC-0029`)
**Estado:** Convocatoria. `DEC-0029` (turno 3, último de la tanda) espera tu visto.

`IMP-0028` e `IMP-0027` cerrados. Falta `FIN-029`, y su `DEC-0029` tiene tu puerta
registrada: revisar **qué puede responder el bot** para que respete Independencia y
Claridad Radical (nada de recomendar productos por conveniencia, todo explicable). El
`ARQ-0029` (`c710e2d`) ya define el alcance conversacional (motor único agnóstico, tools
1:1 con dominio sobre vistas minimizadas, capa IA de respaldo tras reglas plantilla-primero,
gate DPA+PIA intacto). Cuando lo revises y des el visto (o ajustes), emito `DEC-0029`.

**MENSAJE PARA CPSAO** — se solicita tu revisión del alcance de respuestas del bot (`ARQ-0029`) para habilitar `DEC-0029`.

---

## 2026-07-14 — De: CPSAO — Para: CTO — CC: Fundador, Arquitecto, Auditor

Revisé el `ARQ-0029` (`c710e2d`), en particular P2 (tools) y P3 (confirmación). **Visto bueno de producto, con cuatro condiciones que deben quedar en el `DEC-0029` — no son opcionales, son la traducción de nuestros principios al canal conversacional.**

Lo que ya está bien y valido explícitamente:
- **Independencia respetada por construcción:** el set de tools (`registrar/editar/anular_movimiento`, `resumen`, `simular`) es puramente operativo — el bot actúa sobre los datos de la usuaria, no recomienda productos ni vende nada. Es exactamente el desacople que pedí. El "mismo cerebro, otro oído" del §31 es correcto: el bot es un oído de Milla, no un vendedor nuevo.
- **Cero escrituras alegres (P3):** confirmación antes de registrar/anular en baja confianza, sobre un estado que ya existe. Bien.

**Condiciones para el DEC:**

1. **El bot nunca cambia el estado financiero en silencio.** Toda acción que sí se ejecutó (incluido el camino de alta confianza del parser determinista, que hoy registra directo sin confirmar) debe cerrar con una respuesta que diga *qué* quedó registrado y *dónde*: "Listo, registré $45.000 en Comida — lo ves en tus movimientos". Claridad Radical no es solo confirmar antes; es que la usuaria nunca descubra un movimiento que ella no vio nacer. Sin acuse explícito, el canal de menor fricción se vuelve el de menor trazabilidad para ella.

2. **Honestidad sobre qué es y qué no puede hacer.** Con el gate DPA+PIA cerrado (modo plantillas), el bot no debe simular comprensión que no tiene: si no entendió, lo dice claro y ofrece el camino ("no te entendí; puedes decir 'gasté 20 mil en mercado' o abrir la app"), nunca una respuesta vaga que aparente inteligencia. Prohibido el falso "ya lo anoté" cuando no lo hizo.

3. **Si algún día una tool recomienda algo (deuda a atacar, mover plata, un producto), vuelve a mi puerta antes de exponerse.** El alcance actual no lo hace y por eso apruebo; dejo la barrera puesta para el futuro: cualquier tool que emita un consejo, no solo un dato, pasa por revisión de Independencia y Claridad Radical antes de entrar al canal. `simular` está en el borde — apruebo que muestre escenarios ("si abonas $X, terminas en tal fecha"), pero no que empuje una decisión ("deberías abonar $X"); esa línea la fija el DEC.

4. **El límite de mensajes IA se comunica sin castigar (paywall honesto).** El ARQ ya reusa el contador del Copiloto — bien; solo pido que el copy al agotarse siga el tono de Milla (informa el límite y el valor, no corta en seco ni presiona a pagar). Es el mismo criterio del Simulador.

Con estas cuatro en el DEC, doy el visto para `DEC-0029`.

MENSAJE PARA CTO

---

## 2026-07-14 — De: CPSAO — Para: CTO — CC: Fundador, Arquitecto, Auditor

**Visto bueno con 4 condiciones para el DEC:** (1) acuse explícito de todo movimiento
registrado, sin cambios de estado en silencio; (2) honestidad cuando no entiende, prohibido
el falso "ya lo anoté"; (3) barrera a futuro — cualquier tool que dé un consejo (no solo un
dato) vuelve a revisión de Independencia, con simular limitado a mostrar escenarios, no a
empujar decisiones; (4) paywall honesto al agotar la cuota de IA.

MENSAJE PARA CTO

---

## 2026-07-14 — De: CTO — Para: Arquitecto — CC: CPSAO, Auditor, Fundador

**Asunto:** DEC-0029 emitida — IMP-0029 habilitado (último de la tanda)
**Estado:** Decidida. `IMP-0029` autorizado (`IMP-0028` e `IMP-0027` cerrados).

Verifiqué contra código: el motor único (`ConversationService` agnóstico) y el **dedupe por
`update_id` YA existen** (`telegram.controller.ts:66-72`) — **pruébalos, no construyas un
segundo**. `DEC-0029` emitida con las 4 condiciones del CPSAO como cambios obligatorios:
**(1)** acuse explícito de todo movimiento, sin cambios de estado en silencio; **(2)**
honestidad al no entender, prohibido el falso "ya lo anoté"; **(3)** barrera de
Independencia — toda tool que dé un consejo (no un dato) vuelve al CPSAO; simular solo
muestra escenarios, no empuja; **(4)** paywall honesto al agotar la cuota de IA. Más: **(5)**
test PII/genericidad por tool (FIN-005); **(6)** gate DPA+PIA intacto (plantillas/dev, no
encender IA con datos reales en prod). Editar/anular conversacional disponibles (FIN-028
cerrado). Si tocas Registrar más allá de invocar el servicio central, detente y avísame.

**MENSAJE PARA ARQUITECTO** — emitir `IMP-0029` con los cambios obligatorios de `DEC-0029`; entregar con SHA para validación del CTO.

## 2026-07-14 — De: Arquitecto — Para: CTO — CC: Auditor, CPSAO, Fundador

**Estado**
`IMP-0029` entregado en rama de trabajo (§36.2) — commit `9bb83c0d802168421e472d2ae6750f56c0c01cc6`; `IMP-0029` v1.0 en `docs/implementaciones/`. Cierra la tanda 028→027→029.

**Conclusión**
Las 6 condiciones obligatorias honradas en la ruta VIVA (plantilla-primero, el gate DPA+PIA sigue cerrado por construcción — la conversación no tiene forma de llamar al LLM, grep limpio en `messaging/`): acuse explícito con el DÓNDE en cada movimiento; honestidad sin falsos "ya lo anoté"; `simular` muestra el escenario de abono (motor FIN-007, deuda de mayor tasa dicha explícitamente) sin empujar decisiones; paywall honesto al agotar la cuota. El dedupe por `update_id` YA existía — lo probé, no lo reconstruí (e2e). Dato que conviene que el CPSAO vea: el test de genericidad §5.5 cazó un defecto real — el propio texto de ayuda del bot nombraba "Bancolombia" como ejemplo, violando Independencia; corregido a "mi crédito". Suites: unit 355/355, e2e 43/43 (11 suites), tsc limpio, cero migraciones, cero claves.

**Tres reservas que declaro explícitas (IMP §4) — NO son gaps, son lo que el gate mantiene apagado (DEC §6):** (1) la capa de IA tool-use está diseñada pero no es runtime; hoy la interpretación es determinista; (2) el handshake `pendiente_confirmacion` (P3) no se implementó stateful — "cero escrituras alegres" se cumple porque las reglas piden el dato antes de registrar, pero la confirmación explícita en baja confianza espera al LLM (necesita estado conversacional inexistente hoy); (3) `editar` por texto libre es territorio del LLM — hoy solo `anular` está en reglas; el servicio central de FIN-028 ya lo soporta para cuando el LLM lo invoque.

**Acciones**
Queda en tus manos activar la validación del Auditor y, con su concepto, el cierre. Con esto se cierra la tanda de tres frentes de la Beta Técnica.

**Bloqueos**
Ninguno.

MENSAJE PARA CTO

---

---

## 2026-07-14 — De: CTO — Para: Fundador — CC: Arquitecto, Auditor, CPSAO, Ingeniero de Plataforma

**Asunto:** BT-003 cerrado + continuidad Beta institucionalizada (§41)
**Estado:** Acuse. Directriz vigente.

Recibido el cierre de BT-003 y la nueva directriz. Institucionalizada como `GOBERNANZA.md`
§41 (v3.18): toda FIN cerrada e integrada llega al dispositivo Beta vía OTA, por la vía
segura de §40 (gate + centinela); los usuarios de prueba usan siempre la última versión
aprobada salvo razón técnica justificada.

**Estado actual de la Beta:** el OTA vigente (`f166ac42`) ya lleva todo lo cerrado —
FIN-027, FIN-028, BT-001 y el fix BT-003. No queda nada aprobado sin desplegar. El próximo
OTA será al cerrar `IMP-0029` (Telegram), y saldrá por `npm run ota:publish`.

**MENSAJE PARA FUNDADOR** — directriz aplicada; la Beta está al día con todo lo aprobado.

---

## 2026-07-14 — De: CTO — Para: Fundador — CC: Arquitecto, Auditor, CPSAO

**Asunto:** FIN-029 CERRADA (validación técnica) — cierra la tanda de la Beta Técnica
**Estado:** Cerrada (eje técnico). IMP-0029 validado e integrado.

Validación independiente en checkout sobre `9bb83c0` — código y suites por el CTO. Las **6
condiciones obligatorias** de `DEC-0029`, cada una con test que pasa
(`conversation.service.spec.ts`): §5.1 acuse dice QUÉ y DÓNDE (crear + anular); §5.2 al no
entender lo dice y **nunca finge haber anotado**; §5.3 `simular` **muestra** el escenario sin
empujar; §5.4 **paywall honesto**; §5.5 **genericidad** (nunca nombra marcas); y el motor
**invoca el servicio central** de FIN-028 (no reimplementa). El **dedupe por `update_id`** se
probó, no se reconstruyó (`fin029-telegram.e2e-spec.ts`). **Gate DPA+PIA cerrado por
construcción:** grep limpio de LLM/Anthropic en `messaging/` — la conversación es
determinista (reglas), no hay forma de llamar al LLM en runtime.

**Suites por el CTO:** `tsc` 0, unit **355/355** (46 suites), e2e **43/43** (11 suites, incl.
`fin029-telegram`), cero migraciones, cero claves.

**3 reservas declaradas por el Arquitecto — aceptadas para iteración 1** (no son gaps, son lo
que el gate mantiene apagado, `DEC-0029` §6): (1) la capa de IA tool-use está diseñada pero
no es runtime; (2) el handshake `pendiente_confirmacion` en baja confianza espera al LLM; (3)
`editar` por texto libre es territorio del LLM — hoy solo `anular` está en reglas (el servicio
central de FIN-028 ya lo soporta). Todas dependen de abrir el gate DPA+PIA.

**Observación menor para el CPSAO (no bloqueante):** el texto del bot está limpio de marcas,
pero hay **ejemplos/placeholders de UI preexistentes** que nombran "Bancolombia"
(`AccountsScreen.tsx:158` placeholder, `LinkWhatsAppScreen.tsx:41` ejemplo) — fuera del
alcance de FIN-029; los dejo señalados para una revisión de Independencia futura.

**Despliegue (§41):** FIN-029 es **backend-only** → llega a Beta por el **auto-deploy de
Render** (verificado: `/v1/health` 200), no requiere OTA. La activación real del bot de
Telegram (webhook + token) es un paso de configuración operativa, cuando lo decidas.

Con esto **cierra la tanda de tres frentes de la Beta Técnica** (FIN-027, FIN-028, FIN-029) +
BT-001 + BT-003.

**MENSAJE PARA FUNDADOR** — FIN-029 cerrada; tanda de la Beta Técnica completa.
