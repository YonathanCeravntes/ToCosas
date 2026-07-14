# Gobernanza oficial del proyecto Milla

- **Versión:** 3.18
- **Fecha de adopción:** 2026-07-14
- **Autor:** CTO, propuesta del CPSAO, ratificada por el Fundador (Yonathan Cervantes)
- **Estado:** Vigente
- **Historial de cambios:**
  - v1.0 (2026-07-04) — flujo original `ARQ → AUD → DEC → IMP`, backlog, numeración.
  - v2.0 (2026-07-06) — organigrama formal (Fundador/CPO/CTO/Arquitecto/Auditor),
    fase `VALIDACIÓN` explícita, Blueprint, reglas permanentes acumuladas hasta esa
    fecha (referencia inmutable, vistas minimizadas, un FIN a la vez, documentación
    como única fuente de verdad, estado por artefactos verificables, acciones
    correctivas, regularización extraordinaria FIN-013–016).
  - v3.0 (2026-07-06) — añade la Gobernanza Estratégica del Producto (CPSAO,
    laboratorio de ideas, `docs/producto/`) como capa previa al Backlog, y cuatro
    principios transversales nuevos: independencia de roles, trazabilidad completa
    por referencias cruzadas, versionado documental, y archivo histórico
    (`docs/archive/`). Archivada en `docs/archive/GOBERNANZA-v3.0.md`.
  - v3.1 (2026-07-06) — añade el proceso de incorporación de nuevos agentes de IA al
    ecosistema (sección 22) y el registro `AI_REGISTRY.md` (sección 23), con los 3
    refinamientos del CTO ratificados por el Fundador: revisión del Auditor sobre
    acceso a datos/privacidad, cierre formal no automático a cargo del CTO, y
    administración exclusiva del registro por el CTO. Añade además el principio
    "Prioridad de ejecución sobre documentación" (sección 24). Archivada en
    `docs/archive/GOBERNANZA-v3.1.md`.
  - v3.2 (2026-07-06) — añade la regla permanente "Correspondencia exacta
    DEC→IMP→Código→Evidencia obligatoria en toda VALIDACIÓN", motivada por el
    hallazgo real de la validación de FIN-012 (IMP-0012 declaraba un test E2E de
    concurrencia que no existía en el commit). Archivada en
    `docs/archive/GOBERNANZA-v3.2.md`.
  - v3.3 (2026-07-06) — añade el programa paralelo `ALPHA-XXX` (sección 25) para
    preparar y ejecutar la Alpha Cerrada de usuarios reales (`IDEA-0002`), con la
    misma disciplina secuencial de `FIN-XXX` y su propio registro
    `docs/producto/alpha/ALPHA_REGISTRY.md`. Archivada en
    `docs/archive/GOBERNANZA-v3.3.md`.
  - v3.4 (2026-07-06) — añade el Project Health Review (PHR) como práctica
    permanente (sección 26): revisión periódica por hitos de tamaño, archivos
    innecesarios, dependencias, calidad, rendimiento, salud arquitectónica y
    tendencias entre ciclos, con indicador visual de salud (🟢🟡🟠🔴, 0-100). Nunca
    ejecuta cambios por sí mismo. Archivada en `docs/archive/GOBERNANZA-v3.4.md`.
  - v3.5 (2026-07-11) — añade la clasificación obligatoria de origen para toda FIN
    nueva (sección 27): funcionalidad nueva / deuda técnica / acción correctiva /
    mejora de revisión de producto / mejora del Programa Alpha. Archivada en
    `docs/archive/GOBERNANZA-v3.5.md`.
  - v3.6 (2026-07-11) — Amplía el contenido mínimo de un `AUD` (sección 28): para
    toda FIN que impacte experiencia de usuario, el Auditor debe responder
    explícitamente 6 preguntas de riesgo de comprensión, además de sus revisiones
    habituales de calidad/riesgo/seguridad/arquitectura. El Auditor identifica, no
    diseña ni decide — no modifica la Independencia de Roles. No modifica ninguna
    otra regla permanente ni el flujo de desarrollo vigente. Archivada en
    `docs/archive/GOBERNANZA-v3.6.md`.
  - v3.7 (2026-07-11) — Añade dos principios permanentes de
    experiencia de usuario (sección 29), propuestos por el CPSAO durante la
    validación de `DEC-017` y ratificados por el Fundador: "la interpretación nunca
    introduce una nueva pregunta" y "prioridad del lenguaje humano sobre el lenguaje
    financiero", extendiendo el Principio de Claridad Radical (sección 28) con un
    criterio de verificación concreto aplicable a toda FIN de experiencia de usuario
    futura. Archivada en `docs/archive/GOBERNANZA-v3.7.md`.
  - v3.8 (2026-07-11) — Añade la **Revisión de Comprensión (RC)**
    (sección 30), mecanismo permanente propuesto por el CPSAO y ratificado por el
    Fundador: paso previo obligatorio al cierre de toda experiencia UX, deliberadamente
    separado del Programa Alpha (secciones distintas de propósito: RC valida el
    lenguaje del producto, la Alpha valida el producto en uso real). Alcance
    reducido y con salvaguarda de datos personales incorporada de fábrica. Archivada
    en `docs/archive/GOBERNANZA-v3.8.md`.
  - v3.9 (2026-07-12) — Añade la **pregunta de cierre obligatoria
    de todo `ARQ` de experiencia de usuario** (sección 31), propuesta por el CPSAO
    durante la validación de `FIN-019` y ratificada por el Fundador con redacción
    propia: filtro de valor diferencial que obliga a demostrar que cada experiencia
    aporta algo irremplazable dentro del recorrido completo de Milla. Archivada en
    `docs/archive/GOBERNANZA-v3.9.md`.
  - v3.10 (2026-07-12) — Añade el principio permanente de **única
    definición oficial por concepto financiero** (sección 32), propuesto por el
    CPSAO durante la apertura de `FIN-020` (tras el hallazgo real de dos fórmulas
    contradictorias de "Te queda" entre Inicio y Presupuesto) y ratificado por el
    Fundador: ningún concepto financiero mostrado en más de una pantalla puede tener
    más de una fórmula/fuente de verdad. Archivada en
    `docs/archive/GOBERNANZA-v3.10.md`.
  - v3.11 (2026-07-12) — Añade el **Estándar Oficial de
    Comunicación (EOC v1.0)** (sección 33), propuesto por el CPSAO y ratificado por
    el Fundador en su totalidad: encabezado obligatorio, formato ejecutivo de
    respuesta, rúbrica de evaluación de entregas, y cadena de comunicación formal
    CPSAO↔CTO↔{Arquitecto, Auditor}.
  - v3.12 (2026-07-12) — Añade el **commit obligatorio de toda
    documentación oficial en el mismo acto** (sección 34), a raíz de un hallazgo real
    del CTO durante el checkout aislado de `FIN-020`: `GOBERNANZA.md` no se commiteaba
    desde el ciclo `FIN-012` (2026-07-05) — 426 líneas de esta misma Gobernanza (toda
    la Parte II, agentes de IA, EOC v1.0) existían solo en el working tree, junto con
    `ESTADO_PROYECTO.md`, varios `DEC`/`AUD`/`VALIDACIÓN` de FIN-018 a FIN-020, y el
    Programa Alpha completo. Ratificado por el Fundador (2026-07-12): "autorizo
    commitear y que esto no vuelva a ocurrir".
  - v3.13 (2026-07-13) — Añade la **política oficial de
    sincronización Git** (sección 35), a raíz de un hallazgo real del CTO al intentar
    el primer `push` autorizado a `origin`: la rama de trabajo tenía 7 commits
    divergentes en GitHub desde el día 1 del proyecto (2026-07-04) — un primer intento
    de gobernanza abandonado (`docs/auditorias/` plural, `ARQ-0001-Gestion-Movimientos`
    distinto del `ARQ-0001` vigente) que nunca se sincronizó ni se descartó
    formalmente. El Fundador estableció: GitHub y el repositorio local constituyen
    conjuntamente el repositorio oficial (ninguno reemplaza al otro), nunca se elimina
    historial sin respaldo previo, y ninguna operación destructiva de git se ejecuta
    sin resguardar la evidencia histórica primero — protocolo aplicado de inmediato
    (rama `legacy/origin-2026-07-13` publicada en GitHub antes del
    `push --force-with-lease`).
  - v3.14 (2026-07-13) — Añade el **Marco de gobernanza
    post-Fase 0** (sección 36), institucionalizado por memo formal del Fundador tras
    declararse finalizada la Fase 0 de infraestructura (backend en producción en
    Render + Neon, app móvil conectada): modelo híbrido de documentación en GitHub
    (todo el conocimiento reconstruible sí, secretos/legal/comercial sensible no);
    flujo oficial `Fundador→CPSAO→CTO→Arquitecto→Auditor→CTO→GitHub` con el CTO como
    **único integrador** de la rama oficial; testing obligatorio (unit/e2e/tsc/build/
    migraciones) antes de integrar; prohibición de escalar infraestructura por
    anticipación (solo por necesidad técnica demostrada); GitHub como registro
    histórico oficial; y el CTO como custodio permanente de la calidad técnica.
  - v3.15 (2026-07-13) — Añade el **Memorando de Sincronización de
    Contexto (MSC)** (sección 37): comunicación oficial que el CTO emite ante cambios de
    etapa estructurales para fijar una línea base única entre roles que no comparten
    sesión. Propuesta evaluada y presentada por el CTO sin incorporarla, aprobada con
    tres ajustes por el Fundador: disparador adicional por cambios de composición o
    responsabilidades del equipo (ajuste 1); cierre con confirmación de lectura de los
    roles afectados como evidencia de sincronización, no aprobación (ajuste 2); y
    reserva expresa del mecanismo a lo estructural, con revisión si su frecuencia se
    eleva (ajuste 3).
  - **v3.16 (2026-07-13) — esta versión.** Añade, a raíz de la primera Beta Técnica, la
    **gestión de defectos detectados en uso real** (sección 38): todo defecto lo evalúa y
    clasifica el CTO de inmediato (implementación/arquitectura/UX/nueva necesidad); solo
    las nuevas necesidades se vuelven `FIN`, el resto se corrige por mantenimiento con
    registro en el bug tracker `docs/oficial/REGISTRO-DEFECTOS.md` y trazabilidad
    defecto→corrección→commit. Añade además el **invariante de formato regional en campos
    numéricos** (sección 39), motivado por `BT-001` (un 500 al registrar `15,35`): todo
    campo numérico acepta coma/punto decimal y enteros, normalizado antes del Motor, sin
    error por formato regional.
  - **v3.17 (2026-07-14) — esta versión.** Añade el **gate obligatorio de despliegue OTA**
    (sección 40) a raíz de `BT-003` (un OTA llegó a usuarios apuntando a `localhost` por una
    suposición sobre `eas update`): ningún OTA se publica solo porque compile; un gate
    automático (`scripts/deploy/preflight-ota.mjs`) bloquea la publicación ante
    `localhost`/variables faltantes/config inconsistente/`/health` caído; vía única de
    publicación (`npm run ota:publish`, prohibido `eas update` directo); y dispositivo
    centinela previo a ampliar a todos los usuarios.
  - **v3.18 (2026-07-14) — esta versión.** Añade la **continuidad Beta** (sección 41): toda
    `FIN` cerrada e integrada debe reflejarse en la app de los usuarios de prueba vía OTA
    (por la vía segura de §40); los usuarios de prueba trabajan siempre con la última versión
    aprobada salvo razón técnica justificada. Ciclo oficial hasta el dispositivo:
    `Arquitecto→Auditor→CTO→Integración→GitHub→OTA→Dispositivos Beta`.

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

## 22. Incorporación de nuevos agentes de IA al ecosistema (nueva en v3.1)

Propuesta original del CPSAO, ratificada por el Fundador con 3 refinamientos del CTO.
**Ninguna IA pertenece oficialmente al proyecto solo por haber sido creada.** Flujo
obligatorio para incorporar un nuevo agente estratégico:

1. El CPSAO presenta la propuesta estratégica del nuevo agente (valor, objetivo,
   alcance).
2. El CTO evalúa: valor para el producto, prioridad, riesgos, impacto, conveniencia.
   Puede aprobar, rechazar o pedir ajustes.
3. Si el CTO aprueba, el CPSAO diseña el Prompt Maestro del agente.
4. El Fundador crea el nuevo Chat IA con ese Prompt Maestro.
5. El Arquitecto define cómo el agente interactúa con la gobernanza documental: qué
   documentos consulta, cuáles genera, cuándo interviene. Si el agente tendrá acceso a
   datos de usuario o funcionará como tool de un LLM, aplica la regla permanente de
   "vistas minimizadas obligatorias para toda tool de LLM" sin excepción.
6. **El Auditor revisa** los aspectos de acceso a datos, privacidad y cumplimiento de
   vistas minimizadas antes de la incorporación oficial (cuando corresponda — no
   aplica a agentes sin acceso a datos de usuario).
7. **Cierre formal, no automático:** el agente no queda incorporado por el solo hecho
   de completar los pasos 1-6. El CTO emite un registro de cierre en `AI_REGISTRY.md`
   (sección 23), equivalente al `DEC` que cierra un `FIN`. Solo entonces el agente
   forma parte oficial del ecosistema de Milla.

## 23. Registro de agentes de IA — `AI_REGISTRY.md` (nueva en v3.1)

`docs/producto/AI_REGISTRY.md` registra todos los agentes oficiales del proyecto.
**Administrado exclusivamente por el CTO** (mismo patrón que `BACKLOG.md` y
`LAB.md` — ningún otro rol lo edita directamente). Campos mínimos por agente:
Identificador único · Nombre · Objetivo · Estado (`propuesto` / `aprobado` /
`oficial` / `retirado`) · Fecha de incorporación · Responsable del Prompt Maestro ·
Documentos que puede consultar · Documentos que puede generar · Restricciones ·
**Cumple vistas minimizadas: Sí / No / No aplica** · Historial de versiones.

## 24. Prioridad de ejecución sobre documentación (nueva en v3.1)

Directriz expresa del Fundador (2026-07-06): la fase de definición de la gobernanza
alcanzó madurez suficiente; el foco principal del proyecto pasa a ser la ejecución.
Consecuencias operativas: (1) toda propuesta busca convertirse en valor real para
Milla lo antes posible; (2) las interacciones CPSAO-CTO se orientan a responder "¿cuál
es la siguiente acción concreta que más valor aporta al producto?"; (3) no se genera
documentación por generar documentación — la documentación sigue existiendo cuando es
necesaria para calidad y trazabilidad, pero deja de ser un fin en sí mismo. Esta regla
no elimina ninguna fase obligatoria del ciclo `ARQ→AUD→DEC→IMP→VALIDACIÓN→CERRADO` ni
las reglas permanentes existentes — regula el criterio de priorización, no el proceso.

## 25. Programa `ALPHA-XXX` — Alpha Cerrada de usuarios reales (nueva en v3.3)

Propuesta del CPSAO, ratificada por el Fundador. La preparación y ejecución de la
Alpha Cerrada (`IDEA-0002`) se administra como **programa paralelo** al desarrollo de
producto, con su propia nomenclatura `ALPHA-XXX` (`ALPHA-001`, `ALPHA-002`, ...), sin
mezclarse con `FIN-XXX`.

**Disciplina secuencial**, idéntica en espíritu a "un FIN a la vez": se ejecuta una
sola `ALPHA-XXX` a la vez; cada una debe completarse, revisarse y aprobarse por el
CPSAO/Fundador antes de iniciar la siguiente. El orden acordado: `ALPHA-001`
(Objetivos) → `ALPHA-002` (Selección de participantes) → `ALPHA-003` (Preparación
técnica) → `ALPHA-004` (Preparación legal) → `ALPHA-005` (Instrumentación de
métricas) → `ALPHA-006` (Cronograma operativo) → `ALPHA-007` (Criterios de éxito) →
`ALPHA-008` (Criterios de paso a Beta).

**Contenido mínimo de un `ALPHA-XXX`:** objetivo claramente definido · entregable
verificable · estado de avance · aprobación explícita antes de iniciar la siguiente
etapa.

**Regla de evidencia verificable (no de volumen documental):** cada `ALPHA-XXX` debe
producir evidencia concreta de avance hacia la primera validación con usuarios
reales — el progreso no se mide por cantidad de documentación, consistente con la
"Prioridad de ejecución sobre documentación" (sección 24).

**Registro:** `docs/producto/alpha/ALPHA_REGISTRY.md` — tabla maestra (mismo patrón
que `BACKLOG.md`/`LAB.md`/`AI_REGISTRY.md`), **administrada exclusivamente por el
CTO**. Cada `ALPHA-XXX` tiene su propio documento `ALPHA-XXX-Nombre.md` en
`docs/producto/alpha/`.

**Propósito declarado:** la Alpha no es un requisito previo a producción — es el
primer proceso formal mediante el cual Milla aprende directamente de usuarios reales.
El objetivo no es lanzar una Alpha; es aprender lo suficiente para construir un
producto extraordinario (`PRODUCT_DECISIONS.md`, 2026-07-06).

## 26. Project Health Review — PHR (nueva en v3.4)

Propuesta del CPSAO, ratificada por el Fundador. Práctica permanente para proteger la
mantenibilidad de Milla a medida que crece — no busca reducir el proyecto por
reducirlo, sino detectar oportunamente complejidad, deuda técnica o elementos que ya
no aportan valor.

**Frecuencia — por hitos, no continua:** (1) cada 3-4 `FIN` cerradas; (2) antes de
cualquier transición mayor (FIN-010, paso de Alpha a Beta); (3) cuando el CTO detecte
una señal de alerta y abra una revisión extraordinaria; (4) como mínimo cada 6 meses
si ninguna de las anteriores se cumple antes.

**Ejecutor:** el CTO. La sección de Calidad se apoya en las observaciones que el
Auditor ya genera en cada `AUD` — el CTO consolida, no audita desde cero.

**Metodología:** el mismo estándar de artefactos verificables que rige todo el
proyecto — mediciones reales (tamaño de repositorio, tiempos de compilación/tests,
`npm outdated`/`npm audit`, cobertura), nunca estimaciones.

**Contenido obligatorio de cada PHR:**
1. Tamaño del proyecto (total, distribución por carpetas, componentes que más
   espacio consumen).
2. Archivos innecesarios (builds, logs, cachés, temporales, backups, duplicados).
3. Dependencias (sin uso, desactualizadas, críticas pendientes, riesgos de
   seguridad conocidos).
4. Calidad del proyecto (deuda técnica, cobertura de pruebas, estado de la
   documentación, componentes obsoletos, código potencialmente muerto).
5. Rendimiento (tiempo de compilación, tiempo de tests, componentes de mayor
   impacto en el desarrollo).
6. **Salud Arquitectónica** — complejidad creciente, acoplamiento entre módulos,
   riesgo de que nuevas funcionalidades aumenten complejidad innecesariamente,
   componentes candidatos a refactorización, riesgos de escalabilidad.
7. **Tendencias** — desde el segundo PHR en adelante, comparación contra el ciclo
   anterior en tamaño, tiempo de compilación, tiempo de tests, número de
   dependencias, cobertura y deuda técnica (mejora / estable / empeora), no solo una
   fotografía aislada.
8. **Indicador visual de Salud del Proyecto** — puntaje 0-100 con semáforo:
   🟢 Excelente (90-100) · 🟡 Buena (75-89) · 🟠 Atención (60-74) · 🔴 Crítica (<60).
9. **Clasificación de acciones propuestas** — Críticas / Recomendadas / Opcionales.

**Principio permanente:** un PHR nunca elimina ni modifica nada por sí mismo — solo
identifica y clasifica. Toda acción que se decida ejecutar entra al flujo de
gobernanza normal según su naturaleza (corrección menor, `ARQ→AUD→DEC` nuevo, o
excepción documentada del CTO).

**Registro:** `docs/tecnico/PHR_REGISTRY.md` — tabla maestra (mismo patrón que
`BACKLOG.md`/`LAB.md`/`AI_REGISTRY.md`/`ALPHA_REGISTRY.md`), administrada
exclusivamente por el CTO. Cada ciclo genera `docs/tecnico/PHR-XXXX.md`, numeración
correlativa igual que `ARQ`/`AUD`.

## 27. Clasificación obligatoria de origen de las FIN (nueva en v3.5)

Propuesta del CPSAO, ratificada por el Fundador. A partir de `FIN-017`, todo `ARQ` y
toda fila del Backlog debe declarar explícitamente el **origen** de la FIN, en una de
estas 5 categorías:

- **Funcionalidad nueva** — capacidad de producto que no existía.
- **Deuda técnica** — corrección de algo construido antes, sin cambio de alcance
  funcional visible para el usuario.
- **Acción correctiva** — bajo la Regla de Acciones Correctivas ya vigente (cambios
  obligatorios de un `DEC` existente).
- **Mejora de revisión de producto** — originada en `PRODUCT_REVIEW_XXX` o en el
  proceso iterativo de capturas/UXR (Revisar → Mejorar → Validar → Revisar
  nuevamente).
- **Mejora del Programa Alpha** — originada en hallazgos de `ALPHA_RESULTS_TEMPLATE.md`
  durante la ejecución de la Alpha Cerrada.

**Propósito:** permitir, con el tiempo, entender de dónde provienen realmente las
mejoras que hacen evolucionar Milla — no es una categoría decorativa, es trazabilidad
(extensión del principio de Trazabilidad completa, sección 18).

## 28. Auditoría de riesgos de comprensión — obligatoria para FIN de experiencia de usuario (nueva en v3.6)

Propuesta del CPSAO, ratificada por el Fundador. Para toda FIN cuyo `DEC` confirme
impacto en experiencia de usuario (mismo criterio de aplicabilidad que el `UXR`,
sección 22 análoga), el `AUD` correspondiente debe responder explícitamente, además
de sus revisiones habituales (calidad, riesgo, seguridad, cumplimiento de
arquitectura):

1. ¿Existe algún elemento que pueda inducir a una interpretación incorrecta por parte
   de un usuario nuevo?
2. ¿Hay terminología técnica o financiera que pueda generar confusión?
3. ¿La propuesta incrementa innecesariamente la carga cognitiva del usuario?
4. ¿La jerarquía visual facilita identificar la acción principal?
5. ¿La propuesta mantiene coherencia con el resto del producto o introduce patrones
   que puedan desorientar al usuario?
6. ¿Las modificaciones respetan el Principio de Claridad Radical y ayudan a que una
   persona entienda mejor su situación financiera?

**El Auditor identifica, no diseña ni decide** — no altera la Independencia de Roles
(sección 17): señala los riesgos objetivamente para que el Arquitecto los corrija y
el CTO tenga mejores elementos antes de emitir el `DEC`.

**Criterio permanente de éxito para toda FIN de experiencia de usuario:** no se mide
por la cantidad de cambios implementados, sino por cuánto disminuye el esfuerzo que
debe hacer un usuario para comprender Milla y tomar una decisión con confianza.

## 29. Dos principios permanentes de interpretación y lenguaje (nueva en v3.7)

Propuesta del CPSAO, formulada durante la validación de `DEC-017` (FIN-017), ratificada
por el Fundador. Extienden el Principio de Claridad Radical (sección 28) con dos
criterios de verificación concretos, aplicables a toda FIN de experiencia de usuario
presente y futura:

1. **La interpretación nunca introduce una nueva pregunta.** Todo texto que acompañe
   una cifra debe resolver una duda del usuario, no generar una distinta. Si explicar
   una interpretación exige introducir una aclaración compleja sobre el funcionamiento
   interno del producto (p. ej. distinciones entre periodos o fuentes de datos), la
   solución debe reconsiderarse — no se agrega la aclaración, se simplifica el diseño.
   El usuario nunca debería necesitar entender el modelo financiero interno de Milla
   para comprender lo que ve.
2. **Prioridad del lenguaje humano sobre el lenguaje financiero/técnico.** Toda
   redacción de interpretación o de propuesta de valor debe superar la prueba: *¿una
   persona sin conocimientos financieros lo entendería en la primera lectura?* Si la
   respuesta es dudosa, el texto se simplifica más. El objetivo no es sacrificar
   precisión, sino que la precisión sea comprensible.

**Aplicación:** el Arquitecto debe aplicar ambos criterios al redactar o corregir
cualquier interpretación o texto orientado al usuario. El Auditor los verifica como
parte de las 6 preguntas de riesgo de comprensión ya vigentes (sección 28,
especialmente las preguntas 1, 2 y 6). No modifican la Independencia de Roles ni el
flujo `ARQ→AUD→DEC→IMP→VALIDACIÓN→CERRADO`.

## 30. Revisión de Comprensión — RC (nueva en v3.8)

Propuesta del CPSAO durante el cierre de `FIN-018`, ratificada por el Fundador.
Mecanismo permanente, **deliberadamente separado del Programa Alpha** (sección 25):
la Alpha valida el producto en uso real durante semanas; la RC valida únicamente si
una persona entiende la pantalla sin que nadie se la explique, en una sesión breve.
No se mezclan ni se sustituyen entre sí.

**Cuándo se ejecuta:** paso previo obligatorio antes de dar por cerrada cualquier
experiencia de usuario (Inicio, Salud, Presupuesto, Deudas, Simulador, Copiloto, y
las que se agreguen a la hoja de ruta), después de que el Auditor y el CTO ya
validaron `IMP` técnicamente. No reemplaza la Validación técnica — es adicional.

**Diseño obligatorio de la sesión:**
- Duración aproximada: 10-15 minutos por participante.
- Participantes: personas que nunca han usado Milla.
- **Sin crear cuentas reales. Sin registrar información financiera personal del
  participante** — se usa una demostración controlada o capturas con datos
  ficticios (los mismos que ya produce el tooling de captura del proyecto).
- El Auditor observa y documenta exclusivamente: comprensión, dudas,
  interpretaciones erróneas y puntos de confusión. **No evalúa funcionalidades, no
  mide satisfacción, no observa comportamiento financiero** — eso pertenece a la
  Alpha, no a la RC.

**Salvaguarda de datos personales (regla de detención obligatoria):** si en
cualquier momento la dinámica requiere tratar datos personales reales del
participante, o entra en conflicto con el marco legal ya definido para la Alpha
(`CONSENTIMIENTO-ALPHA.md`, `PIA-ALPHA.md`), la sesión se detiene de inmediato y esa
necesidad se integra al Programa Alpha cuando quede desbloqueado — la RC nunca
avanza sola sobre esa línea.

**Ejecutor:** el Auditor diseña y conduce las sesiones; documenta hallazgos de la
misma forma que un `AUD` (identifica, no decide). El CTO evalúa los hallazgos y
decide, junto con el CPSAO, si la experiencia cierra o requiere una iteración
adicional — la misma disciplina de "todo hallazgo termina en decisión" ya vigente
para la Alpha (sección 25).

**Registro:** los hallazgos de cada RC se documentan en `docs/producto/rc/` (un
archivo por experiencia evaluada, `RC-XXXX-Nombre.md`), con referencia cruzada al
`FIN` cuya experiencia se está validando.

## 31. Pregunta de cierre obligatoria de todo ARQ de experiencia de usuario — filtro de valor diferencial (nueva en v3.9)

Propuesta del CPSAO durante la revisión estratégica de `FIN-019` (Experiencia de
Salud), ratificada por el Fundador con redacción propia. **Obligatoria desde
`FIN-020` (Experiencia de Presupuesto) en adelante**, para todo `ARQ` que diseñe o
evolucione una experiencia de usuario completa (Inicio, Salud, Presupuesto, Deudas,
Simulador, Copiloto, y las que se agreguen a la hoja de ruta).

**La pregunta obligatoria**, textual, que el Arquitecto debe responder al cierre de
cada `ARQ` de experiencia:

> "Si elimináramos completamente esta experiencia de Milla, ¿qué capacidad perdería
> el usuario y por qué el resto del producto no podría reemplazarla?"

**Criterio de aceptación:** no se busca una defensa de la pantalla — se busca
demostrar que la experiencia aporta un valor único dentro del recorrido completo del
producto. **Si la respuesta no evidencia un valor diferencial claro, la experiencia
no está suficientemente definida**, o parte de su contenido pertenece en realidad a
otra experiencia — en ese caso el Arquitecto debe reconsiderar el alcance antes de
que el CTO emita el `DEC` correspondiente.

**Propósito:** obligar al equipo a justificar la existencia de cada experiencia desde
el valor que aporta al usuario, no desde la funcionalidad que implementa. Fortalece
la cohesión del producto, evita funcionalidades redundantes, y asegura que cada
experiencia tenga un propósito irremplazable dentro de Milla — extensión directa del
Principio de Claridad Radical (sección 28) y de los dos principios de interpretación
y lenguaje (sección 29), ahora aplicados al nivel de diseño de la experiencia
completa, no solo a su redacción.

**Aplicación:** el CTO verifica que la respuesta esté presente y sea sustantiva antes
de emitir `DEC` — una respuesta genérica o evasiva se trata como observación
bloqueante del `ARQ`, igual que cualquier otro contenido mínimo obligatorio (sección
"Contenido mínimo de un ARQ"). No modifica la Independencia de Roles ni el flujo
`ARQ→AUD→DEC→IMP→VALIDACIÓN→CERRADO`.

## 32. Única definición oficial por concepto financiero (nueva en v3.10)

Propuesta del CPSAO al abrir `FIN-020`, ratificada por el Fundador, a raíz de un
hallazgo real (no hipotético): `budget.service.ts` y `dashboard.service.ts` calculaban
dos valores distintos de "Te queda" ($6.092.801 vs $2.233.766 con datos de la misma
usuaria demo) — uno estático (compromisos fijos), otro con flujo real del ciclo
(incluye gasto variable) — mostrados en pantallas distintas bajo la misma promesa
verbal, sin ninguna explicación de por qué difieren.

**Principio permanente:** ningún concepto financiero mostrado en más de una pantalla
de Milla puede tener más de una fórmula o fuente de verdad. Si dos experiencias
necesitan mostrar el mismo concepto (p. ej. "cuánto te queda", "cuánto debes",
"cuánto ahorras"), ambas deben consumir el mismo cálculo — nunca reimplementarlo de
forma independiente con lógica propia. Esto no impide que el concepto se presente con
distinto nivel de detalle o distinta redacción según el contexto de cada experiencia
(sección 29) — lo que nunca puede variar es el **valor numérico** ni la fórmula que
lo produce.

**Aplicación obligatoria:**
- Todo `ARQ` que introduzca o modifique un concepto financiero ya mostrado en otra
  pantalla debe declarar explícitamente cuál es la única fórmula/fuente oficial de
  ese concepto, y cómo se garantiza que todas las pantallas que lo muestran la
  consumen exactamente igual (mismo servicio, mismo cálculo — nunca duplicado).
- El Auditor verifica este punto como parte de sus 6 preguntas de riesgo de
  comprensión (sección 28) — específicamente la pregunta 5 (coherencia con el resto
  del producto) se extiende a exigir, cuando aplique, evidencia concreta (grep/lectura
  de código) de que no existe una segunda fórmula divergente para el mismo concepto.
- Un `ARQ` que introduzca una segunda fórmula para un concepto que ya existe en otra
  pantalla, sin una razón documentada y aprobada por el CTO, se rechaza sin
  excepción.

**Propósito:** la confianza del usuario se construye tanto con lenguaje claro
(sección 29) como con consistencia numérica — un usuario que ve dos cifras distintas
para lo que percibe como la misma pregunta ("¿cuánto me queda?") aprende a desconfiar
del producto entero, no solo de la pantalla donde vio la discrepancia.

## 33. Estándar Oficial de Comunicación — EOC v1.0 (nueva en v3.11)

Propuesta del CPSAO, ratificada por el Fundador en su totalidad. Objetivo: reducir
consumo de contexto, aumentar velocidad de ejecución, y mantener comunicación
ejecutiva entre todos los roles. Reemplaza el formato de respuesta adoptado
informalmente por el CTO en el turno inmediatamente anterior a esta sección — EOC
v1.0 es ahora el único estándar vigente.

**1. Roles — sin cambios.** El CTO continúa como autoridad técnica exclusiva
(arquitectura, gobernanza, calidad, documentación oficial, coordinación de
Arquitecto y Auditor); no decide estrategia de producto, monetización ni
prioridades funcionales (secciones 1-2, sin modificación).

**2. Oficialización.** Toda documentación oficial sigue siendo responsabilidad
exclusiva del CTO: `GOBERNANZA`, `BACKLOG`, `PRODUCT_DECISIONS`, `PRODUCT_VISION`,
`ARQ`, `AUD`, `DEC`, `IMP`, `VALIDACIÓN`, `PHR`, `ALPHA`, `RC`, y cualquier
documento oficial futuro.

**3. Encabezado obligatorio** en toda comunicación entre roles:

```
De:
Para:
CC:
Asunto:
Fecha:
```

**4. Formato de respuesta obligatorio**, después del encabezado:

```
Estado
Conclusión
Acciones
Bloqueos
Pregunta (solo si es indispensable)
```

**Principios de redacción:** una respuesta = una decisión · máximo 250 palabras · no
repetir contexto ya conocido · no reexplicar decisiones anteriores (si ya está
documentada, citar "Documentado en..." en vez de repetirla) · no justificar en
varios párrafos.

**5. Cadena de comunicación formal:**

```
CPSAO ←→ CTO ←→ { Arquitecto, Auditor }
```

Sin comunicación cruzada entre roles fuera de esta estructura. El CTO sigue siendo
el único canal entre la capa estratégica (CPSAO/Fundador) y la capa técnica
(Arquitecto/Auditor) — consistente con la Jerarquía ya vigente (sección 1).

**6. Rúbrica de evaluación**, obligatoria al cierre de toda entrega (`ARQ`, `AUD`,
`DEC`, `IMP`, `VALIDACIÓN`, y equivalentes):

```
Calificación: X/10
Fortalezas (máximo 3)
Debilidades (máximo 3)
Decisión: Aprobar / Ajustar / Rehacer
```

**Relación con reglas existentes:** EOC v1.0 regula la **forma** de la
comunicación y la evaluación — no reemplaza ni relaja ninguna regla de fondo ya
vigente: verificación contra artefactos reales ("el estado oficial se determina
solo por artefactos verificables"), independencia de roles (sección 17),
correspondencia exacta `DEC→IMP→Código→Evidencia`, ni la ratificación del Fundador
exigida para todo mecanismo permanente nuevo. Un formato ejecutivo no exime al CTO
de verificar independientemente antes de decidir — solo exige que la verificación se
reporte de forma resumida, no que se omita.

## 34. Commit obligatorio de toda documentación oficial en el mismo acto (nueva en v3.12)

**Hallazgo que origina esta regla (no hipotético):** durante el checkout aislado de
`FIN-020` (2026-07-12), el CTO encontró que `docs/GOBERNANZA.md` no se commiteaba
desde el ciclo `FIN-012` (commit `44fdefb`, 2026-07-05) — 426 líneas de esta misma
Gobernanza (toda la Parte II, la incorporación de agentes de IA, EOC v1.0, y las
reglas §24-33) existían **solo en el working tree**, nunca en el historial de git.
Lo mismo ocurría con `ESTADO_PROYECTO.md` (nunca commiteado desde su creación),
`DEC-0018`/`DEC-0019`/`DEC-0020`, `AUD-0018`/`AUD-0019`/`AUD-0020`,
`VALIDACIÓN-0019`/`VALIDACIÓN-0020`, `PROMPT-MAESTRO-CTO.md`,
`PROCEDIMIENTO-ARRANQUE-EN-FRIO.md`, y el Programa Alpha completo
(`docs/producto/alpha/`). Esto contradecía directamente la regla ya vigente "el
estado oficial se determina solo por artefactos verificables: commits registrados
en el repositorio..." — la documentación existía, pero no como artefacto verificable
de git, con el riesgo real de pérdida total si el working tree se dañaba.

**Regla permanente:** toda documentación oficial (`ARQ`, `AUD`, `DEC`, `IMP`,
`VALIDACIÓN`, `GOBERNANZA.md`, `ESTADO_PROYECTO.md`, `BACKLOG.md`,
`PRODUCT_VISION.md`, `PRODUCT_DECISIONS.md`, `AI_REGISTRY.md`, `ALPHA_REGISTRY.md`
y cada `ALPHA-XXX`, `PHR_REGISTRY.md` y cada `PHR-XXXX`, `RC-XXXX`, `IDEA-XXXX`, y
cualquier documento oficial futuro) **debe commitearse a git en el mismo acto en que
se crea o se modifica** — nunca queda como cambio pendiente más allá de la sesión de
trabajo en que se produjo. Esto extiende a **toda** la documentación oficial la
disciplina que ya regía solo para `IMP` ("Referencia inmutable obligatoria para todo
IMP", regla permanente heredada de v1.0/v2.0): un documento sin commit no es, en la
práctica, un artefacto verificable.

**Responsabilidad:**
- Cada rol que produce un documento oficial (CTO, Arquitecto, Auditor, y el CPSAO
  cuando corresponda para `docs/producto/`) es responsable de commitearlo antes de
  cerrar su turno de trabajo — no delegarlo a una sesión futura.
- El CTO, como administrador exclusivo de `BACKLOG.md`/`ESTADO_PROYECTO.md` (sección
  7, Paso 5 de `PROCEDIMIENTO-ARRANQUE-EN-FRIO.md`), verifica en cada cierre de `FIN`
  que `git status` no reporte documentación oficial pendiente de commit — extensión
  directa de su responsabilidad de correspondencia exacta `DEC→IMP→Código→Evidencia`
  (regla permanente heredada) al dominio documental, no solo al de código.
- Si una IA (CTO, Arquitecto o Auditor) no tiene permiso de ejecutar `git commit` de
  forma autónoma en su entorno, debe declararlo explícitamente en su entrega y
  solicitar la ejecución del commit antes de dar por cerrada la fase — nunca asumir
  que "el archivo existe en disco" equivale a "el archivo es un artefacto oficial
  verificable".

**Ratificación:** propuesta del CTO tras el hallazgo, autorizada por el Fundador el
2026-07-12: *"Si, autorizo comittear y que esto no vuelva a ocurrir."*

## 35. Política oficial de sincronización Git (nueva en v3.13)

**Hallazgo que origina esta regla (no hipotético):** el 2026-07-13, al ejecutar el
primer `git push` autorizado a `origin` desde que existe disciplina de commits (§34),
el CTO encontró que la rama de trabajo tenía **7 commits divergentes en GitHub desde
el día 1 del proyecto** (2026-07-04, 20:28–22:50 UTC) que nunca llegaron al historial
local: un primer intento de gobernanza, distinto y abandonado
(`docs/auditorias/` en plural con su propio `README.md`, `ARQ-0000-Plantilla.md`,
un `ARQ-0001-Gestion-Movimientos.md` que no es el `ARQ-0001` vigente, un
`BACKLOG.md` de 60 líneas) más dos commits de frontend del mismo día. Ese primer
intento quedó reemplazado por el sistema de gobernanza que sí conocemos y usamos sin
interrupción desde entonces, pero el reemplazo nunca se sincronizó de vuelta a
GitHub — dejando el repositorio remoto y el local con historias irreconciliables por
`fast-forward` simple, sin que nadie lo supiera hasta este momento.

**Regla permanente:** el repositorio local y el repositorio en GitHub constituyen
**conjuntamente** el repositorio oficial del proyecto — **ninguno reemplaza al
otro**. Consecuencias operativas:

1. **Todo cambio aprobado debe existir en ambos.** El repositorio local es el
   entorno principal de trabajo; GitHub es la infraestructura oficial de respaldo y
   colaboración — no un simple backup pasivo. No pueden existir cambios permanentes
   únicamente en local, ni únicamente en GitHub.
2. **Nunca se elimina historial sin copia previa.** Ninguna operación destructiva de
   git (`push --force`, `push --force-with-lease`, `reset --hard` sobre una rama
   compartida, eliminar una rama remota) se ejecuta sobre `origin` sin resguardar
   primero la evidencia histórica que esa operación descartaría — aunque el CTO
   juzgue el contenido descartado como obsoleto.
3. **Procedimiento obligatorio ante una divergencia irreconciliable** (el caso que
   originó esta regla): (a) crear una rama exclusivamente de respaldo apuntando al
   estado remoto actual (convención de nombre: `legacy/origin-<fecha>`); (b)
   publicar esa rama en `origin` — el respaldo no cuenta como completo si solo existe
   en el entorno local de una sesión; (c) verificar por `git ls-remote` que el hash
   de la rama de respaldo remota coincide exactamente con el estado que se va a
   sobrescribir; (d) solo entonces ejecutar la operación destructiva autorizada
   (preferir siempre `--force-with-lease` sobre `--force` a secas); (e) verificar el
   estado final de ambas ramas y reportarlo.
4. **Ninguna operación destructiva de git se ejecuta sin autorización explícita del
   Fundador**, incluso cuando el CTO esté técnicamente seguro de que el contenido
   descartado es obsoleto — mismo criterio que ya rige para cualquier acción
   irreversible fuera del dominio de código (Sistema, sección "Executing actions with
   care").

**Aplicación del 2026-07-13 (precedente operativo):** rama `legacy/origin-2026-07-13`
creada y publicada en `origin` apuntando al commit `185de68` (el estado remoto
divergente completo) — verificada por `git ls-remote` antes de proceder. Solo
entonces se ejecutó `git push --force-with-lease` de la rama de trabajo
(`claude/finance-app-design-pr8qd5`) hacia `origin`, autorizado expresamente por el
Fundador tras revisar el contenido de los 7 commits.

**Ratificación:** establecida por instrucción directa del Fundador, 2026-07-13.

---

## 36. Marco de gobernanza post-Fase 0 (nueva en v3.14)

**Origen (no hipotético):** el 2026-07-13, al declararse oficialmente finalizada la
Fase 0 de infraestructura (backend NestJS en producción en Render + Neon PostgreSQL,
app móvil conectada, `render.yaml` corregido a la configuración real), el Fundador
emitió un memo formal (`docs/correspondencia/Infraestructura-Fase-0.md`) resolviendo
las decisiones de gobernanza pendientes. Esta sección institucionaliza esas
resoluciones como reglas permanentes.

### 36.1 Modelo híbrido de documentación en GitHub
GitHub es la **fuente oficial de respaldo del proyecto — del código y del
conocimiento**, no solo del código. **Permanece en GitHub** todo lo necesario para
reconstruir técnica y documentalmente el proyecto: código fuente, infraestructura,
arquitectura, gobernanza, roadmap, decisiones, auditorías, documentación técnica y
manuales. **No permanece en GitHub** la información sensible: credenciales, secretos,
claves, tokens, variables privadas, documentación legal confidencial e información
comercial sensible futura. (Coherente con lo ya vigente: todo secreto en `render.yaml`
es `sync: false` y nunca se commitea.)

### 36.2 Flujo oficial permanente — el CTO es el único integrador
Queda establecido el flujo permanente:
`Fundador → CPSAO → CTO → Arquitecto → Auditor → CTO → GitHub`.
**El CTO es el único responsable de integrar cambios oficiales.** No existen commits
oficiales directos del Arquitecto (ni de ningún otro rol) hacia la rama oficial.
Pueden existir ramas de trabajo, pero **ninguna modificación llega a la rama oficial
sin validación del CTO**. La estabilidad del producto tiene prioridad sobre la
velocidad. (Refuerza §35: local y GitHub son espejo, ambos frentes de trabajo.)

### 36.3 Testing obligatorio antes de integrar
Ningún cambio se integra a la rama oficial sin ejecutar, como mínimo y de forma
verificable por el CTO: **pruebas unitarias, pruebas end-to-end, validación de
TypeScript (`tsc --noEmit`), compilación (`build`) y verificación de migraciones
cuando aplique**. El objetivo no es solo detectar errores, sino **garantizar que el
proyecto nunca retroceda funcionalmente** (cero regresiones). Formaliza como
obligatoria la práctica que el CTO ya venía aplicando en cada checkout aislado de
FIN-020 a FIN-024.

### 36.4 No escalar infraestructura por anticipación
No se escala a planes pagos (Render, Redis, Neon pagado, monitoreo, etc.) por
previsión. **El único criterio para escalar es la necesidad técnica demostrada por
datos reales**, nunca la anticipación. El entorno gratuito actual cumple el objetivo
de validación. Cualquier upgrade de infraestructura de producción requiere
autorización expresa del Fundador.

### 36.5 GitHub como registro histórico oficial
GitHub deja de ser un simple repositorio: constituye el **registro histórico oficial**
del proyecto. Todo cambio aprobado debe encontrarse documentado, versionado, trazable
y recuperable. (Extiende §35 del respaldo a la trazabilidad histórica completa.)

### 36.6 El CTO como custodio de la calidad técnica
El CTO asume formalmente, además de Director Técnico, el rol permanente de **custodio
de la calidad técnica del proyecto**: proteger la arquitectura, la estabilidad, la
documentación y la trazabilidad; impedir deuda técnica innecesaria; e impedir la
incorporación de cambios inconsistentes. Faculta al CTO a detener cualquier cambio que
comprometa estos principios.

**Ratificación:** memo formal del Fundador (Yonathan Cervantes), 2026-07-13, asunto
"Resolución de decisiones de gobernanza — Infraestructura Fase 0 completada",
íntegramente aprobado y autorizado.

---

## 37. Memorando de Sincronización de Contexto (MSC) ante cambios de etapa (nueva en v3.15)

**Origen (no hipotético):** el 2026-07-13, tras la finalización de la Fase 0, el
Fundador constató un riesgo ya materializado: varios roles (Fundador, CPSAO, CTO,
Arquitecto, Auditor) no comparten sesión, y cuando se institucionaliza un cambio
estructural, los roles ausentes siguen trabajando sobre un contexto anterior. Ese mismo
día hubo que emitir un memorando de sincronización *a posteriori*
(`docs/correspondencia/MEMO-Sincronizacion-Contexto-Operativo-2026-07-13.md`) para
corregir el desfase. El CTO evaluó y presentó la propuesta
(`docs/oficial/PROPUESTA-Comunicacion-de-Cambio-de-Etapa.md`) sin incorporarla, y el
Fundador la aprobó con tres ajustes (memo del 2026-07-13, "Decisión — Propuesta de
Comunicación Oficial de Cambio de Etapa (MSC)").

**Regla permanente:** ante todo **cambio de etapa estructural** del proyecto, el CTO
emite un **Memorando de Sincronización de Contexto (MSC)**: una comunicación oficial,
estructurada y ejecutiva que fija la nueva línea base documental para todo el equipo.
Convierte la corrección reactiva del desfase de contexto en una garantía proactiva.

### 37.1 Disparadores (cuándo SÍ se emite)
Solo transiciones estructurales:
- **Infraestructura:** cierre o apertura de una fase (p. ej. Fase 0 → Fase 1).
- **Gobernanza:** cambio de versión *mayor* de esta Gobernanza, o cualquier cambio que
  altere el flujo de roles, permisos o responsabilidades.
- **Producción:** salida a producción, o cruce de un gate legal de `docs/PRODUCCION.md`.
- **Producto:** cierre de un bloque completo de roadmap (p. ej. las 6 experiencias UX),
  no una `FIN` individual.
- **Arquitectura:** decisión arquitectónica transversal que redefine cómo trabajan
  varios módulos.
- **Equipo (ajuste 1 del Fundador):** incorporación oficial de un nuevo miembro
  permanente, relevo o sustitución de un rol permanente, o modificación relevante de
  responsabilidades entre roles. Coherente con el proceso de incorporación de agentes
  (§22) y el registro `AI_REGISTRY.md` (§23): cuando ese proceso concluye en un cambio
  permanente de composición o de responsabilidades, además se emite el MSC.

### 37.2 Cuándo NO se emite (evitar ruido — ajuste 3 del Fundador)
Queda expresamente prohibido usar el MSC para actividad rutinaria: el cierre de una
`FIN` individual (ya trazado en `BACKLOG.md` + su correspondencia), un
`DEC`/`IMP`/`AUD` dentro de un ciclo, o ajustes menores de documentación. **Su uso queda
reservado a cambios estructurales.** Si el MSC empieza a emitirse con frecuencia elevada,
se entenderá que el mecanismo se está usando incorrectamente y deberá revisarse.

### 37.3 Contenido mínimo del MSC
Estado actual (una frase) · cambios institucionalizados · decisiones de gobernanza
vigentes · estado real de la infraestructura · nuevas responsabilidades · punto exacto
de continuación · lectura mínima obligatoria. Todo afirmación debe ser rastreable a un
artefacto oficial (hereda "la documentación oficial es la única fuente de verdad"): un
MSC no resume conversaciones, oficializa estado.

### 37.4 Confirmación de lectura (ajuste 2 del Fundador)
El MSC finaliza **solicitando confirmación de lectura únicamente a los roles directamente
afectados** por el cambio. Esa confirmación **no constituye una aprobación** —
constituye únicamente **evidencia de sincronización de contexto**. No abre un ciclo de
decisión ni bloquea el avance; deja constancia de que el rol afectado opera desde la
nueva línea base.

### 37.5 Responsable, ubicación y trazabilidad
Lo emite el **CTO** (coherente con §36.6, custodio de la calidad técnica y la
trazabilidad). Se archiva en `docs/correspondencia/`, se referencia desde `BACKLOG.md` y
se commitea en el mismo acto (§34). El MSC del 2026-07-13 queda como precedente y
plantilla de formato.

**Ratificación:** propuesta del CTO evaluada y presentada para decisión, aprobada con
tres ajustes por el Fundador (Yonathan Cervantes), 2026-07-13.

---

## 38. Gestión de defectos detectados en uso real (bug tracking) (nueva en v3.16)

**Origen (no hipotético):** durante la primera Beta Técnica (2026-07-13), el Fundador
detectó defectos funcionales reales por el uso cotidiano de la app (el primero, `BT-001`:
un 500 al registrar una tasa con coma decimal) y estableció un principio operativo
permanente para tratarlos.

**Regla permanente:**
1. **Todo defecto detectado en uso real lo evalúa el CTO de inmediato** y lo **clasifica**
   en una de: **defecto de implementación · defecto de arquitectura · defecto de
   experiencia de usuario · nueva necesidad funcional**.
2. **Solo las nuevas necesidades funcionales se convierten en `FIN`.** Los defectos se
   corrigen por el **flujo de mantenimiento**, preservando la estabilidad del producto —
   no esperan el cierre de nuevas FIN si afectan la utilización normal de la app.
3. **Registro y trazabilidad obligatorios.** Todo defecto se registra en el bug tracker
   oficial (`docs/oficial/REGISTRO-DEFECTOS.md`) con numeración `BT-XXX`, y se mantiene la
   trazabilidad **defecto → clasificación → corrección → commit**. La documentación técnica
   se actualiza **solo si** la solución modifica reglas permanentes del sistema.
4. **Objetivo:** cada error del uso real se convierte en una mejora permanente y queda
   respaldado documentalmente para evitar su reaparición.

**Ratificación:** instrucción directa del Fundador (Yonathan Cervantes), 2026-07-13
("Corrección de defectos detectados durante la Beta Técnica").

## 39. Formato regional en campos numéricos (invariante del sistema) (nueva en v3.16)

**Origen (no hipotético):** `BT-001` — el registro de una tasa `15,35` (coma decimal,
es-CO) producía un 500 porque una capa borraba la coma y desbordaba el campo Decimal.

**Regla permanente:** **todos los campos numéricos de Millo deben aceptar la escritura
natural del usuario según su configuración regional** — como mínimo coma decimal, punto
decimal y enteros. La **normalización se realiza antes del procesamiento del Motor
Financiero** (capa autoritativa en el backend, `common/parse-number.util.ts` /
`@NormalizeNumber()`), replicada en el frontend por UX (`utils/format.ts` ·
`parseDecimal`/`parseAmount`). **Ningún usuario debe recibir un error por diferencias de
formato regional**; un valor fuera de rango se rechaza con un 400 claro, nunca un 500.
Todo DTO futuro con campos numéricos expuestos al usuario debe aplicar `@NormalizeNumber()`.

**Ratificación:** decisión del Fundador (Yonathan Cervantes), 2026-07-13, en la misma
instrucción de `BT-001`.

## 40. Publicación segura — gate obligatorio de despliegue OTA (nueva en v3.17)

**Origen (no hipotético):** `BT-003` (2026-07-14) — un OTA llegó a usuarios reales
apuntando a `localhost` (el backend estaba operativo; falló el **proceso de liberación**,
que dependió de una suposición sobre el comportamiento de `eas update`). El Fundador
estableció que un CTO no construye héroes que resuelven incidentes, sino **procesos que
hacen muy difícil que el incidente ocurra**.

**Regla permanente:**
1. **Ningún OTA se publica solo porque compile.** Antes de publicar debe validarse la
   **configuración efectiva que recibirá el usuario**, no solo que el bundle exista.
2. **Gate automático que bloquea** (`frontend/scripts/deploy/preflight-ota.mjs`): la
   publicación se detiene automáticamente si detecta `localhost`/host local, variables
   faltantes, configuración inconsistente, canal/runtime inválidos o `/health` caído.
   Checklist mínimo: canal · runtime · **URL final de producción** · variables críticas ·
   `/health` 200 · **ausencia total de referencias a `localhost`** en el bundle.
3. **Vía única de publicación** (`npm run ota:publish`, `scripts/deploy/publish-ota.mjs`):
   **prohibido** correr `eas update` directamente. El wrapper corre el gate y solo publica
   si pasa.
4. **Dispositivo centinela:** todo OTA se instala y verifica primero en un dispositivo
   interno (apertura · autenticación · consumo del backend · navegación) antes de ampliarlo
   al resto de usuarios; el operador lo declara explícitamente al publicar.
5. **Aprendizaje institucional:** este proceso es el verdadero cierre de `BT-003` — si en el
   futuro otro integrante publica un OTA, el procedimiento le impide repetir el mismo error.
   Detalle operativo en `docs/tecnico/EAS-UPDATE.md`.

**Ratificación:** instrucción directa del Fundador (Yonathan Cervantes), 2026-07-14
("Llamado de atención formal — Incidente BT-003 y fortalecimiento obligatorio del proceso
de despliegue").

## 41. Continuidad Beta — toda FIN cerrada llega al dispositivo Beta (nueva en v3.18)

**Origen:** tras validar el hotfix de BT-003, el Fundador estableció (2026-07-14) que la
infraestructura ya está probada y el foco es el producto: cada mejora aprobada debe llegar
a los usuarios de prueba para validar su valor real en uso cotidiano.

**Regla permanente:** toda `FIN` **cerrada e integrada** debe **reflejarse en la aplicación
que usan los usuarios de prueba**. Las funcionalidades no pueden quedarse solo en GitHub o
en local. El ciclo oficial extiende el flujo de integración (§36.2) hasta el dispositivo:

```
Arquitecto → Auditor → CTO → Integración → GitHub → OTA → Dispositivos Beta
```

- Al cerrar una `FIN` con cambios de frontend, el CTO publica el OTA correspondiente **por
  la vía segura** (`npm run ota:publish`, §40) — el gate y el dispositivo centinela siguen
  siendo obligatorios. Cambios solo de backend llegan por el deploy normal de Render.
- Los usuarios de prueba trabajan **siempre con la versión más reciente aprobada**, salvo
  que exista una **razón técnica debidamente justificada y documentada** para no hacerlo.
- Propósito: validar cada mejora en condiciones reales y recibir retroalimentación continua.

**Ratificación:** directriz operativa del Fundador (Yonathan Cervantes), 2026-07-14 ("Cierre
del incidente BT-003 y directriz para las próximas entregas").

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

## Correspondencia exacta DEC→IMP→Código→Evidencia obligatoria en toda VALIDACIÓN (2026-07-06)
Añadida por directriz del Fundador tras la validación de FIN-012: la verificación
aislada confirmó que los 2 hallazgos críticos de diseño estaban genuinamente
corregidos, pero que el cambio obligatorio #4 del `DEC-0012` (test E2E de concurrencia
con saldo exacto) no existía en el commit pese a que `IMP-0012` lo declaraba entregado
con evidencia concreta ("E2E 9/9, saldo final exacto 400.000"). Para que esa brecha
nunca vuelva a pasar desapercibida: en toda fase `VALIDACIÓN`, además de comprobar que
el código funciona, el CTO debe verificar explícitamente la **correspondencia exacta**
entre `DEC` (qué se exigió) → `IMP` (qué se declara entregado) → código real en
checkout aislado (qué existe de verdad) → evidencia verificable (tests, artefactos,
documentación citada). Cualquier cambio obligatorio o evidencia declarada en el `IMP`
que no pueda confirmarse contra el repositorio es, por definición, un hallazgo
bloqueante — no se cierra la `FIN` hasta que la correspondencia sea completa en las
cuatro capas. Esta regla es una extensión directa de "El estado oficial se determina
solo por artefactos verificables" y de "Referencia inmutable obligatoria para todo
IMP", no las reemplaza.
