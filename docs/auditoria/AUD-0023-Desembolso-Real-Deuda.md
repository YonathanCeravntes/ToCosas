# AUD-0023 · Desembolso real de deuda como "lo comprometido" (§32)

- **Documento auditado:** `docs/arquitectura/ARQ-0023-Desembolso-Real-Deuda.md` v1.0
- **Insumos:** hilos FIN-022/FIN-023 · `DEC-0011` §4.2 (deuda declarada que salda) · `GOBERNANZA.md` §31/§32 · código verificado contra `HEAD` (`git show`/`git grep`)
- **Realiza:** Auditor de Milla
- **Fecha:** 2026-07-12

---

## 1. Resumen Ejecutivo

`ARQ-0023` es la cuarta aplicación consecutiva del patrón de fuente única por
construcción, ahora sobre "lo comprometido" por deuda: `totalMonthlyOutlay` (FIN-013)
pasa de dato de display a fuente inyectada por todos los consumidores que hoy usan
`monthlyPayment` a secas. El diseño es correcto y salda una deuda **declarada**
(`DEC-0011` §4.2), no un descuido. Verifiqué los tres puntos que el Arquitecto pidió y
el núcleo §32; **los tres resuelven a favor** y la fuente única es correcta, no solo
centralizada. Observaciones no bloqueantes, más dos decisiones de alcance para el CTO.

## 2. Los tres puntos que el Arquitecto pidió verificar

### Punto 1 — Ciclos de módulos (P2 Alt A) → **SIN CICLOS, confirmado**

P2 Alt A hace que Budget, Motor, Copiloto y Messaging importen `DebtsModule` (donde vive
`DebtInsuranceService`). Mapeé el grafo sobre `HEAD`:
`DebtsModule → {FinanceModule, AuthModule, RemindersModule, SimulationsModule}`;
`SimulationsModule → {Auth, BillingModule}`; `BillingModule → {Auth}`. `git grep` de
`BudgetModule|FinancialEngineModule|CopilotModule|MessagingModule` en **todo el subárbol
de Debts** (debts/simulations/billing/finance/reminders/auth): **cero coincidencias** —
nada en ese subárbol reimporta a los cuatro nuevos importadores. **No hay ciclo.**
*Observación menor:* Budget, Motor y Messaging pasan a arrastrar transitivamente
Simulations+Billing (mayor acoplamiento). Si molestara, `outlaysByUser` podría vivir en
un módulo más liviano; no bloquea.

### Punto 2 — Frontera §2 (`minPayment` de simulaciones/sugerencias NO es compromiso) → **DE ACUERDO, y es requisito de CORRECTITUD**

`simulation-engine.ts:200` usa `minPayment: d.monthlyPayment` como insumo de
amortización. No es una decisión de alcance discrecional: **debe** seguir siendo la
cuota que amortiza. Los cargos aparte (seguro/cuota de manejo) NO reducen el saldo;
usar el `outlay` ahí **sobreestimaría la velocidad de pago** y falsearía payoffDate e
intereses. La frontera no solo no tiene fuga — invertirla introduciría un bug. Confirmo
la frontera tal como está declarada.

### Punto 3 — Cascada sobre Score/DTI/fondo → **NINGÚN corte ni texto exige recalibración**

Los cortes (`DEBT_RATIO_CUTS`, `EmergencyFundMonths` 6/3) y los textos operan sobre
**ratios/meses derivados del insumo**, no sobre el insumo crudo. Corregir `debtMonthly`/
`essential` mueve los VALORES (DTI sube, cobertura baja) pero no las ESCALAS — mismo
razonamiento que `AUD-0021`. Confirmo: cambia el insumo, no la regla. *Matiz declarado
por el ARQ y correcto:* a diferencia de FIN-021 (cambio definicional), aquí el Score/
fondo/DTI de usuarias con cargos aparte **empeora de un día para otro** — es la promesa
"nunca mentir hacia arriba" materializándose; el ARQ lo difiere a RC y a los insights de
cambio de banda del Motor. No bloqueante.

## 3. Núcleo §32 — la fuente única es correcta, no solo centralizada

- **`paymentBreakdown` (`debt-insurance.service.ts:85`): `totalMonthlyOutlay =
  monthlyPayment + separate`** — solo suma las primas/cargos **aparte**; las
  **financiadas** ya están dentro de la cuota y NO se doble-cuentan. La fuente única
  nace correcta; el mismo `paymentBreakdown` ya auditado en FIN-013 aplica a
  `cuota_manejo` (Alt A reusa la maquinaria financiado/aparte). ✓
- **Inventario de 6 consumidores verificado** contra código (`monthlyPayment` como
  compromiso): `spendable.service.ts:109`, `engine.service.ts:53`,
  `budget.service.ts:105,132`, `context-assembler.ts:149`, `conversation.service.ts:171`.
  ✓
- **Consumidor 3 (Recomendaciones) se corrige solo** al corregir el Motor, porque lee
  `EssentialExpense` persistida (herencia de FIN-021) — cadena por construcción correcta,
  **pero su correctitud DEPENDE de que el consumidor 2 (Motor) se corrija**; el `IMP`
  debe fijar ese orden (test de que la lectura persistida ya incluye outlay).
- P2 Alt A (método único inyectado) es el patrón correcto — mismo argumento que ganó en
  FIN-020 P2 y `DEC-0021` §5.1; Alt B ("coincide hoy") correctamente rechazada.

## 4. P1 — Modelo de la cuota de manejo

Alt A (extender `DebtInsuranceKind` con `cuota_manejo`) es la de menor radio de daño:
enum + `ALTER TYPE ADD VALUE` no destructivo, cero migración de datos, reusa
`paymentBreakdown`. La **deuda semántica está declarada** (la tabla se llama "insurances";
`endorsed`/`insurer` no aplican al cargo). Concuerdo con Alt A. **Condiciones que el
`IMP` debe cumplir y el `DEC` exigir:** (1) validación server-side en el DTO que rechace
`endorsed=true` con `cuota_manejo` (400) — no solo ocultarlo en la UI; (2) **sin default
en ninguna capa** (grep de literales, criterio §13.4) — el Fundador fue explícito: la
cuota de manejo se aporta, nunca se asume.

## 5. Observaciones

1. **`available` del context-assembler — precisión del ARQ §5.** El ARQ dice que el
   `available` (hallazgo de `VALIDACION-0020`) "NO se toca". Es cierto como *concepto*
   (su unificación con `teQueda` sigue siendo la futura FIN de Copiloto), pero
   `available` (`context-assembler.ts:177`) se calcula con `debtMonthly` (línea 149),
   que **sí** se corrige aquí — así que su componente de deuda se vuelve más honesto como
   efecto colateral. Es beneficioso; solo conviene que el ARQ/IMP lo diga con precisión
   (mejora el insumo de `available`, no lo unifica).
2. **P4 toca FIN-022, aprobada hace horas** (una línea condicional). Aceptable, pero el
   `DEC` debe autorizarlo explícitamente como alcance de FIN-023 (no dejar que una
   experiencia recién cerrada se modifique sin decisión registrada).
3. **P5 (consumidores 5–6, Copiloto/Messaging) exceden el encargo original de 3
   consumidores** — el ARQ lo marca honestamente como "propuesto". Es una decisión de
   alcance del CTO: incluirlos (recomendable — cierran el §32 completo) o registrarlos
   como §32 conocido con dueño. No es defecto.

## 6. Filtro §31 y experiencia de usuario (§28-29, §32)

- **§31:** de acuerdo con el ARQ §5 — no aplica en su forma de cierre (deuda técnica
  §32; no crea ni elimina experiencia). Correcto.
- **§28-29:** la corrección es de backend; lo visible nuevo es el alta "Cuota de manejo"
  y las líneas condicionales P3/P4 ("incluye seguros y cargos", "Con seguros y cargos:
  {totalOutlay}"). Riesgo de interpretación (Q1/Q6): el número mayor debe leerse como el
  compromiso REAL, no como un error — el copy condicional lo explica. El empeoramiento
  nocturno del Score/fondo (Q6) es el único punto emocionalmente sensible; correctamente
  diferido a RC/insights. Sin jerga nueva.

## 7. Recomendaciones

1. `IMP`: fijar el orden de corrección (Motor antes que la lectura de Recomendaciones) y
   testear que la persistida ya incluye outlay (§3).
2. `DEC`: exigir validación server-side de `endorsed` para `cuota_manejo` y grep de
   "sin default" (§4).
3. `DEC`: decidir explícitamente el alcance de P4 (tocar FIN-022) y P5 (consumidores
   5–6).
4. Precisar el wording del ARQ §5 sobre `available` (§5.1).

## 8. Priorización

- **Bloqueante:** nada de diseño. Las condiciones de §4 (validación `endorsed`, sin
  default) son bloqueantes **para el `IMP`**, no para el `DEC`.
- **No bloqueante:** observaciones §5 y decisiones de alcance del CTO (P4/P5).

## 9. Veredicto

**APROBADO CON OBSERVACIONES.**

El diseño resuelve §32 por construcción para el tercer concepto financiero, con la fuente
única correcta (financiado no se doble-cuenta), sin ciclos de módulos (verificado), con
la frontera de amortización correcta (es requisito, no elección) y sin recalibración de
cortes. Alt A para la cuota de manejo es la de menor riesgo. Las observaciones son
precisables sin rehacer el diseño; las dos decisiones de alcance (P4 tocar FIN-022, P5
incluir Copiloto/Messaging) corresponden al CTO antes del `DEC`, y las condiciones del
modelo de cargo (rechazo de `endorsed`, sin default) deben quedar como verificación
obligatoria del `IMP`.
