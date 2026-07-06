# DEC-0015 · Proyección de ahorro con interés compuesto (ilustrativa) — REGULARIZACIÓN

- **Documentos base:** `docs/arquitectura/ARQ-0015-Proyeccion-Ahorro.md` · `docs/auditoria/AUD-0015-Proyeccion-Ahorro.md` · `docs/implementaciones/IMP-0015-Proyeccion-Ahorro.md` · `DEC-0011 §4.4/§4.5` (autorización original, bundled)
- **Módulo/Feature:** FIN-015
- **Decide:** CTO/CPO/Principal Architect de Millo
- **Fecha:** 2026-07-06

---

## 0. Naturaleza de este documento — Regularización extraordinaria

Emitido bajo la regularización extraordinaria del Backlog Inicial de Milla V1.0 (fundador, 2026-07-05/06). Ver `DEC-0013 §0` para el contexto completo. Excepción única, sin precedente.

## 1. Resumen ejecutivo

Verifiqué de forma independiente, en checkout aislado (commit `c511697`), que el escenario `proyeccion_ahorro` en `simulation-engine.ts` implementa la fórmula de interés compuesto declarada (`FV = inicial·(1+i)^n + aporte·((1+i)^n−1)/i`, rama `i=0` para suma aritmética), usando `toMonthlyEffectiveRate(..., 'EA')` — la misma conversión que usa `AmortizationService`, confirmando la consistencia entre motores que el ARQ declara. El disclaimer fijo (`SAVINGS_PROJECTION_DISCLAIMER`) está presente en el código. Este es exactamente el punto de mayor riesgo regulatorio de todo el sub-ciclo (decisión (a) del fundador: proyección ilustrativa, cero captación real) — verificado con especial atención dado el precedente de FIN-005. `AUD-0015` no encontró hallazgos; la única nota es una desviación de diseño ya documentada con transparencia por la propia Arquitectura (enum aditivo vs. "sin BD" del umbrella original), de impacto mínimo.

## 2. Arquitecturas revisadas

- `docs/arquitectura/ARQ-0015-Proyeccion-Ahorro.md`.

## 3. Auditorías revisadas

- `docs/auditoria/AUD-0015-Proyeccion-Ahorro.md` — veredicto: **APROBADO**.

## 4. Decisiones aprobadas

1. Escenario puro `proyeccion_ahorro`, octavo caso del simulador: aprobado.
2. Fórmula de interés compuesto con capitalización mensual, reutilizando `toMonthlyEffectiveRate`: ratificado.
3. **Disclaimer fijo no removible** presente en toda salida de este escenario: ratificado como guardarraíl permanente de la decisión (a) del fundador (Millo no capta ni ofrece rendimiento).
4. Cero escritura sobre cuentas/series reales (`before === after` en métricas): ratificado.
5. Consumo de la cuota free compartida de simulaciones (5/mes): ratificado, consistente con `DEC-0009`.

## 5. Decisiones rechazadas

- Ninguna.

## 6. Observaciones aceptadas

- Desviación de diseño (enum aditivo `SimulationType` vs. "sin BD" del umbrella): aceptada — un valor de enum no es una tabla ni columna nueva, impacto mínimo, ya documentada con transparencia por la propia Arquitectura.

## 7. Observaciones descartadas

- Ninguna.

## 8. Riesgos aceptados

- Percepción de asesoría de inversión — mitigada por el disclaimer fijo verificado en código y porque la tasa siempre la ingresa el usuario (nunca sugerida ni rankeada por Millo). Aceptado, consistente con la decisión (a) del fundador.

## 9. Riesgos pendientes

- Ninguno nuevo.

## 10. Cambios obligatorios

- Ninguno.

## 11. Plan técnico oficial

No aplica — FIN-015 ya está implementado y verificado.

## 12. Prioridad

No aplica (ciclo cerrado).

## 13. Estado final

**APROBADO — FIN-015 CERRADO** bajo el proceso de regularización extraordinaria del fundador. Verificación independiente confirma la fórmula, el disclaimer permanente y la ausencia de escritura sobre el estado real. Excepción única, sin precedente.

---
*Documento oficial — no modificar. Regularización extraordinaria conforme a `docs/GOBERNANZA.md` y al comunicado del fundador (2026-07-05/06).*
