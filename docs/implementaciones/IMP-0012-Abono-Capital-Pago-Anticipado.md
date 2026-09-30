# IMP-0012 · Abono a capital y pago total anticipado (real)

- **Módulo/Feature:** FIN-012
- **Documentos base:** `ARQ-0012-Abono-Capital-Pago-Anticipado.md` · `AUD-0011-Rev1` + `AUD-0012` (ambos APROBADO) · `DEC-0012` (autoriza desarrollo)
- **Autor:** Agente Desarrollador · **Fecha:** 2026-07-06 (v2: mismo día)
- **Referencia inmutable (regla GOBERNANZA):** commit **`5e8d32fd767f73e8e6943721ded4470a3436ec3b`**
  - v1 (lógica completa): `9ea01d63a4e79935a5edceb7d7c0df19d5fbd62d` — validada por el
    CTO con un único hallazgo bloqueante: el test E2E de concurrencia no estaba en el
    commit (corría como script efímero, no reproducible).
  - v2 (este reenvío): `5e8d32f` añade EXCLUSIVAMENTE el test E2E de concurrencia
    versionado (`backend/test/fin012-debt-concurrency.e2e-spec.ts` + config + script
    npm). Cero cambios de lógica, diseño o alcance.
- **Estado:** Reenviado (v2) — a la espera de re-validación del CTO

## 1. Resumen
Primer ciclo que ESCRIBE sobre el estado real de una deuda con un motor de recálculo.
Abono único a capital (`reducir_plazo` default | `reducir_cuota`) y pago total
anticipado, con **preview = recibo** (misma función pura) y **persistencia atómica**
bajo bloqueo de fila. Cierra además la condición de carrera **preexistente** del
manejador de `pago_deuda`. Los 4 cambios obligatorios de DEC-0012 §10 implementados y
probados.

## 2. Archivos
- `finance/amortization/amortization.service.ts` — métodos ADITIVOS
  `remainingSchedule` (cuota fija dada; valida cuota que no cubre interés; absorbe
  residuo de redondeo ≤ $1 en la última cuota — sin "cuota fantasma" de centavos) y
  `prepaymentReceipt` (before/after del plan restante; `reducir_cuota` vía
  `computeMonthlyPayment` existente). `simulateExtraPayment`/`buildSchedule` intactas.
- `amortization.service.spec.ts` — 6 tests nuevos (los 4 obligatorios + 2 de bordes).
- `debts/debt-prepayment.service.ts` (nuevo) — `preview`/`prepay`/`payoff`;
  `SELECT … FOR UPDATE` dentro de `$transaction` (validación y recálculo con la fila
  bloqueada); regenera el plan de amortización desde el cronograma "after"; crea la
  `Transaction` (`paymentType abono_capital|pago_total`) y encola los MISMOS eventos
  outbox del flujo actual (el Motor recalcula solo; `logro_deuda_saldada` se dispara
  por el pipeline de FIN-006 sin código nuevo).
- `debts.controller.ts` — `POST /debts/:id/prepay-preview`, `POST /debts/:id/prepay`,
  `POST /debts/:id/payoff`; `debt.dto.ts` — `PrepayDto` (monto positivo, efecto enum
  default `reducir_plazo`); `debts.module.ts` — provider.
- `transactions.service.ts` — manejador de `pago_deuda` reemplazado por **una sola
  sentencia atómica** `UPDATE … SET current_balance = GREATEST(…), status = CASE … 
  RETURNING` (0 filas → NotFound). Clamp a 0 y marca `pagada` ahora en BD.
- Migración `20260706100000_fin012_abono_capital` — enum `PaymentType` +
  `transactions.payment_type` default `cuota` (retrocompatible).
- Frontend: tipos `PrepayReceipt`/`PrepayEffect`, 3 endpoints, sección "💸 Abonar a
  capital" (efecto → preview → confirmar) y "Pagar totalmente" con confirmación en
  el detalle de deuda (solo deudas activas).

## 3. Cumplimiento de los 4 cambios obligatorios (DEC-0012 §10)

| # | Cambio | Evidencia |
|---|---|---|
| 1 | Test de ancla a mano | Unit: cuota `470.734,72` exacta; `reducir_plazo` 24→**19** cuotas; `reducir_cuota` → **376.587,78** por fórmula cerrada (`computeMonthlyPayment(8M, 1%, 24)`). ⚠️ Desviación de 1 centavo respecto del 376.587,79 del auditor (0,8×470.734,72=376.587,776 → redondeo a centavos da ,78); el test lo fija con igualdad exacta Y `toBeCloseTo(376.587,79, 0)`, y queda declarado aquí |
| 2 | Test de NO-inflación | Unit: `interestSaved` del abono único (485.212) **estrictamente menor** que el de `simulateExtraPayment` con 2M recurrente (1.098.793) — documenta la confusión que originó el bloqueo |
| 3 | Regresión de semántica | Unit: snapshot EXACTO de `simulateExtraPayment` (baseline 36m/3.693.701,88; withExtra 18m/1.730.564,42; saved 1.963.137,46/18m) — idéntico antes y después del ciclo |
| 4 | Concurrencia E2E | **Test VERSIONADO y reproducible**: `backend/test/fin012-debt-concurrency.e2e-spec.ts`, ejecutable con `npm run test:e2e` (levanta la app real en puerto efímero contra la BD real; solo requiere el Postgres de docker). 3 tests: (a) pago manual 300k + abono 300k **en paralelo** → saldo **exacto 400.000** (nunca last-write-wins 700.000); (b) dos abonos paralelos 300k+200k → saldo exacto 500.000 y `FOR UPDATE` serializando (los `newBalance` devueltos difieren); (c) payoff + pago manual en paralelo → saldo 0, `pagada`, nunca negativo. Resultado en el commit de referencia: **3/3 PASS** |

## 4. Pruebas
- Suite completa **298/298** (37 suites — incluye regresión íntegra FIN-001…016).
- Typecheck backend y frontend limpios; bundle Android 200 (6.59 MB).
- **E2E 9/9** contra backend + Postgres reales: preview=recibo (mismos números);
  persistencia (saldo 8M, cuota intacta en `reducir_plazo`, plan regenerado a 19
  cuotas); `reducir_cuota` persiste cuota nueva menor con plazo igual; payoff (saldo
  0, `pagada`, Transaction `pago_total`, repetido → 400); **concurrencia** (tabla
  §3); pago manual retrocompatible (clamp a 0 + `pagada` + `paymentType cuota`);
  validaciones (abono ≥ saldo → 400 con mensaje "usa el pago total"; negativo → 400).

## 5. Incidencias
- `remainingSchedule` inicialmente producía una "cuota fantasma" #25 de centavos: la
  cuota redondeada a centavos deja un residuo de ~$0,14 tras 24 periodos. Corregido
  absorbiendo residuos ≤ $1 en la última cuota (práctica bancaria estándar), ANTES
  del commit de entrega; el snapshot de `simulateExtraPayment` se verificó idéntico
  antes y después del ajuste (el fix vive solo en el método nuevo).
- **Hallazgo de la validación del CTO (v1 → v2):** el test E2E de concurrencia se
  ejecutó como script efímero fuera del repositorio — la evidencia no era
  reproducible desde el commit. Corregido en v2: el test quedó versionado como spec
  de jest (`test:e2e`), sin dependencias nuevas (app en puerto efímero + `fetch`
  nativo, sin `supertest`) y excluido de la suite unitaria (su config propia;
  `rootDir: src` de la suite normal no lo recoge). Reproducción: levantar el
  Postgres de docker → `cd backend && npm run test:e2e` → 3/3.

## 6. Limitaciones / desviaciones declaradas
- **1 centavo** en el ancla de `reducir_cuota` (§3.1): el valor por fórmula cerrada
  redondeado a centavos es 376.587,78; el auditor calculó a mano 376.587,79.
- El plan regenerado renumera `periodNo` desde 1 con fechas desde la operación (el
  histórico de pagos vive en `transactions`, no en la tabla de amortización).
- `payoff` liquida por `currentBalance` sin intereses causados del periodo en curso
  (simplificación conservadora ratificada por DEC-0012 §4.5 / DEC-0011 §4.9).

## 7. Resultado
FIN-012 completo conforme a DEC-0012: 4/4 cambios obligatorios con evidencia, gap
preexistente de concurrencia cerrado, regresión total en verde. Con la validación del
CTO, la segunda ronda queda **5/5** y puede abrirse la siguiente iniciativa bajo la
regla "un FIN a la vez".
