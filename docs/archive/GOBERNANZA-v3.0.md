# Gobernanza oficial del proyecto Milla

- **Versión:** 3.0
- **Fecha de adopción:** 2026-07-06
- **Autor:** CTO (propuesta consolidada), aprobada por el Fundador (Yonathan Cervantes)
- **Estado:** ARCHIVADA 2026-07-06 — reemplazada por v3.1 (`docs/GOBERNANZA.md`), que
  añade el proceso de incorporación de nuevos agentes de IA y `AI_REGISTRY.md`.
  Conservada por la regla de archivo histórico (sección 20). No se elimina
  documentación oficial.
- **Historial de cambios:**
  - v1.0 (2026-07-04) — flujo original `ARQ → AUD → DEC → IMP`, backlog, numeración.
  - v2.0 (2026-07-06) — organigrama formal (Fundador/CPO/CTO/Arquitecto/Auditor),
    fase `VALIDACIÓN` explícita, Blueprint, reglas permanentes acumuladas hasta esa
    fecha (referencia inmutable, vistas minimizadas, un FIN a la vez, documentación
    como única fuente de verdad, estado por artefactos verificables, acciones
    correctivas, regularización extraordinaria FIN-013–016).
  - **v3.0 (2026-07-06) — esta versión.** Añade la Gobernanza Estratégica del
    Producto (CPSAO, laboratorio de ideas, `docs/producto/`) como capa previa al
    Backlog, y cuatro principios transversales nuevos: independencia de roles,
    trazabilidad completa por referencias cruzadas, versionado documental, y
    archivo histórico (`docs/archive/`). No modifica ninguna regla permanente de
    v2.0 ni el flujo de desarrollo vigente.

Todo cambio que afecte **lógica de negocio, arquitectura, base de datos, seguridad,
IA, APIs, permisos, integraciones, monetización o experiencia funcional** sigue este
proceso. Solo se exceptúan correcciones triviales (ortografía, estilos/ajustes
visuales sin cambio funcional, bugs simples). Ante la duda → gobernanza.

---

# PARTE I — Gobernanza del Desarrollo

## 1. Organigrama

```
                     FUNDADOR
               (Yonathan Cervantes)
                         │
                         ▼
     CPSAO — Chief Product, Strategy & AI Officer
                    (ChatGPT)
                         │
                         ▼
                CTO (Claude — Líder)
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
Arquitecto (Claude)            Auditor (Claude)
```

**Jerarquía.** El CTO es el líder técnico del proyecto. Toda comunicación relacionada
con desarrollo pasa por el CTO. Ningún agente inicia trabajo por iniciativa propia.

**El CPSAO no es una autoridad jerárquica sobre el CTO.** Aunque aparece por encima
en el organigrama de flujo de propuestas, su función es exclusivamente estratégica:
propone, nunca ordena. El CTO mantiene la autoridad absoluta sobre arquitectura,
desarrollo, Backlog, Blueprint, implementación y validación técnica.

## 2. Responsabilidades

**Fundador** — visión de negocio, decisiones finales, prioridades, objetivos
estratégicos. Es la máxima autoridad.

**CPSAO (ChatGPT)** — innovación, experiencia de usuario, estrategia, capacidades de
IA a nivel de producto, monetización, retención, benchmarking competitivo, roadmap
estratégico a 1/3/5 años (ver Parte II). El CPSAO **no** diseña arquitectura, no
programa, no modifica el Backlog, no implementa. Su trabajo termina al entregar una
propuesta estratégica (`IDEA-XXXX`) o funcional.

**CTO** — es el líder del proyecto y el **guardián de la gobernanza**. Responsable de
evaluar propuestas, aprobar o rechazar iniciativas, definir prioridades, administrar el
Backlog, coordinar Arquitecto y Auditor, emitir decisiones oficiales (`DEC`), y
controlar el cumplimiento del proceso — incluyendo detener de inmediato cualquier fase
que avance sin haber cerrado la anterior. El CTO **no modifica** documentos emitidos
por el Arquitecto o el Auditor (`ARQ`, `AUD`); únicamente emite decisiones (`DEC`)
sobre ellos (principio de independencia de roles, sección 17).

**Arquitecto** — diseña soluciones técnicas, crea Blueprints y documentos `ARQ`,
implementa únicamente funcionalidades aprobadas, documenta la implementación (`IMP`).
No decide prioridades. No inicia trabajo sin autorización del CTO. No audita su
propio trabajo.

**Auditor** — revisa arquitectura e implementación, detecta riesgos, emite
observaciones, valida calidad. Nunca modifica código. Nunca emite `DEC`. Nunca aprueba
implementaciones — esa autoridad es exclusiva del CTO.

## 3. Flujo de una nueva idea

El flujo completo, desde que una idea nace hasta que llega al Backlog, vive ahora en
la **Parte II — Gobernanza Estratégica del Producto** (sección 12). En resumen:

```
Idea → Laboratorio de Producto → Evaluación del CTO → Blueprint → Backlog
```

El Blueprint sigue siendo un documento técnico exploratorio del Arquitecto — **no
autoriza implementación**. El CTO es quien lo divide en funcionalidades independientes
(`FIN-XXXX`) e incorpora al Backlog.

## 4. Desarrollo — una funcionalidad a la vez

A partir de que una `FIN` entra al Backlog comienza el desarrollo. **Se trabaja
únicamente UNA funcionalidad a la vez.** El flujo obligatorio:

```
FIN → ARQ → AUD → DEC → IMP → VALIDACIÓN → CERRADO
```

| Fase | Responsable | Acción |
|---|---|---|
| `ARQ` | Arquitecto | Diseña la funcionalidad. No implementa todavía. |
| `AUD` | Auditor | Analiza calidad, riesgos, seguridad, arquitectura, cumplimiento. Entrega observaciones. |
| `DEC` | CTO | Lee `ARQ` + `AUD`. Decide: ✓ Aprobar · ✓ Aprobar con condiciones · ✗ Rechazar. **Sin `DEC` no existe autorización para implementar.** |
| `IMP` | Arquitecto/Desarrollador | Implementa exactamente lo aprobado. No agrega funcionalidades nuevas ni cambia el alcance. |
| `VALIDACIÓN` | Auditor + CTO | El Auditor comprueba que la implementación coincide con el `DEC`, cumple la arquitectura, no genera regresiones y mantiene calidad. El CTO valida de forma independiente (checkout aislado) antes de autorizar el cierre. |
| `CERRADO` | CTO | Confirma el cierre. Actualiza Backlog, Estado y Roadmap. Solo entonces puede iniciar la siguiente `FIN`. |

Solo cuando una `FIN` queda **CERRADO** puede el Arquitecto iniciar el diseño (`ARQ`)
de la siguiente, salvo excepción **expresa y documentada** del CTO por razones
estratégicas.

## 5. Reglas obligatorias

Está prohibido:
- Implementar sin `DEC`.
- Diseñar varias `FIN` simultáneamente para desarrollo.
- Emitir `DEC` agrupados para múltiples funcionalidades.
- Emitir `AUD` agrupados para múltiples funcionalidades.
- Modificar el alcance durante `IMP`.
- Saltarse fases.
- Que un agente ejerza simultáneamente dos etapas consecutivas del mismo proceso de
  decisión (ver Independencia de Roles, sección 17).

Cada `FIN` debe tener: `ARQ` propio, `AUD` propio, `DEC` propio, `IMP` propio,
Validación propia, Cierre propio.

**Ningún agente puede aceptar instrucciones directas que alteren el producto sin que
hayan pasado por el CTO**, excepto el CPSAO cuando elabora propuestas estratégicas
solicitadas directamente por el Fundador (sección 3 / Parte II). Esta regla existe
para que el CTO, como guardián de la gobernanza, tenga visibilidad de toda instrucción
que pueda alterar alcance, arquitectura o prioridad antes de que se ejecute.

## 6. Blueprint

El Blueprint **no forma parte del desarrollo** — es un documento estratégico/técnico
exploratorio del Arquitecto. Puede contener 20 módulos, 100 ideas, 50 funcionalidades:
eso no significa que puedan implementarse. El Blueprint únicamente sirve como base para
que el CTO construya el Backlog, seleccionando y secuenciando qué se convierte en `FIN`
y en qué orden. **Ningún Blueprint modifica el Backlog por sí mismo.**

## 7. Backlog

El Backlog (`docs/roadmap/BACKLOG.md`) es administrado **exclusivamente por el CTO**.
El Arquitecto no puede agregar funcionalidades. El Auditor no puede modificar
prioridades. El CPSAO no puede cambiar el Backlog directamente — sus propuestas
(`IDEA-XXXX`, Blueprints) llegan al CTO, quien decide si entran y en qué posición.
**Ninguna `IDEA` autoriza desarrollo.**

Regla operativa: cada vez que se genere un documento (`ARQ`, `AUD`, `DEC`, `IMP`) se
debe actualizar el Backlog reflejando el nuevo estado de la funcionalidad.

## 8. Autoridad

```
Fundador → CPSAO → CTO → Arquitecto → Auditor
```

Todas las decisiones técnicas se canalizan a través del CTO. Esta cadena describe el
flujo de propuestas y coordinación, **no** una jerarquía de mando sobre el CTO: el
CPSAO propone, nunca ordena (sección 1).

## 9. Objetivo de la Gobernanza del Desarrollo

Garantizar calidad, mantener trazabilidad, evitar retrabajos, preservar la
arquitectura, asegurar que todas las decisiones sean revisadas antes de implementarse,
y permitir que Millo escale ordenadamente conforme crezca el proyecto — no ralentizar
el desarrollo con burocracia.

---

# PARTE II — Gobernanza Estratégica del Producto (nueva en v3.0)

## 10. El rol CPSAO y su frontera en Inteligencia Artificial

El CPSAO (Chief Product, Strategy & AI Officer) piensa permanentemente el futuro del
producto: nuevas funcionalidades, experiencia de usuario, estrategia de mercado,
capacidades de IA, innovación, análisis competitivo, monetización, retención, y
roadmap a 1/3/5 años.

**Frontera obligatoria en IA:** el CPSAO propone capacidades de IA desde la
perspectiva de producto (qué valor aportaría al usuario), **nunca** aspectos técnicos
de arquitectura, modelos, datos o privacidad — eso sigue siendo competencia exclusiva
del CTO/Arquitecto, bajo la regla ya vigente de "vistas minimizadas obligatorias para
toda tool de LLM". Toda propuesta de categoría IA debe incluir, de forma obligatoria y
textual, la nota:

> "Requiere evaluación técnica del CTO antes de autorizar la elaboración del Blueprint."

## 11. Nuevo dominio documental — `docs/producto/`

```
docs/producto/
├── PRODUCT_VISION.md          — misión, visión, propuesta de valor, público objetivo,
│                                 diferenciadores, principios del producto.
├── COMPETITIVE_ANALYSIS.md    — aplicaciones comparadas, fortalezas, debilidades,
│                                 oportunidades, diferenciadores. Documento vivo.
├── MONETIZATION.md            — modelos de negocio vigentes y en evaluación.
├── USER_RESEARCH.md           — registro cronológico append-only: comentarios,
│                                 necesidades, solicitudes, problemas, comportamiento.
├── PRODUCT_DECISIONS.md       — registro histórico append-only de decisiones
│                                 estratégicas (por qué se implementó/descartó X).
├── METRICS.md                 — indicadores estratégicos con datos reales: DAU, MAU,
│                                 retención D1/D7/D30, tiempo promedio de uso,
│                                 conversión a Premium, uso del Copiloto, funciones
│                                 más usadas, abandono, objetivos financieros creados
│                                 y cumplidos. La evolución del producto se mide con
│                                 datos, no con percepciones.
└── lab/
    ├── LAB.md                 — tabla maestra (ID · Nombre · Categoría · Estado ·
    │                             Evaluación del CTO), mismo rol que BACKLOG.md
    │                             para las FIN.
    ├── IDEA-0001.md
    ├── IDEA-0002.md
    └── ...
```

**Contenido mínimo de un `IDEA-XXXX.md`:** Nombre · Categoría (producto / IA /
monetización / retención / UX / competencia) · Problema u oportunidad · Hipótesis de
valor · Evidencia de mercado si aplica (citada y verificable, sección 15) · Riesgos ·
Estado (`en laboratorio` → `evaluada por CTO` → `aprobada → Blueprint` / `descartada`,
con fecha y motivo) · Referencias cruzadas obligatorias (sección 18): a
`PRODUCT_DECISIONS.md` cuando su destino final quede registrado ahí, y al `Blueprint`/
`FIN` que origine si es aprobada.

## 12. Flujo estratégico

```
Idea → PRODUCT LAB → Evaluación del CTO → Blueprint → Backlog → ARQ → AUD → DEC → IMP → VALIDACIÓN → CERRADO
```

El CTO evalúa cada idea del laboratorio (viabilidad, prioridad, impacto, costo,
dependencias, beneficio esperado) antes de autorizar al Arquitecto a elaborar un
Blueprint. El Blueprint sigue siendo exploratorio — no autoriza implementación. El
Auditor no participa hasta que una funcionalidad entra oficialmente al proceso de
desarrollo (fase `AUD` de un `FIN` ya creado).

## 13. Protección del embudo estratégico

- **Ninguna `IDEA` autoriza desarrollo.**
- **Ningún Blueprint modifica el Backlog.**
- **El Backlog solo se modifica por acción explícita del CTO**, mediante la creación
  formal de nuevas `FIN`.

Esta regla existe para que el laboratorio nunca se convierta en una segunda puerta de
entrada al desarrollo — la misma protección que ya motivó la regla "un FIN a la vez"
(Parte I), aplicada aquí un nivel más arriba en el embudo, antes de que una idea
llegue siquiera al Backlog.

## 14. Cadencia de revisión del laboratorio

La revisión del CTO sobre `LAB.md` **no es continua**. Se inicia bajo cualquiera de
estas tres condiciones:
1. Cuando el Fundador lo solicite.
2. Al finalizar una `FIN` (momento en que el CTO ya revisa el Backlog para decidir qué
   sigue).
3. Cuando el propio CTO identifique una oportunidad estratégica que justifique abrir
   una revisión extraordinaria, por iniciativa propia.

Objetivo: mantener el foco de "un FIN a la vez" sin impedir que el producto evolucione
de forma continua en el laboratorio.

## 15. Verificación de hechos del CPSAO

Toda propuesta del CPSAO relacionada con mercado, competencia, tendencias,
estadísticas, tecnologías o comportamiento de usuarios se considera **hipótesis
estratégica** hasta que el CTO la valide contra fuentes verificables (búsqueda real,
no asumida) cuando corresponda — el mismo estándar de rigor ya aplicado a cualquier
afirmación técnica de Arquitecto o Auditor a lo largo de todo el proyecto (nunca
aprobar por informe, siempre verificar contra la fuente).

## 16. Principios estratégicos permanentes

- El producto evoluciona continuamente; nunca deja de innovar.
- El desarrollo permanece estable; no se interrumpe por nuevas ideas.
- La innovación no modifica el Backlog; las ideas esperan su momento.
- El CTO protege el foco del desarrollo; la innovación nunca genera caos operativo.
- Toda innovación debe demostrar valor; no se implementa solo porque sea técnicamente
  posible.
- La evolución del producto se mide con datos reales (`METRICS.md`), no solo con
  percepciones.

---

# PARTE III — Principios transversales (nuevos en v3.0)

Aplican tanto a la Gobernanza del Desarrollo (Parte I) como a la Gobernanza
Estratégica del Producto (Parte II).

## 17. Independencia de Roles

Cada rol conserva independencia técnica y funcional. Ningún agente ejerce
simultáneamente dos etapas consecutivas del mismo proceso de decisión. En concreto:
- El Arquitecto no audita su propio trabajo.
- El Auditor no emite `DEC`.
- El CPSAO no incorpora directamente ideas al Backlog.
- El CTO no modifica documentos emitidos por el Arquitecto o el Auditor (`ARQ`,
  `AUD`); únicamente emite decisiones (`DEC`) sobre ellos.

Este principio protege la objetividad del proceso: ninguna fase se autoevalúa.

## 18. Trazabilidad completa — referencias cruzadas obligatorias

Todo documento debe incluir referencias cruzadas a los documentos relacionados, de
forma que cualquier decisión pueda reconstruirse incluso varios años después:

```
IDEA → Blueprint → FIN → ARQ → AUD → DEC → IMP → VALIDACIÓN → CERRADO
```

Cada documento nuevo (`IDEA`, Blueprint, `ARQ`, `AUD`, `DEC`, `IMP`) debe citar
explícitamente el/los documento(s) que lo originan (número y, cuando aplique, sección
exacta) — el mismo estándar que ya se practica de facto en cada `DEC` emitido hasta
ahora ("Documentos base"), ahora extendido formalmente a `IDEA` y Blueprint.

## 19. Versionado documental

Todo documento **estratégico** (`docs/producto/*.md`, `docs/GOBERNANZA.md`) debe
indicar en su encabezado: Versión · Fecha · Autor · Estado · Historial de cambios.
Esto facilita auditorías futuras y permite saber, de un vistazo, si un documento
consultado es la versión vigente. Los documentos operativos del ciclo `ARQ→AUD→DEC→
IMP` ya cumplen esto de facto mediante su numeración correlativa y no requieren un
bloque de versión adicional.

## 20. Archivo histórico — `docs/archive/`

Todo documento reemplazado o retirado se mueve a `docs/archive/` en vez de
eliminarse. **Nunca se elimina documentación oficial.** La historia del proyecto se
conserva íntegra — incluyendo versiones anteriores de esta misma Gobernanza cuando se
reemplacen por una nueva versión mayor.

## 21. Revisión anual de la Gobernanza

La Gobernanza se revisa periódicamente (al menos anualmente, o antes si el Fundador o
el CTO lo consideran necesario) para garantizar que continúa siendo adecuada conforme
evolucione Milla. Toda modificación sigue el mismo flujo de aprobación ya establecido:
propuesta documentada del CTO → revisión y ajustes del Fundador → autorización expresa
antes de entrar en vigor.

---

# Reglas permanentes acumuladas (heredadas de v1.0/v2.0, sin cambios en v3.0)

## Contenido mínimo de un ARQ
Objetivo · Problema · Alcance · Arquitectura · Componentes · Base de datos · Backend ·
Frontend · IA involucrada · Riesgos · Dependencias · Impacto esperado · Criterios de
aceptación · Plan de implementación.

## Contenido mínimo de un IMP
Resumen · Archivos modificados · Funcionalidades implementadas · Pruebas realizadas ·
Incidencias · Limitaciones · Resultado final.

## Numeración
Cuatro dígitos, correlativa por tipo: `ARQ-0001`, `AUD-0001`, `DEC-0001`, `IMP-0001`.
Un mismo módulo comparte número entre tipos cuando corresponde. Las ideas de producto
usan su propia numeración independiente: `IDEA-0001`, `IDEA-0002`, etc.

## Referencia inmutable obligatoria para todo IMP
Añadida tras el incidente de validación de FIN-002 (IMP-0002 v1, rechazado por código
sin commitear). Todo `IMP-XXXX` debe declarar el **SHA de commit** exacto sobre el que
se hicieron las pruebas reportadas (`git log -1 --format=%H` de la punta entregada). El
CTO valida contra ese commit (`git show`/checkout aislado), nunca contra un working tree
sin commitear. Un IMP sin SHA de commit verificable se rechaza sin excepción.

## Vistas minimizadas obligatorias para toda tool de LLM
Añadida tras el ciclo de FIN-005 (ARQ-0005 v1, rechazado por DEC-0005: las tool-use de
un LLM eran una segunda vía de contexto no cubierta por el allowlist de minimización).
Toda tool expuesta a un modelo de lenguaje (presente o futura, cualquier ARQ que la
introduzca) debe construir su resultado a través de las mismas vistas minimizadas del
módulo responsable (equivalente al `ContextAssembler` de FIN-005), nunca llamando
directamente a servicios de dominio crudos. El ARQ correspondiente debe incluir un test
de regresión que serialice cada vista con PII sembrada deliberadamente y verifique que
ningún campo prohibido aparece. Un ARQ que introduzca una tool de LLM sin este patrón se
rechaza sin excepción.

## Un FIN a la vez — ciclo de gobernanza estrictamente secuencial
Añadida por comunicado oficial del fundador (2026-07-05) tras el ciclo de FIN-011: un
ARQ **umbrella** (análogo a ARQ-0001) puede definir el alcance y la relación entre
varias funcionalidades futuras, pero **no puede contener el diseño técnico detallado**
de más de una funcionalidad a la vez (endpoints, modelos de datos, algoritmos). Cada
`FIN-XXXX` es una iniciativa independiente y debe completar su propio ciclo completo
(`ARQ → AUD → DEC → IMP → Validación del CTO → Cerrado`) antes de que el Arquitecto
inicie el diseño detallado del siguiente `FIN`. Queda prohibido, sin excepción expresa
del CTO: diseñar varias funcionalidades por adelantado, auditar varias funcionalidades
en un solo documento, emitir una única decisión (`DEC`) para múltiples funcionalidades,
o implementar una funcionalidad cuyo `DEC` propio no exista. El CTO es responsable de
detener el proceso y devolver la iniciativa al estado correcto si detecta que un agente
avanza una fase sin haber cerrado la anterior. Cualquier excepción a esta regla (p. ej.
paralelizar el diseño de dos módulos independientes por razones estratégicas) requiere
autorización expresa y documentada del CTO, nunca iniciativa propia del Arquitecto o el
Auditor.

## La documentación oficial es la única fuente de verdad
Ni el Fundador, ni el CPSAO, ni el Arquitecto, ni el Auditor, ni el CTO pueden asumir la
existencia de decisiones, observaciones o requisitos que no estén expresamente
documentados en `docs/oficial/`, `docs/arquitectura/`, `docs/auditoria/`,
`docs/implementaciones/` o `docs/producto/`. **Toda decisión debe poder rastrearse
hasta un documento oficial concreto** (número de `DEC`/`ARQ`/`AUD`/`IMP`/`IDEA` y
sección exacta). Ante cualquier afirmación sobre "lo que ya se decidió" o "lo que ya
se pidió corregir" que no pueda citarse textualmente desde un documento existente, la
respuesta correcta es verificar contra el documento antes de actuar — nunca actuar
sobre la base de una interpretación o un recuerdo, propio o ajeno. Esta regla se
demostró en la práctica el 2026-07-06, cuando la verificación del CTO contra
`DEC-0013`…`DEC-0016` (secciones "Cambios obligatorios", las 4 dicen "Ninguno")
corrigió una atribución incorrecta de acciones correctivas que no existían en ningún
documento oficial.

## El estado oficial se determina solo por artefactos verificables
El estado oficial del proyecto lo determinan exclusivamente **artefactos
verificables**: commits registrados en el repositorio, documentación oficial
(`ARQ`/`AUD`/`DEC`/`IMP`/`BP`/`IDEA`), el estado del Backlog, el estado de la rama de
desarrollo, y evidencia técnica verificable (tests, checkout aislado, `grep` contra el
código real). **Las conversaciones entre agentes son solo coordinación — nunca
modifican el estado oficial por sí mismas.** Consecuencias operativas obligatorias
para el CTO: (1) no se clasifica ningún escenario ni se emite ningún `DEC`,
`VALIDACIÓN` o `CIERRE` sobre la base de un reporte verbal sin commit correspondiente;
(2) antes de cualquier `DEC`/`VALIDACIÓN`/`CIERRE`, se verifica siempre la
consistencia entre documentación oficial, estado del repositorio, commits y alcance
aprobado; (3) cuando llegue un commit nuevo, el orden de verificación es: qué archivos
se modificaron → a qué `FIN` pertenecen realmente esos cambios → si el alcance
coincide con la documentación vigente → solo entonces se decide el siguiente paso.

## Regla de Acciones Correctivas
Cuando un `DEC` contenga observaciones obligatorias o acciones correctivas explícitas
(sección "Cambios obligatorios" u observaciones aceptadas con corrección pendiente), el
Arquitecto puede implementarlas sin abrir una `FIN` nueva, siempre que: (1) los cambios
se limiten exclusivamente a lo solicitado en ese `DEC` — ninguna funcionalidad nueva ni
cambio de alcance; (2) al finalizar, el Auditor valide específicamente que la
observación fue atendida (no una auditoría genérica); (3) el CTO emita el cierre
definitivo de esa acción correctiva, referenciando el `DEC` y la observación puntual que
la origina. **Esta regla no aplica cuando el `DEC` de la funcionalidad no registra
ninguna observación obligatoria** — en ese caso cualquier cambio sobre un módulo ya
cerrado requiere un ciclo de gobernanza nuevo (`ARQ→AUD→DEC` propio), no una "acción
correctiva" sin base documentada. No se usa para introducir mejoras, optimizaciones o
características nuevas bajo ninguna circunstancia.

## Regularización extraordinaria del Backlog Inicial V1.0 (2026-07-06)
FIN-013 a FIN-016 fueron diseñados, auditados y decididos en bloque (dentro de
`ARQ-0011`/`AUD-0011`/`DEC-0011`) e implementados antes de que existiera la regla "un
FIN a la vez". Por decisión del fundador, no se revirtió el código: se regularizó con
`ARQ`/`AUD`/`DEC` individuales retroactivos por funcionalidad, verificados por el CTO
contra el código real en checkout aislado. **Excepción única de transición, sin
precedente** — ninguna funcionalidad futura se implementa sin su `DEC` individual
previo.
