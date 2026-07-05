# DEC-0005 · Copiloto Financiero (v2 — evolución de "Consejos")

- **Documentos base:** `docs/arquitectura/ARQ-0005-Copiloto-Financiero.md` · `docs/auditoria/AUD-0005-Copiloto-Financiero.md`
- **Módulo/Feature:** FIN-005
- **Decide:** CTO/CPO/Principal Architect de Millo
- **Fecha:** 2026-07-05

---

## 1. Resumen ejecutivo

Este es el ciclo de mayor riesgo hasta ahora: primera integración con un LLM externo
sobre datos financieros reales. ARQ-0005 tiene una base seria y honesta (consentimiento
opt-in real, log auditable sin texto, modo sin IA como base funcional, disciplina de
alcance frente a FIN-006/FIN-007, transparencia explícita sobre el bloqueo legal
pendiente). No lo descarto ni lo devuelvo para reescritura completa.

Pero AUD-0005 encontró que el mecanismo que este ARQ existe para garantizar —la
minimización de datos hacia el LLM, mandato DEC-0001 §10.6— tiene un hueco real: las
tool-use de solo lectura son una segunda vía de contexto que **no pasa por el mismo
allowlist** que el `ContextAssembler`, y el propio documento permite `Debt.name`/
`FixedItem.name` (texto libre del usuario) con el mismo perfil de riesgo que
`Transaction.note`, que sí excluye explícitamente. Esto no es un detalle de
implementación: es una falla en el control central que el ARQ propone como su propia
garantía, no detectable por el test de regresión que el propio documento describe como
prueba de cumplimiento.

Concuerdo con el auditor: esto se corrige en el documento antes de que evalúe el resto.
**Decisión: RECHAZADO**, no "aprobado con ajustes". La diferencia importa: en los ciclos
anteriores, los ajustes eran refinamientos sobre un mecanismo que sí funcionaba (ej.
clasificación de eventos, purga de outbox). Aquí el defecto está en el mecanismo mismo de
protección de datos personales hacia un tercero externo — el estándar de corrección debe
ser más alto, y curarlo dentro de un DEC con "cambios obligatorios" para la
implementación sería aceptar como cerrado un punto que el propio ARQ no cerró.

## 2. Arquitecturas revisadas

- `docs/arquitectura/ARQ-0005-Copiloto-Financiero.md` — v. 2026-07-05.

## 3. Auditorías revisadas

- `docs/auditoria/AUD-0005-Copiloto-Financiero.md` — veredicto: **REQUIERE AJUSTES**.

## 4. Decisiones aprobadas

Ninguna decisión de implementación se aprueba en este DEC — no hay autorización de
código para FIN-005 todavía. Sí se ratifican, como marco válido para la próxima versión
del ARQ (no hace falta rediscutirlas):

1. Consentimiento **opt-in real** (apagado por defecto), versionado y revocable.
2. **Allowlist, no blocklist**, como principio de diseño del `ContextAssembler`.
3. `AiInteractionLog` sin texto (solo grupos de campos + tokens) como solución al
   problema de auditar sin duplicar el riesgo.
4. **Modo sin IA como base funcional**, no como degradación de emergencia.
5. Tool-use estrictamente de **solo lectura**, ninguna acción de escritura.
6. Anthropic `claude-haiku-4-5`, router plantilla-primero, prompt caching, límites
   free/premium, gate técnico de producción propio (mismo patrón de DEC-0004).
7. Exclusión de memoria/RAG/pgvector (FIN-006) y simulador/recomendaciones (FIN-007) del
   alcance: disciplina correcta, se mantiene.

## 5. Decisiones rechazadas

1. **Se rechaza el mecanismo de minimización tal como está descrito en §4.3/§4.5.** No
   cubre las respuestas de las tool-use de solo lectura (`get_financial_snapshot`,
   `get_debts`, `get_score_breakdown`); si esas tools llaman directamente a los servicios
   existentes sin pasar por el mismo allowlist, cualquier campo que esos servicios
   devuelvan hoy llega al LLM sin que el test de regresión lo detecte.
2. **Se rechaza incluir `Debt.name` y `FixedItem.name` en el contexto del LLM.** Son
   campos de texto libre ingresados por el usuario (verificado contra
   `backend/prisma/schema.prisma`: ambos `String` sin restricción), el mismo perfil de
   riesgo que `Transaction.note`, que el propio ARQ excluye explícitamente por esa razón.
   No es coherente excluir uno y permitir el otro.
3. **Se rechaza (por ahora) la ausencia de política de retención** para `Conversation`/
   `Message` — no bloquea la resubmisión del ARQ, pero debe incorporarse antes de que yo
   evalúe el documento nuevamente (ver sección 10).

## 6. Observaciones aceptadas

- Hallazgo 1 (tool-use como vía de contexto no cubierta) — aceptado, elevado a condición
  de reenvío del ARQ.
- Hallazgo 2 (`Debt.name`/`FixedItem.name` inconsistente con la exclusión de
  `Transaction.note`) — aceptado, elevado a condición de reenvío del ARQ.
- Hallazgo 3 (sin política de retención de conversaciones) — aceptado, exigido en el
  reenvío (no bloquea el desarrollo, pero si no viene resuelto en el ARQ v2 lo pediré antes
  de emitir DEC).
- Hallazgo 4 (timeout/reintentos del cliente fetch) — aceptado como detalle de
  implementación, no bloquea el ARQ.

## 7. Observaciones descartadas

- Ninguna. Los cuatro hallazgos de AUD-0005 se incorporan como condición de reenvío o
  quedan explícitamente para la fase de implementación.

## 8. Riesgos aceptados

- Ninguno. Este DEC no autoriza ningún desarrollo; no hay riesgo de producto que aceptar
  todavía.

## 9. Riesgos pendientes

1. **Validación legal del encuadre regulatorio** (DEC-0001 §10.7): sigue pendiente,
   bloqueante total para cualquier DEC-0005 futuro, con independencia de que el ARQ
   corrija los hallazgos de minimización. Es una acción externa mía, no del Arquitecto.
2. **Mecanismo de minimización incompleto** (Hallazgos 1 y 2): pendiente hasta el
   reenvío del ARQ.
3. **Retención de conversaciones no definida** (Hallazgo 3): pendiente hasta el reenvío.

## 10. Cambios obligatorios (para el reenvío de ARQ-0005 — no para código)

No autorizo ningún cambio de código en este DEC. Los siguientes cambios son **requisitos
de entrada para que yo evalúe una versión revisada del ARQ** (`ARQ-0005 v2`, mismo
número, no un ciclo nuevo):

1. **Cerrar la segunda vía de contexto:** las tool-use de solo lectura deben construir su
   resultado a través del mismo `ContextAssembler` (o una función que comparta
   exactamente el mismo allowlist y el mismo test de regresión de §4.3), no llamando
   directamente a `EngineService`/`HealthService`/`DebtsService` crudos. El test de
   minimización debe demostrablemente cubrir también lo que devuelven las tools.
2. **Retirar `Debt.name` y `FixedItem.name` del allowlist**, sustituyéndolos por `type`/
   categoría (ya presentes) + un identificador no libre (p. ej. "tu deuda #1", "tu gasto
   fijo #2"), preservando la utilidad explicativa sin exponer texto libre de terceros.
3. **Definir política de retención para `Conversation`/`Message`**, incluyendo qué ocurre
   con el historial de chat ya almacenado cuando el usuario revoca el consentimiento de
   IA (¿se purga? ¿se conserva porque el consentimiento cubría el hecho de conversar, no
   solo el envío al LLM? — decisión que el ARQ debe proponer explícitamente, no dejar
   abierta).
4. **Especificar timeout y reintentos** del cliente `fetch` hacia la API de Anthropic
   (puede ser una sección breve; no requiere el mismo nivel de detalle que los puntos 1-3).

## 11. Plan técnico oficial

**No se autoriza ningún desarrollo.** El siguiente artefacto autorizado es una versión
revisada de `ARQ-0005-Copiloto-Financiero.md` que incorpore los 4 cambios de la sección
10, seguida de su propio ciclo AUD-0005 v2 antes de que yo emita un nuevo DEC-0005. Ese
DEC-0005 seguirá bloqueado, con independencia del resultado de la revisión, hasta que
exista validación legal explícita del encuadre regulatorio (DEC-0001 §10.7) — este es un
bloqueo separado, no resuelto por la corrección del mecanismo de minimización.

## 12. Prioridad

**Alta** para la corrección del ARQ (es el mandato más delicado del proyecto). **Bloqueada**
para cualquier implementación hasta cumplir ambas condiciones (ARQ corregido + validación
legal).

## 13. Estado final

**RECHAZADO.** No se autoriza avanzar con la versión actual de `ARQ-0005`. Se exige una
versión revisada que cierre los Hallazgos 1 y 2 de AUD-0005 en el propio documento, incluya
la política de retención del Hallazgo 3, y especifique el Hallazgo 4. El DEC-0005
resultante de esa revisión permanecerá además bloqueado por la validación legal pendiente
de DEC-0001 §10.7, que es una condición independiente y no se resuelve con esta corrección.

---
*Documento oficial — no modificar. Corresponde al ciclo de gobernanza de `docs/GOBERNANZA.md`.*
