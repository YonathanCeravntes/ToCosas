# VALIDACIÓN-0024 · Mora de deudas — visibilidad y conciliación (iteración 1)

- **Documentos base:** `DEC-0024` · `IMP-0024` v1.0 · `ARQ-0024` v1.1 · `AUD-0024`
- **Realiza:** Auditor de Milla
- **Fecha:** 2026-07-13
- **Referencia inmutable verificada:** commit `faebc2a57eb86acd45244a836b4f6e6c54a92aa2` (ancestro de HEAD confirmado)

---

## 1. Método

Cuatro capas DEC→IMP→Código→Evidencia sobre `faebc2a` (`git show`, no working tree),
suites en vivo. Foco pedido por el CTO: que el dispatch evalúe contra la fecha REAL de la
deuda (join), no contra `reminder.dueDate` legado — y mi propia observación de `AUD-0024`
§5.1: que se eliminaran **ambas** escrituras, no solo una.

## 2. Cambio obligatorio §5 (el punto crítico) — CUMPLIDO, ambas escrituras eliminadas

- **`git grep` sobre el commit: `reminders` ya NO escribe `nextDueDate`** (ni `debt.update`
  ni `dueDate: addOneMonth`). El bloque de roll mensual desapareció; el update del
  recordatorio es `data: { lastSentAt: today }` a secas (`reminders.service.ts:175`).
  **Se eliminaron las dos escrituras** (`debt.nextDueDate` y `reminder.dueDate`), no solo
  la primera — exactamente lo que exigía el `DEC` §5 y mi `AUD` §5.1.
- **El dispatch evalúa contra la deuda:** la query incluye `debt: true`
  (`reminders.service.ts:108`); `const due = r.debtId ? r.debt?.nextDueDate : r.dueDate`
  (línea 119) — recordatorios de deuda leen la fecha de la DEUDA (semántica FIN-018),
  manuales conservan la suya. `reminder.dueDate` documentado como LEGADO (comentario
  líneas 117-118). Deuda saldada (`nextDueDate` null) → `continue`. ✓
- **Escritores de `nextDueDate` tras el cambio:** solo creación de deuda y flujo de pago
  FIN-018 — un dueño de la fecha. §32 sobre una fecha resuelto por construcción.

## 3. Correspondencia por pieza (DEC-0024 → código → captura)

| Pieza | Código confirma | Captura confirma |
|---|---|---|
| **P1 + §5** | ver §2 — cero escrituras de fecha en reminders; dispatch contra `debt.nextDueDate` | — |
| P1 bonus | el recordatorio ya no avisa cuotas ya cubiertas (lee la fecha real, no la copia desincronizada) — spec caso 1 | — |
| **P2 helper único** | `overdue.util.ts`: función pura, medianoche UTC, `null` si `d >= t` (no vencida) — una definición de "hace cuánto" | "⏰ Esta cuota venció hace **12 días**" |
| **P2 aditivo** | `overdueDays(d.nextDueDate)` expuesto en list (`:104`), summary (`:128`) y detalle (`:256`) — campo nuevo, no reforma los existentes | — |
| P2 UI + §29.2 | naranja `warning`, no rojo | Bloque naranja (no rojo); "venció hace 12 días" |
| Copy §13.4 | afirma solo lo observable | "**No hay un pago registrado** para esta cuota… regístrala para que tus números digan la verdad; si no, cada día suma intereses" — nunca "no pagaste"; CTA "✅ Registrar el pago →" + referencia al abono existente (no duplicado) |
| P3 | Score/Salud/SpendableService **ausentes del diff** | — |

## 4. §32 y frontera

`overdueDays` deriva de la única fecha autoritativa por una única función pura — no hay
segunda definición del "hace cuánto" (la lección de zona horaria de FIN-022 aplicada).
`SpendableService` §4.1-bis, Score y Salud no aparecen en el diff (P3 respetada; mora
informa, no recalcula). Frontera intacta.

## 5. Pruebas — ejecución EN VIVO

| Suite | IMP declara | Ejecución del Auditor | Resultado |
|---|---|---|---|
| Unitaria | 326/326 | `npx jest` | **326/326, 42 suites** ✓ (incl. `reminders.dispatch.spec` y `overdue.util.spec`) |
| E2E | 23/23 | `npm run test:e2e` | **23/23, 7 suites** ✓ (incl. `fin024-mora`: `overdueDays` en las 3 superficies contra BD) |

## 6. Reservas del IMP §4 — evaluación

Honestas: (1) el CTA "Registrar el pago" no preselecciona la deuda (mejora pequeña
anotada) — no es un defecto de esta FIN; (2) el silencio post-vencimiento es por diseño
(FIN-025); (3) el "antes" de la captura no corrió el cron viejo, así que la diferencia
real es mayor que la visual — observación honesta, no oculta nada; (4) impacto retroactivo
declarado, mitigado por el copy — a mirar en RC (mi `AUD` §6). Ninguna reserva esconde un
defecto.

## 7. Hallazgos

Ninguno. El cambio obligatorio (ambas escrituras) está completo; el dispatch lee la fecha
autoritativa de la deuda; las observaciones de mi `AUD-0024` §5 (eliminar ambas escrituras,
cargar el join, acotar a `debtId`) están todas atendidas en el código.

## 8. Veredicto

**APROBADO.**

`IMP-0024` corresponde con `DEC-0024` en las cuatro capas, verificado sobre `faebc2a` con
suites en vivo. El bug fundacional está muerto por construcción: `reminders` ya no escribe
**ninguna** fecha (grep) — se eliminaron las dos escrituras, no solo la de
`debt.nextDueDate`, cerrando el trampolín que mi `AUD` §5.1 marcó como riesgo — y el
dispatch evalúa contra la fecha real de la deuda vía join (el punto que el CTO pidió
verificar), con `reminder.dueDate` documentado como legado. La mora es visible y accionable
con el tono correcto (§29.2: naranja, "no hay un pago registrado", nunca "no pagaste"),
`overdueDays` deriva de una única función pura, y Score/Salud/SpendableService no se tocan.
Recomiendo al CTO proceder con su verificación independiente y el cierre de FIN-024.
