# ARQ-0031 · Fase 1 — La espina + compra con tarjeta de crédito de punta a punta

- **Versión:** 1.0
- **Fecha:** 2026-07-14
- **Autor:** Agente Arquitecto
- **Estado:** Emitido — para validación del CTO y pase a AUD-0031 (§36.2)
- **Historial de cambios:**
  - v1.0 (2026-07-14) — primera FIN derivada de FIN-030 (umbrella).
- **Módulo/Feature:** FIN-031 (Fase 1 del umbrella FIN-030) · **Origen (§27):**
  Directriz de producto del Fundador · Prioridad MÁXIMA
- **Documentos base:** `ARQ-0030` umbrella (`2a18a76`) · `AUD-0030` · `DEC-0030`
  (§3 cambios obligatorios) · guardarraíles A–K · GOBERNANZA §31/§32/§42

## 0. Observación de frontera (Registrar/Transacciones)

Fase 1 EXTIENDE Registrar por composición: el alta de transacción ya emite
`TransactionCreated` por outbox (`transactions.service.ts:120-123`, verificado
por el CTO); la cascada son listeners de ese evento, no una reescritura del
núcleo. El único cambio de ENTRADA autorizado por el Fundador es el flujo "¿cómo
pagaste?". Si el IMP necesitara tocar el núcleo de Registrar más allá de esto, me
detengo y aviso.

## 1. Objetivo

Establecer la espina del SO Financiero con UN caso de punta a punta —**compra con
tarjeta de crédito**— que ejercita los guardarraíles G/H/I/J juntos:
1. La tarjeta de crédito como PRODUCTO con cupo (primer `ProductType` con esquema).
2. El flujo "¿cómo pagaste? → crédito → tarjeta X → cuotas".
3. La compra emite un evento con causalidad → listeners mueven saldo/cupo, generan
   cuotas, despiertan el Motor — cada efecto TRAZABLE y REVERSIBLE (§42).
4. **La política de reversión con dependientes** (condición de cierre, DEC-0030 §3.1).

## 2. Problema (verificado contra código)

- `tarjeta_credito` es hoy un `DebtType` sin cupo: no existe "cupo disponible" ni
  "saldo utilizado" como concepto — la usuaria no ve cuánto le queda de la tarjeta.
- Una compra a cuotas con tarjeta hoy se registra DOS veces: el gasto Y (si acaso)
  una deuda manual — el duplicado que el guardarraíl I prohíbe.
- El alta de transacción ya emite `TransactionCreated` por outbox, pero **nadie
  escucha para encadenar consecuencias de producto** (el `EngineListener` recomputa
  métricas, no mueve cupo/saldo).

## 3. Alcance

**Dentro:** extensión de la tarjeta de crédito con cupo; el método de pago
"crédito" en el flujo de registro; el evento de compra con causalidad + sus
listeners (cupo/saldo/cuotas); la trazabilidad y la **política de reversión**;
los servicios hoja de cupo/saldo/cuotas (§32). **Fuera (declarado):** los otros
≥11 tipos (FIN-032); la confirmación mensual (FIN-033); **"flujo de caja"**
(no pasa el gate del DSS en Fase 1 — §4.6); débito/billetera/efectivo como flujos
propios (solo se estructura el punto de extensión, no se implementan sus cascadas).

## 4. Diseño

### 4.1 · La tarjeta de crédito como producto con cupo (I, J)

`Debt` de tipo `tarjeta_credito` gana `creditLimit` (cupo total). **`usedAmount`
(saldo utilizado) y `availableCredit` (cupo disponible) NO se almacenan: se
DERIVAN** en un servicio hoja `CardService` (§32, patrón `DebtOutlayService`):
- `usedAmount = Σ saldo pendiente de las compras vivas de la tarjeta`
- `availableCredit = creditLimit − usedAmount`

Alternativa rechazada: guardar `usedAmount` como columna (se desincroniza — el
bug §32 renace; derivar es la única fuente).

### 4.2 · Modelo de la compra a cuotas (I)

Nuevo `CardPurchase` ligado a la tarjeta (`debtId`): monto, fecha, N cuotas
(1 = sin diferir), con/sin interés, y su mini-plan de cuotas (`CardInstallment`:
periodo, monto, `paidAt`). El saldo pendiente de la compra = Σ cuotas no pagadas.
La compra ACTUALIZA la tarjeta existente (no crea una 2ª deuda — guardarraíl I).
Reusa la amortización de FIN-012 para el caso con interés (misma función pura,
cero fórmula nueva — §32).

### 4.3 · Flujo "¿cómo pagaste?" (H — heredar, no re-preguntar)

Al registrar un gasto: método de pago (efectivo/cuenta/débito/**crédito**/billetera).
Con crédito → elegir tarjeta ya registrada → **solo el delta de esta compra**:
cuántas cuotas, con/sin interés. Corte, cupo y fecha de pago de la tarjeta NO se
re-preguntan (ya son del producto). La baja fricción es criterio de aceptación
(§4.6): una compra de contado sigue siendo un tap; el flujo de cuotas añade solo
los 2 datos que cambian el número.

### 4.4 · Capa de consecuencias por evento (§42 por construcción)

La compra con tarjeta hace UNA mutación (crea la transacción `gasto` +
`CardPurchase` en la misma tx de BD) y emite **`CardPurchaseRegistered`** con
`sourceTransactionId` (causalidad, guardarraíl G). Listeners:
1. `CardService` — el saldo/cupo se DERIVAN, no se escriben (nada que "mover":
   la próxima lectura ya refleja la compra). El evento solo despierta consumidores.
2. Motor (`EngineListener`, ya existente) — recomputa DTI/fondo/Score con el nuevo
   desembolso (el `DebtOutlayService` ya suma cuotas — FIN-023).
3. Presupuesto/teQueda — las cuotas comprometidas entran por `SpendableService`
   (ya lee `nextDueDate`/desembolso — FIN-020/023). **Cero fórmula nueva.**

**Trazabilidad (G):** cada `CardPurchase`/`CardInstallment` guarda su
`sourceTransactionId`; la UI responde "esta cuota nació de tu compra del 12 en tu
tarjeta X" y ofrece deshacer desde ahí. **Acuse explícito** (FIN-029 §5.1) tanto
en app como por Telegram: "Registré tu compra de $X en tu tarjeta — quedan Y
cuotas de $Z. Lo ves en tus movimientos."

### 4.5 · Política de reversión con dependientes (CONDICIÓN DE CIERRE — DEC-0030 §3.1)

El borde donde §42 no es limpio. **Regla, no alternativa suelta:**

| Estado de la compra | Reversión |
|---|---|
| **Sin cuotas pagadas** (ninguna `CardInstallment.paidAt`) | **Anulación limpia**: anular la transacción origen (servicio central FIN-028) → `CardPurchase` y sus cuotas se marcan anuladas → el saldo/cupo derivados vuelven solos. Reversible de verdad. |
| **Con ≥1 cuota pagada** | **Bloquear la anulación directa + ruta de corrección** (Alt A recomendada). No se borra una compra que ya movió plata real (pagos registrados): revertirla inventaría un estado que no ocurrió ("nunca mentir hacia arriba"). El mensaje es honesto: "Esta compra ya tiene pagos aplicados, no puedo borrarla sin falsear tu historial. Puedes **corregir el saldo** con un ajuste, o anular los pagos primero." + CTA a la corrección. |

| | **Alt A — Bloquear + ruta de corrección (recomendada)** | **Alt B — Reversión compensatoria (contra-asiento)** |
|---|---|---|
| Qué es | La anulación de una compra con pagos se bloquea; se ofrece corregir el saldo con un ajuste explícito o anular los pagos primero | Anular genera un movimiento compensatorio que "deshace" el efecto neto |
| Ventajas | Nunca falsea el historial (los pagos ocurrieron de verdad); la usuaria entiende POR QUÉ no se puede borrar sin más; §29.2 (no culpa, explica) | "Un botón deshace todo" |
| Desventajas | La reversión no es un solo tap en ese caso — requiere la ruta de corrección | Inventa un contra-asiento que la usuaria no hizo → contradice §42 "explicable" y "nunca mentir hacia arriba"; el saldo queda "correcto" pero el historial miente |

**Decisión propuesta: Alt A.** Es la que respeta la protección de Confianza que
el CPSAO pidió vigilar: §42 exige reversible **y explicable**; un contra-asiento
fantasma es reversible pero no explicable. Queda al DEC confirmarla.

### 4.6 · "Flujo de caja" — el gate del DSS (J)

No pasa el gate en Fase 1: "Te queda" (FIN-020) ya responde "¿cuánto puedo gastar
sin sabotear el ciclo?", y las cuotas futuras ya entran como compromiso. Un "flujo
de caja" solo se justificaría con la dimensión PROYECTIVA de saldos futuros —que
es una decisión distinta y una FIN propia—, no como un décimo número en Fase 1.
**Fuera de Fase 1** (semilla registrada para una FIN futura si el DSS lo pide).

### 4.7 · Criterios de aceptación (A–K + §31/§32/§42)

- **§32 (grep, criterio de cierre):** cupo/saldo/cuotas solo en `CardService`;
  ningún número recalculado por pantalla; "Te queda"/desembolso siguen en sus
  fuentes.
- **§42/G (test de reversibilidad, criterio de cierre):** crear compra → los
  efectos aparecen (saldo/cupo/cuotas/Motor); anular sin pagos → todos se
  revierten; anular con pagos → bloqueado con ruta de corrección.
- **H:** e2e — la compra con tarjeta NO re-pregunta corte/cupo; el contado es un tap.
- **I:** test — la compra actualiza la tarjeta existente, no crea una 2ª deuda.
- **Confirmación en dos niveles:** la compra (hecho directo) NO pide segunda
  confirmación; una modificación no ingresada (p. ej. cambiar el cupo) SÍ.
- **§31:** §5.

## 5. Respuesta al filtro §31

Sin Fase 1, la tarjeta de crédito sigue siendo una deuda ciega (sin cupo visible)
y una compra a cuotas se registra dos veces. Se perdería la prueba de la espina
—una acción mueve todo, trazable y reversible— sobre el producto más común de la
Beta. Ninguna FIN previa lo da: es el primer eslabón donde "registrar un hecho"
se vuelve "Milla registra sus consecuencias". Valor diferencial: **ves cuánto te
queda de tu tarjeta y tus compras a cuotas viven solas — sin registrarlas dos
veces, y pudiendo deshacer lo que no tocó plata real.**

## 6. Componentes
Backend: `creditLimit` en Debt; `CardPurchase`/`CardInstallment`; `CardService`
(hoja, cupo/saldo/cuotas derivados); evento `CardPurchaseRegistered` + listener;
política de reversión en el servicio central (FIN-028); acuse en el motor
conversacional (FIN-029). Frontend: método de pago en el alta; flujo de tarjeta;
tarjeta con cupo/saldo; trazabilidad de la cuota; ruta de corrección. Tests:
§32 grep, reversibilidad, sin-duplicados, baja fricción.

## 7. Base de datos
`Debt.creditLimit` (nullable, solo tarjetas); tablas `card_purchases` /
`card_installments` con `source_transaction_id`. Migración a mano + `migrate
deploy`. Sin backfill (tarjetas existentes: `creditLimit` null hasta que la
usuaria lo declare — regresión: sin cupo, se comportan como hoy).

## 8. Backend
Cero fórmula nueva (§32): amortización de FIN-012, desembolso de FIN-023, teQueda
de FIN-020. La cascada es composición sobre el outbox.

## 9. Uso de IA
El acuse conversacional corre sobre FIN-029 (gate DPA+PIA intacto).

## 10. Riesgos
- **Reversión con dependientes** (el borde §42): mitigado por la política 4.5
  (bloquear+corregir, sin falsear). Es lo que el AUD debe vigilar por encima de todo.
- **Fricción del flujo de cuotas:** mitigado por H (solo el delta; contado = 1 tap).
- **Derivar saldo/cupo en cada lectura:** costo de una suma por tarjeta —
  negligible; si pesara, cache por evento (diferido, declarado).
- **Regresión:** tarjeta sin `creditLimit` se comporta como hoy (test).

## 11. Dependencias
FIN-002 (outbox), FIN-028 (servicio central + anulación con reversión), FIN-029
(acuse), FIN-012/023 (amortización/desembolso), FIN-020 (teQueda). Ninguna nueva.

## 12. Impacto
Primer producto-entidad con cupo + primera cascada por evento con causalidad;
valida §42 de punta a punta antes de replicarlo a los otros tipos (FIN-032).

## 13. Criterios de aceptación
1. Compra con tarjeta a N cuotas: actualiza saldo/cupo (derivados), genera las
   cuotas, despierta el Motor — todo trazable a la compra (e2e).
2. Anular sin pagos revierte limpio; anular con ≥1 cuota pagada se bloquea con la
   ruta de corrección (test de reversibilidad — criterio de cierre).
3. Grep §32: cupo/saldo/cuotas solo en `CardService`; cero recálculo por pantalla.
4. Sin duplicados (I); baja fricción (H); confirmación en dos niveles.
5. Regresión: tarjeta sin cupo declarado = comportamiento actual.
6. Suites + typecheck + build + migración; capturas del flujo y de la
   trazabilidad/bloqueo. Filtro §31 (§5).

## 14. Plan
1. Validación CTO → AUD-0031 (foco: política de reversión 4.5 + §32) →
DEC-0031 (confirma Alt A de reversión) → 2. modelo+migración + `CardService` →
3. evento+listener+reversión → 4. flujo de pago + UI + trazabilidad → 5. tests/
capturas → 6. IMP-0031 con SHA y juicio razonado → validación → cierre.
