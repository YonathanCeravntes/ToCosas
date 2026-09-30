# Plantilla — Resultados y Aprendizaje de la Alpha Cerrada

- **Versión:** 1.0 (plantilla — sin contenido todavía, por instrucción explícita del
  CPSAO: "no desarrolles contenido todavía")
- **Fecha:** 2026-07-06
- **Autor:** CTO
- **Estado:** Estructura lista para usarse desde el día 1 del piloto. Documento vivo
  — se alimenta durante toda la Alpha, no es un informe de cierre.
- **Referencias cruzadas:** `docs/producto/alpha/ALPHA-005-Instrumentacion-Metricas.md`
  (taxonomía de 5 categorías), `docs/producto/alpha/ALPHA-006-Cronograma-Operativo.md`
  (checkpoints), `docs/producto/PRODUCT_DECISIONS.md`.

---

> Este documento se llena en vivo, entrada por entrada, en cada checkpoint
> (`ALPHA-006`) o cuando surja un hallazgo relevante — no se espera al cierre de la
> Alpha para empezar a registrar. Cada fila nueva se agrega, nunca se sobrescribe una
> anterior (append-only, mismo principio que `PRODUCT_DECISIONS.md`).

## Registro de entradas

Cada entrada de aprendizaje se registra con esta estructura mínima:

| Campo | Descripción |
|---|---|
| **Hipótesis validada** | Cuál de las hipótesis de `ALPHA-001` quedó confirmada con esta evidencia, si aplica. |
| **Hipótesis descartada** | Cuál hipótesis quedó descartada, si aplica, y por qué. |
| **Hallazgo inesperado** | Algo que no estaba anticipado en `ALPHA-001`, si ocurrió. |
| **Decisión tomada** | La acción concreta, hipótesis descartada, o decisión consciente de no actuar (regla "todo hallazgo termina en decisión"). |
| **Funcionalidad candidata** | Si el hallazgo sugiere una necesidad nueva de producto, para eventual `IDEA-XXXX`. |
| **Riesgo identificado** | Cualquier riesgo técnico, legal o de producto detectado. |
| **Evidencia que respalda la decisión** | Cita textual de entrevista, dato cuantitativo, o reporte del canal de Consejo Fundador — nunca una impresión sin respaldo. |
| **Prioridad de atención** | Crítica / Recomendada / Opcional (mismo esquema que el PHR, para consistencia entre programas). |
| **Referencia a la funcionalidad o área afectada** | `FIN-XXX`, módulo técnico, o sección de `PRODUCT_VISION.md` que corresponda. |

## Tabla de entradas

*(Vacía — se llena desde el día 1 del piloto, checkpoint por checkpoint.)*

| # | Fecha/Checkpoint | Hipótesis validada | Hipótesis descartada | Hallazgo inesperado | Decisión tomada | Funcionalidad candidata | Riesgo identificado | Evidencia | Prioridad | Referencia |
|---|---|---|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — | — | — | — |

## Cierre de la Alpha

Al finalizar (`ALPHA-008`), esta tabla es la fuente primaria para determinar si la
Alpha cumplió su propósito — no una impresión general, sino la suma verificable de
estas entradas.
