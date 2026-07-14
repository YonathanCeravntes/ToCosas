# AUD-0027 · Evolución del modelo de ingresos personales

- **Documento auditado:** `docs/arquitectura/ARQ-0027-Modelo-de-Ingresos.md` v1.0 (commit `0b1b044`)
- **Insumos:** `docs/correspondencia/FIN-027-Modelo-de-Ingresos.md` · `GOBERNANZA.md` v3.14 §31/§32/§36 · código verificado contra `HEAD`
- **Realiza:** Auditor de Milla
- **Fecha:** 2026-07-13

---

## 1. Resumen Ejecutivo

`ARQ-0027` introduce un concepto oficial nuevo — "ingreso neto disponible" — con la misma
disciplina §32 de fuente única por construcción (`NetIncomeService` en módulo hoja,
patrón `SpendableService`/`DebtOutlayModule`) que ya cerró tres conceptos. El problema es
real y verificado. Sin hallazgos bloqueantes; una decisión sustantiva (DTI neto vs bruto)
correctamente diferida al CTO.

## 2. Problema verificado contra código

- `core-metrics.ts:36` `incomeRef(fixedIncome, actualIncome) = Math.max(...)` alimenta
  `ref` (`:46`) → DTI, capacidad de ahorro y Score: **todo trabaja sobre BRUTO**.
  Confirmado. Para un independiente que paga su salud/pensión aparte, el sistema le
  muestra como suyo un ingreso que aún debe pagar — el §32 de "Te queda" a escala del
  ingreso. Real, no hipotético.
- Los modelos `IncomeProfile`/`IncomeSource`/`Deduction`/`NetIncome*` **no existen** en el
  schema (grep vacío) — es concepto nuevo, no un rediseño.

## 3. Diseño §32 y arquitectura

- **P3 `NetIncomeService` (módulo hoja):** correcto — misma solución que evitó ciclos en
  FIN-023; los 6 consumidores lo inyectan; criterio de grep "neto solo en el servicio"
  (§13.1). Fuente única por construcción.
- **`withheldAtSource` (diseño derivado):** acertado y necesario. Distingue deducción
  retenida (reduce neto, no sale de la cuenta) de pagada-por-la-usuaria (además compromiso
  del ciclo → se expone a `SpendableService` por inyección, sin tocar su fórmula). Sin
  este flag el independiente vería inflado su "Te queda" o el empleado descontaría dos
  veces — el ARQ lo previene. Coherente con la cadena §32 ya construida.
- **P2 migración de `FixedItem(kind='ingreso')` → `IncomeSource`:** reversible
  (`deletedAt`, no borrado físico) — alineado con §35 (nunca perder historial). Es una
  migración de datos que toca el alta de ingreso del Presupuesto; §36.3 exige verificarla
  (`migrate deploy` sobre BD demo antes de producción) — el ARQ lo declara (§10).

## 4. La decisión diferida (P4-Motor) — bien planteada

El ARQ **no decide solo** si el DTI va sobre neto o bruto: presenta (a) neto en todo
(coherente con "nunca mentir hacia arriba", Score baja para quien tiene deducciones —
como FIN-023) vs (b) bruto para DTI/convención bancaria, neto para el resto. Recomienda
(a) con el efecto declarado. **Correcto que sea decisión del CTO en el `DEC`** — es un
juicio de producto/convención, no de arquitectura. Observo: la opción (b) reintroduciría
DOS referencias de ingreso (bruto para DTI, neto para el resto), lo que roza el espíritu
§32; si el CTO la elige, debe declararse explícitamente por qué la dualidad es aceptable
aquí (convención regulatoria), como excepción documentada.

## 5. Observaciones (no bloqueantes)

1. **Estimados de ingreso variable:** riesgo de fabricar certeza — el ARQ lo mitiga con
   lenguaje de estimación (§29) y manteniendo `teQueda` sobre SOLO lo real. El `IMP` debe
   fijar por test que el estimado nunca alimenta `teQueda`.
2. **Regresión (crítica):** usuaria sin perfil → `NetIncomeService` degrada a las cifras
   de hoy (neto = bruto declarado). Es la garantía de cero regresión; debe ser test
   explícito (criterio §13.4) y verificarse en la Validación.
3. **Alcance/Registrar:** el ARQ declara que Registrar/Transacciones no se toca y el aviso
   permanente si el detalle lo exigiera. Correcto.

## 6. Filtro §31 y experiencia (§28-29)

- **§31:** sustantiva — "la pieza que hace que 'de cada $100 que te entraron' sea verdad
  para cualquier forma de ganarse la vida". Valor diferencial claro; ninguna pantalla lo
  absorbe. Cumple.
- **§28-29:** el efecto sensible es el Score/DTI que se sincera (baja) para quien registre
  deducciones — cuarto capítulo de "nunca mentir hacia arriba"; declarado, a mirar en RC.
  Sin jerga nueva (kinds llanos; empleadores NO entran a la vista minimizada — correcto).

## 7. Veredicto

**APROBADO CON OBSERVACIONES.**

Concepto nuevo con fuente única por construcción, problema real (todo el sistema sobre
bruto), y la decisión de convención (DTI neto/bruto) correctamente diferida al `DEC`. Las
observaciones son de implementación (regresión sin-perfil como test duro; estimado nunca
en `teQueda`; migración verificada §36.3). Si el `DEC` elige "bruto para DTI", debe
documentar la dualidad como excepción §32. Ninguna observación exige rehacer el diseño.
