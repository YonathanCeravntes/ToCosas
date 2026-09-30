# AUD-0016 · Auditoría de ARQ-0016 (Periodo financiero / día de corte — formalización post-implementación)

- **Documento auditado:** `docs/arquitectura/ARQ-0016-Periodo-Financiero.md`
- **Módulo/Feature:** FIN-016 — **ya implementado** (`IMP-0016`, commit `40700bc`)
- **Naturaleza del documento:** formaliza un diseño ya auditado dentro del umbrella (`AUD-0011`, sin hallazgos) y ya aprobado por `DEC-0011` §4.6. Verificado contra el código real — este es el ciclo con la invariante vinculante más estricta del conjunto (decisión (b) del fundador: Score/Motor/Gamificación/Recomendaciones/Memoria NO deben verse afectados), así que el foco de esta verificación fue precisamente esa invariante.
- **Referencia inmutable verificada:** `git show HEAD:backend/src/modules/budget/financial-period.util.ts`, `budget.service.ts`, `budget.controller.ts`, `dto/fixed-item.dto.ts`, migración `20260705120000_fin016_periodo_financiero`, `git grep` sobre todo `backend/src` para confirmar qué módulos importan la utilidad (commit `b87ef89`)
- **Fecha:** 2026-07-06
- **Auditor:** Auditor Oficial de Milla (rol de solo lectura)

> Esta auditoría no modifica el ARQ ni el código.

---

## Resumen Ejecutivo

Verifiqué la invariante vinculante por `grep` directo sobre `backend/src`: únicamente `budget.service.ts` y `dashboard.service.ts` (más el propio archivo y su spec) importan `financial-period.util.ts` — ningún módulo de Score, Motor Financiero, Gamificación, Recomendaciones o Memoria lo referencia. Esto confirma exactamente la garantía "verificable por grep" que el ARQ declara, con el mismo estándar ya usado en ciclos anteriores para invariantes similares (no-impacto de seguros sobre el Motor en FIN-013, guardarraíl de Ley 1266 en FIN-009).

Verifiqué también que `financialPeriod()` reproduce la lógica descrita (ciclo iniciado este mes o el anterior según si `now` ya pasó el día de corte; fin exclusivo = inicio del ciclo siguiente, garantizando contigüidad sin huecos) y que con `cycleStartDay=1` el cálculo coincide exactamente con el mes calendario UTC — retrocompatibilidad total, confirmada además por un test dedicado (`financial-period.util.spec.ts`). La migración real contiene la columna `cycle_start_day INTEGER NOT NULL DEFAULT 1` con el `CHECK BETWEEN 1 AND 28` descrito, y el DTO de `budget.controller.ts` aplica `@Min(1) @Max(28)` en el mismo rango, más `clampCycleDay()` como defensa adicional en el propio util — doble validación (BD + API + función pura), consistente con la disciplina de defensa en profundidad ya vista en otros ciclos.

No encontré ninguna afirmación falsa del documento contra el código.

## Hallazgos

Ninguno.

## Riesgos

- Ninguno nuevo. El riesgo de divergencia visual entre el ciclo de Presupuesto/Inicio y el mes calendario del Score (ya identificado en el propio ARQ) está mitigado por la etiqueta legible siempre visible en la UI, según el propio documento — no verificable por mí en este alcance de auditoría de backend, pero consistente con el patrón de transparencia del resto del proyecto.

## Fortalezas

- La invariante vinculante más estricta del conjunto de sub-ciclos (aislamiento total del Score/Motor/Gamificación/Recomendaciones/Memoria) está verificada de forma directa y objetiva por `grep`, no solo declarada — mismo rigor que ya demostró su valor en el guardarraíl de Ley 1266 (FIN-009).
- Retrocompatibilidad total verificada: con `cycleStartDay=1` el comportamiento es matemáticamente idéntico al mes calendario UTC que el sistema ya usaba, reduciendo a cero el riesgo de regresión para el usuario que no configure nada.
- Triple defensa de rango (`CHECK` en BD, `@Min/@Max` en el DTO, `clampCycleDay` en la función pura) — ningún punto de entrada puede introducir un día de corte fuera de 1–28, incluso si alguno de los tres controles fallara.
- El fin exclusivo del periodo (inicio del ciclo siguiente) garantiza contigüidad sin huecos ni solapes entre ciclos consecutivos — propiedad matemática correcta para cualquier agregación de transacciones por periodo.

## Oportunidades

Ninguna adicional dentro del alcance de este ciclo, ya cerrado.

## Observaciones críticas

Ninguna.

## Observaciones menores

Ninguna.

## Recomendaciones

Ninguna. El ciclo ya está cerrado y verificado.

## Priorización

No aplica.

## Veredicto

**APROBADO.**

ARQ-0016 documenta con exactitud un diseño ya implementado, ya auditado sin hallazgos dentro del umbrella, y ya aprobado por el CTO. La invariante de aislamiento del Score y los demás módulos financieros —la condición más sensible de este ciclo— está verificada de forma objetiva y se sostiene contra el código real. No se requiere ninguna acción adicional del CTO sobre este documento.

---
*Esta auditoría no implementa ni decide. FIN-016 ya está cerrado (IMP-0016); este documento es una formalización retroactiva sin efecto sobre su estado.*
