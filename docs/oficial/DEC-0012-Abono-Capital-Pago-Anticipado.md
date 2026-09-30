# DEC-0012 · Abono a capital y pago total anticipado (deuda)

- **Documentos base:** `docs/arquitectura/ARQ-0011-Rev1-Correccion-FIN012.md` · `docs/arquitectura/ARQ-0012-Abono-Capital-Pago-Anticipado.md` (consolidación) · `docs/auditoria/AUD-0011-Rev1-Correccion-FIN012.md` · `docs/auditoria/AUD-0012-Abono-Capital-Pago-Anticipado.md` · `DEC-0011` (decisión original que bloqueó este sub-ciclo)
- **Módulo/Feature:** FIN-012
- **Decide:** CTO/CPO/Principal Architect de Millo
- **Fecha:** 2026-07-06

---

## 1. Resumen ejecutivo

Este DEC es la adenda que `DEC-0011 §10.3` anunció, ahora emitida como documento individual propio para FIN-012, conforme a la nueva regla de gobernanza "un FIN a la vez". `DEC-0011` había bloqueado el desarrollo de FIN-012 por dos hallazgos críticos verificados contra el código: (1) reutilizar `simulateExtraPayment` para un abono único habría inflado el ahorro de intereses mostrado (esa función modela una cuota extra recurrente, no un pago único); (2) `Debt.currentBalance` se leía y escribía sin bloqueo, vulnerable a condición de carrera bajo pagos concurrentes.

La Arquitectura entregó una corrección acotada (`ARQ-0011-Rev1`, luego consolidada como `ARQ-0012`) que retira por completo `simulateExtraPayment` de este flujo y la reemplaza por dos métodos puros aditivos (`remainingSchedule`, `prepaymentReceipt`); y aplica bloqueo de fila (`FOR UPDATE`) para las rutas nuevas más una actualización atómica condicional (`UPDATE ... RETURNING`) para el manejador ya existente de `pago_deuda`, cerrando también ese gap preexistente. El Auditor verificó ambas correcciones dos veces (re-auditoría acotada y luego la consolidación), incluyendo verificación matemática independiente a mano de los números de ancla propuestos (cuota proporcional 376.587,79; 19 cuotas restantes) — ambos correctos. No encontró hallazgos nuevos en ninguna de las dos pasadas.

**Este DEC autoriza el desarrollo de FIN-012.** A diferencia de FIN-013/014/015/016 (sección aparte de regularización), FIN-012 todavía no tiene código — es la única de las cinco funcionalidades del ex-umbrella ARQ-0011 que sigue el flujo de gobernanza normal hacia adelante (ARQ→AUD→DEC ya completos; falta IMP).

## 2. Arquitecturas revisadas

- `docs/arquitectura/ARQ-0011-Rev1-Correccion-FIN012.md` — corrección acotada.
- `docs/arquitectura/ARQ-0012-Abono-Capital-Pago-Anticipado.md` — consolidación numerada, sin cambios respecto de la Rev1 (verificado por el Auditor línea por línea).

## 3. Auditorías revisadas

- `docs/auditoria/AUD-0011-Rev1-Correccion-FIN012.md` — veredicto: **APROBADO**.
- `docs/auditoria/AUD-0012-Abono-Capital-Pago-Anticipado.md` — veredicto: **APROBADO** (confirma que la consolidación no introduce deriva).

## 4. Decisiones aprobadas

1. **Métodos puros aditivos `remainingSchedule`/`prepaymentReceipt`** en `AmortizationService`, sin tocar `simulateExtraPayment`: aprobado.
2. **`reducir_plazo`** (cuota constante, nuevo plazo) y **`reducir_cuota`** (plazo constante, nueva cuota vía `computeMonthlyPayment`) como los dos efectos del abono único: aprobado.
3. **Bloqueo de fila (`SELECT ... FOR UPDATE`)** para las rutas nuevas `prepay`/`payoff`, y **actualización atómica condicional (`UPDATE ... RETURNING`)** para el manejador existente de `pago_deuda`: aprobado — aplicación diferenciada y correcta del patrón según la complejidad real de cada operación.
4. **Preview y recibo persistido usan la misma función pura** (`prepaymentReceipt`): ratificado — la garantía de "lo que el usuario ve es lo que se guarda" no se debilita.
5. Se ratifican las decisiones ya fijadas en `DEC-0011 §4.8/§4.9`: efecto default `reducir_plazo`; pago total liquida por `currentBalance` sin recalcular intereses causados del periodo en curso.

## 5. Decisiones rechazadas

- Ninguna. La corrección cierra ambos hallazgos que motivaron el bloqueo original; no hay rechazo de diseño en este DEC.

## 6. Observaciones aceptadas

- Ninguna observación pendiente — ambas auditorías (Rev1 y consolidación) no encontraron hallazgos.

## 7. Observaciones descartadas

- Ninguna.

## 8. Riesgos aceptados

- El riesgo genérico de que la implementación no siga exactamente lo especificado (igual que cualquier ARQ en fase de diseño), mitigado por los 4 tests exigidos en la sección 10.

## 9. Riesgos pendientes

- Ninguno nuevo. Gates heredados de FIN-005/FIN-009 (DPA, PIA, producción) sin cambios y no aplican a este ciclo.

## 10. Cambios obligatorios (condición de cierre de IMP-0012)

1. **Test de ancla**: caso P=10.000.000, i=1% mensual, n=24, abono único 2.000.000 — `reducir_cuota` → 376.587,79; `reducir_plazo` → 19 cuotas restantes (valores verificados a mano por el Auditor en dos ocasiones independientes).
2. **Test de no-inflación**: el `interestSaved` del abono único debe ser estrictamente menor que el que devolvería `simulateExtraPayment` con ese mismo monto tratado como cuota mensual recurrente — documenta y bloquea permanentemente la confusión original.
3. **Test de regresión de semántica**: `simulateExtraPayment` debe seguir devolviendo exactamente los mismos valores que antes de este ciclo (snapshot de valores).
4. **Test de concurrencia E2E**: dos pagos paralelos sobre la misma deuda (uno vía `POST /transactions`, otro vía `prepay`) deben resultar en un saldo final matemáticamente correcto, nunca "última escritura gana" — mismo estándar de evidencia que el canje concurrente de `PromoCode` en FIN-009.

## 11. Plan técnico oficial

Se autoriza al agente Desarrollador a iniciar la implementación de FIN-012 siguiendo `ARQ-0012` completo, incorporando los 4 cambios obligatorios de la sección 10:

1. Migración: `Transaction.paymentType` (`cuota`/`abono_capital`/`pago_total`, default `cuota`, retrocompatible).
2. `AmortizationService`: agregar `remainingSchedule`/`prepaymentReceipt` (aditivo, sin tocar funciones existentes) + tests de ancla/no-inflación/regresión.
3. `debts.controller.ts`: `POST /debts/:id/prepay-preview`, `POST /debts/:id/prepay`, `POST /debts/:id/payoff` — todo dentro de `$transaction` con `FOR UPDATE`.
4. `transactions.service.ts`: reemplazar el manejador de `pago_deuda` por el `UPDATE ... RETURNING` atómico.
5. Test E2E de concurrencia.
6. Frontend: sección "Abonar / Pagar" en detalle de deuda (preview → confirmar).
7. Regresión completa de los tests existentes (incluyendo FIN-013/014/015/016, ya que FIN-012 toca `debts`/`transactions` de los que FIN-013/014 dependen para lectura).
8. Cierre con `docs/implementaciones/IMP-0012.md` con SHA de commit + actualización de `BACKLOG.md`.

## 12. Prioridad

**Alta.** Es la funcionalidad de mayor valor de producto confirmada por el fundador en esta ronda (pago anticipado real), ahora con el diseño correctamente asegurado tras dos rondas de auditoría.

## 13. Estado final

**APROBADO. Se autoriza iniciar la implementación de FIN-012** bajo el plan de la sección 11 y los 4 cambios obligatorios de la sección 10. Gates heredados de FIN-005/FIN-009 sin cambios. El cierre de FIN-012 requiere `IMP-0012` con SHA de commit verificable, que validaré en checkout aislado antes de autorizar su cierre — **de forma individual, siguiendo ahora la regla "un FIN a la vez"**: no se iniciará el diseño detallado de ninguna funcionalidad nueva hasta que FIN-012 cierre (salvo excepción expresa que yo autorice por escrito).

---
*Documento oficial — no modificar. Corresponde al ciclo de gobernanza de `docs/GOBERNANZA.md`.*
