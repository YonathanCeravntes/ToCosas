# DEC-0019 · Experiencia de Salud (Score Millo)

- **Documentos base:** `docs/arquitectura/ARQ-0019-Experiencia-Salud.md` (v1.0, commit `9228eca`) · `docs/auditoria/AUD-0019-Experiencia-Salud.md`
- **Módulo/Feature:** FIN-019 (única FIN activa, Gobernanza v3.5 §27 — Origen: Mejora de revisión de producto, `RECORRIDO-SALUD-001`)
- **Decide:** CTO de Milla
- **Fecha:** 2026-07-11

---

## 0. Verificación independiente previa a esta decisión

Antes de decidir, verifiqué contra el repositorio real (no solo el informe del Auditor):

- Confirmé que `FIN-018` cerró formalmente (`DEC-0018` §14) antes de que se abriera `FIN-019` — sin infracción de "un FIN a la vez".
- Leí `frontend/src/api/types.ts`: confirmé que `ScorePillar` expone únicamente `value: number | null` y `status: string` — no existe ningún campo `level` de color para pilares, a diferencia de `HealthIndicator` que sí lo tiene.
- Leí `backend/src/modules/health/score.util.ts`: confirmé que `wealthPillar()` retorna 70 para cualquier patrimonio neto positivo sin tendencia (más 30 si la tendencia es no-negativa), independientemente de la magnitud del patrimonio — un valor esencialmente binario/plano, no continuo.
- Leí `docs/auditoria/AUD-0004-Salud-Financiera.md` y `docs/oficial/DEC-0004-Salud-Financiera.md`: confirmé que esta limitación del pilar Patrimonio ya fue señalada por el Auditor en su momento (Hallazgo 2 de AUD-0004) y aceptada explícitamente por el CTO como riesgo diferido para una futura recalibración de `scoreVersion`, precisamente porque el pilar no se mostraba en ninguna pantalla — condición que `ARQ-0019` cambiaría por primera vez.
- Leí `frontend/src/screens/HealthScreen.tsx` y vi directamente `salud-01-scroll-completo.png`: confirmé la tarjeta naranja (`colors.warning`) para la banda "Estable", "715" sin "de 1.000", "No es un puntaje crediticio · v1" visible, solo 3 indicadores para un Score de 4 pilares, y "Toca para ver detalle" sin anunciar contenido — las observaciones de `RECORRIDO-SALUD-001` se sostienen.

Conclusión: **AUD-019 es preciso y su único hallazgo (P1, regla de color por pilar) se sostiene de forma independiente, con un riesgo real y no hipotético sobre el pilar Patrimonio.**

## 1. Resumen ejecutivo

`ARQ-0019` parte de una intención aprobada por el CPSAO ("comprensión con agencia", §0) y responde con solidez a las 9 observaciones de `RECORRIDO-SALUD-001`, reutilizando patrones ya auditados de FIN-017 (interpretación sin interacción) y FIN-007 (motor de recomendaciones). El Auditor no encontró hallazgos bloqueantes en P2 a P7. Sí encontró, y verifiqué de forma independiente, que P1 (la pieza que responde "¿por qué?", el corazón de esta FIN) propone colorear los 4 pilares con un semáforo verde/amarillo/rojo sin que exista un umbral de color por pilar en el backend, con riesgo concreto de mostrar una calificación sin fundamento real para el pilar Patrimonio — exactamente lo que la intención de esta FIN busca evitar.

## 2. Arquitecturas revisadas

- `docs/arquitectura/ARQ-0019-Experiencia-Salud.md` (v1.0).

## 3. Auditorías revisadas

- `docs/auditoria/AUD-0019-Experiencia-Salud.md` — veredicto: **REQUIERE AJUSTES** (acotado a la regla de color de P1).

## 4. Decisiones aprobadas

1. **P2 — "Tu jugada de mayor impacto", Alt A con B de respaldo:** aprobada sin condiciones. La recomendación top del motor de FIN-007, con fallback al indicador más débil si el motor no tiene recomendaciones activas.
2. **P3 — Indicadores destapados y jerarquizados, Alt A:** aprobada. Interpretación siempre visible, palanca donde hay dolor (amarillo/rojo), fórmula/rangos tras un tap que ahora anuncia su contenido.
3. **P4 — Tono y color, Alt A:** aprobada. La tarjeta del Score usa siempre el verde institucional; el semáforo se reserva para pilares e indicadores.
4. **P5 — Cold-start con emoción, Alt A:** aprobada. Estado propio de construcción usando `coldStart.remainingDays`, con expectativa y 2 acciones disponibles desde el día cero.
5. **P6 — Evolución con lectura, Alt A:** aprobada. Narrativa por casos (primera medición / delta desde el mes anterior) en vez de lista plana.
6. **P7 — Cierre del recorrido, Alt A:** aprobada. Puente al Copiloto antes del disclaimer.

## 5. Decisión devuelta a Arquitectura

**P1 — NO autorizada en su forma actual.** El diseño recomendado (1-A) debe resolver la regla de color por pilar antes de implementarse. Arquitectura debe elegir una de estas rutas (u otra equivalente que resuelva el mismo problema), señaladas por el propio Auditor:

- (a) Definir un umbral de color específico y verificado por pilar (no uno genérico aplicado a los 4 valores 0-100), documentando explícitamente por qué cada corte es válido para la curva real de esa métrica; o
- (b) **Ruta preferida por el CTO, dado el estado actual del pilar Patrimonio:** mostrar la barra de progreso de cada pilar (0-100) sin colorearla como semáforo, reservando el verde/amarillo/rojo para los indicadores (que sí tienen un `level` calculado y auditado) — consistente con cómo la pantalla ya trata esa distinción hoy.

Si se opta por (a) y se decide igualmente colorear el pilar Patrimonio, debe tratarse como caso especial explícito, documentando que su valor no escala con magnitud (la misma nota que `DEC-0004` dejó pendiente), en vez de aplicarle la regla genérica de los otros tres pilares.

El resto de P1 (pilares con nombres llanos, "715 de 1.000", "v1" retirado, línea de pilar más débil) **queda aprobado** — solo la representación de color por pilar requiere esta corrección puntual antes de implementarse.

## 6. Observaciones aceptadas

- La afirmación "cero backend" del ARQ se confirma cierta para P2-P7 y para el resto de P1 (pilares, escala, retiro de "v1"): `pillars`, `coldStart.remainingDays`, los campos de indicadores y `GET /recommendations` con `priorityScore` genuinamente basado en ΔScore ya están expuestos.
- Fortalezas señaladas por el Auditor (fallback de P2 diseñado antes de que se pida, reutilización del precedente 3-A de FIN-017, criterio de aceptación #6 con test emocional verificable, P7 con puente a capacidad ya auditada): confirmadas, sin acción requerida.

## 7. Próximos pasos

1. Arquitectura corrige P1 (regla de color por pilar, ruta (a) o (b) de §5) — no requiere nueva vuelta completa de Auditoría, solo confirmación puntual del CTO antes de habilitar `IMP-0019`.
2. Con esa corrección, Arquitectura implementa las 7 piezas según el Plan de `ARQ-0019` §14: frontend por piezas → capturas de scroll completo después (incluido cold-start con usuario nuevo) → `IMP-0019` con SHA y juicio razonado contra la intención → validación → cierre.
3. `BACKLOG.md` se actualiza reflejando: FIN-019 "Decidido — P2-P7 autorizadas; P1 devuelta a Arquitectura para especificar o retirar el semáforo de color por pilar."

## 8. Adendo — corrección de P1 confirmada (ARQ-0019 v1.1, commit `5fbbd0d`)

Verificación independiente: confirmé que Arquitectura adoptó la ruta (b) — los 4 pilares se muestran como barra de progreso 0-100 en color neutro, idéntico tratamiento para los cuatro, sin semáforo. El semáforo queda reservado a los indicadores (§4.1-bis del ARQ), que sí tienen niveles auditados desde FIN-004. **Corrección adicional, no exigida pero acertada:** Arquitectura detectó que "Lo que más te frena" en v1.0 comparaba pilares entre sí — el mismo defecto de fondo (comparar una curva cuasi-binaria con otras), así que lo corrigió para derivarse del peor **indicador** (niveles ya auditados), omitiéndose si todos están en verde (§29.1). El riesgo diferido de `wealthPillar()` queda registrado como mejora futura, citando `DEC-0004` como precedente vigente. Añadido el criterio 1-bis a §13 para verificar "cero semáforo por pilar" en la captura de cierre.

**Observación menor, no bloqueante:** §10 (Riesgos) del ARQ conserva una frase no actualizada ("el semáforo vive en pilares/indicadores") que contradice la propia corrección de v1.1 (ya no hay semáforo en pilares). Arquitectura debe corregir esa frase a "el semáforo vive en los indicadores" en la próxima versión del documento o en `IMP-0019` — no bloquea la implementación.

**P1 queda confirmada en su totalidad.** Con esto, las 7 piezas de `ARQ-0019` v1.1 están autorizadas — Arquitectura puede proceder a implementar según el Plan §14 y emitir `IMP-0019`.
