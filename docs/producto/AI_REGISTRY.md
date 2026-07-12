# Registro de Agentes de IA — Millo

- **Versión:** 1.0
- **Fecha:** 2026-07-06
- **Autor:** CTO (administrador exclusivo de este documento, Gobernanza v3.1 §23)
- **Estado:** Vigente — 2 agentes registrados (los ya operativos antes de esta regla,
  regularizados retroactivamente)
- **Historial de cambios:**
  - v1.0 (2026-07-06) — creación del documento (Gobernanza v3.1 §23). Alta retroactiva
    de CPSAO y CTO/Arquitecto/Auditor, los agentes ya operativos en el proyecto antes
    de que existiera esta regla — regularización análoga a la de FIN-013–016, sin que
    esto siente precedente para futuras incorporaciones (que sí deben seguir el flujo
    completo de la sección 22 desde la propuesta).

---

Ninguna IA pertenece oficialmente al proyecto solo por haber sido creada. Este
registro es el único lugar donde un agente queda formalmente incorporado (Gobernanza
v3.1 §22-23).

| ID | Nombre | Objetivo | Estado | Fecha incorporación | Responsable Prompt Maestro | Documentos que consulta | Documentos que genera | Restricciones | Cumple vistas minimizadas | Lista de arranque en frío |
|----|--------|----------|--------|---------------------|------------------------------|--------------------------|------------------------|----------------|---------------------------|---------------------------|
| AI-0001 | CPSAO (Chief Product, Strategy & AI Officer) | Estrategia de producto, ideación, roadmap 1/3/5 años | `oficial` (regularizado) | 2026-07-06 | Fundador | `docs/producto/*`, `docs/roadmap/BACKLOG.md` (solo lectura), `docs/correspondencia/*` (lectura y escritura — mecanismo de escritura real sin confirmar, ver `docs/correspondencia/FIN-020-Experiencia-de-Presupuesto.md`, entrada 2026-07-12) | `IDEA-XXXX.md`, propuestas estratégicas, entradas en `docs/correspondencia/*` | No diseña arquitectura, no programa, no modifica el Backlog, no implementa, no tiene autoridad jerárquica sobre el CTO | No aplica — no es tool de LLM, no accede a datos de usuario | `ESTADO_PROYECTO.md` · `PRODUCT_VISION.md` · `BACKLOG.md` (índice) |
| AI-0002 | CTO / Arquitecto / Auditor (Claude, roles separados) | Gobernanza técnica, arquitectura, implementación, auditoría, validación | `oficial` (regularizado) | 2026-07-04 | Fundador | Todo `docs/` | `ARQ`, `AUD`, `DEC`, `IMP`, `GOBERNANZA.md`, `BACKLOG.md`, entradas en `docs/correspondencia/*` | Independencia de roles entre CTO/Arquitecto/Auditor (Gobernanza v3.0 §17) | No aplica a estos roles de gobernanza; **sí aplica** a cualquier tool de LLM que el Arquitecto introduzca dentro del producto (Copiloto Financiero, FIN-005) — verificado caso por caso en cada `ARQ` correspondiente | `GOBERNANZA.md` · `ESTADO_PROYECTO.md` · `BACKLOG.md` (índice) · `ARQ`/`AUD`/`DEC` de la FIN activa |
| AI-0003 | CMIO (Chief Market Intelligence Officer) | Centralizar la inteligencia de mercado (investigación externa), separada de decisiones de producto y ejecución técnica | `evaluado` — CTO aprueba pasar a paso 3 (§22). No oficial todavía | Pendiente (paso 4: Fundador crea el chat) | CPSAO | Por definir en paso 5 (Arquitecto) | Investigación de mercado con evidencia citable — entregables a definir en el Prompt Maestro | No decide producto, arquitectura ni gobernanza; solo investiga y entrega evidencia; reporta exclusivamente al CPSAO (Gobernanza §33, cadena de comunicación) | Pendiente — aplica solo si accede a datos de usuario (no previsto); el Auditor confirma en paso 6 si corresponde | `ESTADO_PROYECTO.md` · `PRODUCT_VISION.md` · `COMPETITIVE_ANALYSIS.md` (no requiere código ni ARQ técnico) |

## Historial

- 2026-07-12 — CTO: registrado `docs/correspondencia/*` como documento que
  CPSAO/CTO/Arquitecto/Auditor pueden generar y consultar (convención propuesta por
  el CPSAO, adoptada operativamente — pendiente ratificación formal en
  `GOBERNANZA.md`, mismo estado que `PROCEDIMIENTO-ARRANQUE-EN-FRIO.md`). Pendiente
  confirmar el mecanismo real de escritura del CPSAO (su alcance previo era de solo
  lectura sobre `docs/producto/*`).
- 2026-07-06 — CTO: creación del documento y alta retroactiva de AI-0001/AI-0002,
  únicos agentes operativos hasta la fecha. Futuras incorporaciones siguen el flujo
  completo de Gobernanza v3.1 §22 desde la propuesta del CPSAO, sin regularización
  retroactiva.
