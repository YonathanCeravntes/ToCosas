# ARQ-0011 · Umbrella — Mejoras de deuda, presupuesto y dashboard financiero

- **Módulo/Feature:** FIN-011 (umbrella de FIN-012, FIN-013, FIN-014, FIN-015, FIN-016)
- **Autor:** Agente Arquitecto
- **Fecha:** 2026-07-05
- **Estado:** Propuesto — en espera de auditoría (AUD-0011) y decisión oficial (DEC-0011 o DEC individuales por sub-ciclo, según segmente el CTO)
- **Documentos relacionados:** ARQ-0001 (umbrella original), DEC-0003 (Motor), DEC-0007 (Simulador), DEC-0009 (Monetización/cuotas), BACKLOG 2026-07-05 (7 puntos del fundador + 2 decisiones de negocio ya cerradas)

---

## 1. Objetivo

Segunda ronda post-roadmap: cerrar los gaps de producto confirmados por el CTO contra
el código real, sin reabrir ninguno de los 9 ciclos cerrados y validados. Cinco
sub-ciclos:

| Sub-ciclo | Qué entrega |
|---|---|
| FIN-012 | Abono a capital y pago total anticipado **reales** (persisten y recalculan la deuda) |
| FIN-013 | Seguros asociados al crédito (obligatorios financiados, endosables) |
| FIN-014 | Dashboard de Inicio v2 (patrimonio, ahorro total, ingresos y gastos fijo+variable, movimientos completos) |
| FIN-015 | Proyección de ahorro con interés compuesto (**solo simulación ilustrativa**) |
| FIN-016 | Periodo financiero / día de corte (**solo Presupuesto y Dashboard**) |

**Decisiones de negocio ya cerradas por el fundador (vinculantes para este ARQ):**
(a) FIN-015 es proyección/simulación ilustrativa únicamente — Millo no capta dinero ni
ofrece rendimiento, cero riesgo regulatorio nuevo; (b) FIN-016 se acota a
Presupuesto/Dashboard — Score, Motor Financiero, Gamificación, Recomendaciones y
Memoria **no cambian** y siguen en mes calendario.

## 2. Problema

Verificado contra el código (no por informe) por el CTO el 2026-07-05:

1. **Pago de deuda no recalcula nada.** `transactions.service.ts` (kind `pago_deuda`)
   solo descuenta `currentBalance` y marca `pagada` si llega a 0; nunca toca
   `termMonths`/`monthlyPayment` ni regenera amortización. El motor de FIN-002/007
   (`AmortizationService`, `simulateExtra`) ya calcula el efecto de un abono, pero es
   puramente simulado.
2. **No existe ningún concepto de seguro de crédito.** En Colombia los créditos de
   libranza/hipotecarios llevan seguros obligatorios (vida deudor, incendio/terremoto)
   frecuentemente financiados en la cuota y **endosables** (el usuario puede aportar su
   propia póliza y bajar la cuota). Millo no puede representar el costo real del
   crédito sin esto.
3. **El dashboard de Inicio está incompleto.** `monthlyDashboard()` solo agrega gastos
   variables por categoría; no hay ingresos por categoría, no diferencia fijo/variable
   (los `FixedItem` no aparecen), no expone patrimonio (existe `networth.util.ts` pero
   solo en `/net-worth`), no hay ahorro total ni proyección.
4. **Todo el sistema usa mes calendario UTC estricto.** Un usuario que cobra el 15 ve
   su presupuesto "reiniciarse" a mitad de su ciclo real de nómina.

## 3. Alcance

**Incluye:** todo lo listado en §1, backend + frontend + migraciones.
**Excluye explícitamente:**
- Reapertura de Score/Motor/Gamificación/Recomendaciones/Memoria (decisión fundador b).
- Producto de rendimiento/captación real (decisión fundador a).
- Nuevas tools de LLM (el Copiloto no gana capacidades en este ciclo → no se crean
  vistas minimizadas nuevas; la regla de minimización obligatoria queda sin superficie
  nueva que cubrir).
- El punto "eliminar registro de presupuesto" del fundador: **verificado — ya existe
  extremo a extremo** (`BudgetScreen.tsx` 🗑️ → `budgetApi.removeFixed` →
  `BudgetService.remove()` con soft-delete). Ticket cerrado sin código.

## 4. Arquitectura propuesta

Principio rector: **reutilizar los motores ya auditados** (amortización de FIN-002/003,
simulación de FIN-007, patrimonio de FIN-002, cuotas de FIN-009) y añadir persistencia
o agregación encima; ningún algoritmo financiero nuevo salvo la fórmula estándar de
interés compuesto (FIN-015, pura).

### 4.1 FIN-012 — Abono a capital y pago total anticipado

- **Puerta de entrada: módulo `debts`** (no `transactions`), porque el recálculo es
  dominio de la deuda. El endpoint crea internamente la `Transaction` (kind
  `pago_deuda`) dentro de la misma `$transaction` de Prisma + evento outbox — una sola
  fuente de movimientos se mantiene, y WhatsApp/Telegram pueden mapear a estos
  endpoints en el futuro sin duplicar lógica.
- `POST /debts/:id/prepay { amount, effect: 'reducir_plazo' | 'reducir_cuota' }`:
  1. Valida `amount > 0` y `< currentBalance` (si es ≥, redirige el flujo a payoff).
  2. Reduce `currentBalance`, recalcula con `AmortizationService`:
     - `reducir_plazo`: cuota constante → nuevo `termMonths` (y `nextDueDate` se
       conserva); es el efecto matemáticamente óptimo (menos intereses).
     - `reducir_cuota`: plazo constante → nuevo `monthlyPayment`.
  3. Persiste deuda + `Transaction` + outbox (`DebtBalanceChanged`, ya existente) en
     una transacción atómica.
  4. Respuesta incluye el delta (intereses ahorrados, meses/cuota nuevos) reutilizando
     el mismo cálculo de `simulateExtra` — lo que antes era simulación ahora es recibo.
- `POST /debts/:id/payoff {}`: liquida — `currentBalance → 0`, `status: 'pagada'`,
  `Transaction` por el saldo, outbox. El insight `logro_deuda_saldada` (dedupe
  per-entity de FIN-006) se dispara solo por el flujo existente, sin código nuevo.
- **Preview antes de confirmar** en UI reutilizando `POST /debts/:id/simulate-extra`
  (ya existe): el usuario ve el efecto y confirma.

### 4.2 FIN-013 — Seguros asociados al crédito

- Nuevo modelo `DebtInsurance`:
  `{ id, debtId, kind: vida_deudor|incendio_terremoto|todo_riesgo|desempleo|otro,
  monthlyPremium Decimal, financed Boolean (va dentro de la cuota),
  endorsed Boolean (póliza propia del usuario), insurer String?, notes String?,
  active Boolean, deletedAt? }` — soft-delete como el resto del dominio.
- Efectos (solo capa de presentación/costo en este ciclo):
  - Detalle de deuda muestra **cuota total real** = `monthlyPayment` + primas activas
    no financiadas; y desglose de las financiadas dentro de la cuota.
  - Proyección de la deuda (`projection`) suma primas al **costo total** del crédito.
  - Flujo "endosar": marcar `endorsed=true` con nueva prima → el ahorro mensual se
    muestra al instante (argumento de valor típico en libranzas).
- **No toca el Motor** (DTI/gasto esencial siguen igual) — propuesto así para respetar
  la decisión (b) del fundador; si el CTO quiere que las primas cuenten como gasto fijo
  del Motor, es decisión de DEC (§17.3).
- CRUD: `GET/POST /debts/:id/insurances`, `PATCH/DELETE /debts/insurances/:id`.

### 4.3 FIN-014 — Dashboard de Inicio v2

- Nuevo endpoint agregador `GET /dashboard/home` (módulo nuevo `dashboard`, thin):
  compone en paralelo servicios existentes, sin lógica financiera nueva:
  ```
  {
    period: { start, end, label },            // de FIN-016 si hay día de corte
    netWorth,                                  // networth.util (FIN-002)
    totalSavings: { total, emergencyFund },    // cuentas ahorros + isEmergencyFund
    income:  { fixed, variable, total, byCategory[] },   // FixedItem kind=ingreso + tx ingreso
    expense: { fixed, variable, total, byCategory[] },   // FixedItem kind=gasto + tx gasto
    debtPayments,
    recentTransactions[]                       // últimas 10, completas (con categoría/deuda)
  }
  ```
- `Dashboard` actual de `/transactions/dashboard` se mantiene (no breaking); la
  pantalla de Inicio migra al nuevo endpoint. "Movimientos completos": las 10 últimas
  en el home + acceso a la lista completa ya existente (`/transactions`).
- Frontend: `DashboardScreen` v2 — tarjetas patrimonio, ahorro total (con CTA a la
  proyección de FIN-015), ingresos fijo+variable, gastos fijo+variable diferenciados
  (el widget "¿en qué se te va la plata?" pasa a mostrar ambos), movimientos.

### 4.4 FIN-015 — Proyección de ahorro con interés compuesto (ilustrativa)

- Nuevo escenario **puro** `proyeccion_ahorro` en `simulation-engine.ts` (octavo caso
  del switch): inputs `{ initialAmount?, monthlyContribution, annualRatePct, months }`;
  interés compuesto estándar con capitalización mensual
  (`i_m = (1+EA)^(1/12) − 1`, consistente con la conversión de tasas ya usada por
  `AmortizationService`). Output: valor final, aportes totales, interés ganado, serie
  anual para graficar.
- **Guardarraíles de la decisión (a):** la tasa la ingresa el usuario (con presets
  ilustrativos tipo "cuenta de ahorros ~8% EA"), el resultado lleva disclaimer fijo
  "Proyección ilustrativa — Millo no ofrece productos de inversión ni garantiza
  rendimientos", y **no** escribe en cuentas/series reales (mismo contrato de FIN-007:
  el motor nunca persiste).
- Cuenta contra la cuota de 5 simulaciones/mes free (consistencia DEC-0009 §10.3) —
  confirmable en DEC (§17.4).
- UI: quinto chip en `SimulatorScreen` + CTA desde la tarjeta de ahorro del Dashboard v2.

### 4.5 FIN-016 — Periodo financiero / día de corte

- `UserSettings.cycleStartDay Int @default(1)` (rango validado **1–28** para que
  exista en todos los meses).
- Utilidad pura `financialPeriod(now, cycleStartDay) → { start, end, label }`
  (ej. "15 jun – 14 jul") con tests de bordes (fin de mes, año nuevo, TZ Bogotá).
- **Solo la consumen** `BudgetService.monthly()` y `GET /dashboard/home`. Invariante
  vinculante (decisión b): Score, Motor (jobs y `metric_readings` por `period`
  calendario), Gamificación (semanas ISO), Recomendaciones y Memoria **no importan la
  utilidad** — criterio de aceptación verificable por grep en la revisión.
- UI: Ajustes → "Día de inicio de tu ciclo financiero" (selector 1–28); el Presupuesto
  y el Dashboard muestran la etiqueta del periodo activo para que la divergencia con el
  Score (mes calendario) sea explícita y no un bug percibido.

## 5. Componentes

| Componente | Sub-ciclo | Tipo |
|---|---|---|
| `DebtPrepaymentService` (+ endpoints prepay/payoff en `debts.controller`) | FIN-012 | Nuevo, reutiliza `AmortizationService` |
| Modelo `DebtInsurance` + `DebtInsuranceService` + CRUD | FIN-013 | Nuevo |
| Módulo `dashboard` (`GET /dashboard/home`, agregador thin) | FIN-014 | Nuevo |
| Escenario `proyeccion_ahorro` en `simulation-engine.ts` | FIN-015 | Extensión pura |
| `financialPeriod()` util + `UserSettings.cycleStartDay` | FIN-016 | Nuevo util + columna |
| Frontend: detalle de deuda (abonos/seguros), Dashboard v2, chip simulador, Ajustes | todos | Extensión |

## 6. Cambios en base de datos

- **FIN-012:** ninguna tabla nueva. `Transaction` gana columna opcional
  `paymentType: 'cuota'|'abono_capital'|'pago_total'` (default `'cuota'`,
  retrocompatible) para trazabilidad del tipo de pago.
- **FIN-013:** tabla `debt_insurances` (modelo §4.2) + índice `(debt_id, active)`.
- **FIN-016:** columna `user_settings.cycle_start_day int NOT NULL DEFAULT 1`.
- **FIN-014/015:** sin cambios de BD.
- Una migración por sub-ciclo, hand-written + `prisma migrate deploy` (práctica del
  proyecto en Windows).

## 7. Cambios en backend

Detallados en §4. Transversal: todos los flujos de escritura de FIN-012 van en
`$transaction` con eventos outbox existentes (el Motor recalcula solo, sin código
nuevo); validación de entrada con DTOs `class-validator` como el resto del proyecto;
sin dependencias npm nuevas.

## 8. Cambios en frontend

- Detalle de deuda: sección "Abonar / Pagar" (preview → confirmar) y sección "Seguros"
  (lista + alta + endoso).
- `DashboardScreen` v2 (§4.3). `SimulatorScreen`: chip `proyeccion_ahorro` con
  disclaimer. `SettingsScreen`: selector de día de corte.
- `api/types.ts` + `endpoints.ts`: tipos nuevos (`PrepayResult`, `DebtInsurance`,
  `HomeDashboard`, inputs de proyección).

## 9. Uso de IA

Ninguno nuevo. No se crean tools de LLM ni vistas minimizadas (nada nuevo viaja al
Copiloto). Si un ciclo futuro expone estos datos al Copiloto, aplicará la regla
vigente de vistas minimizadas obligatorias.

## 10. Riesgos y mitigaciones

| Riesgo | Sub-ciclo | Mitigación |
|---|---|---|
| Recalcular mal la deuda al abonar (corrupción de datos reales — primer ciclo que ESCRIBE sobre deudas con un motor) | FIN-012 | Reutilizar `AmortizationService` intacto; preview=recibo (mismo cálculo); tests con casos contables conocidos; abono nunca deja `currentBalance<0`; todo en `$transaction` |
| Doble contabilidad del abono (endpoint debts + POST /transactions manual) | FIN-012 | `paymentType` distingue; el endpoint es la única ruta que recalcula; un pago manual sigue comportándose como hoy (solo descuenta saldo) — documentado en UI |
| Percepción de asesoría de inversión | FIN-015 | Disclaimer fijo no removible + tasa ingresada por el usuario + cero persistencia (decisión fundador a) |
| Divergencia visual ciclo vs. mes calendario del Score | FIN-016 | Etiqueta del periodo siempre visible; invariante verificable por grep (§4.5) |
| Dashboard v2 lento (agrega 5 fuentes) | FIN-014 | Agregador compone consultas ya indexadas en paralelo (`Promise.all`); sin N+1 |
| Seguros mal representados (dominio asegurador complejo) | FIN-013 | Modelo mínimo (prima mensual plana); sin cálculo actuarial; campos libres para lo no modelado |

## 11. Dependencias

- FIN-012 → `AmortizationService` (FIN-002/003), outbox (FIN-002), insights (FIN-006).
- FIN-013 → FIN-012 solo por pantalla compartida (detalle de deuda); independiente en backend.
- FIN-014 → `networth.util` (FIN-002), `BudgetService` (previo), FIN-016 (si hay día de corte, lo usa; si no, mes calendario).
- FIN-015 → `SimulationEngine` (FIN-007), cuota de simulaciones (FIN-009).
- FIN-016 → ninguna; es base opcional de FIN-014.
- **Orden propuesto de implementación:** FIN-012 → FIN-016 → FIN-014 → FIN-013 → FIN-015
  (el CTO puede segmentar distinto en los DEC).

## 12. Impacto en lo existente

- Cero cambios en Score/Motor/Gamificación/Recomendaciones/Memoria (invariante).
- `/transactions/dashboard` se conserva (sin breaking); Inicio migra a `/dashboard/home`.
- La regresión completa FIN-001…009 (272 tests actuales) debe seguir verde en cada
  sub-ciclo — mismo estándar de DEC-0009 §11.
- Cuota free de simulaciones pasa a repartirse entre 8 escenarios (antes 7) sin cambiar
  el límite.

## 13. Criterios de aceptación

**FIN-012:** abono con `reducir_plazo` produce el mismo resultado que `simulate-extra`
para los mismos inputs (test de paridad); abono con `reducir_cuota` mantiene
`termMonths` y baja `monthlyPayment`; payoff deja `currentBalance=0`, `status=pagada`,
crea Transaction y dispara `logro_deuda_saldada` (E2E); un `POST /transactions` manual
kind `pago_deuda` sigue comportándose exactamente como hoy (regresión).
**FIN-013:** CRUD completo; cuota total mostrada = cuota + primas no financiadas;
endoso recalcula el display al instante; el Motor no cambia ningún valor con/sin
seguros (test de no-impacto).
**FIN-014:** `/dashboard/home` devuelve las 6 secciones con datos consistentes contra
los endpoints fuente (test de consistencia); ingresos/gastos distinguen fijo/variable.
**FIN-015:** fórmula validada contra valores conocidos (test numérico); disclaimer
presente en API y UI; cero escrituras en BD (motor puro); consume cuota free.
**FIN-016:** `financialPeriod` con tests de bordes; grep confirma que solo
Budget/Dashboard la importan; con `cycleStartDay=1` el comportamiento es idéntico al
actual (retrocompatibilidad total).

## 14. Plan de implementación por fases

1. **Fase A (FIN-012):** migración `paymentType` → `DebtPrepaymentService` + endpoints
   + tests de paridad → UI detalle de deuda → E2E (abono, payoff, insight).
2. **Fase B (FIN-016):** columna + util + tests de bordes → Budget/Dashboard la
   consumen → selector en Ajustes.
3. **Fase C (FIN-014):** módulo dashboard + test de consistencia → DashboardScreen v2.
4. **Fase D (FIN-013):** migración `debt_insurances` → CRUD + display de cuota total →
   UI seguros/endoso.
5. **Fase E (FIN-015):** escenario puro + test numérico → chip en simulador + CTA.
6. Cada fase cierra con: typecheck backend+frontend, suite completa verde, bundle
   Android, commit con SHA e IMP individual (o consolidado, según decida el DEC).

## 15. Decisiones que corresponden al DEC (§17 del formato umbrella)

1. **FIN-012 — efecto por defecto del abono:** propuesta `reducir_plazo` (óptimo en
   intereses); el usuario siempre puede elegir.
2. **FIN-012 — pago total:** propuesta liquidar por `currentBalance` (sin cálculo de
   intereses causados del periodo en curso — simplificación conservadora); ¿aceptable?
3. **FIN-013 — ¿las primas impactan el Motor (DTI/gasto esencial)?** Propuesta: NO en
   este ciclo (solo display/costo total), coherente con la decisión (b) del fundador.
4. **FIN-015 — ¿la proyección consume cuota free de simulaciones?** Propuesta: sí
   (consistencia DEC-0009).
5. **FIN-016 — rango y default del día de corte:** propuesta 1–28, default 1
   (retrocompatible).
6. **Granularidad de cierre:** ¿un IMP por sub-ciclo (5 validaciones) o IMP por fase
   agrupada? Propuesta: IMP individual por sub-ciclo, mismo estándar del roadmap
   original.
