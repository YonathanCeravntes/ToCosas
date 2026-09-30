# DEC-0022 · Experiencia de Deudas

- **Documentos base:** `docs/arquitectura/ARQ-0022-Experiencia-Deudas.md` (v1.0, commit `23d9967`) · `docs/auditoria/AUD-0022-Experiencia-Deudas.md`
- **Módulo/Feature:** FIN-022 (única FIN activa) · **Origen (§27):** Mejora de revisión de producto (hoja de ruta UX)
- **Decide:** CTO de Milla
- **Fecha:** 2026-07-12

---

## 0. Verificación independiente previa a esta decisión

- `simulation-engine.ts:203-208`: confirmé que `specifics` solo propaga `avalancheMonths/Interest`, `snowballMonths/Interest`, `recommended`, `interestDifference` — `payoffOrder` de `PortfolioResult` (`portfolio.simulator.ts:32,108`) no llega al resultado público. El Punto 3a del Auditor es real: el orden de ataque tendría que re-derivarse en el summary.
- `recommendations.service.ts:90`: confirmé `extraBudget: Math.max(0, Math.round(surplus * 0.3))` — distinto del `extraBudget` que el ARQ baraja para el bloque (0 o excedente real). El Punto 3b es real.
- `debts.service.ts:195` y el filtro de Inicio: ambos usan `{deletedAt:null, status:'activa'}` — `totalDebt` es fuente única real, sin divergencia.

Conclusión: **AUD-022 es preciso. El enfoque "conectar, no inventar" es correcto; el hallazgo bloqueante de P2 (ranking por construcción, no por coincidencia) se sostiene de forma independiente y es la misma clase de riesgo que `DEC-0021` §5.1 ya cerró para el fondo de emergencia.**

## 1. Resumen ejecutivo

`ARQ-0022` rediseña la lista de Deudas como zona de decisión (frente completo → orden de ataque → costo por tarjeta), reutilizando el motor de estrategias de FIN-007 sin construir uno nuevo. El Auditor no encontró hallazgos en P1, P3, P4, P5. El corazón de la FIN (P2, el bloque de orden de ataque) tiene dos vacíos reales que deben cerrarse antes de implementarse: el orden no debe re-derivarse en el summary (debe salir del motor por construcción), y la cifra de ahorro debe describir lo que realmente es.

## 2. Arquitecturas revisadas
`docs/arquitectura/ARQ-0022-Experiencia-Deudas.md` (v1.0).

## 3. Auditorías revisadas
`docs/auditoria/AUD-0022-Experiencia-Deudas.md` — veredicto: **APROBADO CON OBSERVACIONES** (bloqueante solo para P2).

## 4. Decisiones aprobadas

1. **P1 — Hero del frente completo (Alt A):** aprobada sin condiciones.
2. **P3 — Costo visible por tarjeta (Alt A):** aprobada sin condiciones.
3. **P4 — Frontera con mora, etiqueta neutra:** aprobada sin condiciones.
4. **P5 — Detalle sin cambios:** aprobada.
5. **Respuesta al filtro §31:** aprobada — sustantiva.
6. **P2 — Orden de ataque (Alt A):** aprobada **con los dos cambios obligatorios de la sección 5.**

## 5. Cambios obligatorios (condición para implementar P2)

1. **El orden de ataque debe exponerse desde un helper puro compartido** en `portfolio.simulator.ts` (p. ej. `attackOrder(debts, strategy)`), consumido idénticamente por el summary y por cualquier otro consumidor futuro (Simulador) — nunca re-derivado independientemente en el summary. Mismo criterio que `DEC-0021` §5.1: la diferencia entre "coincide hoy" y "no puede divergir nunca".
2. **El copy de ahorro debe describir lo que la cifra realmente es** (diferencia entre avalancha y bola de nieve, no "pagar a ciegas") y **manejar explícitamente el caso `interestDifference ≈ 0`** (omitir o reformular el bloque, nunca mostrar "te ahorra $0").
3. **Fijar el contrato de `extraBudget` del bloque** (el ARQ baraja 0 o excedente real; Recomendaciones usa `surplus*0.3`) y dejar el supuesto documentado en el propio código o en el `IMP` — si el `IMP` decide alinear la apertura del Simulador a ese mismo valor, mejor; si no, el desacuerdo entre cifras debe quedar explicado, no oculto.
4. **Gatear la simulación del bloque a `debtsCount > 1`** — evita ejecutar una comparación de estrategias que se descarta en cada carga de Inicio para usuarios con 0/1 deuda.

## 6. Observaciones aceptadas

- Densidad de la tarjeta (P3, una línea más): aceptada, verificar en captura que no sobrecarga.
- El hero hace más visible la deuda total (costo declarado en `ARQ` §10): aceptado, la fecha de libertad al lado es la mitigación de narrativa.

## 7. Próximos pasos

1. Arquitectura implementa según el Plan de `ARQ-0022` §14, con los 4 cambios obligatorios de la sección 5 incorporados desde el diseño de P2 (no como parche posterior).
2. Capturas reales full-scroll antes/después de la lista + cold-start (usuario sin deudas).
3. `IMP-0022` con SHA y juicio razonado, verificando explícitamente los criterios §13 del ARQ y los 4 cambios obligatorios.
4. `BACKLOG.md`/`ESTADO_PROYECTO.md` se actualizan en el mismo acto (ya reflejado).
