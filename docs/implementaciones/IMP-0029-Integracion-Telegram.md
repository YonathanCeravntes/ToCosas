# IMP-0029 · Integración Telegram — Motor Conversacional único (iteración 1)

- **Versión:** 1.0
- **Fecha:** 2026-07-14
- **Autor:** Agente Arquitecto/Desarrollador
- **Estado:** Entregado — en rama de trabajo, para VALIDACIÓN e integración del CTO (§36.2)
- **Historial de cambios:**
  - v1.0 (2026-07-14) — emisión tras DEC-0029 (las 6 condiciones obligatorias).
- **Módulo/Feature:** FIN-029 · **Origen (§27):** Instrucción del Fundador · Prioridad Media
- **Documentos base:** `ARQ-0029` v1.0 (`c710e2d`) · `AUD-0029` · `DEC-0029`
  (4 condiciones del CPSAO + PII + gate)
- **Referencia inmutable (regla GOBERNANZA):** commit
  **`9bb83c0d802168421e472d2ae6750f56c0c01cc6`**

## 1. Resumen

Cierra la tanda de tres frentes. El motor conversacional único ya existía
embrionario (`ConversationService` agnóstico); esta iteración lo **formaliza**
como el único cerebro (los adaptadores solo transportan), le aplica las cuatro
condiciones del CPSAO en la ruta VIVA (plantilla-primero) y le añade `simular`
como escenario. El gate DPA+PIA permanece intacto: la capa de IA queda diseñada
pero **no se enciende** — la conversación de hoy no toca el LLM (grep limpio).

## 2. Cumplimiento (DEC-0029 §5)

| Cond. | Implementación | Verificación |
|---|---|---|
| **§5.1 acuse explícito** | `SEEN_IN_APP` en cada acuse: registro y anulación cierran con "Lo ves en tus movimientos en la app"; nunca se cambia estado en silencio | unit: el acuse de gasto y el de anulación contienen el "dónde" |
| **§5.2 honestidad** | Fallback: "No te entendí. Puedes decir…"; test asegura que jamás aparece un falso `✅`/"registré"/"anoté" cuando no hubo acción | unit dedicado |
| **§5.3 simular escenario** | `consulta_simulacion` (rule parser, con disparador + verbo de abono para no confundir con un pago real); `simulate()` corre `abono_extra` del motor FIN-007 sobre la deuda de MAYOR tasa (dicho explícitamente), muestra meses/intereses ahorrados, y NUNCA usa "deberías"/imperativos; barrera de Independencia a futuro documentada en el propio código | unit: muestra el escenario, no registra, sin "deberías"; parser distingue "pagué…" (registro) de "¿qué pasa si abono…?" |
| **§5.4 paywall honesto** | `ForbiddenException` (cuota FIN-009) → copy con tono Millo ("…con Millo+ son ilimitadas — sin apuro"), no error ni corte seco | unit: contiene "millo+", no "error/500/forbidden" |
| **§5.5 PII/genericidad** | Test de `FORBIDDEN_BRAND_TERMS` sobre las respuestas del bot — **encontró un defecto real**: el texto de ayuda nombraba "Bancolombia" como ejemplo; corregido a "mi crédito" | unit de genericidad |
| **§6 gate DPA+PIA** | La conversación no importa `AnthropicClient` ni lee `ANTHROPIC_API_KEY`/`LLM_API_KEY` (grep en `messaging/` = 0); la ruta viva es 100% reglas/plantillas | grep + revisión de imports |
| **P4 dedupe** | El dedupe por `update_id` existente (`telegram.controller`) se PROBÓ, no se reconstruyó; `anular` añadido como alias de `deshacer` | e2e: update duplicado ⇒ un solo `webhook_event`, `status='processed'` |
| **Editar/anular (FIN-028)** | `undoLast` ya reencaminado al servicio central en IMP-0028; la anulación conversacional emite evento y el Motor recalcula | Cubierto por FIN-028 + el acuse §5.1 |

## 3. Suites y evidencia

- Unitaria **355/355** (+11: parser 4, conversation 7). E2E **43/43** en 11
  suites (+3 del webhook con dedupe). `tsc` limpio. Sin migraciones, sin claves.
- No hay capturas de UI: FIN-029 es backend puro (la vinculación de Telegram
  vive en Ajustes desde una FIN previa; no se tocó). La evidencia es el e2e del
  webhook y los tests de comportamiento del motor.

## 4. Juicio razonado

**¿Es Milla la misma por Telegram, con sus principios intactos? Sí:** el bot
actúa solo sobre los datos de la usuaria (registrar/anular/resumen/simular),
acusa todo lo que hace y dónde verlo, es honesto cuando no entiende, y su única
capacidad de "consejo" —`simular`— se limita a mostrar el escenario sin
empujar. El test de genericidad cazó lo más valioso: el propio texto de ayuda
violaba Independencia nombrando un banco. Y el gate legal sigue cerrado por
construcción, no por promesa: la conversación no tiene forma de llamar al LLM.

**Reservas honestas (declaradas):** (1) la **capa de IA de tool-use no es
runtime** — está diseñada en el ARQ pero su activación depende del gate DPA+PIA
(DEC §6); hoy la interpretación es determinista (reglas), así que mensajes
fuera de los patrones caen en el fallback honesto, no en comprensión profunda;
(2) el **flujo de confirmación `pendiente_confirmacion`** (P3 del ARQ) no se
implementó como handshake stateful: la ruta de reglas no registra cuando falta
monto/tipo (pide el dato antes), así que "cero escrituras alegres" se cumple
por otra vía, pero la confirmación explícita en baja confianza queda para
cuando entre el LLM (necesita estado conversacional que hoy no existe); (3)
**`editar` conversacional** por texto libre ("cambia el mercado de 180 a 165")
es territorio del LLM — hoy solo `anular` (deshacer) está en la ruta de reglas;
el servicio central de FIN-028 ya lo soporta para cuando el LLM lo invoque.

Estas tres reservas NO son gaps del alcance: son exactamente lo que el gate
DPA+PIA mantiene apagado (DEC §6). Lo runtime de esta iteración honra las 6
condiciones obligatorias.

## 5. Para la validación

- Reproducir: `npx jest` (355) · `npm run test:e2e` (43, docker) · `npx tsc
  --noEmit` · grep de IA en `messaging/` (0).
- Entregado en rama de trabajo (§36.2): el CTO valida (testing §36.3) e
  integra. Cierra la tanda 028→027→029.
