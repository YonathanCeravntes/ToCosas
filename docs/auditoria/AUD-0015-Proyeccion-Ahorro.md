# AUD-0015 · Auditoría de ARQ-0015 (Proyección de ahorro — formalización post-implementación)

- **Documento auditado:** `docs/arquitectura/ARQ-0015-Proyeccion-Ahorro.md`
- **Módulo/Feature:** FIN-015 — **ya implementado** (`IMP-0015`, commit `6f622e3`)
- **Naturaleza del documento:** formaliza un diseño ya auditado dentro del umbrella (`AUD-0011`, sin hallazgos) y ya aprobado por `DEC-0011` §4.4/§4.5. Verificado contra el código real.
- **Referencia inmutable verificada:** `git show HEAD:backend/src/modules/simulations/simulation-engine.ts`, `simulations.service.ts`, `simulation-engine.spec.ts`, `simulations.controller.ts`, `backend/src/modules/finance/amortization/interest.util.ts` (commit `b87ef89`)
- **Fecha:** 2026-07-06
- **Auditor:** Auditor Oficial de Milla (rol de solo lectura)

> Esta auditoría no modifica el ARQ ni el código.

---

## Resumen Ejecutivo

Verifiqué que el caso `proyeccion_ahorro` en `simulation-engine.ts` implementa exactamente la fórmula de interés compuesto descrita (`FV = inicial·(1+i)^n + aporte·((1+i)^n−1)/i`, con la rama `i===0` para suma aritmética), usando `toMonthlyEffectiveRate(..., 'EA')` — la misma función de conversión EA→mensual que emplea `AmortizationService`, tal como el ARQ declara como garantía de consistencia entre motores. El disclaimer fijo (`SAVINGS_PROJECTION_DISCLAIMER`) está presente en el código y se adjunta siempre a la salida. Confirmé que el bloque de este escenario no modifica el objeto `after`/`target` — el estado financiero antes/después permanece idéntico, cumpliendo la garantía de "foto del futuro, no delta de hoy". La validación en `simulations.service.ts` reproduce exactamente los rangos declarados (aporte positivo, tasa 0–100, meses enteros 1–600, monto inicial opcional ≥0). El enum `proyeccion_ahorro` está registrado en el DTO del controller y consumido por el mismo flujo `run()`/tabla `Simulation` que el resto de escenarios, confirmando que comparte la cuota free de simulaciones sin mecanismo paralelo. Los tests de ancla (`simulation-engine.spec.ts`, sección dedicada a este escenario) existen y cubren el caso de referencia.

La desviación menor que el propio ARQ declara (valor de enum aditivo en `SimulationType`, cuando el umbrella original decía "sin BD") es correctamente señalada como tal en el documento — no es una afirmación falsa sino una discrepancia reconocida y de impacto mínimo (un valor de enum no es una tabla ni columna nueva).

## Hallazgos

Ninguno.

## Riesgos

- Ninguno nuevo. El riesgo de percepción de asesoría de inversión (ya identificado en el propio ARQ) está mitigado por el disclaimer fijo verificado en código y por el hecho de que la tasa es siempre ingresada por el usuario, nunca sugerida o rankeada por Millo.

## Fortalezas

- Reutilización genuina de `toMonthlyEffectiveRate` entre el motor de amortización y el de simulación — la consistencia declarada entre ambos motores es verificable en el código, no solo una afirmación de diseño.
- El escenario no persiste ni modifica ninguna serie real (`after === before` en métricas), verificado directamente en el bloque del switch — coherente con el contrato ya establecido en FIN-007 de que el simulador nunca escribe sobre el estado financiero real.
- La desviación de diseño (enum aditivo vs. "sin BD" declarado en el umbrella) se documenta con transparencia en el propio ARQ en vez de ocultarse — mismo estándar de honestidad ya visto en ciclos anteriores (p. ej. el reconocimiento de la regresión de simulaciones ilimitadas a 5/mes en FIN-009).
- Los tests de ancla verifican el caso exacto declarado (1M al 8% EA = 1.080.000 en 12 meses, consecuencia directa de la definición de tasa efectiva anual), dando una verificación matemática real, no solo la existencia de un test.

## Oportunidades

Ninguna adicional dentro del alcance de este ciclo, ya cerrado.

## Observaciones críticas

Ninguna.

## Observaciones menores

Ninguna con impacto — la desviación de enum ya está correctamente documentada por la propia Arquitectura como tal.

## Recomendaciones

Ninguna. El ciclo ya está cerrado y verificado.

## Priorización

No aplica.

## Veredicto

**APROBADO.**

ARQ-0015 documenta con exactitud un diseño ya implementado, ya auditado sin hallazgos dentro del umbrella, y ya aprobado por el CTO. La fórmula, el disclaimer, la ausencia de escritura sobre el estado real y la reutilización de la cuota de simulaciones están todos verificados contra el código. No se requiere ninguna acción adicional del CTO sobre este documento.

---
*Esta auditoría no implementa ni decide. FIN-015 ya está cerrado (IMP-0015); este documento es una formalización retroactiva sin efecto sobre su estado.*
