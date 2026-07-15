# DEC-0005 · Copiloto Financiero (v2 — mecanismo de minimización cerrado)

- **Documentos base:** `docs/arquitectura/ARQ-0005-Copiloto-Financiero.md` (v2) · `docs/auditoria/AUD-0005-Copiloto-Financiero.md` (v1, rechazada) · `docs/auditoria/AUD-0005-Copiloto-Financiero-v2.md`
- **Módulo/Feature:** FIN-005
- **Decide:** CTO/CPO/Principal Architect de Millo
- **Fecha:** 2026-07-05
- **Supersede a:** el `DEC-0005` anterior (RECHAZADO) sobre la v1 del ARQ.

---

## 1. Resumen ejecutivo

`ARQ-0005 v2` corrige, de forma sustantiva y no cosmética, los dos hallazgos que motivaron
el rechazo anterior: la segunda vía de contexto por tool-use ahora está cerrada por
restricción de tipos **más validación en runtime** (no solo por convención de código), y
`Debt.name`/`FixedItem.name` se sustituyeron por identificadores no libres con mapeo
reversible solo en servidor — extendiendo el mismo principio, con transparencia, a
`Category.name`/`Account.name`/`Asset.name`. `AUD-0005 v2` lo verificó punto por punto
contra el documento y contra el esquema real (`schema.prisma`), confirmando que los campos
excluidos son efectivamente texto libre sin restricción: **APROBADO CON OBSERVACIONES**,
sin ninguna observación crítica.

Concuerdo con el veredicto del auditor: el mecanismo de minimización que exige DEC-0001
§10.6 queda, ahora sí, demostrablemente cerrado. **Apruebo el diseño de ARQ-0005 v2** con
los dos ajustes menores que señala AUD-0005 v2 (sección 10).

Sin embargo, **esto no autoriza ningún desarrollo de FIN-005.** Como dejé explícito en el
DEC-0005 rechazado, la validación legal del encuadre regulatorio (DEC-0001 §10.7) es una
condición **independiente y bloqueante total**, no resuelta por esta corrección técnica.
Esa validación no es algo que yo, como CTO/arquitecto, pueda resolver por mi cuenta: es una
decisión de negocio y de riesgo legal real que le corresponde al fundador. La traslado
explícitamente al final de este documento.

## 2. Arquitecturas revisadas

- `docs/arquitectura/ARQ-0005-Copiloto-Financiero.md` — versión 2, 2026-07-05.

## 3. Auditorías revisadas

- `docs/auditoria/AUD-0005-Copiloto-Financiero.md` (v1) — veredicto: REQUIERE AJUSTES (ya
  resuelto por esta v2).
- `docs/auditoria/AUD-0005-Copiloto-Financiero-v2.md` — veredicto: **APROBADO CON
  OBSERVACIONES**.

## 4. Decisiones aprobadas

1. **Mecanismo de minimización v2** (§4.3/§4.3-A/§4.3-B del ARQ): aprobado. Las 4 vistas
   minimizadas tipadas, la restricción de tipos + validación en runtime en el ejecutor de
   tools, y el test de regresión que cubre las 4 vistas con PII sembrada, se consideran
   una implementación demostrable (no solo declarada) del mandato DEC-0001 §10.6.
2. **Identificadores no libres para deudas/gastos fijos** ("deuda #N", "gasto fijo #N")
   con mapeo reversible solo en servidor: aprobado. Resuelve la tensión entre privacidad y
   utilidad explicativa sin sacrificar ninguna.
3. **Extensión del principio a `Category.name`/`Account.name`/`Asset.name`**: aprobado
   (el ARQ la marcó como no exigida pero la incluyó con transparencia; la ratifico como
   parte del alcance oficial, no como opcional).
4. **Política de retención de `Conversation`/`Message`** (§4.7): aprobada — revocación de
   consentimiento ≠ borrado de historial; botón autónomo de borrado; purga de
   conversaciones inactivas a 24 meses.
5. **Resiliencia del cliente Anthropic** (§4.8): aprobada — timeout 30s, 1 reintento en
   red/5xx, sin reintento en 429, circuit breaker de 5 fallos/5 min.
6. Todo lo demás ratificado en el DEC-0005 rechazado (consentimiento opt-in real, log sin
   texto, modo sin IA como base, tools solo lectura, Haiku + plantilla-primero, gate de
   producción propio) se mantiene sin cambios.

## 5. Decisiones rechazadas

- Ninguna. La v2 no introduce nada que deba rechazarse.

## 6. Observaciones aceptadas

- Hallazgo 1 de AUD-0005 v2 (asimetría de retención: log 12 meses vs. conversaciones 24
  meses) — aceptado y **ratificado explícitamente aquí** (ver sección 10, no quedaba solo
  como aceptación por default).
- Hallazgo 2 de AUD-0005 v2 (falta regla de gobernanza para tools de LLM futuras) —
  aceptado, se incorpora a `GOBERNANZA.md` (sección 10).

## 7. Observaciones descartadas

- Ninguna.

## 8. Riesgos aceptados

- **Asimetría de retención** (12 vs. 24 meses): aceptada conscientemente. El log de
  auditoría es interno y su propósito se cumple en 12 meses; el historial de chat tiene
  utilidad continua directa para el usuario y se gobierna, además, por un derecho de
  borrado autónomo en cualquier momento — no depende solo del paso del tiempo.

## 9. Riesgos pendientes

1. **Validación legal del encuadre regulatorio** (DEC-0001 §10.7): sigue sin resolverse.
   Es el único punto que impide autorizar desarrollo de FIN-005. No es un hallazgo técnico
   — es una decisión de riesgo legal/de negocio del fundador (ver sección 13).

## 10. Cambios obligatorios

1. **Ratificación formal de la retención asimétrica** (Recomendación 1 de AUD-0005 v2):
   queda ratificada en este DEC (sección 8), no pendiente de decisión adicional.
2. **Regla de gobernanza para tools de LLM futuras**: se añade a `docs/GOBERNANZA.md` que
   toda tool de un LLM (presente o futura, incluido cualquier ARQ de FIN-006/FIN-007) debe
   construirse sobre vistas minimizadas equivalentes a las de este ciclo, con test de
   regresión que las cubra — no como buena práctica opcional, sino como estándar
   obligatorio derivado de este incidente.

## 11. Plan técnico oficial

**No se autoriza ningún desarrollo de FIN-005 en este DEC.** El diseño queda aprobado y
listo para implementarse en el momento en que se resuelva la sección 13. Cuando esa
condición se cumpla, el plan de implementación es el de `ARQ-0005 v2` §14, sin cambios
adicionales requeridos por este DEC.

## 12. Prioridad

**Alta** para la resolución del bloqueo legal (es la única barrera restante para el
diferenciador central del producto). **Nula** para desarrollo mientras el bloqueo persista.

## 13. Validación legal recibida (adenda — 2026-07-05)

El fundador aportó un memorando de un abogado especializado en derecho financiero,
protección de datos y tecnología (Colombia), que responde las tres preguntas que yo
mismo formulé como condición de entrada. Lo evalúo como CTO, no como sustituto de
criterio legal: el propio memorando se declara **preliminar**, basado en información
parcial, y recomienda una revisión integral antes de producción. Actúo en consecuencia:
lo tomo como suficiente para **desbloquear desarrollo**, no como cierre definitivo del
punto legal para producción.

**Conclusiones del memorando:**
1. El Score Millo se ubica en educación financiera no regulada, **condicionado** a que
   las recomendaciones sean genéricas (sin marcas/tasas/entidades específicas) y a
   disclaimers de "no asesoría" visibles — ya presentes en el diseño (ARQ-0005 §4.5/§8),
   pero deben reforzarse como restricción explícita, no implícita.
2. El envío de datos a Anthropic puede cumplir la Ley 1581 de 2012, **condicionado** a que
   el consentimiento incluya: identificación del responsable (Millo), finalidad
   específica mencionando el uso de IA/Anthropic, advertencia expresa de transferencia
   internacional a EE.UU. (país sin nivel adecuado de protección según la SIC), derechos
   ARCO y revocación — el diseño actual de consentimiento (§4.2) es genérico y no incluye
   explícitamente estos elementos. **Además, se requiere un DPA (Data Processing
   Agreement) formal con Anthropic** — acción contractual externa, no técnica.
3. No se requiere registro ante la SFC en el diseño actual. Advertencia a futuro: si el
   Score se comparte con terceros (bancos, fintechs) para decisiones de crédito, se
   activaría Ley 1266 (Habeas Data Financiero) y registro ante la SIC — no aplica hoy,
   pero queda anotado como restricción de alcance para cualquier ARQ futuro de
   monetización/partnerships (FIN-009 u otros).

**Riesgo residual reconocido por el propio abogado:** no existe doctrina específica de
la SFC/SIC sobre scores financieros generados por IA; el riesgo regulatorio de un caso
novedoso no desaparece con este memorando preliminar.

## 14. Cambios obligatorios adicionales (derivados del memorando legal)

Estos se suman a los de la sección 10 y son **condición de entrada para `IMP-0005`**
(no se cierra el desarrollo sin ellos), con independencia de que ya autorizo iniciar
la implementación (sección 15):

1. **Texto de consentimiento (§4.2 del ARQ) debe reescribirse** para incluir
   explícitamente: identificación de Millo como responsable, mención expresa de
   Anthropic/IA como finalidad, advertencia de transferencia internacional a EE.UU.
   sin nivel adecuado de protección (según criterio SIC), derechos ARCO, y mecanismo de
   revocación — no basta la redacción genérica original.
2. **Restricción explícita de "recomendación genérica"** en el system prompt y en
   `templates.ts`: el Copiloto **nunca** debe nombrar entidades financieras, tasas de
   producto de terceros, ni marcas específicas al dar una recomendación — instrucción de
   sistema verificable por test (igual rigor que el test de minimización de PII).
3. **DPA con Anthropic**: acción externa del fundador (no de ingeniería). Es
   precondición para que `ANTHROPIC_API_KEY` se active con **datos reales de usuarios**,
   en cualquier ambiente (desarrollo, staging o producción) — la etiqueta del ambiente no
   cambia si el dato es real. Sin DPA, el desarrollo continúa en modo plantillas/mock.
4. **PIA (evaluación de impacto en privacidad)** documentada: recomendada por el
   abogado como evidencia de *accountability*. La produzco yo mismo como documento breve
   antes de que se active la API real con datos de usuarios (no bloquea el desarrollo en
   modo plantillas/mock).

## 15. Estado final

**DESARROLLO AUTORIZADO (dev/staging, modo plantillas u con datos sintéticos).**
**ACTIVACIÓN CON DATOS REALES DE USUARIOS BLOQUEADA** hasta que exista el DPA con
Anthropic (cambio obligatorio §14.3) y la PIA (§14.4). **PRODUCCIÓN BLOQUEADA**
(`COPILOT_PRODUCTION_ENABLED` permanece en `false`) hasta revisión legal final de la
documentación completa (consentimiento definitivo, términos, DPA, ARQ-0005 completo),
tal como el propio abogado lo recomienda.

Se autoriza al Desarrollador a iniciar la implementación de FIN-005 siguiendo el plan de
`ARQ-0005 v2` §14, incorporando los cambios obligatorios de las secciones 10 y 14 de este
DEC. El cierre de FIN-005 (`IMP-0005`) debe declarar explícitamente el estado de cada
condición de la sección 14 (cuáles están resueltas y cuáles siguen pendientes antes de
usar datos reales o de activar producción). Validaré `IMP-0005` en checkout aislado,
igual que los ciclos anteriores.

---
*Documento oficial — no modificar. Corresponde al ciclo de gobernanza de `docs/GOBERNANZA.md`.*
