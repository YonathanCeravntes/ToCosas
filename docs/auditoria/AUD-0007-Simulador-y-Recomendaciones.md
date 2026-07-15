# AUD-0007 · Auditoría de ARQ-0007 (Simulador financiero + Motor de recomendaciones con impacto)

- **Documento auditado:** `docs/arquitectura/ARQ-0007-Simulador-y-Recomendaciones.md`
- **Módulo/Feature:** FIN-007
- **Documentos base revisados:** `ARQ-0001/DEC-0001`, `DEC-0002`, `DEC-0003`, `DEC-0004`, `DEC-0005 v2 + adenda`, `ARQ-0006/AUD-0006/DEC-0006`, `IMP-0006`, `GOBERNANZA.md`
- **Referencia inmutable verificada:** `git show HEAD:backend/src/modules/health/score.util.ts` (confirma que `computeScore` existe y es la función pura que el ARQ dice reutilizar) y `git show HEAD:backend/prisma/schema.prisma` (confirma el modelo `Category` real) — no se auditó contra working tree (persiste la desincronización ya documentada en ciclos anteriores).
- **Fecha:** 2026-07-05
- **Auditor:** Auditor Oficial de Milla (rol de solo lectura)

> Esta auditoría no modifica el ARQ ni el código. Documenta hallazgos para que el CTO
> emita `DEC-0007`.

---

## Resumen Ejecutivo

ARQ-0007 cierra la promesa central de ARQ-0001 (decidir viendo el impacto antes, con recomendaciones cuantificadas) reutilizando genuinamente el código puro ya existente (`AmortizationService`, `portfolio.simulator`, y — verificado contra el código real — `computeCoreMetrics`/`computeScore` de FIN-003/FIN-004), lo que elimina por construcción el riesgo de que el cálculo hipotético diverja del real. También resuelve, con un diseño concreto, el pendiente heredado más importante de DEC-0006 (presupuesto agregado de notificaciones cross-canal), y extiende con disciplina la regla de vistas minimizadas a la nueva tool `run_simulation`.

Se identifican dos observaciones que conviene resolver antes de implementar (no bloquean el diseño general): el detector de oportunidad "categoría dominante discrecional" depende de una clasificación (discrecional vs. esencial) que **no existe en el modelo `Category` actual** (verificado contra `schema.prisma`), y el límite de "máximo 3 recomendaciones activas" no define una regla de desplazamiento cuando una nueva oportunidad de mayor prioridad aparece con el cupo lleno.

## Verificación del pendiente heredado (DEC-0006 §10.4)

| Pendiente | Resolución propuesta | Verificación |
|---|---|---|
| Límite agregado de notificaciones cross-canal (recordatorios + proactividad) | §4.5: `NotificationLog` + `NotificationBudgetService`, tope 3/día (2 recordatorios + 1 proactivo), ambos despachadores existentes (`RemindersService.dispatchDue`, verificado que existe en el código; `ProactivityJob`, de FIN-006) consultan y registran | ✅ Resuelto con diseño concreto, no solo declarado — coordina las dos fuentes reales que hoy notifican de forma independiente |

## Hallazgos

1. **El detector de oportunidad "categoría dominante discrecional" (§4.3) depende de una clasificación que no existe en el modelo de datos actual.** Verificado contra `backend/prisma/schema.prisma`: `Category` tiene `name, kind (TxKind), icon, color, isGlobal, keywords` — ningún campo distingue gasto discrecional de esencial. El ARQ no propone de dónde vendría esa clasificación (¿lista hardcodeada por nombre de categoría global? ¿nuevo campo `isDiscretionary` en `Category`? ¿heurística sobre `keywords`?). Sin resolver esto, ese generador de recomendaciones específico no tiene una base de datos que consultar.
2. **Sin regla de desplazamiento para el cupo de "máximo 3 recomendaciones activas".** Si el job nightly detecta una nueva oportunidad de alta prioridad mientras ya existen 3 recomendaciones activas (aunque sean de menor prioridad y no vencidas), el ARQ no especifica si la nueva reemplaza a la de menor prioridad, se descarta silenciosamente, o queda en espera. Sin esta regla, un usuario podría quedar con recomendaciones de baja urgencia ocupando el cupo mientras una de alta urgencia (p. ej. DTI que acaba de cruzar a zona roja) no logra mostrarse.
3. **El reparto rígido del presupuesto de notificaciones (2 recordatorios + 1 proactivo) no define qué pasa con los cupos no usados.** Si un usuario no tiene recordatorios de cuota pendientes ese día, el ARQ no aclara si ese cupo se libera para un segundo proactivo o simplemente se pierde (dejando al usuario con solo 1 notificación posible ese día incluso cuando el presupuesto total de 3 lo permitiría).

## Riesgos

- El Hallazgo 1, si no se resuelve antes de implementar, obliga a improvisar la clasificación discrecional/esencial durante el desarrollo sin que quede documentada como decisión de arquitectura — el mismo patrón de "decisión implícita no auditada" que este proceso de gobernanza existe para evitar.
- El Hallazgo 2 puede producir una experiencia contraintuitiva: el usuario percibe que Millo "no le avisó a tiempo" de un riesgo nuevo porque el cupo de recomendaciones estaba ocupado por sugerencias de menor relevancia.
- El Hallazgo 3 es de impacto menor (subutilización del presupuesto, no fatiga), pero conviene aclararlo para que el `NotificationBudgetService` tenga una regla determinista desde el primer commit, no una que se decida ad hoc en el código.

## Fortalezas

- Reutilización genuina (verificada contra el código, no solo declarada) de `computeCoreMetrics` y `computeScore` como funciones puras para calcular el estado hipotético — elimina por construcción el riesgo de "deriva" entre el cálculo real y el simulado, en vez de mantener una segunda implementación paralela que podría desincronizarse.
- Resuelve con diseño concreto el pendiente heredado de DEC-0006 (presupuesto de notificaciones), en vez de dejarlo para "otro ciclo más" como ya había ocurrido una vez.
- Decisión deliberada de que las recomendaciones no notifiquen en v1 (solo in-app) para no presionar el presupuesto de notificaciones recién creado — buen ejemplo de contención de alcance basada en una lección aprendida del ciclo anterior.
- Extiende con disciplina la regla de gobernanza de vistas minimizadas a la sexta vista (`MinimizedSimulationView`) sin tratarla como excepción por ser "solo números".
- Cero escritura en series reales durante una simulación — protege la integridad de los datos históricos frente a hipótesis del usuario.
- Estructura fija de recomendación (qué hacer · por qué · beneficio · qué pasa si no · impacto por indicador) cumple literalmente el mandato original de ARQ-0001 sobre el motor de recomendaciones, no una versión simplificada.
- Declara explícitamente la deprecación (no borrado) del módulo legacy `suggestions/`, evitando tanto la acumulación de código muerto como una eliminación apresurada sin ciclo de transición.
- Solicita ratificación explícita de parámetros (§17) en vez de fijarlos unilateralmente como si fueran de diseño puro — coherente con la disciplina de separar "parámetro ratificable" de "decisión arquitectónica" que ya se ha visto en ciclos anteriores.

## Oportunidades

- Definir la fuente de la clasificación discrecional/esencial antes de implementar: la opción más simple y consistente con el resto del sistema sería una lista curada por el equipo sobre las categorías globales (ya "curadas", como se trató en FIN-005/006) más una regla conservadora para categorías personalizadas del usuario (p. ej. tratarlas como discrecionales por defecto, o excluir ese generador para categorías de usuario hasta tener evidencia).
- Definir una regla de desplazamiento simple para el cupo de recomendaciones (p. ej. la nueva reemplaza a la de menor `priorityScore` si su propia prioridad es mayor; si no, queda pendiente sin crearse).
- Especificar si los cupos de recordatorios no usados se reasignan a proactividad, o mantener el reparto fijo con una nota explícita de por qué se prefiere así (p. ej. para no premiar con más proactividad a usuarios sin deudas activas).

## Observaciones críticas

Ninguna. No se detectaron incumplimientos de mandatos vinculantes ni afirmaciones factualmente incorrectas verificables contra el código.

## Observaciones menores

- Hallazgo 3 (cupos no usados del presupuesto de notificaciones) es de menor impacto que los Hallazgos 1 y 2, pero conviene resolverlo en el mismo ciclo para no dejar comportamiento implícito en `NotificationBudgetService`.

## Recomendaciones

1. Definir explícitamente la fuente de la clasificación discrecional/esencial de categorías antes de implementar el generador correspondiente.
2. Definir una regla de desplazamiento para el cupo de "máximo 3 recomendaciones activas".
3. Especificar el comportamiento de cupos no usados en el presupuesto de notificaciones (reasignación vs. reparto fijo, con justificación).

## Priorización

| Recomendación | Clasificación |
|---|---|
| Fuente de clasificación discrecional/esencial (Rec. 1) | Debe hacerse antes del desarrollo |
| Regla de desplazamiento del cupo de recomendaciones (Rec. 2) | Debe hacerse antes del desarrollo |
| Comportamiento de cupos no usados del presupuesto de notificaciones (Rec. 3) | Puede resolverse durante la implementación, documentado en el código |

## Veredicto

**APROBADO CON OBSERVACIONES.**

ARQ-0007 cumple los mandatos vinculantes aplicables, resuelve genuinamente el pendiente heredado de DEC-0006, y su decisión de diseño más importante (reutilizar las funciones puras reales de FIN-003/FIN-004 para el cálculo hipotético) está verificada contra el código, no solo declarada. Las dos observaciones (clasificación discrecional inexistente, regla de desplazamiento del cupo de recomendaciones) son huecos de especificación concretos y de bajo costo de cerrar, no defectos del mecanismo central. Se recomienda que el CTO las resuelva como cambios obligatorios de bajo costo en `DEC-0007`, sin devolver el ARQ para una nueva iteración completa.

---
*Esta auditoría no implementa ni decide. Queda a la espera de la decisión oficial del CTO (`DEC-0007`).*
