# AUD-0004 · Auditoría de ARQ-0004 (Salud Financiera + Score Millo — primer hito acotado)

- **Documento auditado:** `docs/arquitectura/ARQ-0004-Salud-Financiera.md`
- **Módulo/Feature:** FIN-004
- **Documentos base revisados:** `ARQ-0001/DEC-0001`, `DEC-0002`, `ARQ-0003/AUD-0003/DEC-0003`, `IMP-0003`
- **Referencia inmutable verificada:** `git show bbf9654:...` para el cierre de FIN-003 (contrato `MetricKey`, `engine.constants.ts`, `core-metrics.ts` con `incomeRef = max(fijo, real)`) — no se auditó contra working tree.
- **Fecha:** 2026-07-05
- **Auditor:** Auditor Oficial de Milla (rol de solo lectura)

> Esta auditoría no modifica el ARQ ni el código. Documenta hallazgos para que el CTO
> emita `DEC-0004`.

---

## Resumen Ejecutivo

ARQ-0004 respeta con precisión el mandato más restrictivo que arrastra este ciclo (Score + máximo 3 indicadores, DEC-0001 §10.9), justifica la selección de los 3 indicadores por accionabilidad concreta (cada uno tiene una acción ejecutable ya existente en la app), incorpora la señal de monetización exigida (§10.8) sin construir billing real, y trata el encuadre legal (§10.7) como gate de despliegue explícito en vez de ignorarlo. El Score se calcula como función pura sobre el contrato `metricKey` ya cerrado de FIN-003, sin dependencias nuevas y sin IA — coherente con "determinismo primero".

Se identifican cuatro observaciones, ninguna bloqueante para iniciar desarrollo, pero dos de ellas (la función `norm(tendencia)` no definida y la ausencia de un mecanismo técnico —no solo procesal— para bloquear la exposición a producción) conviene resolverlas antes de implementar, no después.

## Hallazgos

1. **Función `norm(tendencia)` no definida.** §4.1 especifica el puntaje del pilar Patrimonio para patrimonio neto ≤0 como `max(0, 40+40·norm(tendencia))`, pero no define qué es `norm()` (¿normalización sobre qué rango de pendiente? ¿en qué unidades viene `trend.net_worth`?). Sin esta definición, dos implementaciones razonables del mismo ARQ podrían producir puntajes distintos para el mismo usuario — rompe la propiedad de "función pura y auditable" que el resto del documento defiende con rigor (tramos con anclas explícitas en todos los demás casos).
2. **El pilar Patrimonio no escala con la magnitud del patrimonio, solo con su signo y tendencia.** Un usuario con patrimonio neto de $1.000 y uno con $10.000.000, ambos con tendencia plana, reciben el mismo puntaje base (70/100) en este pilar. Para un pilar cuyo nombre es "Patrimonio + crecimiento", no capturar la magnitud relativa (p. ej. patrimonio vs. gasto esencial mensual, como sí hace el pilar Liquidez) puede sentirse contraintuitivo para el usuario y reduce el poder explicativo del Score en ese componente.
3. **Renormalización ambigua cuando solo una sub-métrica de un pilar compuesto falta.** El pilar Ahorro es el promedio de dos sub-puntajes (`savings_rate` y `emergency_fund_months`). El documento explica la renormalización cuando un **pilar completo** está `unavailable` (§4.1, §10 riesgo 1), pero no dice qué ocurre si solo **una de las dos sub-métricas** del pilar Ahorro falta (p. ej. `emergency_fund_months` se omite cuando el gasto esencial es 0, mientras `savings_rate` sí existe). ¿El pilar Ahorro se marca `unavailable` por completo, o se calcula solo con la sub-métrica disponible?
4. **El gate de exposición a producción (§4.5) es puramente procesal, sin mecanismo técnico de enforcement.** El ARQ declara "la exposición a usuarios reales en producción queda bloqueada hasta validación legal", pero no propone ningún mecanismo en código (feature flag, variable de entorno, guard) que impida técnicamente que un despliegue rutinario active la pestaña Salud en producción antes de esa validación. Dado que el propio mandato (DEC-0001 §10.7) nació precisamente para evitar una exposición prematura, dejarlo solo como acuerdo de proceso es más débil que lo que el mandato pretendía.

## Riesgos

- Sin definir `norm()` (Hallazgo 1), la implementación puede introducir un comportamiento no anticipado y no testeable con "anclas" como el resto de las funciones de puntaje — el propio plan de tests (§14.2) asume anclas claras para todos los tramos.
- Sin un gate técnico (Hallazgo 4), basta un despliegue apresurado (o un cambio de configuración no revisado) para exponer el Score a usuarios reales antes de la validación legal, precisamente el escenario que DEC-0001 quiso prevenir.
- La ambigüedad de renormalización parcial (Hallazgo 3) puede llevar a que dos usuarios con datos equivalentes obtengan pilares Ahorro distintos según cómo el desarrollador interprete el caso borde, socavando la consistencia que el resto del diseño cuida con tanto detalle.

## Fortalezas

- Cumplimiento ejemplar del mandato más restrictivo (3 indicadores, no 15): justifica cada elección por accionabilidad concreta y existente en la app (deudas+simulador, cuentas de fondo, presupuesto), no por preferencia estética.
- Señal de monetización bien acotada: gatea solo el histórico (nice-to-have), nunca el Score actual ni los indicadores — evita el riesgo "gate percibido como castigo" que el propio documento identifica y mitiga en el mismo párrafo.
- Encuadre legal tratado con seriedad como gate de *release*, no de *desarrollo* — distinción correcta y consistente con cómo DEC-0001 lo planteó.
- Composición pura sobre el contrato `metricKey` ya cerrado de FIN-003, sin reabrirlo ni modificarlo — respeta la estabilidad de contrato que el propio DEC-0003 exigió.
- Explicabilidad radical bien implementada en el diseño: descomposición por pilar, delta mes a mes explicado, y manejo explícito (aunque incompleto, ver Hallazgo 3) de pilares no disponibles en vez de ocultarlos.
- `scoreVersion` previsto desde el diseño para futuras recalibraciones — buena práctica que evita comparar históricos calculados con fórmulas distintas sin saberlo.
- Cero dependencias nuevas, cero IA, alcance disciplinado (excluye explícitamente los 12 indicadores restantes, Copiloto, memoria, simulador, gamificación y billing real).

## Oportunidades

- Definir `norm(tendencia)` con la misma precisión de anclas que el resto de las funciones de puntaje (p. ej. mapear la pendiente normalizada por el propio patrimonio o por el gasto esencial mensual, con anclas concretas).
- Considerar que el pilar Patrimonio incorpore una noción de magnitud relativa (p. ej. patrimonio ÷ gasto esencial anual) además del signo y la tendencia, para que el pilar sea comparable en poder explicativo con Liquidez y Endeudamiento.
- Aclarar en el ARQ (o dejarlo para la implementación, documentado) el comportamiento de renormalización cuando solo una sub-métrica de un pilar compuesto falta.
- Añadir un flag técnico (p. ej. variable de entorno `HEALTH_SCORE_PRODUCTION_ENABLED=false` por defecto) que materialice el gate legal de §4.5, en vez de depender solo del acuerdo de proceso.

## Observaciones críticas

Ninguna. No se detectaron incumplimientos de mandatos vinculantes (DEC-0001/DEC-0002/DEC-0003) ni premisas factualmente incorrectas en este ARQ.

## Observaciones menores

- El catálogo de `metricKey` sigue creciendo dentro de `MetricReading` (7 métricas core + 3 tendencias + N anomalías por categoría + ahora 5 lecturas de score/pilares). No es un defecto de este ARQ en particular, pero conviene que el CTO tenga presente, de cara a FIN-005/FIN-006, si `MetricReading` seguirá siendo el contenedor adecuado para todo tipo de serie o si conviene una revisión de modelo más adelante.
- El mecanismo para activar `plan=premium` manualmente ("admin/testing") no se especifica (¿endpoint? ¿script?); razonable dejarlo para la implementación dado que no hay billing real todavía.

## Recomendaciones

1. Definir `norm(tendencia)` con anclas explícitas antes de implementar `score.util.ts`.
2. Evaluar incorporar magnitud relativa (no solo signo/tendencia) al pilar Patrimonio.
3. Especificar el comportamiento de renormalización cuando solo una sub-métrica de un pilar compuesto (Ahorro) está disponible.
4. Incorporar un mecanismo técnico (flag/variable de entorno) que materialice el gate de exposición a producción del §4.5, no solo un acuerdo de proceso.

## Priorización

| Recomendación | Clasificación |
|---|---|
| Definir `norm(tendencia)` con anclas (Rec. 1) | Debe hacerse antes del desarrollo |
| Especificar renormalización parcial del pilar Ahorro (Rec. 3) | Debe hacerse antes del desarrollo |
| Flag técnico para el gate de producción (Rec. 4) | Debe hacerse antes de producción (no bloquea el desarrollo en sí) |
| Magnitud relativa en el pilar Patrimonio (Rec. 2) | Puede esperar una versión futura (mejora de calidad del Score, no defecto) |

## Veredicto

**APROBADO CON OBSERVACIONES.**

ARQ-0004 cumple los mandatos vinculantes aplicables (3 indicadores, monetización, encuadre legal, sin IA, contrato de FIN-003 respetado) y mantiene la disciplina de alcance y explicabilidad de los ciclos anteriores. Las observaciones (función de normalización no definida, renormalización parcial ambigua, gate de producción sin mecanismo técnico, magnitud del pilar Patrimonio) son ajustes de especificación de bajo costo. Se recomienda que el CTO las resuelva como cambios obligatorios de bajo costo en `DEC-0004`, sin devolver el ARQ para una nueva iteración completa.

---
*Esta auditoría no implementa ni decide. Queda a la espera de la decisión oficial del CTO (`DEC-0004`).*
