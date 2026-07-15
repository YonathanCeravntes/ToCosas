# Procedimiento de arranque en frío — cualquier IA nueva o cambio de chat

- **Autor:** CTO
- **Estado:** Operativo desde 2026-07-12, dentro de la reorganización documental en ejecución (`PROPUESTA-2026-07-12-Reorganizacion-Documental.md`). Refinado el 2026-07-12 con dos mejoras al informe de incorporación solicitadas por el CPSAO (ver Paso 4). Pendiente de ratificación formal como sección de `GOBERNANZA.md` (paso 6 del plan de migración) — las mejoras del Paso 4 ratifican junto con el resto del mecanismo, no antes.
- **Propósito:** que un chat nuevo — mismo rol o rol distinto — quede orientado sin depender del historial de la conversación anterior.

---

## Paso 1 — Lectura obligatoria (Nivel 1, siempre, sin excepción)

1. `docs/GOBERNANZA.md` — reglas vigentes. Basta leer el bloque de historial de versiones (encabezado) para saber qué mecanismos existen; profundizar solo en la sección relevante a la tarea.
2. `docs/ESTADO_PROYECTO.md` — snapshot del estado actual: qué `FIN` está activa, en qué fase, qué se espera de cada rol ahora mismo.
3. `docs/roadmap/BACKLOG.md` — índice de todas las `FIN` (formato corto desde FIN-020); enlaces a la evidencia de cada una si se necesita detalle.

## Paso 2 — Lectura según el rol (Nivel 2, condicional)

- **Arquitecto/Auditor entrando a una `FIN` en curso:** leer el `ARQ`/`AUD`/`DEC` vigente de esa `FIN` (citados en `ESTADO_PROYECTO.md`).
- **CPSAO:** `PRODUCT_VISION.md`, `PRODUCT_DECISIONS.md` (append-only, leer las últimas entradas), `COMPETITIVE_ANALYSIS.md` si aplica.
- **CMIO (cuando se oficialice):** `PRODUCT_VISION.md`, `COMPETITIVE_ANALYSIS.md` — no requiere `ARQ` técnico ni acceso a código.
- **Cualquier IA nueva (§22):** su fila en `docs/producto/AI_REGISTRY.md`, columna "Lista de arranque en frío".

## Paso 3 — Verificación antes de actuar

Ninguna IA asume que un hecho es cierto solo porque aparece en `ESTADO_PROYECTO.md` o en el historial de chat — ambos son puntos de partida, no la fuente de verdad final. La fuente de verdad es siempre el documento oficial citado (`ARQ`/`AUD`/`DEC`/`IMP`) y, cuando aplique, el código real del repositorio (regla ya vigente: "el estado oficial se determina solo por artefactos verificables").

## Paso 4 — Informe de incorporación (contenido obligatorio)

Al completar los pasos 1–3, todo CTO entrante presenta un informe de incorporación en formato EOC v1.0 (`GOBERNANZA.md` §33) que debe incluir, como mínimo:

1. Qué documentos leyó y el estado que reconstruyó (FIN activa, roadmap UX, gates y riesgos abiertos, próxima acción esperada).
2. Cualquier vacío o inconsistencia documental encontrado, indicando si lo corrigió o si requiere que otro rol lo resuelva.
3. **Evaluación propia del CTO sobre el estado del proyecto** (mejora del CPSAO, 2026-07-12): fortalezas, riesgos, oportunidades y aspectos prioritarios a vigilar desde su responsabilidad técnica y de gobernanza. No es una repetición del estado reconstruido, sino un juicio propio.
4. **Confirmación explícita de la prioridad estratégica actual del CPSAO** (mejora del CPSAO, 2026-07-12): el CTO declara cuál entiende que es la dirección de producto vigente, para validar que reconstruyó no solo el estado técnico sino el rumbo estratégico.
5. Declaración de si asume formalmente el cargo o si existe un bloqueo real.

**Propósito de las mejoras 3 y 4:** verificar comprensión —técnica y de dirección de producto—, no generar documentación adicional. El CTO no decide estrategia (competencia del CPSAO/Fundador); solo demuestra que la comprende.

## Paso 5 — Antes de que una ventana de contexto termine

Todo agente que anticipe el cierre de su ventana de contexto debe, antes de que eso ocurra, volcar a documentación oficial cualquier conocimiento relevante que solo exista en el historial de la conversación (decisiones tomadas verbalmente, hallazgos no escritos, matices de diseño discutidos pero no documentados). Ningún conocimiento operativo puede depender exclusivamente de un historial de chat que puede cerrarse en cualquier momento.

## Paso 6 — Mantenimiento (responsabilidad del CTO)

`ESTADO_PROYECTO.md` y `BACKLOG.md` se actualizan en el mismo acto — nunca por separado — cada vez que se emite un `ARQ`/`AUD`/`DEC`/`IMP`/Cierre. Esta no es una tarea adicional: es una extensión de la regla operativa ya vigente ("cada vez que se genere un documento se actualiza el Backlog", `GOBERNANZA.md` §7).
