# ARQ-0012 · Abono a capital y pago total anticipado (real)

- **Módulo/Feature:** FIN-012
- **Origen:** derivado del umbrella `ARQ-0011` §4.1 **corregido por
  `ARQ-0011-Rev1-Correccion-FIN012.md`** (DEC-0011 §10 rechazó el mecanismo original;
  este documento consolida el diseño YA CORREGIDO en un solo lugar para trazabilidad).
  No introduce cambios respecto de la Rev1.
- **Autor:** Agente Arquitecto · **Fecha:** 2026-07-05
- **Estado:** ⏳ **NO autorizado a desarrollo** — en espera de re-auditoría acotada del
  Auditor y adenda del CTO a DEC-0011 (§10.3)

---

## 1. Objetivo
Que el abono a capital y el pago total anticipado sean operaciones **reales**: que
persistan, recalculen la deuda (plazo o cuota) y generen su transacción — no solo la
simulación de FIN-007.

## 2. Problema
`transactions.service.ts` (kind `pago_deuda`) solo descuenta `currentBalance`; nunca
recalcula `termMonths`/`monthlyPayment` ni regenera la amortización. Además el DEC
identificó 2 hallazgos críticos en el diseño original del umbrella:
1. Usar `simulateExtraPayment` para un abono ÚNICO infla el ahorro mostrado (esa
   función modela una cuota extra RECURRENTE mensual).
2. `Debt.currentBalance` se lee y escribe sin bloqueo/atomicidad (condición de
   carrera preexistente que FIN-012 agravaría).

## 3. Alcance
**Incluye:** endpoints `prepay`/`payoff` en `debts`, recálculo correcto, persistencia
atómica (incluido el manejador preexistente de `pago_deuda`), preview=recibo, UI.
**Excluye:** cambiar la semántica de `simulateExtraPayment` (queda reservada a su
propósito original); intereses causados del periodo en el payoff (liquidación por
`currentBalance` — simplificación conservadora ratificada, DEC-0011 §4.9/§8).

## 4. Arquitectura (diseño corregido — Rev1)

### 4.1 Cálculo (cambio obligatorio #1 de DEC-0011)
Nuevos métodos **puros y aditivos** en `AmortizationService` (ninguna función
existente se modifica ni se invoca `simulateExtraPayment` en FIN-012):
- `remainingSchedule(balance, monthlyRate, payment, from)` — camina el cronograma con
  CUOTA FIJA dada hasta liquidar (valida `payment > balance·i`; tope `MAX_PERIODS`).
- `prepaymentReceipt(balance, monthlyRate, payment, remainingMonths, amount, effect,
  from)` — compara el plan restante ANTES vs. DESPUÉS del abono único:
  - `reducir_plazo` (default ratificado §4.8): misma cuota sobre `balance − amount`
    → menos cuotas, intereses ahorrados reales.
  - `reducir_cuota`: mismo plazo restante, nueva cuota =
    `computeMonthlyPayment(balance − amount, i, m)` (función existente, exacta).
El **preview** (`GET /debts/:id/prepay-preview`) y el **recibo persistido** usan la
misma función pura: lo que el usuario ve antes de confirmar es lo que queda guardado.

### 4.2 Persistencia atómica (cambio obligatorio #2 de DEC-0011)
- Rutas nuevas (`POST /debts/:id/prepay {amount, effect}`, `POST /debts/:id/payoff`):
  `SELECT … FOR UPDATE` dentro de una única `$transaction` (validación y recálculo con
  la fila bloqueada) → `UPDATE` de saldo/plazo/cuota/estado → `INSERT` de la
  `Transaction` (kind `pago_deuda`, `paymentType abono_capital|pago_total`) + evento
  outbox — todo o nada.
- Manejador **preexistente** de `pago_deuda` (gap que este ciclo también cierra):
  una sola sentencia atómica condicional
  `UPDATE debts SET current_balance = GREATEST(current_balance − $amt, 0), status =
  CASE WHEN current_balance − $amt <= 0.005 THEN 'pagada' ELSE status END WHERE id =
  $id AND user_id = $uid AND deleted_at IS NULL RETURNING …` (0 filas → NotFound).
- `Transaction.paymentType` (`cuota` default retrocompatible) para trazabilidad; un
  pago manual sigue comportándose como hoy (solo descuenta saldo, documentado en UI).

## 5. Componentes
`DebtPrepaymentService` (nuevo) + endpoints en `debts.controller`; extensión aditiva
de `AmortizationService`; ajuste atómico en `transactions.service`.

## 6. Base de datos
`Transaction.paymentType` (columna opcional, default `'cuota'`). Sin tablas nuevas.

## 7. Backend
Los 3 endpoints de §4; el insight `logro_deuda_saldada` se dispara por el flujo
existente de FIN-006 (dedupe per-entity), sin código nuevo.

## 8. Frontend
En el detalle de deuda: "Abonar a capital" (elige efecto, ve preview, confirma) y
"Pagar totalmente" (confirmación destructiva con el monto de liquidación).

## 9. Uso de IA
Ninguno.

## 10. Riesgos
Primer ciclo que ESCRIBE sobre deudas con un motor de recálculo → mitigado por: motor
puro reutilizado intacto, preview=recibo (misma función), lock de fila, tests de §13.

## 11. Dependencias
`AmortizationService` (FIN-002/003), outbox (FIN-002), insights (FIN-006),
`paymentBreakdown` de FIN-013 (solo pantalla compartida).

## 12. Impacto
Cierra además la condición de carrera preexistente en pagos de deuda. El Motor
recalcula solo vía eventos outbox existentes.

## 13. Criterios de aceptación (incluye los exigidos por DEC-0011 §10)
1. **Test de ancla a mano:** P=10.000.000, i=1% mensual, n=24 → cuota 470.734,72;
   abono único de 2.000.000: `reducir_plazo` → 19 cuotas con la misma cuota;
   `reducir_cuota` → nueva cuota 376.587,79 (fórmula cerrada).
2. **Test de NO-inflación:** el `interestSaved` del abono único es MENOR que el que
   reportaría `simulateExtraPayment` con ese monto mensual.
3. **Regresión de semántica:** `simulateExtraPayment` devuelve exactamente lo mismo
   que hoy para un input fijo.
4. **Test E2E de concurrencia:** 2 pagos paralelos sobre la misma deuda → saldo final
   exacto (nunca "última escritura gana").
5. Payoff → saldo 0, `status pagada`, Transaction creada, insight disparado.
6. `POST /transactions` manual kind `pago_deuda` se comporta exactamente como hoy.

## 14. Plan
Tras la adenda del CTO: extensión del motor + tests 1–3 → migración `paymentType` →
`DebtPrepaymentService` atómico + ajuste de `transactions.service` → UI → E2E de
concurrencia (test 4) → IMP-0012 con SHA.
