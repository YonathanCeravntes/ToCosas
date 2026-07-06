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

| ID | Nombre | Objetivo | Estado | Fecha incorporación | Responsable Prompt Maestro | Documentos que consulta | Documentos que genera | Restricciones | Cumple vistas minimizadas |
|----|--------|----------|--------|---------------------|------------------------------|--------------------------|------------------------|----------------|---------------------------|
| AI-0001 | CPSAO (Chief Product, Strategy & AI Officer) | Estrategia de producto, ideación, roadmap 1/3/5 años | `oficial` (regularizado) | 2026-07-06 | Fundador | `docs/producto/*`, `docs/roadmap/BACKLOG.md` (solo lectura) | `IDEA-XXXX.md`, propuestas estratégicas | No diseña arquitectura, no programa, no modifica el Backlog, no implementa, no tiene autoridad jerárquica sobre el CTO | No aplica — no es tool de LLM, no accede a datos de usuario |
| AI-0002 | CTO / Arquitecto / Auditor (Claude, roles separados) | Gobernanza técnica, arquitectura, implementación, auditoría, validación | `oficial` (regularizado) | 2026-07-04 | Fundador | Todo `docs/` | `ARQ`, `AUD`, `DEC`, `IMP`, `GOBERNANZA.md`, `BACKLOG.md` | Independencia de roles entre CTO/Arquitecto/Auditor (Gobernanza v3.0 §17) | No aplica a estos roles de gobernanza; **sí aplica** a cualquier tool de LLM que el Arquitecto introduzca dentro del producto (Copiloto Financiero, FIN-005) — verificado caso por caso en cada `ARQ` correspondiente |

## Historial

- 2026-07-06 — CTO: creación del documento y alta retroactiva de AI-0001/AI-0002,
  únicos agentes operativos hasta la fecha. Futuras incorporaciones siguen el flujo
  completo de Gobernanza v3.1 §22 desde la propuesta del CPSAO, sin regularización
  retroactiva.
