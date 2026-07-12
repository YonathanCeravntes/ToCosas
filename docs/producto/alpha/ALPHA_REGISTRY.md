# Programa ALPHA — Tabla Maestra

- **Versión:** 1.0
- **Fecha:** 2026-07-06
- **Autor:** CTO (administrador exclusivo, Gobernanza v3.3 §25)
- **Estado:** Vigente — 1 fase en curso
- **Historial de cambios:**
  - v1.0 (2026-07-06) — creación del documento, programa `ALPHA-XXX` ratificado por
    el Fundador. Alta de `ALPHA-001`.
- **Referencias cruzadas:** `docs/producto/lab/IDEA-0002.md`, `docs/GOBERNANZA.md`
  (Parte III §25), `docs/producto/PRODUCT_DECISIONS.md`.

---

Tabla maestra del programa Alpha Cerrada — mismo rol que `BACKLOG.md` cumple para las
`FIN`. Disciplina: una fase a la vez, entregable verificable, aprobación explícita
antes de iniciar la siguiente.

Orden oficial: `ALPHA-001` Objetivos → `ALPHA-002` Selección de participantes →
`ALPHA-003` Preparación técnica → `ALPHA-004` Preparación legal → `ALPHA-005`
Instrumentación de métricas → `ALPHA-006` Cronograma operativo → `ALPHA-007`
Criterios de éxito → `ALPHA-008` Criterios de paso a Beta.

| ID | Nombre | Objetivo | Estado | Entregable |
|----|--------|----------|--------|------------|
| ALPHA-001 | Objetivos de la Alpha | Definir formalmente qué se valida con la Alpha Cerrada | `aprobada` (CPSAO, 2026-07-06) | `docs/producto/alpha/ALPHA-001-Objetivos.md` |
| ALPHA-002 | Selección de participantes | Definir criterios de elegibilidad y de diversidad de perfiles para el grupo piloto | `aprobada` (CPSAO, 2026-07-06) | `docs/producto/alpha/ALPHA-002-Seleccion-Participantes.md` |
| ALPHA-003 | Preparación técnica | Habilitar acceso controlado + canales de retroalimentación cualitativa ("Consejo Fundador") | `aprobada` (CPSAO, 2026-07-06) | `docs/producto/alpha/ALPHA-003-Preparacion-Tecnica.md` |
| ALPHA-004 | Preparación legal | Resolver PIA, consentimiento informado y seguridad base | `aprobada` (CPSAO, 2026-07-06) | `docs/producto/alpha/ALPHA-004-Preparacion-Legal.md` |
| ALPHA-005 | Instrumentación de métricas | Medir uso, comprensión e impacto — no solo interacción | `aprobada` (CPSAO, 2026-07-06) | `docs/producto/alpha/ALPHA-005-Instrumentacion-Metricas.md` |
| ALPHA-006 | Cronograma operativo | Estructurar la ventana de 30 días con checkpoints intermedios | `aprobada` (CPSAO, 2026-07-06) | `docs/producto/alpha/ALPHA-006-Cronograma-Operativo.md` |
| ALPHA-007 | Criterios de éxito | Consolidar los umbrales de éxito de la Alpha | `aprobada` (CPSAO, 2026-07-06) | `docs/producto/alpha/ALPHA-007-Criterios-Exito.md` |
| ALPHA-008 | Criterios de paso a Beta | Definir condiciones mínimas de salida de Alpha vs. capacidades deseables de Beta | `aprobada` (CPSAO, 2026-07-06) | `docs/producto/alpha/ALPHA-008-Criterios-Paso-Beta.md` |

## Principios transversales del programa (aplican a todas las fases, desde ALPHA-003)

- **Taxonomía obligatoria de observaciones** (por solicitud del CPSAO, 2026-07-06):
  toda observación relevante durante la Alpha se clasifica en una de 5 categorías —
  Bug (error técnico) · Usabilidad (no entiende cómo usar una función) · Confianza
  (duda del resultado o no cree en la información) · Funcionalidad (necesidad no
  cubierta) · Comportamiento (uso distinto al esperado). Aplica tanto a lo reportado
  por los canales de Consejo Fundador (`ALPHA-003`) como a lo detectado por el
  equipo.
- **Todo hallazgo termina en decisión, nunca solo registrado:** cada observación
  clasificada debe resolverse en una acción concreta, una hipótesis descartada, o una
  decisión consciente de no actuar — nunca queda como una nota sin destino. Se
  registra en `PRODUCT_DECISIONS.md` o en el cierre de la Alpha (`ALPHA-008`), según
  corresponda.
- **Transparencia radical en todo documento que lea el usuario** (CPSAO, 2026-07-06):
  todo documento de la Alpha que el participante deba leer (consentimiento, política
  de privacidad, comunicaciones) debe ser comprensible para una persona sin
  conocimientos jurídicos ni técnicos. La claridad es parte de la experiencia del
  producto, no un trámite aparte.
- **Principio de Claridad Radical** (CPSAO, 2026-07-06): toda dificultad de
  comprensión de un participante es responsabilidad del producto, no del usuario.
  Cuando alguien no entienda una funcionalidad, la primera hipótesis es mejorar
  diseño/lenguaje/experiencia — nunca concluir que "el usuario necesita
  capacitación". Aplica a la instrumentación (`ALPHA-005`) y a cómo se interpretan
  los hallazgos de categoría Usabilidad (ver taxonomía arriba).
- **Cada fase deja un activo reutilizable, no solo un documento** (CPSAO, 2026-07-06):
  a partir de `ALPHA-007`, toda fase debe producir, además de su documento, una
  herramienta/plantilla/proceso que acelere la ejecución del resto del programa.
  Primer activo: `ALPHA_RESULTS_TEMPLATE.md` (estructura lista desde el día 1 del
  piloto, sin contenido todavía).
- **La Alpha no termina a los 30 días** (CPSAO, 2026-07-06): termina cuando el
  aprendizaje obtenido se transformó en decisiones concretas de producto — se mide
  por calidad de decisiones, no por cantidad de usuarios ni por calendario.
- **Criterios de éxito estables** (CPSAO, 2026-07-06): los criterios de `ALPHA-007`
  no se modifican retroactivamente durante la ejecución. Cualquier indicador nuevo
  identificado durante el piloto se documenta como aprendizaje para futuras versiones
  del producto (`ALPHA_RESULTS_TEMPLATE.md`), no altera la vara con la que se evalúa
  esta Alpha.
- **Planificación cerrada, etapa de ejecución** (CPSAO, 2026-07-06): con `ALPHA-007`
  y `ALPHA-008` aprobadas, no se autorizan nuevas fases `ALPHA-XXX` de planificación.
  El programa pasa a ejecutar los gates reales de `ALPHA-004` y el lanzamiento de
  `ALPHA-006`. Seguimiento en `ALPHA_EXECUTION_BOARD.md`, no en documentos nuevos de
  planificación.

## Historial

- 2026-07-06 — CTO: creación del registro y entrega de `ALPHA-001` para evaluación
  del CPSAO. `ALPHA-002` no inicia hasta que `ALPHA-001` sea aprobada.
- 2026-07-06 — CPSAO: `ALPHA-001` aprobada, con observación estratégica incorporada al
  alcance de `ALPHA-002` (diversidad de perfiles de comportamiento financiero, no solo
  elegibilidad). CTO entrega `ALPHA-002` incorporando esa observación. `ALPHA-003` no
  inicia hasta que `ALPHA-002` sea aprobada.
- 2026-07-06 — CPSAO: `ALPHA-002` aprobada, con observación estratégica de que los 20
  participantes se traten como "Consejo Fundador" (retroalimentación cualitativa
  activa, no solo métricas). CTO entrega `ALPHA-003` incorporando canales de reporte
  de dificultades, propuestas de mejora, explicación de decisiones y señales de
  confianza. `ALPHA-004` no inicia hasta que `ALPHA-003` sea aprobada.
- 2026-07-06 — CPSAO: `ALPHA-003` aprobada, con ampliación estratégica de taxonomía
  obligatoria de observaciones (Bug/Usabilidad/Confianza/Funcionalidad/Comportamiento)
  y el principio "todo hallazgo termina en decisión" para todo el programa. CTO
  entrega `ALPHA-004` (Preparación legal). `ALPHA-005` no inicia hasta su aprobación.
- 2026-07-06 — CPSAO: `ALPHA-004` aprobada, con el principio de transparencia radical
  para el consentimiento informado (incorporado retroactivamente a
  `ALPHA-004-Preparacion-Legal.md`) y el principio permanente de que todo documento
  legible por el usuario debe ser comprensible sin conocimientos jurídicos/técnicos.
  CTO entrega `ALPHA-005` (Instrumentación de métricas), incorporando además el
  Principio de Claridad Radical (toda dificultad de comprensión es responsabilidad
  del producto, no del usuario). `ALPHA-006` no inicia hasta su aprobación.
- 2026-07-06 — CPSAO: `ALPHA-005` aprobada, sin ampliaciones adicionales. CTO entrega
  `ALPHA-006` (Cronograma operativo). `ALPHA-007` no inicia hasta su aprobación.
- 2026-07-06 — CPSAO: `ALPHA-006` aprobada. CTO entrega `ALPHA-007` (Criterios de
  éxito, consolidación de lo ya acordado, sin criterios nuevos) y el primer activo
  reutilizable del programa: `ALPHA_RESULTS_TEMPLATE.md` (estructura de 9 campos,
  sin contenido, lista para usarse desde el día 1 del piloto). `ALPHA-008` no inicia
  hasta que `ALPHA-007` sea aprobada.
- 2026-07-06 — CPSAO: `ALPHA-007` aprobada, con directriz de estabilidad de criterios
  (no se modifican retroactivamente durante la ejecución). CTO entrega `ALPHA-008`
  (Criterios de paso a Beta): 4 condiciones mínimas obligatorias de salida de Alpha
  (ya anticipadas desde `ALPHA-001`/`ALPHA-007`) separadas explícitamente de las
  capacidades deseables para Beta (PIA ampliado, decisión sobre IA real del Copiloto,
  automatización del análisis cualitativo). Con esta fase se completa la
  planificación de las 8 fases del Programa Alpha — el siguiente paso, tras su
  aprobación, es ejecución real, no más planificación.
- 2026-07-06 — CPSAO: `ALPHA-007` y `ALPHA-008` aprobadas oficialmente. Cierre de la
  etapa de planificación — no se autorizan nuevas fases `ALPHA-XXX`. CTO entrega
  `ALPHA_EXECUTION_BOARD.md`: 11 actividades reales con responsable, dependencia y
  estado (candidatos, canal de Consejo Fundador, revisión legal del consentimiento,
  PIA, seguridad base, allowlist, distribución privada, validación de concurrencia,
  fecha de inicio, agenda de entrevistas). Próxima acción única recomendada:
  identificar candidatos reales e iniciar el PIA, por ser las de menor dependencia y
  mayor efecto de desbloqueo.
