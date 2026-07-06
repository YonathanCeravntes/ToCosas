# DEC-0011 · Umbrella — Mejoras de deuda, presupuesto y dashboard financiero

- **Documentos base:** `docs/arquitectura/ARQ-0011-Mejoras-Deuda-Presupuesto-Dashboard.md` · `docs/auditoria/AUD-0011-Mejoras-Deuda-Presupuesto-Dashboard.md`
- **Módulo/Feature:** FIN-011 (umbrella) — cubre FIN-012, FIN-013, FIN-014, FIN-015, FIN-016
- **Decide:** CTO/CPO/Principal Architect de Millo
- **Fecha:** 2026-07-05

---

## 1. Resumen ejecutivo

ARQ-0011 diagnostica correctamente, sobre verificación propia previa contra el código (no por informe), los cuatro gaps de producto que originaron este ciclo, y propone el principio correcto: reutilizar los motores ya auditados (amortización, simulación, patrimonio, cuotas) en vez de duplicar lógica financiera. Verifiqué de forma independiente los dos hallazgos que el auditor eleva a crítica, ambos exclusivos de FIN-012 (el sub-ciclo que el propio ARQ señala como el de mayor riesgo, por ser el primero que escribe sobre el saldo real de una deuda con un motor de recálculo): confirmé en `amortization.service.ts` que `extraMonthly` se aplica dentro del bucle `while` en **cada periodo** del cronograma — `simulateExtraPayment` modela una cuota extra recurrente mensual, no un abono único — así que usarla para un abono único (como propone §4.1) mostraría al usuario un ahorro de intereses inflado, como si se comprometiera a pagar ese extra todos los meses. Confirmé también en `transactions.service.ts` que el manejo de `pago_deuda` hace `findFirst` seguido de `update` calculado en memoria, sin bloqueo de fila ni actualización condicional atómica — la misma familia de condición de carrera que el proyecto ya resolvió con rigor para el outbox y para el canje de `PromoCode`, aquí no aplicada, y que FIN-012 agravaría al recalcular también plazo y cuota, no solo saldo.

AUD-0011: **REQUIERE AJUSTES, con el alcance acotado exclusivamente a FIN-012.** Los otros cuatro sub-ciclos (FIN-013, FIN-014, FIN-015, FIN-016) no presentan hallazgos bloqueantes. Aplico aquí la misma disciplina que distingue "defecto del mecanismo central" de "hueco de especificación periférico" (el estándar que usé para rechazar ARQ-0005 v1 y para exigir condiciones de entrada en DEC-0009): un error de cálculo que infla un ahorro de intereses mostrado al usuario, más una condición de carrera sobre dinero real, en la operación central de este sub-ciclo específico, no es un hueco periférico — **no autorizo el desarrollo de FIN-012 con el diseño actual.** Los otros cuatro sub-ciclos sí quedan autorizados a implementación en este mismo DEC.

## 2. Arquitecturas revisadas

- `docs/arquitectura/ARQ-0011-Mejoras-Deuda-Presupuesto-Dashboard.md` — v. 2026-07-05 (umbrella).

## 3. Auditorías revisadas

- `docs/auditoria/AUD-0011-Mejoras-Deuda-Presupuesto-Dashboard.md` — veredicto: **REQUIERE AJUSTES** (acotado a FIN-012; FIN-013/014/015/016 sin observaciones bloqueantes).

## 4. Decisiones aprobadas

1. **FIN-013 — Seguros asociados al crédito** (`DebtInsurance`: prima mensual, financiado/endosable, CRUD): aprobado tal como está diseñado. Se autoriza su implementación.
2. **FIN-013 — las primas NO impactan el Motor (DTI/gasto esencial) en este ciclo**: ratificado, consistente con la invariante (b) ya cerrada por el fundador (no reabrir Score/Motor). Si en el futuro se requiere que las primas cuenten como gasto fijo real, es una decisión de un ciclo nuevo con su propia evidencia.
3. **FIN-014 — Dashboard de Inicio v2** (`GET /dashboard/home` agregador, patrimonio + ahorro total + ingresos/gastos fijo+variable + movimientos completos, preserva `/transactions/dashboard`): aprobado. Es composición de servicios ya auditados, sin lógica financiera nueva — bajo riesgo.
4. **FIN-015 — Proyección de ahorro con interés compuesto** (escenario puro `proyeccion_ahorro` en `simulation-engine.ts`, disclaimer fijo no removible, cero escritura en BD): aprobado. Hereda correctamente el contrato ya establecido de FIN-007 (motor puro).
5. **FIN-015 — consume la cuota free de simulaciones (5/mes)**: ratificado, por consistencia con DEC-0009 §10.3 — no se crea una cuota paralela sin límite para un escenario nuevo.
6. **FIN-016 — Periodo financiero / día de corte** (`UserSettings.cycleStartDay`, rango 1–28, default 1; utilidad pura `financialPeriod()`; consumida **solo** por `BudgetService`/`GET /dashboard/home`): aprobado. La invariante (b) del fundador (Score/Motor/Gamificación/Recomendaciones/Memoria sin cambios) queda además **verificable por grep**, no solo declarada — correcto.
7. **Granularidad de cierre**: un `IMP` individual por sub-ciclo (cinco validaciones independientes), mismo estándar aplicado durante todo el roadmap original. Se ratifica.
8. **FIN-012 — efecto por defecto del abono = `reducir_plazo`**: ratificado como default (es la opción matemáticamente óptima en intereses), con el usuario pudiendo elegir `reducir_cuota` en cada operación. Aplica **una vez que FIN-012 sea corregido y re-auditado** (sección 10).
9. **FIN-012 — pago total anticipado sin cálculo de intereses causados del periodo en curso** (simplificación conservadora, favorece ligeramente al usuario): ratificado como v1. Aplica **una vez que FIN-012 sea corregido y re-auditado**.

## 5. Decisiones rechazadas

- **El diseño de FIN-012 tal como está en ARQ-0011 §4.1 no se aprueba para desarrollo.** No es un rechazo del sub-ciclo completo (el objetivo — abono a capital y pago total anticipado reales — sigue siendo correcto y necesario), sino del mecanismo de cálculo y persistencia propuesto, por las dos razones de la sección 10.

## 6. Observaciones aceptadas

- Hallazgo 1 (reutilización incorrecta de `simulateExtraPayment` para un abono único) — aceptado, **crítico**, bloqueante para FIN-012.
- Hallazgo 2 (condición de carrera en la escritura de `Debt.currentBalance`, agravada por el recálculo de plazo/cuota) — aceptado, **crítico**, bloqueante para FIN-012.

## 7. Observaciones descartadas

- Ninguna.

## 8. Riesgos aceptados

- **Pago total anticipado sin recalcular intereses causados del periodo en curso** (decisión aprobada §4.9): simplificación v1 que favorece ligeramente al usuario (paga un poco menos de lo que técnicamente devengaría un banco); riesgo de negocio menor, aceptado explícitamente, revisable con evidencia si se vuelve relevante.
- **Modelo mínimo de seguros** (prima mensual plana, sin cálculo actuarial): aceptado para v1, con campos libres para lo no modelado — correcto para no sobre-diseñar un dominio que Millo no necesita modelar con precisión de asegurador.

## 9. Riesgos pendientes

- **FIN-012 queda sin fecha de implementación** hasta que la Arquitectura entregue la corrección exigida en la sección 10 y esta pase de nuevo por auditoría (al menos del componente corregido, no de todo el ARQ-0011). No es un riesgo residual del sistema — es una autorización que deliberadamente no se otorga todavía.
- El patrón de lectura-y-escritura sin bloqueo sobre `Debt.currentBalance` (Hallazgo 2) **ya existe hoy** en producción de código (`transactions.service.ts`, manejador actual de `pago_deuda`), independientemente de FIN-012. Queda registrado como deuda técnica preexistente que este ciclo debe cerrar (sección 10), no como algo nuevo que FIN-012 introduce desde cero.

## 10. Cambios obligatorios

**Condición de entrada — bloqueante para autorizar el desarrollo de FIN-012 (no aplica a FIN-013/014/015/016, que sí quedan autorizados por este DEC):**

1. **Corregir el cálculo del abono único.** La Arquitectura debe rediseñar §4.1 para que el preview y el recibo persistido de un abono a capital único (y del pago total anticipado) se calculen recalculando el cronograma sobre el **saldo reducido** con `buildSchedule`/`computeMonthlyPayment` (sin `extraMonthly`) — nunca con `simulateExtraPayment`/`POST /debts/:id/simulate-extra`, que debe seguir reservada exclusivamente para su propósito original (abono recurrente mensual, ya usado por FIN-007). Debe incluir un test de ancla que compare el resultado contra un caso calculado a mano, y un test de regresión que confirme que `simulateExtraPayment` sigue devolviendo el mismo resultado que antes (no se le cambia semántica).
2. **Actualización atómica (o bloqueo de fila) para toda escritura de `Debt.currentBalance`.** Debe cubrir tanto las rutas nuevas de FIN-012 (`prepay`, `payoff`) como el manejador **ya existente** de `pago_deuda` en `transactions.service.ts` — este ciclo es la oportunidad correcta para cerrar ese gap preexistente, dado que es precisamente el ciclo que reconoce el riesgo. Patrón sugerido (mismo ya validado en el proyecto): `UPDATE debts SET current_balance = current_balance - $monto WHERE id = $id AND current_balance >= $monto RETURNING *` (o equivalente con `SELECT ... FOR UPDATE` dentro de la transacción de Prisma). Debe existir un test de concurrencia que sembre dos pagos simultáneos sobre la misma deuda y verifique que el saldo final es matemáticamente correcto (no "última escritura gana").
3. La Arquitectura debe someter la corrección como una revisión acotada de §4.1 (no es necesario reescribir ARQ-0011 completo) y el Auditor debe volver a verificar **solo esa sección** contra el código antes de que yo autorice el desarrollo de FIN-012.

**Para FIN-013/014/015/016 (ya autorizados), sin condición de entrada adicional** más allá de lo ya especificado en ARQ-0011 §13 (criterios de aceptación) y la regresión completa de los 272 tests existentes en cada sub-ciclo.

## 11. Plan técnico oficial

Se autoriza al agente Desarrollador a iniciar la implementación de **FIN-013, FIN-014, FIN-015 y FIN-016** siguiendo el plan de ARQ-0011 §14 (fases B, C, D, E — el orden interno queda a criterio del desarrollador, no es necesario respetar la numeración de fases si hay razones de eficiencia, siempre que cada sub-ciclo cierre con su propio `IMP` individual con SHA de commit).

**FIN-012 NO está autorizado.** La Arquitectura debe entregar primero la corrección de la sección 10 (cambios obligatorios #1 y #2), que el Auditor revisará de forma acotada, antes de que yo emita la autorización de desarrollo para ese sub-ciclo específico (mediante una adenda a este mismo DEC-0011, sin necesidad de un DEC nuevo).

Cada sub-ciclo autorizado cierra con:
1. Migración correspondiente (`debt_insurances` para FIN-013; `user_settings.cycle_start_day` para FIN-016; sin cambios de BD para FIN-014/015).
2. Backend + tests (incluyendo los criterios de aceptación de ARQ-0011 §13 para cada sub-ciclo).
3. Frontend correspondiente (detalle de deuda/seguros, Dashboard v2, chip de simulador, Ajustes).
4. Regresión completa de los 272 tests existentes (FIN-001…009) en verde.
5. Typecheck + bundle Android.
6. `docs/implementaciones/IMP-0XX.md` individual con SHA de commit + actualización de `docs/roadmap/BACKLOG.md`.

No se autoriza ninguna funcionalidad fuera de lo especificado en ARQ-0011 (reapertura de Score/Motor/Gamificación/Recomendaciones/Memoria, producto de rendimiento real, tools de LLM nuevas) dentro de este ciclo.

## 12. Prioridad

**Alta** para FIN-013/014/015/016 (gaps de producto ya confirmados con el fundador, bajo riesgo técnico). **Alta pero bloqueada** para FIN-012 (el de mayor valor de producto del conjunto — pago anticipado real es una funcionalidad muy solicitada — pero no se sacrifica corrección financiera ni integridad de datos por velocidad).

## 13. Estado final

**APROBADO CON AJUSTES, SEGMENTADO.** Se autoriza iniciar la implementación de FIN-013, FIN-014, FIN-015 y FIN-016 bajo el plan de la sección 11. **FIN-012 no está autorizado a desarrollo**: la Arquitectura debe corregir los dos hallazgos críticos de la sección 10 (cálculo del abono único; actualización atómica de `Debt.currentBalance`, incluyendo el gap preexistente en `transactions.service.ts`) y someterlos a una re-auditoría acotada antes de que yo emita la autorización correspondiente. Los gates heredados de FIN-005/FIN-009 (DPA, PIA, producción, política de tiendas) siguen vigentes sin cambios y no aplican a este ciclo. El cierre de cada sub-ciclo autorizado requiere su propio `IMP` con SHA de commit verificable, que validaré en checkout aislado antes de autorizar su cierre individual.

---
*Documento oficial — no modificar. Corresponde al ciclo de gobernanza de `docs/GOBERNANZA.md`.*
