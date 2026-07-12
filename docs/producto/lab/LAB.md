# Laboratorio de Producto — Tabla Maestra

- **Versión:** 1.2
- **Fecha:** 2026-07-06
- **Autor:** CTO
- **Estado:** Vigente — 2 ideas registradas
- **Historial de cambios:**
  - v1.0 (2026-07-06) — creación del documento como parte del scaffold de Gobernanza v3.0.
  - v1.1 (2026-07-06) — alta de `IDEA-0001` (Evolución de PRODUCT_VISION hacia la
    Constitución Cultural de Milla), propuesta por el CPSAO tras la aprobación
    conceptual de `PRODUCT_VISION.md` v1.2.
  - v1.2 (2026-07-06) — alta de `IDEA-0002` (Plan Alpha Cerrada de Milla), propuesta y
    analizada conjuntamente por CPSAO y CTO, con estructura de 8 fases ratificada
    expresamente por el Fundador. Ninguna fase autorizada a desarrollarse todavía.

---

Tabla maestra del laboratorio de ideas de producto — mismo rol que
`docs/roadmap/BACKLOG.md` cumple para las funcionalidades (`FIN`). Cada idea nueva del
CPSAO (o de cualquier fuente, siempre canalizada por el CTO) se registra aquí con su
propio documento `IDEA-XXXX.md`.

**Regla dura (Gobernanza v3.0, Parte II §13):** ninguna fila de esta tabla autoriza
desarrollo. Solo cuando el CTO aprueba una idea y el Arquitecto entrega un Blueprint
que el CTO decide segmentar en `FIN`, esa idea llega al Backlog real.

Leyenda de estado: `en laboratorio` · `evaluada por CTO` · `aprobada → Blueprint` ·
`descartada`.

| ID | Nombre | Categoría | Estado | Evaluación del CTO |
|----|--------|-----------|--------|---------------------|
| IDEA-0001 | Evolución de PRODUCT_VISION hacia la Constitución Cultural de Milla | Estrategia de producto / cultura | `en laboratorio` | Registro aceptado; no autorizada a avanzar a Blueprint. Requiere evidencia de mercado o priorización explícita del Fundador |
| IDEA-0002 | Plan Alpha Cerrada de Milla | Estrategia de producto / validación de mercado | `aprobada — estructura ratificada` | Estructura de 8 fases aprobada por el Fundador. Ninguna fase inicia sin autorización adicional explícita; no genera `FIN` ni toca el Backlog por sí misma |

## Historial

- 2026-07-06 — CTO: alta de `IDEA-0001`, propuesta por el CPSAO como recomendación
  posterior a la aprobación conceptual de `PRODUCT_VISION.md` v1.2. No genera `FIN`, no
  toca el Backlog, no afecta `FIN-012`.
- 2026-07-06 — CTO: alta de `IDEA-0002` (Plan Alpha Cerrada), tras análisis conjunto
  CPSAO-CTO en chat (hipótesis a validar, métricas, criterios de éxito y de paso a
  Beta) y ratificación expresa del Fundador de 6 puntos: (1) la Alpha Cerrada como
  siguiente gran meta de producto antes de la salida completa a producción, (2) el
  principio de que la Alpha valida cambio de comportamiento financiero real, no solo
  uso de la app, (3) el principio de confianza como indicador principal, (4) la
  estructura de 8 fases del Plan Alpha (registrada como esqueleto aprobado, sin
  desarrollo de fases todavía), (5) el Copiloto en modo plantillas durante la Alpha
  (sin IA generativa, para evitar el gate de DPA), (6) un principio permanente de
  protección de datos, incorporado también a `PRODUCT_VISION.md` (ver Historial de ese
  documento). No genera ninguna `FIN`, no toca el Backlog de desarrollo.
