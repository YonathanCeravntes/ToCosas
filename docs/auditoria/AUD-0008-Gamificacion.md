# AUD-0008 · Auditoría de ARQ-0008 (Gamificación — rachas, logros, niveles y retos)

- **Documento auditado:** `docs/arquitectura/ARQ-0008-Gamificacion.md`
- **Módulo/Feature:** FIN-008
- **Documentos base revisados:** `ARQ-0001/DEC-0001`, `DEC-0002`, `DEC-0003`, `DEC-0005 v2+adenda`, `ARQ-0006/DEC-0006`, `ARQ-0007/AUD-0007/DEC-0007`, `IMP-0007`, `GOBERNANZA.md`
- **Fecha:** 2026-07-05
- **Auditor:** Auditor Oficial de Milla (rol de solo lectura)

> Esta auditoría no modifica el ARQ ni el código. Documenta hallazgos para que el CTO
> emita `DEC-0008`.

---

## Resumen Ejecutivo

ARQ-0008 es el ciclo de menor riesgo hasta ahora: sin IA, sin PII nueva, sin canales de notificación nuevos y con una restricción estructural clara y bien respetada (las celebraciones compiten por el mismo cupo proactivo diario de FIN-007, en vez de crear una vía nueva de fatiga). El documento aprendió explícitamente de la auditoría anterior: reutiliza la misma lista curada de categorías discrecionales (`DISCRETIONARY_GLOBAL_CATEGORIES`) que `DEC-0007` fijó para evitar adivinar sobre texto libre del usuario, en vez de reintroducir ese mismo hueco en el reto "bajo_promedio". La decisión de computar nivel/XP on-read (sin tabla de estado) sigue la misma filosofía ya validada del patrimonio on-read de FIN-002, evitando una fuente nueva de desincronización.

Se identifican dos huecos de especificación, ninguno bloqueante: la definición del reto "registro_constante" mezcla semanas ISO con límites de mes calendario sin resolver la ambigüedad de los bordes de mes, y el algoritmo de asignación de retos ("rotación según su situación") no se especifica, lo que podría asignar a un usuario un reto trivial o imposible de cumplir para su situación real.

## Hallazgos

1. **Ambigüedad entre semanas ISO y límites de mes calendario en el reto "registro_constante".** §4.4 lo define como "4 semanas ISO con ≥1 tx" dentro de un `Challenge.month (YYYY-MM)`. Un mes calendario no siempre contiene exactamente 4 semanas ISO completas: puede abarcar partes de 5 semanas ISO distintas (p. ej. si el mes empieza un jueves), o una semana ISO puede quedar dividida entre dos meses. El documento no aclara qué semanas ISO cuentan para un mes dado (¿las que empiezan dentro del mes? ¿las que tienen mayoría de días dentro del mes?), dejando el criterio de cumplimiento potencialmente distinto según en qué mes caiga el reto.
2. **Algoritmo de asignación de retos no especificado.** §4.4 dice que el job "asigna 1 reto por usuario activo (rotación según su situación)" pero no define qué significa "según su situación". Sin un criterio de elegibilidad, el sistema podría asignar "bajo_promedio" (mantener el gasto discrecional bajo el promedio) a un usuario que no tiene gasto discrecional registrado (reto trivialmente cumplido, sin valor) o "flujo_positivo" a un usuario cuyo flujo es estructuralmente negativo por diseño de sus ingresos (reto imposible, frustrante).

## Riesgos

- El Hallazgo 1 puede producir que el mismo comportamiento del usuario (registrar todas las semanas) se marque como completado en unos meses y no en otros, solo por cómo caen los límites de semana ISO — inconsistencia visible para el usuario en un producto que se esfuerza por ser "explicable" en todo lo demás.
- El Hallazgo 2, sin resolver, puede generar la percepción de que los retos son aleatorios o injustos, debilitando precisamente el objetivo de retención que este ciclo busca reforzar.

## Fortalezas

- Restricción estructural de "cero rutas nuevas de notificación" bien respetada: las celebraciones viajan por el mecanismo de insights ya existente y compiten por el mismo cupo proactivo diario, no lo amplían — exactamente lo que `DEC-0006`/`DEC-0007` querían proteger.
- Reutiliza la lista curada `DISCRETIONARY_GLOBAL_CATEGORIES` de FIN-007 para el reto "bajo_promedio" en vez de inventar una clasificación nueva sobre texto libre del usuario — aplica directamente la lección del ciclo anterior.
- Nivel/XP computados on-read desde `Achievement`/`Streak`, sin tabla de estado duplicado — mismo principio ya validado (patrimonio on-read de FIN-002); imposible que el nivel mostrado se desincronice de sus fuentes.
- Racha semanal (no diaria) y sin penalización de XP al perderla (`best` se conserva) — decisión de tono explícitamente razonada para evitar presión ansiógena, coherente con el mandato original de "recompensar sin infantilizar".
- Catálogo de logros con nombres y textos deliberadamente sobrios, sujetos al mismo test de genericidad que ya protege al resto del producto de sonar como asesoría o usar marcas.
- Ningún incentivo perverso relevante: sin recompensas monetarias ni comparación social (leaderboards), el riesgo de "hacer trampa" para ganar puntos queda correctamente descartado como de bajo impacto.
- Declara con transparencia las simplificaciones de diseño (nivel sin tabla, racha semanal) como puntos a ratificar en el DEC, no como hechos consumados.

## Oportunidades

- Definir explícitamente el criterio de pertenencia de una semana ISO a un mes calendario para el reto "registro_constante" (p. ej. "las semanas ISO cuyo jueves cae dentro del mes", regla estándar de ISO 8601 para asignar una semana a un mes/año).
- Definir un criterio simple de elegibilidad para la asignación de retos (p. ej. no asignar "bajo_promedio" a un usuario sin gasto discrecional registrado en los últimos 3 meses; no asignar "flujo_positivo" a un usuario cuyo flujo lleva negativo de forma sostenida sin una meta de mejora asociada).

## Observaciones críticas

Ninguna. No se detectaron incumplimientos de mandatos vinculantes ni afirmaciones factualmente incorrectas.

## Observaciones menores

- Ambos hallazgos son de especificación de bajo costo, resolubles con una regla explícita adicional en el propio documento o en el DEC, sin necesidad de rediseño.

## Recomendaciones

1. Definir el criterio de asignación de semanas ISO a meses calendario para el reto "registro_constante".
2. Definir un criterio mínimo de elegibilidad para la asignación de retos según la situación real del usuario.

## Priorización

| Recomendación | Clasificación |
|---|---|
| Criterio de semanas ISO vs. mes calendario (Rec. 1) | Debe hacerse antes del desarrollo |
| Criterio de elegibilidad para asignación de retos (Rec. 2) | Debe hacerse antes del desarrollo |

## Veredicto

**APROBADO CON OBSERVACIONES.**

ARQ-0008 es un diseño disciplinado y de bajo riesgo que aplica correctamente las lecciones de ciclos anteriores (lista curada de categorías, presupuesto de notificaciones, on-read para evitar desincronización). Los dos hallazgos son huecos de especificación puntuales sobre los retos mensuales, no defectos del mecanismo central de gamificación (racha, logros, nivel), que está bien fundamentado. Se recomienda que el CTO los resuelva como cambios obligatorios de bajo costo en `DEC-0008`.

---
*Esta auditoría no implementa ni decide. Queda a la espera de la decisión oficial del CTO (`DEC-0008`).*
