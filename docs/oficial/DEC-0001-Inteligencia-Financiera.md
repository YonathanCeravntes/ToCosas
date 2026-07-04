# DEC-0001 · Inteligencia Financiera (arquitectura de 3 capas — umbrella)

- **Documentos base:** `docs/arquitectura/ARQ-0001-Inteligencia-Financiera.md` · `docs/auditoria/AUD-0001-Inteligencia-Financiera.md`
- **Módulo/Feature:** FIN-001 (umbrella)
- **Decide:** CTO/CPO/Principal Architect de Millo
- **Fecha:** 2026-07-04

---

## 1. Resumen ejecutivo

Se aprueba el **norte estratégico** de ARQ-0001 (evolución de Millo hacia una plataforma
de inteligencia financiera de 3 capas: Motor → Salud Financiera → Copiloto, con
determinismo primero e IA después) con ajustes obligatorios. Este DEC **no autoriza
implementación de código**: FIN-001 es un documento paraguas, tal como el propio ARQ lo
declara ("cada capa/módulo tendrá su propio ARQ hijo antes de implementarse"). Lo que este
DEC autoriza es **avanzar al siguiente ciclo de gobernanza** (ARQ-0002 para FIN-002) bajo
las condiciones fijadas aquí, que son vinculantes para todos los ARQ/DEC hijos (FIN-002…FIN-009).

La auditoría (AUD-0001) confirma un hallazgo crítico que se acepta sin matices: la premisa
de que Redis/BullMQ "ya está disponible" es factualmente falsa (no existe en
`backend/package.json` ni en `render.yaml`). Se acepta también el resto de los hallazgos
de seguridad, privacidad, regulación y secuenciación de negocio como condiciones de entrada
para las fases correspondientes.

## 2. Arquitecturas revisadas

- `docs/arquitectura/ARQ-0001-Inteligencia-Financiera.md` — v. 2026-07-04, autor: Agente de Arquitectura.

## 3. Auditorías revisadas

- `docs/auditoria/AUD-0001-Inteligencia-Financiera.md` — veredicto: **REQUIERE AJUSTES**.
- Nota de contexto (no vinculante para este DEC): existe además `docs/Auditorias/AUD-0001-Arquitectura.md`,
  informe general previo con numeración/carpeta distinta. Se trata como antecedente histórico,
  no como auditoría formal del ciclo de gobernanza (ver cambio obligatorio #10).

## 4. Decisiones aprobadas

1. **Nombre del producto:** Millo. Queda cerrado; no se reabre en documentos futuros.
2. **Norte estratégico de 3 capas** (Motor Financiero → Salud Financiera → Copiloto) y sus
   principios (determinismo primero/IA después, explicabilidad radical, memoria propiedad
   de Millo, privacidad por diseño): **aprobados** como marco de referencia para todos los
   ARQ hijos.
3. **Ingreso manual de saldos/activos** como base de patrimonio/liquidez: aprobado. Es la
   única vía viable mientras no exista agregación bancaria (correctamente fuera de alcance).
4. **Anthropic (Claude Haiku por defecto, escalado a modelo mayor)** para el Copiloto:
   aprobado en principio, condicionado (ver Decisiones rechazadas y Cambios obligatorios —
   no se autoriza su ARQ de implementación, FIN-005, sin consentimiento/minimización resuelto).
5. **Secuencia del primer hito:** Fase 0→2 (FIN-002 Fundaciones → FIN-003 Motor MVP →
   FIN-004 Salud/Score) antes de autorizar el ARQ de Copiloto (FIN-005).
6. **Encuadre legal de trabajo:** "información/educación con disclaimers" se acepta como
   encuadre *provisional* de diseño, no como resolución final (ver Cambios obligatorios #7).
7. **Dependencia FIN-002 → todo lo demás**: confirmada y vinculante. Ningún módulo de
   Fase 1+ puede iniciar su propio ARQ en paralelo a FIN-002.

## 5. Decisiones rechazadas

1. **Se rechaza la premisa de infraestructura "Redis/BullMQ ya disponible/presente"**
   (secciones 7 y 11 del ARQ). Es falsa. Cualquier ARQ hijo que la reutilice sin decisión
   explícita de costo será devuelto sin auditoría.
2. **Se rechaza incluir pgvector/RAG en el alcance inicial** de FIN-002/FIN-003. Se difiere
   hasta tener evidencia de que la memoria estructurada (filas con tags, sin embeddings) es
   insuficiente.
3. **Se rechaza el dashboard inicial con 15 indicadores + 7 pilares** expuestos
   simultáneamente en el primer lanzamiento de Salud Financiera (FIN-004).
4. **Se rechaza secuenciar monetización en Fase 7 (FIN-009).** Debe existir una señal de
   monetización, aunque sea mínima, a más tardar en FIN-004/FIN-005.

## 6. Observaciones aceptadas

- H1/Hallazgo 1 (premisa Redis/BullMQ falsa) — aceptada íntegramente.
- Hallazgo 2 (bus de eventos sin outbox) — aceptada.
- Hallazgo 5 (sin cold-start para anomalías/predicciones) — aceptada.
- Hallazgo 7 (envío de datos a LLM externo sin consentimiento/minimización) — aceptada, se
  eleva a condición bloqueante.
- Observación crítica sobre encuadre regulatorio no bloqueante en el plan de fases —
  aceptada, se corrige en este DEC (ver Cambios obligatorios #7).
- Recomendación 5 (adelantar monetización) — aceptada.
- Recomendación 7 (acotar primer hito a 3 indicadores) — aceptada.
- Observación menor sobre inconsistencia de nombres de carpeta de auditoría — aceptada
  (ver Cambios obligatorios #10).

## 7. Observaciones descartadas

- Ninguna. Todos los hallazgos, riesgos y recomendaciones de AUD-0001 se aceptan en algún
  grado (aceptados directamente o convertidos en cambio obligatorio/condición de fase). No
  se descarta ningún punto de la auditoría.

## 8. Riesgos aceptados

- **Complejidad/alcance del roadmap de 8 fases**: se acepta como riesgo conocido, mitigado
  por el propio mecanismo de gobernanza (cada fase requiere su ARQ/AUD/DEC/IMP) y por el
  acotamiento de este DEC al primer hito (Fase 0→2).
- **Costo de IA en Fase 3+**: se acepta como riesgo a gestionar en el momento del ARQ de
  FIN-005, mediante la estrategia ya prevista (plantillas, caché, contexto compacto,
  modelo escalonado).

## 9. Riesgos pendientes

- **Riesgo regulatorio (Score + recomendaciones financieras)**: no resuelto. Bloquea el
  DEC de FIN-004 en producción y el DEC de FIN-005 en su totalidad hasta validación legal
  explícita.
- **Privacidad/consentimiento para datos hacia LLM externo**: no resuelto. Bloquea
  cualquier ARQ de FIN-005.
- **Cifrado de PII en reposo y rate limiting**: no resueltos. No bloquean FIN-002/FIN-003
  en desarrollo, pero deben decidirse explícitamente antes de exponer el sistema ampliado
  a más usuarios o a producción.
- **Particionamiento/retención de series de tiempo**: no resuelto en detalle; queda para el
  ARQ de FIN-002/FIN-003, no es bloqueante para iniciar diseño.

## 10. Cambios obligatorios

1. El ARQ de FIN-002 debe decidir explícitamente la infraestructura de colas/eventos: (a)
   cron + tabla outbox sobre PostgreSQL existente (recomendado, sin costo nuevo) vs. (b)
   Redis/BullMQ presupuestado como gasto nuevo. No se acepta "ya disponible".
2. Patrón **outbox** incluido como parte obligatoria del alcance de FIN-002, no como mejora
   futura.
3. Clasificación evento-por-evento **síncrono crítico (<100ms) vs. asíncrono diferido**,
   documentada en el ARQ de FIN-002 o FIN-003.
4. **Cold-start explícito** (umbral mínimo de historial, p. ej. ≥60 días) para
   anomalías/predicciones/tendencias, incluido en el alcance de FIN-003.
5. **Cifrado de PII en reposo y rate limiting** evaluados y decididos (aunque no se
   implementen de inmediato) antes del DEC de FIN-002, dado que se amplía la superficie de
   datos sensibles (patrimonio, memoria financiera).
6. **Consentimiento explícito del usuario + minimización auditable de campos** hacia
   cualquier LLM externo, especificado como requisito de entrada del ARQ de FIN-005.
   Bloqueante: no se emitirá DEC para FIN-005 sin esto resuelto en el ARQ.
7. **Validación legal explícita** del encuadre regulatorio (Score + recomendaciones): debe
   completarse antes de exponer FIN-004 (Score) a usuarios reales en producción, y es
   bloqueante total para cualquier DEC de FIN-005.
8. **Señal de monetización simple** (p. ej. paywall sobre simulaciones o límite de mensajes
   del Copiloto) incluida en el alcance de FIN-004 o FIN-005, no diferida a FIN-009.
9. **Primer hito visible de Salud Financiera acotado a Score + máximo 3 indicadores**
   (a definir cuáles en el ARQ de FIN-004, priorizando accionabilidad), no los 15 propuestos.
10. **Convención única de carpeta de auditoría**: la oficial es `docs/auditoria/`
    (singular, según `GOBERNANZA.md`). `docs/Auditorias/AUD-0001-Arquitectura.md` queda
    como antecedente histórico, no se renombra ni se borra, pero no es válido como
    referencia de gobernanza para futuros DEC.

## 11. Plan técnico oficial

Este DEC no autoriza código. Autoriza al Agente de Arquitectura a iniciar el siguiente
ciclo de gobernanza:

- **Próximo artefacto autorizado:** `ARQ-0002-Fundaciones-de-Datos.md` (FIN-002), cubriendo
  Account/Asset, bus de eventos con outbox, snapshots y series de tiempo.
- El ARQ-0002 debe incorporar, como contenido obligatorio, los 10 puntos de la sección
  "Cambios obligatorios" que le apliquen (1, 2, 3, 4, 5, 9 en lo pertinente a fundaciones).
- **No se autoriza** iniciar ARQ de FIN-005 (Copiloto) hasta que FIN-002, FIN-003 y FIN-004
  tengan su propio ciclo ARQ→AUD→DEC completo, y hasta que el mecanismo de
  consentimiento/minimización (cambio obligatorio #6) esté diseñado.
- ARQ-0001 permanece como documento de referencia estratégica (no se re-audita ni se
  vuelve a decidir); las decisiones de esta sección son las que rigen desde ahora.
- El agente Auditor debe, en el AUD-0002, verificar explícitamente que el ARQ-0002 cumple
  los 10 cambios obligatorios de este DEC antes de emitir veredicto.

## 12. Prioridad

**Alta.** Bloquea el inicio de todo el roadmap de inteligencia financiera (FIN-002 en
adelante depende de las decisiones tomadas aquí).

## 13. Estado final

**APROBADO CON AJUSTES.**

FIN-001 (umbrella) queda **decidido y condicionado**: el norte estratégico se aprueba; la
implementación no se autoriza directamente por tratarse de un documento paraguas. Se
autoriza avanzar a `ARQ-0002-Fundaciones-de-Datos.md` (FIN-002) bajo los cambios
obligatorios de la sección 10. No se cierra el ciclo de FIN-001 hasta que FIN-002, FIN-003
y FIN-004 completen su propio ARQ→AUD→DEC→IMP.

---
*Documento oficial — no modificar. Corresponde al ciclo de gobernanza de `docs/GOBERNANZA.md`.*
