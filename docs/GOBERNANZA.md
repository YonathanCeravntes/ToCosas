# Gobernanza técnica — ecosistema Millo

**Versión 2.0** — adoptada 2026-07-06 por decisión del fundador. Sustituye y amplía la
versión anterior; las reglas permanentes ya vigentes (referencia inmutable, vistas
minimizadas, un FIN a la vez) se preservan íntegras dentro de esta versión.

Todo cambio que afecte **lógica de negocio, arquitectura, base de datos, seguridad,
IA, APIs, permisos, integraciones, monetización o experiencia funcional** sigue este
proceso. Solo se exceptúan correcciones triviales (ortografía, estilos/ajustes
visuales sin cambio funcional, bugs simples). Ante la duda → gobernanza.

---

## 1. Organigrama

```
                     FUNDADOR
               (Yonathan Cervantes)
                         │
                         ▼
              CPO (ChatGPT — Producto)
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

## 2. Responsabilidades

**Fundador** — visión de negocio, decisiones finales, prioridades, objetivos
estratégicos. Es la máxima autoridad.

**CPO (ChatGPT)** — innovación, experiencia de usuario, IA, monetización, estrategia,
funcionalidades, benchmarking, roadmap funcional. El CPO **no** diseña arquitectura ni
programa. Su trabajo termina al entregar una propuesta funcional.

**CTO** — es el líder del proyecto y el **guardián de la gobernanza**. Responsable de
evaluar propuestas, aprobar o rechazar iniciativas, definir prioridades, administrar el
Backlog, coordinar Arquitecto y Auditor, emitir decisiones oficiales (`DEC`), y
controlar el cumplimiento del proceso — incluyendo detener de inmediato cualquier fase
que avance sin haber cerrado la anterior.

**Arquitecto** — diseña soluciones técnicas, crea Blueprints y documentos `ARQ`,
implementa únicamente funcionalidades aprobadas, documenta la implementación (`IMP`).
No decide prioridades. No inicia trabajo sin autorización del CTO.

**Auditor** — revisa arquitectura e implementación, detecta riesgos, emite
observaciones, valida calidad. Nunca modifica código. Nunca aprueba implementaciones
— esa autoridad es exclusiva del CTO.

## 3. Flujo de una nueva idea

```
Fundador → CPO
```
El CPO genera una **propuesta funcional**: objetivo, problema, beneficio, valor
agregado, impacto, posibles riesgos, casos de uso. No incluye arquitectura ni código.

```
CPO → CTO
```
El CTO analiza viabilidad, prioridad, complejidad, costo, impacto y dependencias.
Puede: ✓ Aprobar · ✗ Rechazar · ↺ Solicitar ajustes.

```
CTO → Arquitecto  (si aprueba)
```
El Arquitecto genera un **Blueprint (BP)**: arquitectura, componentes, módulos, APIs,
base de datos, seguridad, riesgos, alternativas, dependencias. **El Blueprint no
autoriza implementación** — es únicamente un documento técnico exploratorio.

```
Arquitecto → CTO
```
El CTO estudia el Blueprint. Si aporta valor, lo **divide en funcionalidades
independientes** (p. ej. `FIN-021`, `FIN-022`, `FIN-023`, `FIN-024`) y las incorpora al
Backlog.

## 4. Desarrollo — una funcionalidad a la vez

A partir de aquí comienza el desarrollo. **Se trabaja únicamente UNA funcionalidad a la
vez** (p. ej. `FIN-021`). El flujo obligatorio:

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

Cada `FIN` debe tener: `ARQ` propio, `AUD` propio, `DEC` propio, `IMP` propio,
Validación propia, Cierre propio.

**Ningún agente puede aceptar instrucciones directas que alteren el producto sin que
hayan pasado por el CTO**, excepto el CPO cuando elabora propuestas estratégicas
solicitadas directamente por el Fundador (sección 3). Esta regla existe para que el
CTO, como guardián de la gobernanza, tenga visibilidad de toda instrucción que pueda
alterar alcance, arquitectura o prioridad antes de que se ejecute.

## 6. Blueprint

El Blueprint **no forma parte del desarrollo** — es un documento estratégico/técnico
exploratorio del Arquitecto. Puede contener 20 módulos, 100 ideas, 50 funcionalidades:
eso no significa que puedan implementarse. El Blueprint únicamente sirve como base para
que el CTO construya el Backlog, seleccionando y secuenciando qué se convierte en `FIN`
y en qué orden.

## 7. Backlog

El Backlog (`docs/roadmap/BACKLOG.md`) es administrado **exclusivamente por el CTO**.
El Arquitecto no puede agregar funcionalidades. El Auditor no puede modificar
prioridades. El CPO no puede cambiar el Backlog directamente — sus propuestas llegan
al CTO, quien decide si entran y en qué posición.

Regla operativa: cada vez que se genere un documento (`ARQ`, `AUD`, `DEC`, `IMP`) se
debe actualizar el Backlog reflejando el nuevo estado de la funcionalidad.

## 8. Autoridad

```
Fundador → CPO → CTO → Arquitecto → Auditor
```

Todas las decisiones técnicas se canalizan a través del CTO.

## 9. Objetivo

Garantizar calidad, mantener trazabilidad, evitar retrabajos, preservar la
arquitectura, asegurar que todas las decisiones sean revisadas antes de implementarse,
y permitir que Millo escale ordenadamente conforme crezca el proyecto — no ralentizar
el desarrollo con burocracia.

---

## Contenido mínimo de un ARQ
Objetivo · Problema · Alcance · Arquitectura · Componentes · Base de datos · Backend ·
Frontend · IA involucrada · Riesgos · Dependencias · Impacto esperado · Criterios de
aceptación · Plan de implementación.

## Contenido mínimo de un IMP
Resumen · Archivos modificados · Funcionalidades implementadas · Pruebas realizadas ·
Incidencias · Limitaciones · Resultado final.

## Numeración
Cuatro dígitos, correlativa por tipo: `ARQ-0001`, `AUD-0001`, `DEC-0001`, `IMP-0001`.
Un mismo módulo comparte número entre tipos cuando corresponde.

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
Auditor. **Formalizada como sección 4/5 de esta v2.0.**

## La documentación oficial es la única fuente de verdad (añadida 2026-07-06)
Ni el Fundador, ni el CPO, ni el Arquitecto, ni el Auditor, ni el CTO pueden asumir la
existencia de decisiones, observaciones o requisitos que no estén expresamente
documentados en `docs/oficial/`, `docs/arquitectura/`, `docs/auditoria/` o
`docs/implementaciones/`. **Toda decisión debe poder rastrearse hasta un documento
oficial concreto** (número de `DEC`/`ARQ`/`AUD`/`IMP` y sección exacta). Ante cualquier
afirmación sobre "lo que ya se decidió" o "lo que ya se pidió corregir" que no pueda
citarse textualmente desde un documento existente, la respuesta correcta es verificar
contra el documento antes de actuar — nunca actuar sobre la base de una interpretación
o un recuerdo, propio o ajeno. Esta regla se demostró en la práctica el 2026-07-06,
cuando la verificación del CTO contra `DEC-0013`…`DEC-0016` (secciones "Cambios
obligatorios", las 4 dicen "Ninguno") corrigió una atribución incorrecta de acciones
correctivas que no existían en ningún documento oficial.

## El estado oficial se determina solo por artefactos verificables (añadida 2026-07-06)
El estado oficial del proyecto lo determinan exclusivamente **artefactos
verificables**: commits registrados en el repositorio, documentación oficial
(`ARQ`/`AUD`/`DEC`/`IMP`/`BP`), el estado del Backlog, el estado de la rama de
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

## Regla de Acciones Correctivas (añadida 2026-07-06)
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
`ARQ-0011`/`AUD-0011`/`DEC-0011`) e implementados antes de que existiera esta regla.
Por decisión del fundador, no se revirtió el código: se regularizó con `ARQ`/`AUD`/`DEC`
individuales retroactivos por funcionalidad, verificados por el CTO contra el código
real en checkout aislado. **Excepción única de transición, sin precedente** — ninguna
funcionalidad futura se implementa sin su `DEC` individual previo.
