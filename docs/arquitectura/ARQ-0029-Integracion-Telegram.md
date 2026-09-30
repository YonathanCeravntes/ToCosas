# ARQ-0029 · Integración Telegram — Motor Conversacional único

- **Versión:** 1.0
- **Fecha:** 2026-07-13
- **Autor:** Agente Arquitecto
- **Estado:** Emitido — para validación del CTO y pase a AUD-0029 (flujo §36.2)
- **Historial de cambios:**
  - v1.0 (2026-07-13) — emisión por directiva del CTO (hilo FIN-029).
- **Módulo/Feature:** FIN-029 · **Origen (§27):** Instrucción del Fundador ·
  Prioridad Media
- **Documentos base:** `docs/correspondencia/FIN-029-Integracion-Telegram.md` ·
  DEC-0005 v2 + adenda legal (gate DPA+PIA) · `PRODUCCION.md` §1 ·
  GOBERNANZA v3.14 §31/§32/§36

## 0. Intención

Que hablarle a Milla por Telegram sea hablarle a LA MISMA Milla — un solo motor
conversacional que hoy escucha por Telegram, mañana por WhatsApp, y que nunca
reimplementa lo que el dominio ya sabe hacer.

## 1. Objetivo

Formalizar y completar el motor conversacional único: adaptador de canal
(transporte puro) ↔ Motor Conversacional (agnóstico) ↔ dominio (servicios
existentes), añadiendo la interpretación IA como CAPA DE RESPALDO tras las
reglas, bajo el gate DPA+PIA y con vistas minimizadas.

## 2. Estado real (verificado — la restricción central YA se cumple a medias)

- **El motor único existe embrionario:** `ConversationService`
  (`messaging/conversation.service.ts`) es agnóstico de canal
  (`ChannelSource = 'whatsapp' | 'telegram'`) y AMBOS adaptadores lo consumen
  (`whatsapp/message-processor` y `telegram.controller.ts:28,115`). No hay dos
  motores que unificar — hay UNO que formalizar y completar.
- **La vinculación Telegram existe** (FIN de mensajería previa: `telegram-link`
  con OTP/deep link, `TelegramSender`, webhook con secret). Las variables están
  en `render.yaml` (`sync:false`) — no se tocan (§36.4).
- **Lo que falta:** (a) interpretación IA cuando el parser de reglas no
  entiende (hoy: respuesta genérica de ayuda); (b) edición/anulación
  conversacional (hoy solo `undoLast`, que además escribe por fuera del
  servicio central — lo corrige FIN-028); (c) contrato formal adaptador↔motor
  (hoy el acople es informal); (d) confirmación conversacional para acciones
  de baja confianza.
- **Piezas listas desde el día 1 que este ARQ APROVECHA en vez de inventar:**
  `TxStatus.pendiente_confirmacion` y `parseConfidence` existen en el modelo;
  el pipeline plantilla-primero, `ContextAssembler` (vistas minimizadas),
  `AnthropicClient`, el test de genericidad y el presupuesto de mensajes IA son
  de FIN-005.

## 3. Alcance

Backend: contrato adaptador↔motor + capa IA de respaldo + confirmación
conversacional + dedupe de webhooks. **Fuera (declarado):** WhatsApp Business
(el adaptador ya existe y NO se toca — la prueba de canal-agnóstico es que no
haya que tocarlo), habilitar IA con datos reales (gate DPA+PIA intacto:
`PRODUCCION.md` §1 — todo funciona en modo plantillas/dev como FIN-005),
cambios al módulo Registrar/Transacciones (el motor INVOCA el servicio central
de FIN-028; si el diseño de detalle exigiera modificarlo, me detengo y aviso —
instrucción permanente), infraestructura (§36.4).

## 4. Diseño — alternativas por pieza

### P1 — El contrato adaptador ↔ motor

| | **Alt A — Formalizar `ConversationService` como EL motor (recomendada)** | **Alt B — Motor nuevo "bien diseñado" desde cero** |
|---|---|---|
| Qué es | Contrato explícito: el adaptador solo (1) verifica el transporte (webhook secret, dedupe por `update_id`), (2) resuelve `chatId→userId` vinculado, (3) entrega `{ userId, text, source, messageId }` y (4) envía la respuesta de vuelta. TODO lo demás (intención, parseo, acciones, respuesta) es del motor | Reescribir la conversación en un módulo nuevo |
| Ventajas | Conserva lo auditado (parser de reglas, resumen, deshacer); WhatsApp queda alineado gratis (ya consume el mismo servicio); riesgo mínimo | "Limpio" en el papel |
| Desventajas | El motor actual necesita orden interno (pipeline explícito) | Tira un motor que funciona y crea el RIESGO de dos motores durante la transición — exactamente lo que el Fundador prohibió |

### P2 — Pipeline del motor (plantilla-primero, IA de respaldo)

```
texto → 1. reglas/parser existente (costo 0: registrar, resumen, deshacer, ayuda)
      → 2. si no resuelve Y el gate lo permite: intérprete IA (tool-use)
      → 3. si no: plantilla de ayuda honesta (comportamiento actual)
```

| | **Alt A — IA como intérprete de INTENCIÓN con tools (recomendada)** | **Alt B — IA generando la respuesta libre** |
|---|---|---|
| Qué es | El LLM recibe la vista MINIMIZADA (patrón `ContextAssembler`: categorías por ref, deudas por ref — cero PII) y un set de tools que mapean 1:1 a servicios del dominio: `registrar_movimiento` (servicio central FIN-028), `editar_movimiento`/`anular_movimiento` (ídem), `resumen` (existente), `simular` (FIN-007). El LLM DECIDE, el dominio EJECUTA | El LLM redacta y el backend "interpreta" su texto |
| Ventajas | Desacople estricto Motor Financiero ↔ Conversacional (restricción del Fundador): cero lógica financiera en el motor conversacional; auditable tool por tool; test de regresión PII por vista (regla permanente) | — |
| Desventajas | Set de tools a mantener | Parsear texto de LLM = segunda lógica financiera implícita — prohibido |

### P3 — Confianza y confirmación (cero escrituras alegres)

Toda creación/edición vía IA (o parser con `parseConfidence` baja) entra como
`pendiente_confirmacion` (el estado EXISTE desde el día 1) y el motor responde
"¿Registro gasto de $45.000 en Comida? (sí/no)"; el "sí" confirma (pasa a
`confirmada` vía el servicio central), el "no" descarta (`descartada`). La
anulación conversacional SIEMPRE confirma antes (paridad con DEC-028-003). Las
reglas de alta confianza (parser determinista, comportamiento actual) siguen
registrando directo — cero fricción nueva donde hoy no la hay.

### P4 — Seguridad y límites del canal

- Webhook: verificación del secret (existe) + **dedupe por `update_id`**
  (tabla/campo de último update procesado — Telegram reintenta; sin esto,
  movimientos dobles).
- Solo cuentas VINCULADAS (flujo OTP existente); mensajes de no-vinculados
  reciben el deep link de vinculación y nada más.
- Presupuesto de mensajes IA: el MISMO contador del Copiloto (FIN-005/009) —
  el canal no multiplica la cuota; declarado en la respuesta cuando se agota
  (paywall honesto, patrón del Simulador).
- Gate DPA+PIA: la capa 2 del pipeline se activa por el flag de producción
  existente; en dev, tools con el cliente de plantillas (patrón FIN-005). El
  ARQ diseña; NO habilita claves con datos reales.

## 5. Respuesta al filtro §31

Sin este canal, Milla solo existe cuando la usuaria abre la app — y el momento
real de un gasto es la caja, la calle, el "ya se me olvidó". El registro
conversacional es la única forma de capturar la vida financiera DONDE pasa, y
es la puerta de entrada de menor fricción al hábito que sostiene todo el
producto. Valor diferencial: **Milla en el bolsillo sin abrir la app — mismo
cerebro, otro oído.**

## 6. Componentes
Backend: contrato adaptador↔motor (refactor de orden, sin módulo nuevo), capa
IA (tools + vistas minimizadas + tests de PII/genericidad), flujo de
confirmación sobre `pendiente_confirmacion`, dedupe de updates, tests (unit del
pipeline con IA mockeada; e2e del webhook con dedupe y confirmación). Frontend:
ninguno (Ajustes ya tiene la vinculación).

## 7. Base de datos
Solo el registro del último `update_id` procesado (campo en el link de Telegram
o tabla mínima — a fijar en AUD). Sin cambios a Transaction.

## 8. Backend
El motor conversacional invoca servicios existentes; cero fórmulas propias
(§32). Depende del servicio central de FIN-028 para editar/anular — secuencia
de IMPs: **FIN-028 antes que FIN-029** (el CTO ya la fija por prioridad).

## 9. Uso de IA
Sí — intérprete de intención con tools minimizadas, SOLO tras el gate DPA+PIA
(`PRODUCCION.md` §1); en dev/plantillas como FIN-005. Cero datos reales antes.

## 10. Riesgos
- LLM registrando de más → mitigado por P3 (confirmación en baja confianza) y
  por tools que solo aceptan refs de la vista minimizada.
- Reintentos de Telegram → dedupe P4 (e2e obligatorio).
- Dependencia de FIN-028: si su IMP se retrasa, la iteración 1 de este canal
  puede salir SIN editar/anular (solo registrar+resumen+deshacer existentes) —
  recorte declarado, no silencioso.
- Doble motor accidental durante el IMP → criterio de grep: WhatsApp y Telegram
  sin lógica de interpretación propia (solo transporte).

## 11. Dependencias
FIN-028 (servicio central), FIN-005 (ContextAssembler/cliente/gate), FIN-007
(simulaciones), vinculación Telegram existente. Ninguna de infraestructura.

## 12. Impacto
Primer canal conversacional completo sobre UN motor; WhatsApp queda a un
adaptador de distancia (que ya existe); el gate legal intacto.

## 13. Criterios de aceptación
1. Grep del desacople: los adaptadores (whatsapp/telegram) sin lógica de
   interpretación ni de dominio — solo transporte; el motor sin fórmulas
   financieras (invoca servicios).
2. Test de regresión PII de cada vista/tool expuesta al LLM (regla permanente
   FIN-005) + test de genericidad.
3. e2e: webhook duplicado (mismo `update_id`) ⇒ UN solo movimiento; mensaje de
   baja confianza ⇒ `pendiente_confirmacion` + confirmación "sí" lo confirma
   por el servicio central.
4. Modo dev sin claves: pipeline completo funcional con plantillas (gate
   intacto, verificado por config).
5. Suites + typecheck + build (§36.3); evidencia con bot real de dev si el CTO
   lo autoriza, o e2e de webhook simulado.
6. Filtro §31 (§5).

## 14. Plan
1. Validación CTO → AUD-0029 → DEC-0029 → 2. (tras IMP-0028) contrato + dedupe
→ 3. capa IA + confirmación → 4. tests/evidencia → 5. IMP-0029 → validación →
cierre.
