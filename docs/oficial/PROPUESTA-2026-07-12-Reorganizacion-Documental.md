# Propuesta — Reorganización documental integral y sistema de continuidad entre sesiones

- **Solicitado por:** CPSAO (2026-07-12) — "ninguna IA debe depender del historial de un chat para continuar trabajando."
- **Autor:** CTO (Claude)
- **Estado:** Propuesta para revisión del CPSAO/Fundador. **No entra en vigor ni se aplica a `GOBERNANZA.md` hasta autorización expresa** (mismo patrón que `PROPUESTA-2026-07-06-Gobernanza-v3.0-Consolidada.md`).
- **Alcance:** mejora estructural de la gobernanza documental. No modifica funcionalidades, arquitectura técnica, UX, ni ninguna `FIN` activa.
- **Insumo verificado:** inventario real del árbol `docs/` (4.0 MB, 130+ archivos), no una estimación — ver §1.

---

## 0. Diagnóstico (verificado contra el árbol real, no supuesto)

| Documento | Tamaño/extensión real | Problema identificado |
|---|---|---|
| `GOBERNANZA.md` | 655 líneas, 33 secciones | Crece indefinidamente con cada mecanismo nuevo. Sin índice navegable — una IA nueva debe leer 655 líneas para saber si una regla le aplica. |
| `BACKLOG.md` | 211 líneas y creciendo | Cada fila de `FIN` cerrada acumula un párrafo de verificación completo (ver fila `FIN-019`, ~200 palabras). A 50 `FIN`, esto será ilegible como índice. Mezcla dos funciones que deberían separarse: **índice** (qué existe, en qué estado) y **evidencia** (por qué se cerró así). |
| `docs/producto/` | 2.8 MB (72% del árbol) | Incluye capturas (evidencia permanente, correcto que pesen) mezcladas con documentos de trabajo de una sola `FIN` (`COMPRENSION-FIN020-...md`) sin distinción de ciclo de vida. |
| Documentos raíz (`00-vision...md` … `10-costos...md`) | 10 archivos, anteriores a la Gobernanza | Sin encabezado de versión, sin dueño declarado, sin relación explícita con el `ARQ` correspondiente que los reemplazó (p. ej. `02-arquitectura-sistema.md` vs `ARQ-0001`). Ambigüedad real: ¿siguen vigentes o son solo históricos? |
| Ningún documento de estado agregado | — | Hoy, reconstruir el contexto completo exige leer `GOBERNANZA.md` + `BACKLOG.md` completo + el último `DEC`/`VALIDACIÓN` + mensajes de chat no documentados. No existe un único punto de entrada. |

**Conclusión del diagnóstico:** el problema no es falta de documentación — es *sobra* de documentación sin jerarquía de lectura. Ya existe el principio correcto (`GOBERNANZA.md` §32, única fuente de verdad) — falta aplicarlo a la documentación misma, no solo a los conceptos financieros del producto.

## 1. Principio rector

**Separar "índice" de "evidencia" en todo documento maestro.** Un índice dice *qué existe y en qué estado* (una línea, con enlace). La evidencia dice *por qué* (vive en el documento original — `DEC`, `VALIDACIÓN`, `ARQ` — nunca duplicada en el índice). Este es el mismo principio de §32 aplicado un nivel más arriba: ningún hecho vive en dos documentos a la vez; el índice apunta, no repite.

## 2. Clasificación: permanente vs. temporal

Ningún documento oficial se elimina (§20, sin cambios). La clasificación no es "qué se borra" — es "qué rige la lectura obligatoria de una IA nueva" vs. "qué es evidencia histórica consultable bajo demanda":

**Nivel 1 — Lectura obligatoria para cualquier IA al iniciar sesión (el "arranque en frío"):**
`GOBERNANZA.md` · `ESTADO_PROYECTO.md` (nuevo, §5) · `BACKLOG.md` (versión índice, §4).

**Nivel 2 — Lectura obligatoria solo para el rol/tarea activa:**
El `ARQ`/`AUD`/`DEC`/`IMP`/`VALIDACIÓN` de la `FIN` en curso · `PRODUCT_VISION.md` y `COMPETITIVE_ANALYSIS.md` para CPSAO/CMIO · `AI_REGISTRY.md` para incorporación de agentes.

**Nivel 3 — Evidencia histórica, se consulta bajo demanda, nunca se lee completa por defecto:**
Todo `ARQ`/`AUD`/`DEC`/`IMP`/`VALIDACIÓN` de `FIN` ya cerradas · `docs/archive/*` · `docs/producto/capturas/*` · `RECORRIDO-*`, `RC-*` · documentos de comprensión previos a un `ARQ` (`COMPRENSION-FINXXX.md`) una vez que su contenido quedó absorbido en el `ARQ` correspondiente (ya ocurrió con `ARQ-0020` §0, que cita `COMPRENSION-FIN020`).
Los 10 documentos raíz (`00`…`10`) se reclasifican formalmente como **Nivel 3 — fundacionales, supersedidos por `ARQ` cuando exista uno equivalente** (ver §6, migración).

## 3. Documentos maestros y sus dueños

| Documento | Dueño exclusivo | Naturaleza | Frecuencia de actualización |
|---|---|---|---|
| `GOBERNANZA.md` | CTO | Versionado, constitución del proyecto | Cada mecanismo permanente nuevo ratificado |
| `BACKLOG.md` | CTO | Índice vivo (no evidencia) | Cada `ARQ`/`AUD`/`DEC`/`IMP`/Cierre |
| `ESTADO_PROYECTO.md` (nuevo) | CTO | Snapshot mutable (no append-only) | Mismo momento que `BACKLOG.md` — acción conjunta, no independiente |
| `AI_REGISTRY.md` | CTO | Registro vivo | Cada paso del flujo §22 |
| `ALPHA_REGISTRY.md` / `PHR_REGISTRY.md` | CTO | Registro vivo | Cada `ALPHA-XXX` / cada `PHR` |
| `PRODUCT_VISION.md`, `COMPETITIVE_ANALYSIS.md`, `MONETIZATION.md`, `METRICS.md` | CPSAO | Documento vivo | Cuando el CPSAO lo decida |
| `PRODUCT_DECISIONS.md`, `USER_RESEARCH.md` | CPSAO | **Append-only** (nunca se reescribe, solo se agrega) | Cada decisión/hallazgo estratégico |
| `LAB.md` | CTO (admite propuestas del CPSAO) | Índice vivo | Cada `IDEA-XXXX` |
| `ARQ`/`IMP` por `FIN` | Arquitecto | Inmutable una vez cerrado (solo adendos versionados) | Una vez por fase |
| `AUD`/`VALIDACIÓN`/`RC-XXXX` por `FIN` | Auditor | Inmutable una vez cerrado (solo adendos versionados) | Una vez por fase |

## 4. `BACKLOG.md` — de "narrativa" a "índice" (cambio de formato, no de contenido)

**Regla nueva, aplicable desde `FIN-020`:** cada fila del Backlog contiene **una sola línea de estado** con enlaces, nunca el párrafo de verificación completo. La verificación detallada de cierre (lo que hoy ocupa la fila) se traslada a una nueva sección obligatoria dentro del propio `DEC` de esa `FIN`: **`§Cierre`**, redactada por el CTO al momento del cierre (mismo contenido que hoy se escribe en Backlog, solo que vive donde ya vive el resto de la decisión).

Ejemplo de formato nuevo de fila (usando FIN-019 como referencia, sin reescribir su historia real):

> `FIN-019 | Experiencia de Salud | Alta | Cerrado — ver DEC-0019 §Cierre, VALIDACIÓN-0019 (APROBADO) | Habilita FIN-020`

Las filas ya escritas (`FIN-001`–`FIN-019`) **no se reescriben** — quedan como registro histórico tal cual se produjeron (principio de no alterar el historial). Solo las filas nuevas siguen el formato corto. El encabezado de `BACKLOG.md` documentará este punto de corte explícitamente.

## 5. `ESTADO_PROYECTO.md` — el documento nuevo, y el mecanismo para mantenerlo vivo

**No es un documento adicional que alguien deba "acordarse" de actualizar — es una escritura obligatoria en el mismo acto que ya actualiza `BACKLOG.md`.** Hoy la regla operativa dice "cada vez que se genere un documento (ARQ/AUD/DEC/IMP) se actualiza el Backlog" (§7). Se extiende: **esa misma acción actualiza también `ESTADO_PROYECTO.md`, en el mismo turno, nunca como tarea separada.** El CTO es el único administrador de ambos — no depende de que un agente externo "recuerde" hacerlo.

**Contenido obligatorio (una sola pantalla, pensado para lectura en minutos):**

```markdown
# ESTADO_PROYECTO — Milla

- Actualizado: <fecha> · por: CTO
- Gobernanza vigente: v3.11 (docs/GOBERNANZA.md)

## FIN activa
FIN-020 — Experiencia de Presupuesto · Fase actual: ARQ entregado, pendiente DEC
Documentos: ARQ-0020 (v1.0) · AUD-0020 · (AUD/DEC/IMP pendientes)

## Últimas 5 FIN cerradas
- FIN-019 — Experiencia de Salud — Cerrado (DEC-0019 §Cierre)
- FIN-018 — Evolución de Inicio — Cerrado (DEC-0018 §14)
- FIN-017 — UX Login/Dashboard — Cerrado (DEC-0017)
- FIN-016 — Periodo financiero — Cerrado
- FIN-015 — Proyección de ahorro — Cerrado

## Hoja de ruta UX (posición actual)
Inicio ✅ · Salud ✅ · Presupuesto 🔄 (FIN-020, en curso) · Deudas ⏳ · Simulador ⏳ · Copiloto ⏳
RC integral: pendiente, programada al cierre de las 6 experiencias.

## Agentes de IA oficiales
CTO, Arquitecto, Auditor, CPSAO — oficiales. CMIO — evaluado, pendiente Prompt Maestro
(ver AI_REGISTRY.md AI-0003).

## Decisiones del Fundador pendientes de ejecutar
Ninguna.

## Bloqueos abiertos
Ninguno.

## Próxima acción esperada
CTO: emitir DEC-020 tras revisar AUD-020.
```

**Por qué esto cumple el criterio de éxito del CPSAO:** una IA nueva (Arquitecto, Auditor, o CMIO) que solo lea `GOBERNANZA.md` + `ESTADO_PROYECTO.md` + `BACKLOG.md` (versión índice) queda orientada sobre qué está vigente, qué está activo y qué se espera de ella — sin necesitar el historial del chat. Si necesita detalle de una `FIN` específica, el índice le da el enlace exacto (Nivel 2/3, bajo demanda, no por defecto).

## 6. Estrategia de versionado y anti-duplicidad

- Todo documento **snapshot** (`ESTADO_PROYECTO.md`) se sobrescribe — no es append-only, no acumula historial propio (su historial ya vive en `BACKLOG.md`/`ARQ`/`DEC`).
- Todo documento **append-only** (`PRODUCT_DECISIONS.md`, `USER_RESEARCH.md`) nunca se reescribe, solo se agrega — regla ya vigente (§11), sin cambios.
- Todo documento **inmutable una vez cerrado** (`ARQ`/`AUD`/`DEC`/`IMP`/`VALIDACIÓN`) solo admite adendos versionados explícitos (v1.1, v1.2...) — regla ya vigente, sin cambios.
- **Regla anti-duplicidad nueva:** ningún hecho operativo (estado de una `FIN`, versión vigente de Gobernanza, agentes oficiales) se escribe en más de un documento con redacción propia — se escribe una vez en su documento dueño (tabla §3) y se **enlaza**, nunca se repite, en cualquier otro lugar que lo mencione. Extensión directa de §32 a la documentación misma.

## 7. Estrategia de incorporación de nuevas IAs (extiende §22-23, sin reemplazarlas)

`AI_REGISTRY.md` gana una columna nueva: **"Lista de arranque en frío"** — los documentos exactos que ese agente debe leer antes de su primera acción. Ejemplos:
- Arquitecto/Auditor: `GOBERNANZA.md` + `ESTADO_PROYECTO.md` + `BACKLOG.md` + el `ARQ`/`DEC` de la `FIN` activa.
- CMIO: `PRODUCT_VISION.md` + `COMPETITIVE_ANALYSIS.md` + `ESTADO_PROYECTO.md` (no necesita código ni `ARQ` técnico — su alcance no lo requiere).

## 8. Plan de migración (orden propuesto, cada paso revisable independientemente)

1. **Crear `ESTADO_PROYECTO.md`** con el contenido real actual (verificado, no estimado) — aditivo, cero riesgo, no reescribe nada existente.
2. **Adoptar el formato corto de `BACKLOG.md`** desde `FIN-020` en adelante — las filas anteriores no se tocan.
3. **Adoptar la convención `§Cierre` dentro del `DEC`** desde `FIN-020` en adelante.
4. **Añadir la columna "Lista de arranque en frío" a `AI_REGISTRY.md`** — aditivo.
5. **Reclasificar formalmente los 10 documentos raíz** como Nivel 3/fundacionales en el encabezado de `GOBERNANZA.md` (una línea aclaratoria, no se mueven ni se eliminan).
6. **Codificar el mecanismo como sección permanente de `GOBERNANZA.md`** (nueva versión) — **solo después de la revisión y ratificación del CPSAO/Fundador**, siguiendo la misma disciplina aplicada a todo mecanismo permanente de esta gobernanza.

Ningún paso de este plan modifica código, arquitectura técnica, UX ni el estado de `FIN-020` en curso.

## 9. Criterio de éxito (tomado textualmente del CPSAO, para que la revisión lo verifique)

"Cualquier IA puede iniciar un chat completamente nuevo, leer únicamente los documentos definidos por el sistema, y continuar trabajando con el mismo nivel de contexto que tendría si hubiese participado desde el primer día." — verificable en la práctica: el Nivel 1 (§2) son 3 documentos, ninguno mayor a una pantalla de lectura salvo `GOBERNANZA.md` (que ya cuenta con índice de historial de versiones al inicio, suficiente para orientarse sin leer las 33 secciones completas).
