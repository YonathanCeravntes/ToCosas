# AUD-0011 · Auditoría de ARQ-0011 (Umbrella — Mejoras de deuda, presupuesto y dashboard financiero)

- **Documento auditado:** `docs/arquitectura/ARQ-0011-Mejoras-Deuda-Presupuesto-Dashboard.md` (umbrella FIN-011, cubre FIN-012…016)
- **Módulo/Feature:** FIN-011 (umbrella) — segunda ronda post-roadmap
- **Documentos base revisados:** `ARQ-0001` (umbrella original), `DEC-0003`, `DEC-0007`, `DEC-0009`, `BACKLOG.md` (feedback del fundador y decisiones (a)/(b) ya cerradas)
- **Referencia inmutable verificada:** `git show HEAD:backend/src/modules/finance/amortization/amortization.service.ts` y `git show HEAD:backend/src/modules/transactions/transactions.service.ts` — no se auditó contra working tree (persiste la desincronización ya documentada en ciclos anteriores).
- **Fecha:** 2026-07-05
- **Auditor:** Auditor Oficial de Milla (rol de solo lectura)

> Esta auditoría no modifica el ARQ ni el código. Al ser un documento umbrella análogo a
> ARQ-0001, se aplicó el mismo tipo de verificación de premisas contra el código real,
> con énfasis en FIN-012 por ser, según el propio ARQ, "el primer ciclo que ESCRIBE sobre
> deudas con un motor" — el de mayor riesgo de corrupción de datos financieros reales de
> los cinco sub-ciclos.

---

## Resumen Ejecutivo

ARQ-0011 diagnostica correctamente los cuatro gaps de producto (verificados por el propio CTO contra el código antes de encargar el ARQ, no solo por informe) y propone un principio rector sano: reutilizar los motores ya auditados en vez de duplicar lógica financiera. Cuatro de los cinco sub-ciclos (FIN-013, 014, 015, 016) están bien acotados, respetan con disciplina las invariantes de negocio ya cerradas por el fundador, y declaran con transparencia las decisiones abiertas que corresponden al DEC en vez de resolverlas unilateralmente.

El sub-ciclo restante — **FIN-012, que el propio documento identifica como el de mayor riesgo** — tiene dos defectos verificados directamente contra el código que deben corregirse antes de implementar: (1) el ARQ propone reutilizar `simulateExtraPayment`/`POST /debts/:id/simulate-extra` para calcular y previsualizar un abono **único** a capital, pero esa función modela una **cuota extra recurrente mensual** (confirmado en `amortization.service.ts`: `extraMonthly` se suma en cada periodo del ciclo de amortización), no un pago único — usarla para un abono único mostraría al usuario un ahorro de intereses inflado, como si se comprometiera a pagar ese extra cada mes indefinidamente; (2) el patrón de lectura-y-escritura sobre `Debt.currentBalance` que ya existe hoy (confirmado en `transactions.service.ts`: `findFirst` seguido de `update` calculado, sin bloqueo de fila ni actualización atómica condicional) es vulnerable a una condición de carrera clásica de "última escritura gana" bajo pagos concurrentes sobre la misma deuda — y FIN-012 extiende ese mismo patrón para recalcular también plazo/cuota, no solo el saldo, agravando el impacto de una carrera si ocurre.

## Hallazgos

1. **Reutilización incorrecta de `simulateExtraPayment` para modelar un abono único (lump-sum) en FIN-012.** Verificado en `backend/src/modules/finance/amortization/amortization.service.ts` (método `buildSchedule`, línea ~59): `extraMonthly` se aplica dentro del bucle `while` en **cada periodo** del cronograma, es decir, `simulateExtraPayment` calcula el efecto de pagar una cuota extra **todos los meses** hasta liquidar la deuda — no el efecto de un pago único hecho una sola vez. §4.1 del ARQ propone usar exactamente esta función (vía el endpoint existente `POST /debts/:id/simulate-extra`) tanto para el "preview antes de confirmar" como para el cálculo del delta (`intereses ahorrados, meses/cuota nuevos`) que se persiste como recibo. Para un abono único, el cálculo correcto es distinto y más simple: recalcular el cronograma sobre el **nuevo saldo reducido** manteniendo la cuota original (`reducir_plazo`, usando `buildSchedule` sin `extraMonthly`) o manteniendo el plazo original (`reducir_cuota`, usando `computeMonthlyPayment` sobre el nuevo saldo) — ninguno de los dos necesita `simulateExtraPayment`.
2. **Patrón de lectura-y-escritura sin bloqueo sobre `Debt.currentBalance`, ahora extendido a recalcular plazo y cuota.** Verificado en `backend/src/modules/transactions/transactions.service.ts` (líneas ~56-69): el manejo actual de `pago_deuda` lee el saldo (`findFirst`), calcula el nuevo valor en memoria, y lo escribe (`update`) dentro de una transacción interactiva de Prisma (`$transaction`) — sin `SELECT ... FOR UPDATE` ni una actualización condicional atómica (`WHERE currentBalance = @valorLeído`). Bajo pagos concurrentes sobre la misma deuda (p. ej. un pago por WhatsApp y un abono desde la app casi simultáneos), el segundo en escribir puede sobrescribir el resultado del primero con un valor calculado sobre un saldo ya obsoleto — el mismo tipo de condición de carrera que el proyecto ya identificó y corrigió con rigor para el outbox (`FOR UPDATE SKIP LOCKED`) y para el canje de `PromoCode` (`UPDATE ... WHERE ... RETURNING`). El ARQ nombra este riesgo explícitamente ("corrupción de datos reales — primer ciclo que ESCRIBE sobre deudas con un motor") pero su mitigación declarada ("todo en `$transaction`") no resuelve la carrera específica, y FIN-012 la extiende: ahora una escritura perdida no solo desactualiza un saldo, sino que puede dejar `termMonths`/`monthlyPayment` inconsistentes con el saldo real.

## Riesgos

- Si el Hallazgo 1 no se corrige, el "recibo" de un abono a capital (una operación que el usuario ejecuta con dinero real y que queda persistida) mostrará una cifra de intereses ahorrados mayor a la real — un error de cara al usuario en el primer ciclo que escribe sobre el estado financiero real de su deuda, con el agravante de que el propio proyecto ya demostró, en ciclos anteriores, la disciplina de verificar estos cálculos con pruebas de ancla.
- Si el Hallazgo 2 no se corrige, el riesgo es de baja frecuencia (requiere dos escrituras casi simultáneas sobre la misma deuda) pero de alto impacto: una condición de carrera no detectada podría dejar el cronograma de amortización de un usuario desalineado con su saldo real, silenciosamente, sin ningún error visible.

## Fortalezas

- El diagnóstico de los cuatro gaps de producto (§2) está verificado contra el código real por el propio CTO antes de encargar el ARQ, no por informe del fundador — mismo estándar de rigor que se ha mantenido en todo el proceso de gobernanza.
- Principio rector de reutilizar los motores ya auditados (amortización, simulación, patrimonio, cuotas) en vez de duplicar lógica financiera — reduce genuinamente el riesgo de deriva entre módulos, cuando se aplica correctamente (ver Hallazgo 1 para el caso donde la reutilización elegida no es la correcta).
- Respeta con disciplina las dos invariantes de negocio ya cerradas por el fundador (FIN-015 sin captación real; FIN-016 acotado a Presupuesto/Dashboard, sin tocar Score/Motor/Gamificación/Recomendaciones/Memoria) y las hace **verificables**, no solo declaradas (criterio de aceptación por `grep` para FIN-016).
- FIN-013 declara con transparencia, en vez de resolver unilateralmente, la pregunta de si las primas de seguro deben impactar el Motor (DTI/gasto esencial) — la deja explícitamente para el DEC (§15.3), evitando una decisión de producto con implicaciones de riesgo financiero tomada por la arquitectura sin autorización.
- FIN-014 (dashboard agregador) compone servicios ya existentes en paralelo sin lógica financiera nueva, y preserva el endpoint anterior (`/transactions/dashboard`) sin romperlo — bajo riesgo de regresión.
- FIN-015 hereda correctamente el contrato ya establecido de FIN-007 (motor puro, cero escritura en series reales, disclaimer no removible) en vez de crear un patrón nuevo para la proyección de ahorro.
- Verificación adicional honesta: confirma que el ticket de "eliminar registro de presupuesto" del fundador ya existe extremo a extremo, evitando abrir un ciclo de gobernanza innecesario sobre algo que ya funciona.
- Exige regresión completa de los 272 tests existentes (FIN-001…009) en cada sub-ciclo — mismo estándar ya aplicado en DEC-0009.

## Oportunidades

- Calcular el efecto de un abono único directamente con `buildSchedule` sobre el saldo reducido (manteniendo cuota o plazo según el `effect` elegido), sin pasar por `simulateExtraPayment`; reservar esa función exclusivamente para su propósito original (abono recurrente mensual, ya usado por FIN-007).
- Adoptar el mismo patrón de actualización atómica ya probado en el proyecto (`UPDATE ... WHERE current_balance = @valorLeído ... RETURNING`, o `SELECT ... FOR UPDATE` dentro de la transacción) para toda escritura de `Debt.currentBalance` en FIN-012, no solo para las nuevas rutas — aprovechando el ciclo para cerrar también el gap ya existente en `transactions.service.ts`, ya que FIN-012 es precisamente el ciclo que reconoce este riesgo como el principal.

## Observaciones críticas

- **Hallazgo 1** se eleva a crítica: es un error de cálculo verificado contra el código, en la operación de mayor sensibilidad financiera del ciclo (un abono a capital real, con recibo persistido).
- **Hallazgo 2** se eleva a crítica: es una condición de carrera verificada contra el código existente, y FIN-012 la extiende a un recálculo más amplio (plazo y cuota, no solo saldo) en el primer sub-ciclo que escribe sobre el estado real de una deuda con un motor.

## Observaciones menores

Ninguna observación menor adicional: los sub-ciclos FIN-013, FIN-014, FIN-015 y FIN-016 no presentan hallazgos de esta auditoría más allá de las decisiones que el propio ARQ ya deja correctamente abiertas para el DEC (§15).

## Recomendaciones

1. Corregir el cálculo de FIN-012 para usar `buildSchedule`/`computeMonthlyPayment` sobre el saldo reducido, no `simulateExtraPayment`, tanto en el preview como en el recibo persistido.
2. Especificar un mecanismo de actualización atómica (o bloqueo de fila) para toda escritura de `Debt.currentBalance`, incluyendo las nuevas rutas de FIN-012 y, de ser posible en el mismo ciclo, el manejador existente de `pago_deuda` en `transactions.service.ts`.

## Priorización

| Recomendación | Clasificación |
|---|---|
| Corregir el cálculo de abono único (Rec. 1) | Debe hacerse antes del desarrollo — bloqueante para FIN-012 |
| Actualización atómica de `Debt.currentBalance` (Rec. 2) | Debe hacerse antes del desarrollo — bloqueante para FIN-012 |
| FIN-013, FIN-014, FIN-015, FIN-016 | Sin observaciones bloqueantes — pueden avanzar a DEC en paralelo |

## Veredicto

**REQUIERE AJUSTES** (alcance acotado a FIN-012 únicamente).

Los sub-ciclos FIN-013, FIN-014, FIN-015 y FIN-016 están bien diseñados, respetan las invariantes de negocio y no presentan hallazgos bloqueantes — pueden proceder a `DEC-0011` (o a los DEC individuales que el CTO decida) sin devolverse a la Arquitectura. FIN-012, en cambio, tiene dos defectos verificados contra el código en la operación de mayor riesgo del ciclo (abono a capital real): un error de cálculo que reutiliza la función equivocada del Motor, y una condición de carrera ya presente que el propio ciclo agrava. Dado que el propio ARQ señala a FIN-012 como el sub-ciclo de mayor riesgo, recomiendo que el CTO no autorice su implementación hasta que la Arquitectura corrija ambos puntos — sin necesidad de reescribir el resto del documento.

---
*Esta auditoría no implementa ni decide. Queda a la espera de la decisión oficial del CTO (`DEC-0011`).*
