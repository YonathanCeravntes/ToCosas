# DEC-0024 · Mora de deudas — visibilidad y conciliación (iteración 1)

- **Documentos base:** `docs/arquitectura/ARQ-0024-Mora.md` (v1.1) · `docs/auditoria/AUD-0024-Mora.md`
- **Módulo/Feature:** FIN-024 (única FIN activa) · **Origen (§27):** Dominio diferido 3 veces, activado por el CPSAO
- **Decide:** CTO de Milla
- **Fecha:** 2026-07-13

---

## 0. Verificación independiente previa a esta decisión

- Confirmé el bug fundacional contra `HEAD`: `reminders.service.ts:158-172` escribe `debt.nextDueDate` sin comprobar pago alguno, en conflicto directo con `debt-prepayment.service.ts:110` (semántica FIN-018: avanza solo al pagar, desde la amortización real).
- `git grep` propio de `.dueDate` fuera de `reminders/`: ningún módulo lee `reminder.dueDate` de deuda como autoritativo — confirma que Alt A (P1) es segura, sin romper consumidores externos.

Conclusión: **AUD-024 es preciso. El diseño corrige la causa raíz (doble escritor) antes que el síntoma, y la mora resultante es genuinamente derivada, no una fórmula paralela.**

## 1. Resumen ejecutivo

`ARQ-0024` v1.1 corrige un bug fundacional preexistente (dos escritores con semánticas opuestas sobre `debt.nextDueDate`, la misma clase de conflicto que §32 prohíbe para montos, aquí sobre una fecha) y, sobre esa base ya confiable, hace visible y accionable el estado de mora de deudas — sin inventar números, sin tocar Score/Salud ni `SpendableService`. El Auditor no encontró hallazgos bloqueantes; sus tres observaciones son precisiones para el `IMP`, la primera de las cuales elevo a cambio obligatorio.

## 2. Arquitecturas revisadas
`docs/arquitectura/ARQ-0024-Mora.md` (v1.1).

## 3. Auditorías revisadas
`docs/auditoria/AUD-0024-Mora.md` — veredicto: **APROBADO CON OBSERVACIONES** (nada bloqueante para el diseño).

## 4. Decisiones aprobadas

1. **P1 — Escritor único de `nextDueDate` (Alt A):** aprobada, con el cambio obligatorio de la sección 5.
2. **P2 — Estado de mora derivado + conciliación, solo deudas (Alt A, helper único `overdueDays`):** aprobada.
3. **P3 — Score/Salud sin cambios, semilla registrada:** aprobada.
4. **Respuesta al filtro §31:** aprobada — sustantiva, y con el argumento adicional correcto de que la mora protege la honestidad de FIN-020/021/023 (sin conciliar, esas cifras corren sobre pagos fantasma).

## 5. Cambios obligatorios

1. **El `IMP` debe eliminar AMBAS escrituras de fecha para recordatorios con `debtId`** — no solo `debt.nextDueDate` (:170), también `reminder.dueDate` (:164). Si solo se quita la primera, `reminder.dueDate` reintroduce la dualidad que esta FIN existe para matar (observación 1 del Auditor, la más importante de las tres).
2. **Confirmar que el cron carga `debt.nextDueDate`** (el `include` de la relación) antes de evaluar `shouldFireToday` contra ella — el ARQ lo asume, el `IMP` debe verificarlo o añadirlo.
3. **Acotar el cambio a `debtId != null`** — los recordatorios manuales (sin deuda asociada) no cambian de comportamiento; el test debe fijarlo como regresión.

## 6. Observaciones aceptadas

- Impacto retroactivo: al corregir P1, usuarias que nunca registraron pagos verán mora con números grandes ("venció hace 94 días") de un día para otro. Es la verdad del dato, no un defecto — mitigado por el copy de conciliación diseñado. La RC integral debe observar específicamente esta primera impresión.
- El recordatorio de una deuda impaga callará tras el vencimiento (comportamiento declarado de Alt A) — cubierto por el fast-follow `FIN-025`, ya registrado.
- `reminder.dueDate` queda como dato legado para recordatorios de deuda — el `IMP` debe documentarlo en código para que nadie vuelva a tratarlo como autoritativo.

## 7. Próximos pasos

1. Arquitectura implementa según el Plan de `ARQ-0024` §14, incorporando los 3 cambios obligatorios de la sección 5 desde el diseño.
2. Capturas reales: lista con "venció hace N días", detalle con el bloque de conciliación (deuda vencida real), y una deuda al día idéntica a FIN-022/023 (regresión visual).
3. `IMP-0024` con SHA y juicio razonado, verificando explícitamente los criterios §13 del ARQ.
4. `BACKLOG.md`/`ESTADO_PROYECTO.md` se actualizan en el mismo acto (ya reflejado).
