# AUD-0024 · Mora de deudas — visibilidad y conciliación (iteración 1)

- **Documento auditado:** `docs/arquitectura/ARQ-0024-Mora.md` v1.1
- **Insumos:** `COMPRENSION-FIN024-Mora.md` · hilo FIN-024 · `GOBERNANZA.md` §29/§31/§32 · código verificado contra `HEAD` (`git show`/`git grep`)
- **Realiza:** Auditor de Milla
- **Fecha:** 2026-07-13

---

## 1. Resumen Ejecutivo

`ARQ-0024` v1.1 corrige un bug fundacional real (dos escritores con semánticas opuestas
sobre `debt.nextDueDate` — la clase §32 sobre una fecha) y, sobre esa base, hace visible
y accionable el estado de mora de deudas, sin motor nuevo, sin tocar Score/Salud ni
`SpendableService`. Verifiqué los tres puntos que el Arquitecto pidió y el núcleo del
diseño; **los tres se sostienen**. Observaciones no bloqueantes, casi todas precisiones
para el `IMP`.

## 2. Los tres puntos que el Arquitecto pidió verificar

### Punto 1 — ¿Alguien más escribe/lee `reminder.dueDate` de deuda como autoritativo? → **NO, Alt A es segura**

- **El doble escritor es real:** `reminders.service.ts:162-171` — `rollToNextMonth =
  r.debtId != null && remaining <= 0` escribe `debt.nextDueDate = addOneMonth(...)` **sin
  comprobar pago alguno** (solo que llegó el vencimiento). Confirmado el conflicto con la
  semántica FIN-018 (avanza al PAGAR, en `debt-prepayment.service.ts:110,148`).
- **Escritores de `debt.nextDueDate`:** creación (`debts.service.ts:50`), flujo de pago
  (`debt-prepayment`), y el cron (`reminders.service:170`). P1 elimina el tercero →
  quedan creación + pago = una sola semántica (FIN-018). ✓
- **`git grep` de `.dueDate` como lectura autoritativa fuera de `reminders`: cero
  coincidencias.** Nadie externo depende de `reminder.dueDate`; volverlo dato legado para
  recordatorios de deuda no rompe ningún consumidor. La premisa de Alt A se sostiene.

### Punto 2 — `shouldFireToday` con fecha vencida (¿loop/spam?) → **NO re-dispara, por construcción**

`reminder.util.ts`: `shouldFireToday = offsetsDays.includes(daysUntil(dueDate, today))`
con offsets `[3,1,0]`. Con la fecha ya vencida, `daysUntil` es **negativo** →
`[3,1,0].includes(negativo) = false` → **no dispara**. Bajo Alt A (evaluando contra la
`nextDueDate` real, que se queda en el pasado si no se paga) el recordatorio **calla tras
vencer** — exactamente el comportamiento declarado (el aviso post-vencimiento es FIN-025).
`lastSentAt` (`:113`, dedup mismo día) es una segunda barrera. **Sin loop ni spam.** ✓

### Punto 3 — Exponer `overdueDays` en el summary no rompe el contrato de Inicio → **correcto, es aditivo**

`overdueDays` es un campo **nuevo** (null si no vencida); Inicio consume
`totalDebt`/`monthlyPaymentsTotal`/`upcoming` del mismo summary y **no lee**
`overdueDays`. Añadirlo no altera ningún campo existente. Seguro **siempre que el `IMP`
lo agregue como campo nuevo** (no reforme la forma de los existentes) — verificación §13.2
lo cubre con el test de regresión "deuda al día → sin cambios visuales". ✓

## 3. Núcleo §32 y frontera

- **P1 es el fix §32 correcto sobre una fecha:** una sola fuente autoritativa
  (`debt.nextDueDate` con semántica FIN-018), el recordatorio deriva de ella — no puede
  desincronizarse. Corrige de paso el bug latente inverso (recordatorio de una cuota ya
  pagada cuando el pago adelantó la fecha). Mismo patrón de fuente única de FIN-020/021/023.
- **Frontera respetada:** `SpendableService` §4.1-bis NO se toca (mora informa, no
  recalcula "lo comprometido"); Score/Salud sin cortes nuevos (P3, semilla registrada —
  mismo criterio `DEC-0019` P1); fijos siguen con "ya pasó su fecha" (conciliación
  `fixedItemId` diferida). Alcance disciplinado.

## 4. Fortalezas

- Ataca la causa raíz (el doble escritor) antes que el síntoma: sin P1, la mora no es
  una feature incompleta, es **estructuralmente indetectable** — priorización correcta.
- "Conectar, no inventar": deriva estado de la fecha ya confiable de FIN-018; cero motor,
  cero migración, cero modelo.
- Copy §29.2 bien cuidado: naranja `warning` (no rojo), "no está registrada" (nunca "no
  pagaste"), CTA doble con salida digna — coherente con "el rojo no culpa".
- §31 sustantiva y con doble filo real: la mora no solo informa, **protege la honestidad
  de FIN-020/021/023** (sin conciliar, esas cifras calculan sobre pagos fantasma).

## 5. Observaciones (no bloqueantes — precisiones para el IMP)

1. **P1 debe eliminar AMBAS escrituras para recordatorios de deuda:** hoy el bloque
   escribe `debt.nextDueDate` (:170) **y** `reminder.dueDate` (:164). Si el `IMP` quita
   solo la primera y sigue avanzando `reminder.dueDate`, este vuelve a ser una segunda
   copia de la fecha — justo la dualidad que la FIN mata. El `IMP` debe dejar de rodar
   `reminder.dueDate` para recordatorios con `debtId` y documentarlo como legado.
2. **Confirmar que el dispatch carga `debt.nextDueDate`:** Alt A evalúa contra la fecha
   real de la deuda; el `IMP` debe garantizar que la query del cron incluye esa relación
   (el ARQ asume "el join ya la carga" — verificarlo, o añadir el `include`).
3. **Recordatorios manuales (sin `debtId`) no cambian:** el `IMP` debe acotar el cambio a
   `debtId != null` para no alterar el roll de recordatorios manuales (el ARQ lo declara;
   que el test lo fije).

## 6. Filtro §31 y experiencia de usuario (§28-29)

- **§31:** de acuerdo con el ARQ §5 — valor diferencial claro (la única voz que dice
  "esto YA venció, haz esto hoy" y protege la honestidad de las cifras). Cumple.
- **§28-29:** el único punto emocionalmente sensible (Q1/Q6) es el **aflorar retroactivo**
  de mora con números grandes ("venció hace 94 días") en usuarias que nunca registraron
  pagos, al corregir P1. Es la verdad, pero la primera impresión puede ser dura; el copy
  de conciliación es la mitigación diseñada. **Recomiendo que la RC integral mire
  específicamente este primer impacto.** Sin jerga nueva; "hace N días" es llano.

## 7. Recomendaciones

1. `IMP`: eliminar ambas escrituras (debt.nextDueDate y reminder.dueDate) para
   recordatorios con `debtId`; documentar `reminder.dueDate` como legado (Obs. 1).
2. `IMP`: confirmar el `include` de la deuda en el cron y el test de que un recordatorio
   de deuda evalúa contra la fecha real (Obs. 2).
3. `IMP`: mantener `overdueDays` como campo aditivo; fijar la regresión "deuda al día →
   sin cambios visuales" (Punto 3).
4. RC: observar el impacto retroactivo de la primera aparición de mora (§6).

## 8. Priorización

- **Bloqueante:** nada de diseño. Las observaciones §5 son precisiones **para el `IMP`**,
  no para el `DEC`.
- **No bloqueante:** el impacto retroactivo (mitigado y diferido a RC).

## 9. Veredicto

**APROBADO CON OBSERVACIONES.**

El diseño resuelve un bug fundacional real (doble escritor de `nextDueDate`, §32 sobre una
fecha) con una sola fuente autoritativa, y sobre ella hace visible y accionable la mora
sin inventar números ni tocar dominios cerrados. Los tres puntos pedidos se sostienen: no
hay otro consumidor autoritativo de `reminder.dueDate` (Alt A segura), `shouldFireToday`
no re-dispara con fecha vencida (silencio declarado, sin spam), y `overdueDays` es aditivo
al summary. Las observaciones son precisiones para el `IMP` — sobre todo eliminar **ambas**
escrituras de fecha para recordatorios de deuda, no solo la de `debt.nextDueDate`, para no
reintroducir la dualidad por la puerta de atrás. El impacto retroactivo de la mora al
corregir P1 es la verdad del dato; su mitigación (copy de conciliación) existe y debe
mirarse en la RC.
