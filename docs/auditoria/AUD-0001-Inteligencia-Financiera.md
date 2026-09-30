# AUD-0001 · Auditoría de ARQ-0001 (Inteligencia Financiera — arquitectura de 3 capas)

- **Documento auditado:** `docs/arquitectura/ARQ-0001-Inteligencia-Financiera.md`
- **Módulo/Feature:** FIN-001 (umbrella)
- **Fecha:** 2026-07-04
- **Auditor:** Auditor Oficial de Milla (rol de solo lectura)
- **Producto:** Millo (nombre pendiente de confirmación por el CTO, ver sección 15 del ARQ)

> Esta auditoría no modifica el ARQ ni el código. Solo documenta hallazgos para que el
> CTO decida qué se incorpora al `DEC-0001` correspondiente.

---

## Resumen Ejecutivo

ARQ-0001 formaliza correctamente el vacío estructural más importante del proyecto (ausencia de modelo `Account`/`Asset`, por lo que no puede calcularse patrimonio ni liquidez real) y propone una arquitectura de 3 capas razonable como norte estratégico. El documento ya incorpora buenas prácticas de gobernanza: deja explícitas 5 decisiones pendientes para el CTO (sección 15) antes de continuar, y declara que "no iniciar implementación" hasta AUD y DEC.

Sin embargo, el documento **repite una premisa técnica falsa** ya señalada en una revisión previa del mismo contenido (informe general `AUD-0001-Arquitectura.md`, en `docs/Auditorias/`, realizado antes de que este ARQ se formalizara): afirma que Redis/BullMQ "ya presente"/"ya disponibles" (secciones 7 y 11), cuando la verificación directa del código (`backend/package.json`, `render.yaml`) confirma que no existen ni en dependencias ni en la infraestructura de despliegue (plan free de Render, sin Redis). Esto no es un detalle menor: cambia el costo y el orden real de las Fases 0–1.

El alcance también permanece muy amplio (22 módulos de Motor + Score de 15 indicadores + Copiloto con RAG/pgvector + gamificación + monetización) sin un slice mínimo comercializable antes de completar varias fases, y persisten brechas de seguridad/privacidad (envío de datos financieros a un LLM externo sin consentimiento ni minimización especificados) y un riesgo regulatorio (Score + recomendaciones financieras) que el propio ARQ reconoce como pendiente de "encuadre legal" pero no bloquea explícitamente en su plan de fases.

## Hallazgos

1. **Premisa de infraestructura falsa (Redis/BullMQ "ya disponible")** — Secciones 7 y 11 del ARQ. Contradicho por `backend/package.json` (sin `bullmq`/`redis`) y `render.yaml` (plan free, sin add-on de Redis ni worker service).
2. **Bus de eventos sin patrón outbox** — Sección 7 propone `EventEmitter2` como bus de dominio sin especificar garantía transaccional entre el cambio de dominio y la emisión del evento.
3. **Modelo de datos sin `Account`/`Asset` (correctamente señalado como prerequisito)** — Sección 6 y 11 lo dejan como FIN-002, dependencia de todo lo demás. Correcto, pero vale la pena confirmar que ningún otro módulo de Fase 1+ arranque en paralelo sin este modelo.
4. **pgvector y RAG planteados desde el diseño inicial (sección 9)** sin validar antes si la memoria estructurada (sin embeddings) es insuficiente. No hay extensión pgvector instalada hoy.
5. **Sin umbral de cold-start** para módulos de Anomalías/Predicciones/Tendencias (sección 4.1): no se define un mínimo de historial de datos por usuario antes de activarlos.
6. **15 indicadores + 7 pilares de Score + Copiloto + simulador + gamificación** contemplados para exposición temprana al usuario (sección 4.2), sin secuencia de lanzamiento incremental por evidencia de uso.
7. **Envío de datos financieros a LLM externo (Anthropic) sin consentimiento ni minimización especificados como requisito de entrada** — Sección 9 detalla reducción de costo, pero no un mecanismo de consentimiento explícito del usuario ni una definición auditable de qué campos se minimizan.
8. **Riesgo regulatorio reconocido pero no bloqueante en el plan de fases** — Sección 10, riesgo 3, y sección 15, decisión 5, dejan el encuadre legal como pregunta abierta, pero el plan de fases (sección 14) no condiciona el avance del Copiloto/Score a resolver esa pregunta primero.
8. **Monetización en la última fase (Fase 7)** — Sección 14: Premium/hardening queda al final del roadmap, después de Motor, Score, Copiloto, Memoria, Simulador y Gamificación completos.
9. **Series de tiempo (`MetricReading`, `ScoreHistory`) sin diseño de particionamiento/retención** — Sección 6 las menciona como "tablas particionadas por tiempo" pero sin especificar la estrategia concreta ni política de retención.
10. **Rate limiting y cifrado de PII en reposo no mencionados** en la sección de riesgos (10) ni en la de base de datos (6), pese a que el ARQ amplía la superficie de datos sensibles (patrimonio, memoria financiera, conversaciones).

## Riesgos

- Si se avanza con el bus de eventos sin outbox (Hallazgo 2) y luego se migra a colas persistentes bajo presión de escala, es probable una reescritura de la capa de eventos.
- Si se presupuesta la Fase 0 asumiendo Redis/BullMQ ya disponibles (Hallazgo 1), la estimación de esfuerzo/costo de esa fase quedará subvaluada y se descubrirá el gap a mitad de implementación.
- Acumular pgvector/RAG y superficie de datos sensibles sin resolver antes cifrado/consentimiento (Hallazgos 4 y 7) hace cada vez más costoso remediarlo retroactivamente.
- Postergar la señal de monetización a la Fase 7 (Hallazgo 8) arriesga invertir la mayor parte del esfuerzo de ingeniería antes de validar disposición a pagar.
- Activar anomalías/predicciones sin cold-start (Hallazgo 5) puede generar desconfianza en usuarios nuevos, justo en el momento de onboarding.

## Fortalezas

- El diagnóstico del vacío estructural (falta de patrimonio) es correcto y coincide con la evidencia real del código.
- El ARQ deja explícitas 5 decisiones pendientes del CTO (sección 15) antes de continuar — buena disciplina de gobernanza, evita avanzar sobre supuestos no validados por el negocio.
- Principios de diseño claros y consistentes: determinismo primero / IA después, explicabilidad radical, privacidad por diseño (sección 4, "Principios").
- Reconoce correctamente que "no incluye" agregación bancaria automática por ahora, enfocándose en el diferencial real (ingesta conversacional WhatsApp/Telegram) frente a competidores.
- Declara explícitamente la dependencia FIN-002 → todo lo demás (sección 11), evitando que se malinterprete el orden de fases.
- El documento se autolimita ("no iniciar implementación" hasta AUD y DEC) — coherente con el proceso de gobernanza definido en `GOBERNANZA.md`.

## Oportunidades

- Corregir la premisa de infraestructura (Hallazgo 1) antes del DEC, para que la estimación de la Fase 0 sea realista.
- Definir en el propio ARQ (o en un ARQ hijo de FIN-002) el patrón outbox y la clasificación evento-por-evento entre síncrono crítico y asíncrono diferido.
- Adelantar un experimento de monetización simple a la Fase 2–3 en lugar de la Fase 7.
- Acotar el primer hito visible a Score + 3 indicadores en vez de 15, dejando el resto para iteraciones posteriores guiadas por uso real.
- Prototipar el Copiloto (sin memoria persistente ni pgvector) en paralelo a las Fases 0–2 para validar pronto la hipótesis de retención conversacional.

## Observaciones críticas

- La afirmación de que Redis/BullMQ "ya presente"/"ya disponibles" es **factualmente incorrecta** y debe corregirse en el ARQ antes de aprobar el DEC de la Fase 0, dado que cambia el costo y el diseño de esa fase.
- No hay mecanismo de consentimiento/minimización especificado para el envío de datos financieros a un LLM externo (Anthropic). Este punto debería ser condición de entrada para cualquier DEC que autorice la Fase 3 (Copiloto), no solo un riesgo mencionado.
- El encuadre regulatorio (Score + recomendaciones financieras) queda como pregunta abierta para el CTO (sección 15, decisión 5) pero el plan de fases no lo bloquea explícitamente; se recomienda que el DEC correspondiente condicione el avance de Fase 2 (Score) y Fase 3 (Copiloto) a resolver esta pregunta primero.

## Observaciones menores

- Inconsistencia de nomenclatura de carpetas de auditoría observada entre distintas fuentes de instrucción del proyecto: `docs/Auditorias/` (usada para el informe general previo), `docs/auditorias/` y `docs/auditoria/` (esta, según `GOBERNANZA.md`). Se recomienda que el CTO fije una única convención oficial para evitar duplicidad de carpetas.
- Numeración: `GOBERNANZA.md` establece que "un mismo módulo comparte número entre tipos" (ARQ-0001 ↔ AUD-0001 ↔ DEC-0001). Ya existe un `AUD-0001-Arquitectura.md` (informe general, anterior a este ARQ) con un esquema de numeración distinto. No se modifica ni renombra ningún archivo existente; se deja constancia para que el CTO decida si unifica la numeración retroactivamente.
- El nombre del producto sigue sin resolver (Millo vs. Milla) — ya señalado como decisión pendiente en el propio ARQ (sección 15, decisión 1); se reitera aquí solo para que no se pierda en el seguimiento del backlog.

## Recomendaciones

1. Corregir la premisa de Redis/BullMQ en el ARQ (o documentarlo como decisión de infraestructura pendiente) antes del DEC de Fase 0.
2. Incluir el patrón outbox como parte del alcance de FIN-002, no como mejora futura implícita.
3. Condicionar cualquier DEC de Fase 3 (Copiloto) a la existencia de un mecanismo de consentimiento explícito y minimización auditable de datos hacia el LLM.
4. Condicionar el DEC de Fase 2 (Score) y Fase 3 (Copiloto) a la resolución de la decisión 5 del ARQ (encuadre legal).
5. Adelantar la señal de monetización (aunque sea mínima) a Fase 2–3 en el DEC que apruebe el roadmap.
6. Definir cold-start explícito para anomalías/predicciones como parte del alcance de FIN-003 (Motor MVP).
7. Acotar el primer hito visible de Salud Financiera a 3 indicadores, no 15, en el DEC de Fase 2.

## Priorización

| Recomendación | Clasificación |
|---|---|
| Corregir premisa de Redis/BullMQ (Rec. 1) | Debe hacerse antes del desarrollo (Fase 0) |
| Outbox pattern en el alcance de FIN-002 (Rec. 2) | Debe hacerse antes del desarrollo (Fase 0) |
| Consentimiento/minimización para LLM (Rec. 3) | Debe hacerse antes de producción (bloqueante Fase 3) |
| Resolver encuadre legal antes de Score/Copiloto (Rec. 4) | Debe hacerse antes de producción (bloqueante Fase 2–3) |
| Adelantar señal de monetización (Rec. 5) | Puede esperar, pero se recomienda no más allá de Fase 2–3 |
| Cold-start para anomalías/predicciones (Rec. 6) | Debe hacerse antes de producción (Fase 1) |
| Acotar indicadores del primer hito (Rec. 7) | Debe hacerse antes de producción (Fase 2) |
| Unificar convención de carpetas de auditoría | Puede esperar una versión futura (decisión administrativa del CTO) |

## Veredicto

**REQUIERE AJUSTES.**

La dirección estratégica del ARQ-0001 se considera sólida como norte, pero el documento no debe pasar a `DEC-0001` sin corregir la premisa factual sobre Redis/BullMQ y sin que el CTO resuelva explícitamente, dentro del propio DEC, las condiciones de bloqueo señaladas para el Copiloto (consentimiento/minimización de datos a LLM) y para el Score (encuadre legal).

---
*Esta auditoría no implementa ni decide. Queda a la espera de la decisión oficial del CTO (`DEC-0001`).*
