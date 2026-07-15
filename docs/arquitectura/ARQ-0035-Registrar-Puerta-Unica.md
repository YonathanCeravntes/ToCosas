# ARQ-0035 · Registrar como puerta única del ecosistema (P2 del EOC)

- **Versión:** 1.0
- **Fecha:** 2026-07-15
- **Autor:** Agente Arquitecto
- **Estado:** Emitido — para AUD-0035 y validación del CTO (§36.2)
- **Historial de cambios:**
  - v1.0 (2026-07-15) — P2 del programa EOC (DEC-0033); primer frente que toca Registrar.
- **Módulo/Feature:** FIN-035 (P2 de DEC-0033) · **Origen (§27):** Visión del Fundador +
  observaciones de Registrar (instrucción permanente) · Prioridad MÁXIMA
- **Documentos base:** `DEC-0033` (umbrella EOC) · las 10 observaciones del Fundador + criterios
  del CPSAO/CTO (`docs/correspondencia/FIN-035-Registrar-Puerta-Unica.md`) · fundación
  `CIERRE-0032`, selector `CIERRE-0034`, espina `DEC-0031` · GOBERNANZA §32/§42 · DEC-0030 §5

## 0. Observación de frontera (SÍ toca Registrar — por composición, no reescritura)

FIN-035 es el frente autorizado sobre Registrar/Transacciones. **Se compone sobre el núcleo
existente, no lo reescribe:** `transactions.service.create` ya emite `TransactionCreated` por el
outbox (`:120-127`, verificado) y la cascada ya son listeners (FIN-002/EngineListener, FIN-031).
Lo que FIN-035 añade es la **puerta** (el flujo guiado de entrada) y el **enrutado por método de
pago**; el motor de dominio es el mismo. Si el IMP necesitara meter lógica financiera nueva en
`transactions.service`, me detengo y aviso.

## 1. Objetivo

Convertir Registrar en **la puerta única**: el usuario "registra algo que acaba de ocurrir" sin
pensar en módulos, en una decisión por pantalla, heredando el contexto para pedir lo mínimo, y con
la cascada §42 (visible/reversible) por construcción. Registrar es **otra puerta al MISMO motor**
—cero lógica de dominio propia (§32)— la misma que ya usa el bot (FIN-029) y usará el lenguaje
natural.

## 2. LA decisión central — el patrón de confirmación de la cascada

El CTO pide decidirlo explícitamente y **no asumir el de FIN-029**. Verifiqué el patrón REAL del
bot: `conversation.service.registerTransaction` **comete directo** (`this.transactions.create(...)`)
y devuelve un **acuse explícito** ("✅ Registré tu … Lo ves en tus movimientos") con **`deshacer`**
disponible (`undoLast`). No hay confirmación-antes-de-cometer. Es **commit + acuse + deshacer**,
no "propone → confirma".

**Decisión (nivel 1 — el hecho directo): Registrar sigue `commit + acuse explícito + deshacer`,
el MISMO patrón del bot.** Con el **modelo de dos niveles de DEC-0030 §5** encima:

| Nivel | Qué es | Patrón | Por qué |
|---|---|---|---|
| **1 · Hecho directo** | El usuario registra lo que ocurrió (un gasto, un pago, una compra a cuotas) | **Commit + acuse + deshacer** | Es lo que pasó; pedir "¿confirmas?" es fricción vacía. El acuse hace VISIBLE toda la cascada; `deshacer` la revierte (FIN-028). §42 cumplido sin un paso extra. |
| **2 · Modifica datos NO ingresados** | La acción cambiaría algo que el usuario no tecleó (refinanciación, cambio de plazo/condiciones, consolidación, sustitución de producto) | **Confirmar ANTES de cometer** | Aquí sí se toca lo que el usuario no afirmó; §42 exige su visto antes, no solo después. |

**Alternativa rechazada — wizard universal "confirmar antes de cometer".** Un paso de revisión
obligatorio en TODO registro convierte un gasto en efectivo (2 toques) en 3, rompe la obs. 7
(<1 min) y **diverge del bot** → dos patrones para el mismo hecho, violando la obs. 8 ("un solo
motor, otra puerta"). El acuse-post-commit + deshacer da la misma garantía §42 sin el peaje.

**Contrapeso §42 (no-negociable del CPSAO/CTO):** cada efecto de la cascada (gasto/obligación/
presupuesto/"Te queda"/Salud/Score/historial/Telegram) es **rastreable a la transacción origen**
(`sourceTransactionId`, ya existente) y **reversible desde ahí** (anular el origen revierte la
cascada por los mismos listeners — patrón FIN-028). El acuse **enumera lo que se movió**
("Registré tu compra: gasto $X, cuota comprometida $Y, te queda $Z"). Automatizar sí, a ciegas
nunca.

## 3. El flujo (una decisión por pantalla, heredando contexto)

### 3.1 · Puerta: "¿Qué quieres registrar?"

Una sola decisión (obs. 2): **ingreso · gasto · pago de deuda · transferencia · ahorro**. Cada
opción **construye el siguiente paso dinámicamente** (obs. 3/9) — cero campos que no aplican.

### 3.2 · La resolución de la tensión 2↔7 (guardarraíl H — "preguntar menos heredando más")

Una-decisión-por-pantalla gobierna la **carga cognitiva**, NO el número literal de pasos. La
velocidad viene de **heredar el contexto**, no de amontonar campos ni de maximizar pantallas:

- **Gasto en efectivo/cuenta:** monto + categoría → **listo en pocos toques**. Contextual (obs. 4):
  **nunca** pregunta cuotas.
- **Gasto con crédito:** "¿con cuál tarjeta?" (reusa el selector/entidades de FIN-034 y las
  tarjetas del usuario) → **solo los deltas que la tarjeta no sabe** (cuotas, con/sin interés) →
  es **exactamente la compra-con-tarjeta de FIN-031** (obs. 8, mismo motor; no se re-pregunta
  corte/cupo). 
- **Usuario recurrente:** la ruta de **lenguaje natural** (obs. 6) es la de <1 min — "compré un
  portátil por 3M a 24 cuotas con mi Visa" reusa el MISMO motor de FIN-035 (ver §5).

Wizard maximalista de seis pantallas = **rechazado** (rompe obs. 7).

### 3.3 · Sin doble digitación (obs. 5) = la cascada por composición

Una acción → una mutación (`transactions.create` [+ `CardPurchase` si es a cuotas], una tx de BD)
→ emite el evento con causalidad → **los listeners existentes reaccionan**: Motor (DTI/fondo/Score),
`SpendableService` ("Te queda"), saldo/cupo derivados (FIN-031), acuse por Telegram/Copiloto
(FIN-029). **Cero fórmula nueva, cero lógica de dominio en Registrar** (§32).

## 4. §32 estricto — Registrar es otra puerta al mismo motor (obs. 6, 8)

- **Cero lógica de dominio propia:** Registrar arma el flujo y llama a `transactions.service` /
  al path de tarjeta de FIN-031. Una transacción creada desde Registrar produce **exactamente el
  mismo resultado** que desde cualquier módulo o desde el bot (obs. 8) — porque es el mismo
  `create` + el mismo outbox.
- **Sin ramas por tipo en el flujo** (mismo criterio de FIN-032/034): el enrutado por método de
  pago y por tipo de movimiento se dirige por **configuración/descriptores**, no por
  `if (tipo === …)` en la pantalla. Grep de cierre.
- **"Flujo disponible" (obs. 5) = `SpendableService` ("Te queda")**, no un número nuevo. Si
  alguna vez pretendiera ser un indicador propio, pasa el gate del DSS antes de existir (fuente
  única + una decisión que "Te queda" no dé ya) — **fuera de FIN-035**.

## 5. Lenguaje natural preparado, no habilitado (obs. 6)

La ruta NL **ya existe** en el motor único (FIN-029 `ConversationService` → `transactions.create`).
FIN-035 garantiza que Registrar y NL comparten **el mismo motor y el mismo patrón** (commit +
acuse + deshacer): agregar NL no crea lógica separada. La **habilitación con IA sobre datos
reales sigue tras el gate DPA+PIA** (intacto); el diseño avanza, el LLM no se enciende.

## 6. Accesibilidad (obs. 10)

Una-decisión-por-pantalla favorece a mayores, baja educación financiera y dificultades visuales:
lenguaje humano ("compré algo", "me prestaron"), objetivos de toque grandes, sin jerga bancaria,
modo oscuro y tipografía adaptable (ya en el tema). Declarado como criterio, no solo la velocidad.

## 7. Respuesta al filtro §31

Sin FIN-035, Registrar sigue siendo un formulario y la compra-con-tarjeta (que la fundación ya
sabe modelar) se registra dos veces o desde el detalle de la deuda, no desde donde el usuario
piensa ("acabo de comprar algo"). **Valor diferencial:** una acción en la puerta principal mueve
todo el ecosistema, **visible y reversible**, en menos de un minuto, con el mismo motor que el
bot — el fin de la doble digitación. Ninguna FIN previa lo da: FIN-031 construyó la cascada de
tarjeta; FIN-035 la pone donde el usuario entra.

## 8. Componentes

Frontend: el flujo de Registrar (`AddTransactionScreen` → puerta guiada una-decisión-por-pantalla
dirigida por configuración) + el enrutado "¿cómo pagaste?" (efectivo/cuenta/débito/crédito/
billetera) que para crédito invoca el path de compra-con-tarjeta de FIN-031; el acuse que enumera
la cascada; el "deshacer" desde el acuse (reusa FIN-028). Backend: **composición** sobre
`transactions.service` + outbox existentes; el gate de nivel 2 (confirmar antes de cometer) donde
la acción modifique datos no ingresados. Tests: cascada §42 (acuse enumera + deshacer revierte),
coherencia (Registrar == bot == módulo), grep §32 (sin ramas por tipo; "flujo" = SpendableService),
contextual (efectivo no pregunta cuotas), dos niveles de confirmación, compat FIN-034.

## 9. Base de datos

**Sin esquema nuevo previsto.** `Transaction` (con `sourceTransactionId`/causalidad), `CardPurchase`
y el outbox ya existen. Si el nivel 2 (modificaciones no ingresadas) exigiera un campo, se declara
en el IMP con su migración a mano — pero el alcance de P2 es flujo + enrutado, no un modelo nuevo.

## 10. Backend

Cero fórmula financiera nueva (§32): `transactions.create`, el path de tarjeta (FIN-031), la
reversión (FIN-028), teQueda (FIN-020), el desembolso (FIN-023) y el acuse (FIN-029) ya existen.
FIN-035 los **orquesta desde la puerta**, no los reimplementa.

## 11. Uso de IA

Ninguno nuevo se enciende. La arquitectura queda lista para que NL reuse el motor; el gate
DPA+PIA gobierna la habilitación con datos reales (sigue cerrado).

## 12. Riesgos

- **La cascada corrompiendo ocho superficies en silencio** (el riesgo que el CPSAO subrayó):
  mitigado por el patrón elegido — acuse que enumera + `deshacer` que revierte por los listeners
  (FIN-028); test de §42 como cierre.
- **El wizard rompiendo la obs. 7:** mitigado por "preguntar menos heredando más" (efectivo 2
  toques; tarjeta solo deltas) — criterio de diseño, no matiz; test de conteo de pasos por ruta.
- **Registrar filtrando lógica de dominio** (viola §32/obs.8): mitigado por composición sobre
  `transactions.service`; grep de cierre sin ramas por tipo; test de coherencia Registrar==bot.
- **Alcance colándose ideas de la Beta** (tipos de tarjeta, seguros, retanqueo, cupo, Score):
  se registran como **candidatas aparte** (FIN-037), no entran en P2. Compat total con FIN-034.

## 13. Dependencias

FIN-002 (outbox), FIN-028 (reversión central), FIN-029 (acuse + motor NL), FIN-031 (compra-con-
tarjeta), FIN-020 (teQueda), FIN-032/034 (descriptores + selector/entidades). Ninguna nueva.

## 14. Impacto

Registrar pasa de formulario a puerta única del ecosistema, con la cascada visible/reversible y
el mismo motor para app, bot y (a futuro) NL. Cierra la doble digitación. Habilita P3/P4
(proactividad y profundidad) sobre una entrada coherente.

## 15. Criterios de aceptación

1. **Patrón de confirmación decidido y probado:** nivel 1 (hecho directo) = commit + acuse que
   **enumera** la cascada + **deshacer** que la revierte (e2e sobre gasto-con-crédito: efectos
   presentes → deshacer → todos revertidos, patrón FIN-028); nivel 2 (modifica datos no
   ingresados) = confirmar antes de cometer.
2. **Coherencia (obs. 8):** una transacción creada desde Registrar produce el mismo resultado que
   desde el bot / otro módulo (test).
3. **Tensión 2↔7:** efectivo se registra en pocos toques y **nunca** pregunta cuotas (obs. 4); la
   ruta de tarjeta solo pide los deltas (test de pasos por ruta).
4. **§32 (grep de cierre):** sin ramas por tipo en el flujo de Registrar; "flujo disponible" =
   `SpendableService`; cero lógica de dominio propia.
5. **NL preparado:** Registrar y el bot comparten motor y patrón (sin lógica separada); IA real
   tras el gate DPA+PIA.
6. **Compat FIN-034 + accesibilidad + cero deuda técnica + cobertura total**; sin ideas sueltas de
   la Beta (registradas aparte). Suites + typecheck + capturas del flujo. Filtro §31 (§7).

## 16. Plan

1. Validación CTO → **AUD-0035** (foco: el patrón de confirmación §2 + §42 de la cascada +
   resolución 2↔7 + §32) → **DEC-0035** → 2. flujo de puerta (una-decisión-por-pantalla dirigido
   por config) + enrutado "¿cómo pagaste?" (crédito → path FIN-031) → 3. acuse que enumera +
   deshacer desde el acuse + gate de nivel 2 → 4. tests (§42/cascada, coherencia, pasos por ruta,
   grep §32, dos niveles) + capturas → 5. **IMP-0035** con SHA y juicio razonado → validación del
   CTO → cierre.
