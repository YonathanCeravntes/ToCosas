# ARQ-0011 · Revisión 1 — Corrección acotada de §4.1 (FIN-012)

- **Módulo/Feature:** FIN-012 (abono a capital y pago total anticipado)
- **Alcance de este documento:** SOLO la corrección de ARQ-0011 §4.1 exigida por
  DEC-0011 §10 (cambios obligatorios #1 y #2). El resto de ARQ-0011 permanece sin
  cambios. Sometido a re-auditoría acotada según DEC-0011 §10.3.
- **Autor:** Agente Arquitecto
- **Fecha:** 2026-07-05
- **Estado:** Propuesto — en espera de re-auditoría acotada y adenda del CTO a DEC-0011

---

## 1. Hallazgos que corrige

1. **Crítico #1 (cálculo):** el diseño original reutilizaba `simulateExtraPayment` /
   `POST /debts/:id/simulate-extra` para el preview/recibo de un abono **único**, pero
   esa función modela una cuota extra **recurrente mensual** (`extraMonthly` se aplica
   en cada iteración del bucle de `buildSchedule`) — habría mostrado un ahorro de
   intereses inflado.
2. **Crítico #2 (concurrencia):** toda escritura de `Debt.currentBalance` (las rutas
   nuevas Y el manejador ya existente de `pago_deuda` en `transactions.service.ts`,
   que hoy hace `findFirst` + `update` calculado en memoria) debe ser atómica o con
   bloqueo de fila.

## 2. §4.1 corregido — Cálculo del abono único (reemplaza al original)

### 2.1 Nuevos métodos puros en `AmortizationService` (aditivos)

No se modifica ninguna función existente. Se agregan dos métodos puros, testeables
sin BD, que modelan correctamente la situación "hoy tengo un saldo S, una tasa i y
una cuota A" (sin `extraMonthly` en ningún caso):

```ts
/**
 * Camina el cronograma con CUOTA FIJA dada sobre un saldo dado, hasta liquidar.
 * Es el plan "restante" real de una deuda viva: no recalcula la cuota, la respeta.
 * Devuelve { months, totalInterest, payoffDate, entries }.
 */
remainingSchedule(balance: number, monthlyRate: number, payment: number, from: Date)

/**
 * Recibo de un abono único a capital. Compara el plan restante ANTES
 * (remainingSchedule sobre `balance`) contra el plan restante DESPUÉS:
 *  - effect='reducir_plazo':  misma cuota A sobre saldo (balance − amount)
 *      → nuevo número de cuotas (menor), intereses ahorrados reales.
 *  - effect='reducir_cuota':  mismo plazo restante m, nueva cuota
 *      computeMonthlyPayment(balance − amount, i, m)  ← función existente, exacta.
 * Devuelve { before, after, interestSaved, monthsSaved | paymentSaved }.
 */
prepaymentReceipt(balance, monthlyRate, payment, remainingMonths, amount, effect, from)
```

- `remainingSchedule` valida `payment > balance * monthlyRate` (la cuota debe cubrir
  al menos el interés del periodo; si no, error explícito — nunca bucle infinito;
  se conserva además el tope `MAX_PERIODS`).
- **`simulateExtraPayment` no se toca ni se invoca en ningún punto de FIN-012**: queda
  reservada a su propósito original (abono recurrente, FIN-007 / simulador).
- El **preview** (`GET /debts/:id/prepay-preview?amount=&effect=`) y el **recibo
  persistido** usan `prepaymentReceipt` — misma función pura, mismo número: lo que el
  usuario ve antes de confirmar es exactamente lo que queda guardado.

### 2.2 Tests exigidos por DEC-0011 §10.1

- **Test de ancla (caso calculado a mano):** deuda P=10.000.000, i=1% mensual,
  n=24 → cuota A=470.734,72. Tras 0 cuotas pagadas, abono único de 2.000.000 con
  `reducir_plazo`: el plan restante sobre 8.000.000 con la MISMA cuota A liquida en
  19 cuotas (no 24) y los intereses del plan después son menores que los del plan
  antes en una cifra verificada contra hoja de cálculo, cuota a cuota. Con
  `reducir_cuota`: nueva cuota = `computeMonthlyPayment(8.000.000, 1%, 24)` =
  376.587,79 (fórmula cerrada, verificable a mano).
- **Test de no-inflación:** para el mismo caso, se afirma explícitamente que
  `interestSaved` del abono único es **menor** que el `interestSaved` que devolvería
  `simulateExtraPayment` con ese monto mensual — el test documenta y bloquea la
  confusión que originó el hallazgo.
- **Test de regresión de semántica:** `simulateExtraPayment` con un input fijo
  devuelve exactamente el mismo resultado que hoy (snapshot de valores, no de
  implementación).

## 3. §4.1 corregido — Persistencia atómica (reemplaza al original)

### 3.1 Rutas nuevas (`prepay`, `payoff`)

Dentro de una única `$transaction` de Prisma:

1. `SELECT ... FROM debts WHERE id=$id AND user_id=$uid AND deleted_at IS NULL
   FOR UPDATE` — bloqueo de fila (patrón autorizado explícitamente por DEC-0011
   §10.2). Toda validación y cálculo (`prepaymentReceipt`) ocurre con la fila
   bloqueada: ningún otro pago puede intercalarse.
2. `UPDATE debts SET current_balance = $nuevo, term_months|monthly_payment = $..., 
   status = $...` (valores derivados del saldo leído bajo lock, no de un estado
   anterior en memoria).
3. `INSERT` de la `Transaction` (kind `pago_deuda`, `paymentType`
   `abono_capital`/`pago_total`) + evento outbox — todo o nada.

Se usa `FOR UPDATE` (y no un solo `UPDATE ... RETURNING`) porque el recálculo de
plazo/cuota necesita leer el saldo y derivar varios campos de forma consistente; el
lock de fila da la misma garantía con la lógica en un solo lugar.

### 3.2 Manejador existente de `pago_deuda` (gap preexistente — se cierra aquí)

`transactions.service.ts` reemplaza el par `findFirst` + `update` por **una sola
sentencia atómica condicional** (para el pago simple no hay recálculo, así que el
patrón `UPDATE ... RETURNING` es suficiente y más barato que un lock):

```sql
UPDATE debts
   SET current_balance = GREATEST(current_balance - $amount, 0),
       status = CASE WHEN current_balance - $amount <= 0.005 THEN 'pagada' ELSE status END
 WHERE id = $debtId AND user_id = $userId AND deleted_at IS NULL
RETURNING id, current_balance, status;
```

- 0 filas → deuda no encontrada (mismo `NotFoundException` actual).
- El clamp a 0 y la marca `pagada` que hoy se calculan en memoria pasan a la BD —
  comportamiento funcional idéntico, ahora sin ventana de carrera.

### 3.3 Test de concurrencia exigido por DEC-0011 §10.2

E2E contra Postgres real: deuda con saldo 1.000.000; se disparan **en paralelo** dos
pagos de 300.000 (uno por `POST /transactions`, otro por `prepay`); saldo final
esperado exactamente 400.000 y los campos de cronograma consistentes con el orden de
aplicación — nunca "última escritura gana" (que dejaría 700.000). Mismo estilo de
evidencia que la prueba de canje concurrente de FIN-009.

## 4. Lo que NO cambia

Puerta de entrada por `debts` (crea la `Transaction` internamente), `paymentType` en
`Transaction`, efecto default `reducir_plazo` (DEC-0011 §4.8), pago total liquidando
por `currentBalance` sin intereses causados (DEC-0011 §4.9), insight
`logro_deuda_saldada` por el flujo existente, y los criterios de aceptación de
ARQ-0011 §13 — que se amplían con los 3 tests de §2.2 y el de §3.3 de esta revisión.
