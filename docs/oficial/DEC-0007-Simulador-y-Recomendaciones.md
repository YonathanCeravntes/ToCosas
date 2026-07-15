# DEC-0007 · Simulador financiero + Motor de recomendaciones con impacto

- **Documentos base:** `docs/arquitectura/ARQ-0007-Simulador-y-Recomendaciones.md` · `docs/auditoria/AUD-0007-Simulador-y-Recomendaciones.md`
- **Módulo/Feature:** FIN-007
- **Decide:** CTO/CPO/Principal Architect de Millo
- **Fecha:** 2026-07-05

---

## 1. Resumen ejecutivo

ARQ-0007 cierra la promesa central del proyecto (decidir viendo el impacto antes, con
recomendaciones cuantificadas) reutilizando de forma genuina —verificado por el auditor
contra el código real de `score.util.ts`— las funciones puras `computeCoreMetrics`/
`computeScore` para el cálculo hipotético, lo que elimina por construcción el riesgo de
que la simulación diverja del cálculo real. Resuelve también, con diseño concreto, el
pendiente heredado más importante de DEC-0006: el presupuesto agregado de notificaciones
cross-canal.

AUD-0007: **APROBADO CON OBSERVACIONES**, sin observaciones críticas. Las dos que sí
señala son reales y las verifiqué: confirmé contra `schema.prisma` que `Category` no
tiene ningún campo que distinga gasto discrecional de esencial, y el ARQ no define qué
pasa cuando el cupo de recomendaciones activas está lleno y aparece una de mayor
prioridad. Ambas se resuelven en este DEC como cambios obligatorios de bajo costo, igual
que el patrón de FIN-002/003/004/006.

## 2. Arquitecturas revisadas

- `docs/arquitectura/ARQ-0007-Simulador-y-Recomendaciones.md` — v. 2026-07-05.

## 3. Auditorías revisadas

- `docs/auditoria/AUD-0007-Simulador-y-Recomendaciones.md` — veredicto: **APROBADO CON
  OBSERVACIONES**.

## 4. Decisiones aprobadas

1. **Motor de simulaciones puro** (7 escenarios v1) reutilizando `AmortizationService`,
   `portfolio.simulator`, `computeCoreMetrics`, `computeScore`, `computeNetWorth`:
   aprobado. Cero escritura en series reales.
2. **Motor de recomendaciones con impacto** (estructura fija: qué hacer/por qué/
   beneficio/qué pasa si no/impacto por indicador; prioridad = impacto × urgencia ×
   viabilidad): aprobado, cumple literalmente el mandato de ARQ-0001.
3. **`MinimizedSimulationView` (6ª vista)** para la tool `run_simulation`, bajo la regla
   de GOBERNANZA de vistas minimizadas: aprobado.
4. **Presupuesto global de notificaciones** (`NotificationLog` + `NotificationBudgetService`,
   tope 3/día, reparto 2 recordatorios + 1 proactivo): aprobado, resuelve el pendiente de
   DEC-0006 §10.4 con diseño concreto, no declarativo.
5. **Las recomendaciones no notifican en v1** (solo in-app): aprobado, decisión correcta
   para no presionar el presupuesto recién creado.
6. **Deprecación formal (no borrado) del módulo legacy `suggestions/`**: aprobada.
7. **Ratificaciones de §17 del ARQ**: presupuesto 3/día (2+1) — ratificado con el ajuste
   de la sección 10; máx. 3 recomendaciones activas — ratificado con la regla de
   desplazamiento de la sección 10; retención `Simulation` 12 meses / `NotificationLog`
   90 días — ratificado.

## 5. Decisiones rechazadas

- Ninguna. No hay rechazo de diseño.

## 6. Observaciones aceptadas

- Hallazgo 1 (clasificación discrecional/esencial inexistente en `Category`, verificado
  contra `schema.prisma`) — aceptado, se resuelve en este DEC.
- Hallazgo 2 (sin regla de desplazamiento para el cupo de 3 recomendaciones activas) —
  aceptado, se resuelve en este DEC.
- Hallazgo 3 (cupos no usados del presupuesto de notificaciones sin definir) — aceptado,
  se resuelve en este DEC (no se deja para "documentado en el código" sin decisión
  explícita, para no repetir el patrón de decisión implícita que este proceso existe
  para evitar).

## 7. Observaciones descartadas

- Ninguna.

## 8. Riesgos aceptados

- **Clasificación discrecional por lista curada** (no por campo de datos): aceptado como
  solución v1; si en el futuro se requiere granularidad por transacción, se revisará con
  evidencia (mismo principio de "criterio de evidencia" ya usado para pgvector/RAG).

## 9. Riesgos pendientes

- Ninguno nuevo específico de FIN-007 que quede sin mitigación tras los cambios
  obligatorios. Los gates heredados de FIN-005 (DPA/PIA/producción) siguen sin cambios.

## 10. Cambios obligatorios

1. **Fuente de la clasificación discrecional/esencial**: lista curada en código
   (`DISCRETIONARY_GLOBAL_CATEGORIES: string[]`) sobre los nombres de categorías
   globales ya sembradas (p. ej. Entretenimiento, Restaurantes, Compras, Suscripciones).
   Para **categorías personalizadas del usuario**, el generador de "categoría dominante
   discrecional" **se excluye por defecto** (no se adivina discrecionalidad sobre texto
   libre del usuario) hasta que exista evidencia de que hace falta — mismo principio que
   el criterio de evidencia ya usado para pgvector/RAG (ARQ-0006 §4.6).
2. **Regla de desplazamiento del cupo de 3 recomendaciones activas**: si aparece una
   nueva oportunidad con `priorityScore` **estrictamente mayor** que la recomendación
   activa de menor prioridad, esta última se marca `status: 'dismissed'` (razón:
   `superseded`) y la nueva ocupa su lugar. Si la nueva prioridad es igual o menor que
   todas las activas, no se crea en este ciclo (no se pierde silenciosamente: puede
   generarse en el siguiente ciclo nightly si la condición persiste y ya hay cupo).
3. **Cupos no usados del presupuesto de notificaciones NO se reasignan.** Reparto fijo:
   hasta 2 recordatorios + hasta 1 proactivo, tope total 3/día. Si un usuario no tiene
   recordatorios pendientes ese día, ese cupo no se transfiere a proactividad. Razón
   explícita: el límite de 1 proactivo/día es una garantía anti-fatiga independiente ya
   fijada en DEC-0006 (FIN-006), no un cupo optimizable — subir ese tope para "aprovechar"
   presupuesto no usado debilitaría esa garantía sin necesidad real.

## 11. Plan técnico oficial

Se autoriza al agente Desarrollador a iniciar la implementación de FIN-007 siguiendo el
plan de la sección 14 de `ARQ-0007`, incorporando los 3 cambios obligatorios de la
sección 10 de este DEC:

1. Migración: `Simulation`, `Recommendation` (con `status` incluyendo `dismissed` con
   razón `superseded`), `NotificationLog` (+enums).
2. `SimulationEngine` puro (7 escenarios) + tests con anclas numéricas.
3. `simulations/` (service + controller + historial + retención 12 meses).
4. `recommendations/` (motor + prioridad + **regla de desplazamiento del cambio
   obligatorio #2** + **lista curada de categorías discrecionales del cambio obligatorio
   #1** + job nightly + endpoints) + tests de ambos casos borde.
5. `NotificationBudgetService` (**reparto fijo sin reasignación**, cambio obligatorio #3)
   + integración en `RemindersService`/`ProactivityJob` + tests.
6. Tool `run_simulation` + 6ª vista minimizada + plantillas de simulación + extensión de
   specs de PII (6 vistas) y genericidad.
7. Frontend: sección "Recomendado para ti", simulador general, ΔScore en abono extra, CTA
   en Salud.
8. Verificación end-to-end + bundle Android.
9. Cierre con `docs/implementaciones/IMP-0007-Simulador-y-Recomendaciones.md`, **con SHA
   de commit** (regla de GOBERNANZA), declarando el estado de los gates heredados
   (DPA/PIA/producción, sin cambios), y actualizando `docs/roadmap/BACKLOG.md`.

No se autoriza ninguna funcionalidad fuera de este plan (metas formales, gamificación,
billing, pgvector/RAG) dentro del ciclo de FIN-007.

## 12. Prioridad

**Media-Alta.** Cierra la promesa central de "ver el impacto antes de decidir" y resuelve
el pendiente de notificaciones heredado de FIN-006; es el ciclo más grande desde FIN-005
pero sin riesgo estructural nuevo.

## 13. Estado final

**APROBADO CON AJUSTES.** Se autoriza iniciar la implementación de FIN-007 bajo el plan
de la sección 11 y los 3 cambios obligatorios de la sección 10. Los gates heredados de
FIN-005 (DPA, PIA, producción bloqueada) siguen vigentes sin cambios. El cierre de
FIN-007 requiere `IMP-0007` con SHA de commit verificable, que validaré en checkout
aislado antes de autorizar el cierre.

---
*Documento oficial — no modificar. Corresponde al ciclo de gobernanza de `docs/GOBERNANZA.md`.*
