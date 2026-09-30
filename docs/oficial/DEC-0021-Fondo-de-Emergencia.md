# DEC-0021 · Única definición del fondo de emergencia (§32)

- **Documentos base:** `docs/arquitectura/ARQ-0021-Fondo-de-Emergencia.md` (v1.0, commit `77ddffd`) · `docs/auditoria/AUD-0021-Fondo-de-Emergencia.md` · decisión de producto del CPSAO en `docs/correspondencia/FIN-021-Fondo-de-Emergencia.md`
- **Módulo/Feature:** FIN-021 (única FIN activa) · **Origen (§27):** Deuda técnica, prioridad inmediata por decisión del CPSAO
- **Decide:** CTO de Milla
- **Fecha:** 2026-07-12

---

## 0. Verificación independiente previa a esta decisión

Verifiqué en checkout aislado contra el commit `125c5c6` (código) y `77ddffd` (ARQ):
- `core-metrics.ts:48,61`: `essential = fixedExpense + debtMonthly`; `EmergencyFundMonths = emergencyBalance / essential`, persistida como `MetricReading`. Es real y ya auditada en FIN-003/004.
- `git grep EmergencyFundMonths`: 6 consumidores leen la lectura persistida sin recalcular (health, score, simulation-engine, gamification, insights, motor). Coincide con el inventario del ARQ §2.
- Los dos divergentes (Inicio, Recomendaciones) confirmados como declara el ARQ.
- Frescura de P2 Alt A: `outbox.dispatcher.ts:36` (`@Cron(EVERY_10_SECONDS)`) + `engine.constants.ts:21` (`DEBOUNCE_MS = 15_000`) ⇒ ~25 s peor caso — confirmado, coincide con el cálculo de `AUD-0021` §4.

Conclusión: **AUD-021 es preciso. El diseño resuelve §32 por construcción, adoptando la fórmula ya auditada en vez de inventar una nueva — el mismo patrón que `SpendableService` en FIN-020.**

## 1. Resumen ejecutivo

`ARQ-0021` corrige el hallazgo derivado del cierre de FIN-020: tres lecturas divergentes de "meses de fondo de emergencia cubiertos" (Inicio, Salud, motor de recomendaciones). La solución adopta la fórmula canónica ya persistida por el Motor (`EmergencyFundMonths`, auditada en FIN-003/004) como única fuente, en vez de crear una nueva — radio de daño mínimo, cero re-auditoría de Score/Salud. El Auditor no encontró hallazgos bloqueantes. La única pieza pendiente de decisión (P3, la meta única) ya fue resuelta por el CPSAO: **Alt C**.

## 2. Arquitecturas revisadas
`docs/arquitectura/ARQ-0021-Fondo-de-Emergencia.md` (v1.0).

## 3. Auditorías revisadas
`docs/auditoria/AUD-0021-Fondo-de-Emergencia.md` — veredicto: **APROBADO CON OBSERVACIONES** (ninguna bloqueante).

## 4. Decisiones aprobadas

1. **P1 — La fórmula canónica del Motor es LA oficial (Alt A):** aprobada. `EmergencyFundMonths` (fondo marcado / gasto esencial) se declara única fuente; ningún otro módulo recalcula el concepto.
2. **P2 — Inicio lee la lectura persistida del Motor (Alt A):** aprobada, con el límite de frescura de **~25 segundos** (peor caso) aceptado explícitamente, tal como recomendó `AUD-0021` §4 — no es la staleness de 24h que "cadencia del Motor" podría sugerir; es un concepto que cambia lento (meses), un retraso de segundos no induce error de interpretación.
3. **P3 — Meta única: Alt C** (decisión de producto del CPSAO). Dos hitos nombrados — "colchón inicial" (3 meses) y "fondo completo" (6 meses) — usando la escala de logros ya existente (`fondo_3m`/`fondo_6m`). La recomendación apunta siempre al próximo hito del usuario, nombrándolo.
4. **P4 — Recomendaciones y glosario:** aprobada, con la condición de la sección 5.

## 5. Cambios obligatorios

1. **El `IMP` debe hacer que `recommendations.service.ts` consuma la fuente/constantes oficiales del fondo de emergencia — no solo alinear la meta a 3/6.** Hoy recalcula inline con la misma base que la canónica; si esa base cambiara en el futuro sin que Recomendaciones importe la constante, §32 se reabriría por la puerta de atrás (mismo riesgo que motivó preferir el servicio único sobre la util compartida en `ARQ-0020` P2). No es opcional — es la diferencia entre "coincide hoy" y "no puede divergir nunca".
2. Constantes de hitos/cortes en un único módulo exportado (patrón `DEBT_RATIO_CUTS`), consumido por Recomendaciones, Inicio y el glosario del Copiloto — cero literales `3`/`6` sueltos en copys.

## 6. Observaciones aceptadas

- Percepción de pérdida en Inicio (la usuaria demo verá un número menor al pasar de "ahorro total" a "fondo marcado"): aceptada como el costo de la honestidad del concepto, mismo patrón que el hero de Inicio en FIN-020. El copy ya invita a marcar cuentas como fondo (`ARQ-0021` §10). Vigilar junto con el hallazgo equivalente de FIN-020 en la RC integral.
- Concesión del Auditor sobre su matiz intra-servicio de FIN-020 (línea 106 vs 109 de `recommendations.service.ts`): registrada y aceptada, sin acción — ya corregida en `AUD-0021` §2.

## 7. Próximos pasos

1. Arquitectura implementa según el Plan de `ARQ-0021` §14: módulo de constantes → `dashboard.service`/`recommendations.service`/`templates.ts` → tests (igualdad + caso a mano + selección de hito) → capturas reales de las tres pantallas co-visibles (Inicio, Salud, Presupuesto P5) → `IMP-0021` con SHA y juicio razonado, verificando explícitamente el cambio obligatorio §5.1.
2. `BACKLOG.md`/`ESTADO_PROYECTO.md` se actualizan en el mismo acto (ya reflejado).
