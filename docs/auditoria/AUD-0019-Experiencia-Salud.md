# AUD-0019 · Auditoría de ARQ-0019 v1.0 (Experiencia de Salud)

- **Documento auditado:** `docs/arquitectura/ARQ-0019-Experiencia-Salud.md`, versión 1.0, commit `9228eca`
- **Módulo/Feature:** FIN-019 (única FIN activa; confirmé que FIN-018 cerró formalmente — DEC-0018 §14, `docs/oficial/DEC-0018-Evolucion-Inicio.md` — antes de que se abriera FIN-019, sin infracción de "un FIN a la vez")
- **Insumo verificado:** `docs/producto/capturas/revision-salud/RECORRIDO-SALUD-001.md` (commit `6e5b002`) + 3 capturas reales (`salud-01-scroll-completo.png`, `salud-02-indicador-expandido.png`, `salud-03-evolucion.png`)
- **Referencia de código verificada:** `frontend/src/screens/HealthScreen.tsx`, `frontend/src/api/types.ts`, `frontend/src/api/endpoints.ts`, `frontend/src/theme/colors.ts`, `backend/src/modules/health/score.util.ts`, `backend/src/modules/recommendations/recommendations.service.ts` (working tree / HEAD vigente al momento de esta auditoría)
- **Fecha:** 2026-07-11
- **Auditor:** Auditor Oficial de Milla (rol de solo lectura)

> Esta auditoría no modifica el ARQ ni el código ni diseña la solución. Incluye las 6
> preguntas de comprensión UX (instrucción permanente del CTO) y los criterios §29
> (Gobernanza v3.7).

---

## Resumen Ejecutivo

Verifiqué cada afirmación de diagnóstico de `RECORRIDO-SALUD-001` contra las 3 capturas reales y las 9 se sostienen con exactitud: la tarjeta del Score se pinta naranja (`colors.warning = '#E08A00'`) incluso para la banda "Estable" (S3); no aparece "de 1.000" en ningún punto (S6); "v1" es visible textualmente ("No es un puntaje crediticio · v1", S2); los 4 pilares con pesos/estado/delta existen en el API (`pillars: ScorePillar[]`) pero `HealthScreen.tsx` no los renderiza — solo un resumen compacto de `deltaByPillar` en texto diminuto (S1); las acciones y el CTA del simulador solo aparecen tras el tap, y "Toca para ver detalle" no anuncia su contenido (S4, confirmado línea por línea en `IndicatorCard`); "Evolución" es una lista plana de una fila (S5); `coldStart.remainingDays` existe en el tipo `HealthScore` pero no se usa en ningún punto de `HealthScreen.tsx` (S7); la pantalla termina en el disclaimer sin ningún cierre o puente (S8); y solo 3 indicadores cubren un Score de 4 pilares (S9). El ARQ responde a las 9 con piezas concretas, cada una con ≥2 alternativas comparadas, y verifiqué contra `types.ts`/`endpoints.ts` que la base de datos necesaria (`pillars`, `coldStart.remainingDays`, `indicators.meaning/howComputed/ranges/actions`, `GET /recommendations` con `priorityScore` genuinamente calculado sobre `ΔScore` normalizado) ya está expuesta — la afirmación "cero backend" es cierta para 6 de las 7 piezas.

Encontré un hallazgo que elevo a crítica porque toca directamente P1 — la pieza que responde la pregunta central de esta FIN ("¿por qué?"): el diseño recomendado (1-A) representa cada uno de los 4 pilares con una barra de color verde/amarillo/rojo (ver mockup §4.8: "Tu colchón ▓░░░ rojo", "Lo que tienes ▓▓░░ amarillo"), pero verifiqué en `score.util.ts` que **no existe ningún umbral que traduzca el `value` (0-100) de un pilar a un nivel de color** — a diferencia de los indicadores individuales, que sí tienen `level: 'verde'|'amarillo'|'rojo'` ya calculado por el backend. El ARQ no especifica qué regla usaría el frontend para colorear cada pilar, y una regla genérica (p. ej. "≥70 verde") sería engañosa para el pilar Patrimonio en particular: `wealthPillar()` devuelve un valor **binario/plano** (70 para cualquier patrimonio positivo sin tendencia, sin importar la magnitud) — la misma limitación que yo mismo señalé en `AUD-0004` y que `DEC-0004` aceptó como riesgo diferido *precisamente porque el pilar no se mostraba en ninguna pantalla*. Mostrarlo ahora con un semáforo de color, sin resolver esa limitación, arriesga pintar "amarillo" o "verde" a un pilar que en realidad no mide lo que el color implica — justo el tipo de calificación sin fundamento que la intención de esta FIN ("nunca calificado, siempre orientado") busca evitar.

## Hallazgos

1. **P1 (recomendada 1-A) requiere un umbral de color por pilar que no existe en el backend ni se especifica en el ARQ, con riesgo concreto en el pilar Patrimonio.** Verificado en `frontend/src/api/types.ts`: `ScorePillar` solo expone `value: number | null` y `status: string` ('ok'/'partial'/'unavailable', un indicador de disponibilidad de datos, no de salud). No hay ningún campo `level` para pilares como sí existe para `HealthIndicator`. El mockup de §4.8 y la descripción de la Alt A ("barra de estado verde/amarillo/rojo") requieren que el frontend invente un umbral 0-100→color, no documentado en el ARQ. Verificado en `score.util.ts`, `wealthPillar()` retorna 70 para cualquier patrimonio neto positivo sin dato de tendencia (independiente de la magnitud) — un umbral genérico lo mostraría sistemáticamente como "amarillo" o "verde" sin que ese color refleje una medición real de qué tan sano es el patrimonio del usuario. Mismo riesgo, menor severidad, en los demás pilares: sus curvas (`liquidityPillar`, `debtPillar`, `savingsRateSub`/`emergencyFundSub` combinados) tienen puntos de quiebre distintos entre sí, así que un único umbral genérico aplicado a los 4 valores 0-100 no reproduciría fielmente los cortes reales de cada métrica subyacente (p. ej. `DEBT_RATIO_CUTS` ya existe para endeudamiento pero está expresado en la escala del DTI, no en la escala 0-100 del pilar).

## Riesgos

- Si el Hallazgo 1 no se resuelve antes de implementar, la pieza central de esta FIN (P1, la que responde "¿por qué?") podría mostrar un color que no corresponde a la salud real del pilar — especialmente Patrimonio — contradiciendo directamente la intención declarada en §0 de la propia ARQ. Es un riesgo silencioso: no rompe ningún test funcional, solo produce una calificación visual sin fundamento real, que es exactamente el defecto que el resto del documento se esfuerza en eliminar.

## Fortalezas

- Verificación exhaustiva y honesta contra el estado real del producto: las 9 observaciones de `RECORRIDO-SALUD-001` las confirmé una por una contra las capturas y el código, y las 9 son ciertas — no hay ninguna afirmación de diagnóstico exagerada o inventada.
- La afirmación "cero backend" es sustancialmente cierta: verifiqué que `pillars`, `coldStart.remainingDays`, los 4 campos de cada indicador y `GET /recommendations` (con `priorityScore` genuinamente basado en `ΔScore`, no solo urgencia/viabilidad) ya existen y están expuestos — el ARQ no exagera la disponibilidad de datos para inflar el alcance "sin backend".
- P2 diseña correctamente el fallback antes de que se lo pidan (aprendizaje ya aplicado de FIN-018): "recomendación top del motor, con respaldo local si viene vacío" evita el escenario de pantalla rota para un usuario cuyo motor de recomendaciones aún no generó nada.
- P3 aplica explícitamente el precedente ya validado de FIN-017 (interpretación visible sin interacción, DEC-0017 §5.1/ruta (a)) en vez de reinventar el patrón — coherencia real entre experiencias, no solo declarada.
- P4 resuelve el problema de tono (S3) sin inventar un mapa de color nuevo para bandas: reserva el semáforo a pilares/indicadores (los estados) y usa el verde institucional para el elemento más grande de la pantalla — decisión consistente con el hero de Inicio.
- El criterio de aceptación #6 (test emocional de 5 segundos: "¿calificado u orientado?") traduce la intención cualitativa del CPSAO en un criterio verificable, en vez de dejarla como una aspiración no comprobable.
- P7 cierra el recorrido con un puente real hacia una capacidad ya auditada (las tools de FIN-005 responden sobre el score) en vez de inventar contenido nuevo — mismo principio de reutilización que ya ha guiado ciclos anteriores.

## Oportunidades

- Definir explícitamente en el ARQ (o en el DEC) la regla de color por pilar para P1: por ejemplo, un umbral específico y documentado por pilar (no uno genérico para los 4), o — más simple y más seguro dado el estado actual del pilar Patrimonio — mostrar la barra de progreso (0-100) sin colorearla como semáforo hasta que exista una regla de color verificada contra cada curva real, reservando el color rojo/amarillo/verde para los indicadores (que sí lo tienen) como ya lo hace hoy la pantalla.
- Si se decide colorear los pilares, tratar el pilar Patrimonio como caso especial explícito (documentando que su valor no escala con magnitud, la misma nota que `DEC-0004` ya dejó pendiente) en vez de aplicarle la misma regla que a los otros tres.

## Observaciones críticas

- **Hallazgo 1** se eleva a crítica: toca el mecanismo central de la pieza que responde la pregunta rectora de la FIN ("¿por qué?"), con un riesgo verificado (no hipotético) de mostrar una calificación de color sin fundamento real para el pilar Patrimonio, que ya tiene una limitación de diseño conocida y aceptada (`DEC-0004`) que esta FIN volvería visible por primera vez.

## Observaciones menores

Ninguna adicional — el resto del documento (P2 a P7) no presenta hallazgos de especificación más allá del ya elevado en P1.

## Revisión de experiencia de usuario (6 preguntas)

1. **¿Algo induce a interpretación incorrecta en un usuario nuevo?** Sí, potencialmente: un pilar Patrimonio coloreado "verde" o "amarillo" sin una regla verificada podría hacer que un usuario con un patrimonio apenas positivo lea una señal de salud que no corresponde a su situación real (Hallazgo 1). El resto de las piezas (P2-P7) no inducen interpretación incorrecta — reutilizan datos ya correctos.
2. **¿Hay terminología confusa?** No, tras el rediseño propuesto: los nombres llanos de pilares ("Tu colchón", "Tus deudas", "Tu ahorro", "Lo que tienes") y la eliminación de "v1" resuelven la jerga ya señalada en S2.
3. **¿Se incrementa la carga cognitiva innecesariamente?** No — P3 mantiene la interpretación en una sola línea incondicional y reserva la fórmula/rangos para el tap ya anunciado ("¿Cómo se calcula? →"), un balance razonable entre destapar y no saturar.
4. **¿La jerarquía visual deja clara la acción principal?** Sí, y de forma explícita: P2 declara una sola jugada ("Tu jugada de mayor impacto") como la decisión concreta al salir de la pantalla — exactamente lo que pide la pregunta rectora del CPSAO.
5. **¿Hay coherencia con el resto del producto?** Sí en el resto de las piezas (P3 reutiliza el patrón de interpretación de Inicio; P4 reutiliza el verde institucional del hero). El Hallazgo 1 es, en parte, un problema de coherencia inversa: los indicadores YA tienen semáforo con umbral verificado; los pilares tendrían uno inventado ad-hoc si no se especifica, rompiendo la consistencia interna de la propia pantalla entre dos elementos que deberían tratarse con el mismo rigor.
6. **¿Se respeta el Principio de Claridad Radical y los criterios §29?** Mayormente sí. El diseño general cumple §29.1 (ninguna interpretación exige entender el modelo interno) y §29.2 (lenguaje llano en las tablas de §4). El Hallazgo 1 es la única pieza que, sin resolver, podría violar la intención central de la FIN misma (§0: "nunca calificado, siempre orientado") mostrando una calificación de color no verificada.

## Recomendaciones

1. Antes de que el CTO emita `DEC-019`, que Arquitectura especifique la regla de color por pilar para P1 (Hallazgo 1) — o adopte la alternativa más segura de no colorear los pilares como semáforo hasta verificarla, dejando el color reservado a los indicadores como hoy.

## Priorización

| Recomendación | Clasificación |
|---|---|
| Especificar o retirar el semáforo de color por pilar en P1 (Rec. 1) | Debe hacerse antes del desarrollo — bloqueante solo para esa pieza específica de P1 |

## Veredicto

**REQUIERE AJUSTES** (acotado a la regla de color de P1; el resto del documento — P2 a P7 — no presenta hallazgos bloqueantes).

El diagnóstico de `RECORRIDO-SALUD-001` es preciso y verificado contra el código real en las 9 observaciones. La afirmación de "cero backend" se sostiene para prácticamente todo el alcance, y el diseño de P2 a P7 responde con solidez a la intención declarada por el CPSAO, reutilizando patrones ya auditados de FIN-017 y FIN-007. Solo P1 —la pieza que responde la pregunta central de la FIN— tiene un hueco de especificación con un riesgo real y verificado (no hipotético) sobre el pilar Patrimonio. Recomiendo que el CTO autorice P2 a P7 sin devolver el documento completo a Arquitectura, y exija que P1 resuelva la regla de color de pilares (o prescinda del semáforo por pilar) antes de autorizar esa pieza específica.

---
*Esta auditoría no implementa ni decide. Queda a la espera de la decisión oficial del CTO (`DEC-019`).*
