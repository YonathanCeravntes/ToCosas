# DEC-0008 · Gamificación (rachas, logros, niveles y retos sobre hitos reales)

- **Documentos base:** `docs/arquitectura/ARQ-0008-Gamificacion.md` · `docs/auditoria/AUD-0008-Gamificacion.md`
- **Módulo/Feature:** FIN-008
- **Decide:** CTO/CPO/Principal Architect de Millo
- **Fecha:** 2026-07-05

---

## 1. Resumen ejecutivo

ARQ-0008 es, tal como señala el propio auditor, el ciclo de menor riesgo estructural hasta ahora: sin IA, sin PII nueva, sin canal de notificación nuevo. Verifiqué de forma independiente contra el código real los tres mecanismos que el ARQ dice reutilizar, no solo declarar: (1) `DISCRETIONARY_GLOBAL_CATEGORIES = ['Entretenimiento', 'Comida', 'Ropa']` existe exactamente así en `recommendations.constants.ts` (commit `a56f11e`); (2) `InsightsService.createIfNew()` existe con la firma descrita y es genuinamente idempotente por `dedupeKey` (violación de índice único `P2002` → devuelve `null`, commit `994b085`); (3) el tope de 1 proactivo/día está implementado en `proactivity.job.ts` tal como se cita. El diseño de nivel/XP on-read (sin tabla nueva) sigue el mismo principio ya validado del patrimonio on-read de FIN-002 — decisión correcta, no una improvisación.

AUD-0008: **APROBADO CON OBSERVACIONES**, sin observaciones críticas. Los dos hallazgos (ambigüedad semana ISO/mes calendario en el reto "registro_constante"; algoritmo de asignación de retos no especificado) son huecos de especificación puntuales sobre los retos mensuales, no defectos del mecanismo central (racha/logros/nivel). Se resuelven aquí como cambios obligatorios de bajo costo, mismo patrón que FIN-002/003/004/006/007.

## 2. Arquitecturas revisadas

- `docs/arquitectura/ARQ-0008-Gamificacion.md` — v. 2026-07-05.

## 3. Auditorías revisadas

- `docs/auditoria/AUD-0008-Gamificacion.md` — veredicto: **APROBADO CON OBSERVACIONES**.

## 4. Decisiones aprobadas

1. **Racha semanal de registro** (`Streak`, actualización por evento `transaction.created`, idempotente por semana ISO, `best` conservado): aprobada.
2. **Catálogo de 12 logros v1** (`Achievement`, único por `(userId, code)`, evaluación por listener + job nightly 3:15 Bogotá): aprobado.
3. **Nivel/XP computados on-read, sin tabla de estado** (§4.3 del ARQ): aprobado. Es la simplificación correcta frente a `UserLevel` de ARQ-0001 — mismo principio del patrimonio on-read de FIN-002, cero riesgo de desincronización.
4. **Retos mensuales** (`Challenge`, 3 tipos v1, 1 por usuario/mes, +30 XP al completar): aprobados en su estructura, con los cambios obligatorios de la sección 10 para resolver los dos hallazgos del auditor.
5. **Celebración sin rutas nuevas de notificación**: aprobada — el logro entra como `Insight` tipo `logro` y compite por el único cupo proactivo diario ya existente (FIN-006/FIN-007), en vez de crear una vía nueva de fatiga. Es exactamente la disciplina que este proyecto necesita mantener conforme crece el número de fuentes de "cosas que avisar".
6. **Reutilización de `DISCRETIONARY_GLOBAL_CATEGORIES` para el reto "bajo_promedio"** (en vez de una clasificación nueva sobre texto libre): aprobada — aplica correctamente la lección de DEC-0007 §10.1.
7. **Textos del catálogo sujetos al test de genericidad** existente: ratificado como obligatorio, sin excepción.

## 5. Decisiones rechazadas

- Ninguna. No hay rechazo de diseño.

## 6. Observaciones aceptadas

- Hallazgo 1 (ambigüedad semana ISO vs. mes calendario en "registro_constante") — aceptado, se resuelve en este DEC.
- Hallazgo 2 (algoritmo de asignación de retos no especificado) — aceptado, se resuelve en este DEC.

## 7. Observaciones descartadas

- Ninguna.

## 8. Riesgos aceptados

- **Calibración de XP/niveles y valores de logros** es un parámetro de producto, no de arquitectura; se ratifica el catálogo v1 del ARQ (§17) con la expectativa explícita de que se recalibre con datos reales de uso, sin que eso implique un rediseño del mecanismo.
- **Tono/sobriedad del catálogo** depende de revisión editorial humana además del test de genericidad automatizado; se acepta el riesgo residual de que algún nombre requiera ajuste post-lanzamiento (bajo costo de corrección, no estructural).

## 9. Riesgos pendientes

- Ninguno nuevo específico de FIN-008 que quede sin mitigación tras los cambios obligatorios. Los gates heredados de FIN-005 (DPA/PIA/producción) siguen sin cambios y no aplican a este módulo (cero IA, cero datos hacia el LLM).

## 10. Cambios obligatorios

1. **Regla explícita de pertenencia de semana ISO a mes calendario** para el reto "registro_constante": una semana ISO pertenece al mes calendario que contiene su **jueves** (regla estándar ISO 8601, la misma que determina a qué año/semana pertenece una fecha). El reto se completa si el usuario registra **≥1 movimiento en cada una de las semanas ISO que, por esa regla, pertenecen al mes** — el número de semanas exigidas **no es fijo en 4**: será 4 o 5 según cómo caiga el mes (el ARQ debe corregir "4 semanas ISO" por "todas las semanas ISO del mes" en el nombre/descripción visible al usuario, para no prometer un número que a veces será incorrecto).
2. **Criterio mínimo de elegibilidad para la asignación nightly de retos**, evaluado en este orden antes de asignar:
   - **`bajo_promedio`**: solo si el usuario tiene gasto registrado en al menos una `DISCRETIONARY_GLOBAL_CATEGORIES` en los últimos 3 meses (mismo criterio de evidencia ya usado en FIN-007). Si no, no es elegible.
   - **`flujo_positivo`**: solo si el cashflow promedio de los últimos 3 meses del usuario no es estructuralmente negativo por debajo de un umbral razonable (p. ej. no asignar si el promedio de 3 meses es negativo en más del 20% del ingreso de referencia) — evita un reto percibido como imposible.
   - **`registro_constante`**: siempre elegible para cualquier usuario activo (no depende de historial financiero, solo de registrar) — **actúa como reto por defecto** si ninguno de los otros dos es elegible ese mes. Esto garantiza que todo usuario activo reciba exactamente 1 reto, nunca ninguno.
   - Esta regla de elegibilidad debe quedar documentada en código (comentario junto a la función de asignación) y cubierta por tests que sembren los tres escenarios (sin gasto discrecional, flujo estructuralmente negativo, caso normal con los tres elegibles).

## 11. Plan técnico oficial

Se autoriza al agente Desarrollador a iniciar la implementación de FIN-008 siguiendo el plan de la sección 14 de `ARQ-0008`, incorporando los 2 cambios obligatorios de la sección 10 de este DEC:

1. Migración: `Streak`, `Achievement`, `Challenge` (+enums), con los índices únicos de idempotencia ya especificados en el ARQ.
2. Catálogo de 12 logros + `achievements.service` (evaluación + idempotencia) + tests, incluyendo revisión de tono/sobriedad de los 12 nombres/cuerpos.
3. `streak.service` + listener `transaction.created` + tests (misma semana no-op, consecutiva +1, hueco reset, best conservado).
4. `challenges.service` con la **regla de pertenencia semana ISO/mes del cambio obligatorio #1** y la **regla de elegibilidad del cambio obligatorio #2** + asignación/evaluación nightly + tests de los tres escenarios de elegibilidad.
5. `gamification.job` (3:15 AM Bogotá) + celebración vía `InsightsService.createIfNew` (tipo `logro`, dedupeKey por código) + test que verifique **cero invocación de sender/canal nuevo** por este módulo.
6. `GET /gamification/profile` (racha, XP, nivel computado on-read, logros, reto del mes) + tests de umbrales de nivel y bono de racha (cap 26).
7. Frontend: bloque de progreso en Inicio (racha + nivel + últimos logros + reto del mes), pantalla Logros (grid con desbloqueados/pendientes y su condición), modal de celebración sobrio al abrir con logros no vistos.
8. Verificación end-to-end (incluyendo manipulación de fechas para racha y bordes de mes para "registro_constante") + bundle Android.
9. Cierre con `docs/implementaciones/IMP-0008-Gamificacion.md`, **con SHA de commit** (regla de GOBERNANZA), declarando el estado de los gates heredados (DPA/PIA/producción, sin cambios — no aplican a este módulo), y actualizando `docs/roadmap/BACKLOG.md`.

No se autoriza ninguna funcionalidad fuera de este plan (notificaciones nuevas, leaderboards, recompensas monetarias, monetización de la gamificación, IA/LLM) dentro del ciclo de FIN-008.

## 12. Prioridad

**Media.** Ciclo de bajo riesgo estructural que refuerza el bucle de retención (más registro → mejor Motor/Score/Copiloto → más valor) y prepara la conversación de monetización de FIN-009, pero no es bloqueante para ningún otro módulo.

## 13. Estado final

**APROBADO CON AJUSTES.** Se autoriza iniciar la implementación de FIN-008 bajo el plan de la sección 11 y los 2 cambios obligatorios de la sección 10. Los gates heredados de FIN-005 (DPA, PIA, producción bloqueada) siguen vigentes sin cambios y no aplican a este módulo. El cierre de FIN-008 requiere `IMP-0008` con SHA de commit verificable, que validaré en checkout aislado antes de autorizar el cierre.

---
*Documento oficial — no modificar. Corresponde al ciclo de gobernanza de `docs/GOBERNANZA.md`.*
