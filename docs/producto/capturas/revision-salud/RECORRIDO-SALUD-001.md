# Recorrido crítico de Salud · Observaciones 001 (insumo de ARQ-019)

- **Versión:** 1.0
- **Fecha:** 2026-07-11
- **Autor:** Agente Arquitecto
- **Estado:** Observaciones para evaluación del equipo — **sin decisiones; nada autoaprobado ni descartado**
- **Historial de cambios:**
  - v1.0 (2026-07-11) — recorrido del estado actual, previo a ARQ-019 (FIN-019).
- **Método:** mismo estándar de Inicio — recorrido completo como usuario que abre la
  pantalla por primera vez, app REAL (usuaria demo, Score 715 real calculado por el
  Motor). Capturas: `salud-01-scroll-completo.png` (estado base),
  `salud-02-indicador-expandido.png` (lo que vive tras el tap),
  `salud-03-evolucion.png` (historial abierto). Evaluado contra: las 5 preguntas del
  CPSAO, las **3 preguntas obligatorias de FIN-019** y la **intención declarada**
  ("comprensión con agencia: entiendo por qué y sé qué mueve la aguja — nunca
  calificado, siempre orientado").

---

## Veredicto contra las 3 preguntas obligatorias (estado actual)

| Pregunta | ¿Respondida hoy? | Evidencia |
|---|---|---|
| 1 · ¿Cómo está mi salud financiera hoy? | **Parcial** | Número + banda ✓, pero sin escala visible (¿715 de cuánto?) ni causas al lado |
| 2 · ¿Por qué obtuve ese resultado? | **NO** | El Score viaja solo; los indicadores no declaran su conexión con él (S1, S9) |
| 3 · ¿Qué debería hacer para mejorarla? | **Escondida** | Las acciones y el CTA del simulador existen, pero viven tras "Toca para ver detalle" (S4) |

**Veredicto emocional contra la intención:** hoy el usuario sale con un número y
una palabra — **calificado, no orientado**. La materia prima para lo contrario ya
existe (acciones, simulador, fórmulas, pilares en el API): está escondida o sin
conectar.

## Observaciones por sección

| # | Observación | Pregunta guía | Detalle |
|---|---|---|---|
| S1 | **El Score viaja solo** | 3 obligatorias / intención | 715 sin causas visibles. Los 4 pilares con pesos y deltas **ya existen en el API** (`pillars`, `deltaByPillar` — Liquidez 28% · Endeudamiento 28% · Ahorro 25% · Patrimonio 19%) y la UI no los muestra; la conexión indicador→Score tampoco se declara. Es la brecha central: sin esto, la pregunta 2 no tiene respuesta posible |
| S2 | Jerga e inconsistencia de lenguaje con Inicio | terminología | "v1" visible (vocabulario interno); "9.9%"/"74.9%" en porcentaje seco cuando Inicio ya asentó "$N de cada $100"; "No es un puntaje crediticio" correcto pero críptico para quien no sabe qué es un puntaje crediticio |
| S3 | La banda "Estable" se pinta NARANJA | tono/emoción | 715/1000 con tarjeta color alerta: el color contradice a la palabra — se siente regaño donde el dato dice "vas razonable". El mapa de color banda→emoción merece revisión completa (¿"crítico" en rojo puro es coach o juez?) |
| S4 | **La palanca vive escondida** | (2) momento / intención | Las 2-3 acciones concretas y "🧪 Simular cómo mejorarlo →" solo aparecen tras el tap (captura 02 vs 01); un indicador ROJO colapsado muestra el problema SIN la salida. "Toca para ver detalle" ni siquiera anuncia que ahí están las acciones. Contradice el precedente 3-A de FIN-017 (interpretación/acción visible sin interacción) |
| S5 | "Evolución" promete y entrega una lista | (1) valor / (4) | Con 1 mes de historia: "2026-07 — 715" (captura 03) — una fila plana, sin lectura (¿primera medición? ¿subió?). Para el usuario nuevo aporta casi nada en su forma actual |
| S6 | Score sin escala visible | (5) claridad | No aparece "de 1.000" por ningún lado; 715 no se puede ubicar sin referencia |
| S7 | Cold-start mudo | intención (4ª consecuencia) | El API expone `coldStart.remainingDays` y la UI muestra solo "—" (verificado en `HealthScreen.tsx`: el campo no se renderiza) — el usuario nuevo no sabe si la pantalla está rota o cuándo tendrá su Score |
| S8 | Cierre sin salida | (3) ritmo / (5) | La pantalla termina en el disclaimer legal y media pantalla vacía; a diferencia de Inicio, no hay cierre ni puente hacia la acción global |
| S9 | Los 3 indicadores no cubren el porqué | 3 obligatorias | El Score tiene 4 pilares; se muestran 3 indicadores que no mapean 1:1 (patrimonio y tendencia no aparecen) — aun conectando lo visible, el porqué quedaría incompleto |

## Fortalezas del estado actual (para no perderlas al iterar)

- El detalle expandido (captura 02) es **excelente material**: fórmula en lenguaje
  llano, rangos claros ("Verde ≥6 meses · Amarillo 3–6 · Rojo <3"), acciones
  concretas y CTA directo al simulador — el problema no es el contenido, es que
  está escondido.
- El disclaimer cumple el guardarraíl legal (DEC-0004) — cualquier iteración debe
  conservarlo.
- La estructura Score→indicadores es el esqueleto correcto para "¿por qué?" — falta
  la conexión explícita, no una reestructura.

## Síntesis

La pantalla tiene los materiales de la respuesta y la coreografía equivocada: el
QUÉ está arriba sin escala, el POR QUÉ existe en el API pero no llega a la vista, y
el QUÉ HACER está completo pero enterrado tras un tap que no anuncia su contenido.
El ARQ-019 tiene un punto de partida claro: **destapar y conectar** antes que
inventar.

Ninguna observación está aprobada ni descartada — quedan para evaluación del equipo
y para las alternativas comparadas del ARQ-019.
