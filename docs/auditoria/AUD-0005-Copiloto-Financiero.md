# AUD-0005 · Auditoría de ARQ-0005 (Copiloto Financiero — v2)

- **Documento auditado:** `docs/arquitectura/ARQ-0005-Copiloto-Financiero.md`
- **Módulo/Feature:** FIN-005
- **Documentos base revisados:** `ARQ-0001/DEC-0001`, `DEC-0002`, `DEC-0003`, `ARQ-0004/AUD-0004/DEC-0004`, `IMP-0004`
- **Referencia inmutable verificada:** `git show c85117e:...` para el cierre de FIN-004 (guard de producción, gate premium) y `git show HEAD:backend/prisma/schema.prisma` para los campos reales de `Debt`/`FixedItem` citados en los hallazgos — no se auditó contra working tree.
- **Fecha:** 2026-07-05
- **Auditor:** Auditor Oficial de Milla (rol de solo lectura)

> Esta auditoría no modifica el ARQ ni el código. Este es el ciclo de mayor riesgo hasta
> ahora (primera integración con un LLM externo sobre datos financieros reales); se aplicó
> el mayor nivel de escrutinio, en línea con la advertencia que el propio CTO dejó al
> autorizar este ARQ. Documenta hallazgos para que el CTO decida `DEC-0005`, que ya está
> bloqueado por mandato hasta la validación legal (independiente de este informe).

---

## Resumen Ejecutivo

ARQ-0005 aborda con seriedad el mandato más delicado del proyecto (DEC-0001 §10.6): consentimiento explícito opt-in versionado y revocable, un `ContextAssembler` con allowlist de campos, un log de auditoría que no almacena texto, tool-use restringido a solo lectura, y un modo sin IA que es la base funcional por defecto. La disciplina de alcance también es correcta: excluye memoria/RAG (FIN-006) y cualquier tool de escritura (FIN-007), y declara honestamente en su propia sección 17 que no resuelve la validación legal — la deja como bloqueo explícito del DEC, no oculto.

Sin embargo, esta auditoría encuentra que el mecanismo central que el documento presenta como su núcleo — "el `ContextAssembler` es el único módulo que puede construir contexto para el LLM" (§4.3) — **no cubre, tal como está descrito, el contexto que entra al modelo a través de las tool-use de solo lectura** (`get_debts`, `get_financial_snapshot`, `get_score_breakdown`). Si esas tools devuelven los objetos de los servicios existentes sin pasar por el mismo allowlist, existe una segunda vía de datos hacia el LLM que no está cubierta por el test de regresión de minimización que el propio ARQ propone como garantía. Además, dos campos de texto libre ingresados por el usuario (`Debt.name`, `FixedItem.name`) están permitidos en el contexto por la misma razón que `Transaction.note` está explícitamente prohibido ("las notas son texto libre del usuario, PII potencial") — inconsistencia directa dentro del propio criterio del documento. Por esto, el veredicto es **REQUIERE AJUSTES**, no una aprobación con observaciones: el defecto está exactamente en el mecanismo que este ARQ existe para garantizar.

## Hallazgos

1. **Las tool-use de solo lectura son una segunda vía de contexto hacia el LLM, no cubierta explícitamente por el allowlist ni por el test de regresión de minimización.** §4.3 afirma que el `ContextAssembler` es "el único módulo que puede construir contexto para el LLM", pero §4.5 describe tools (`get_financial_snapshot`, `get_debts`, `get_score_breakdown`) que "resuelven en proceso contra los servicios existentes (Motor/Salud)". Si estas tools llaman directamente a `EngineService`/`HealthService`/`DebtsService` sin pasar el resultado por el mismo allowlist de §4.3, cualquier campo que esos servicios devuelvan hoy (ids, timestamps, `notes`, nombres libres, etc.) llegaría al LLM sin que el test de minimización lo detecte, porque ese test —tal como se describe— solo cubre lo que construye el `ContextAssembler`, no lo que devuelven las tools.
2. **`Debt.name` y `FixedItem.name` están permitidos en el contexto (§4.3) pese a ser campos de texto libre ingresados por el usuario, exactamente el mismo perfil de riesgo que `Transaction.note`.** Verificado contra `backend/prisma/schema.prisma`: `Debt.name` y `FixedItem.name` son `String` sin restricción, tan libres como `Transaction.notes` (también `String?`, y ese sí está explícitamente prohibido en la tabla de §4.3 con la justificación "las notas son texto libre del usuario, PII potencial"). Un usuario podría nombrar una deuda "Préstamo de mi hermano Andrés Gómez, cel. 3001234567" o un gasto fijo "Arriendo donde mi tía en la Calle 45", y ese texto entraría al contexto del LLM sin pasar por ningún filtro de PII.
3. **Sin política de retención/eliminación para `Conversation`/`Message` (el contenido real de la charla), a diferencia de `AiInteractionLog`.** §4.4 define retención de 12 meses para el log de auditoría (que no almacena texto), pero el ARQ no define qué pasa con el contenido real de las conversaciones (que sí puede incluir detalles financieros que el usuario escribió directamente) al revocar el consentimiento, ni una retención general para `Message.content`. §4.2 dice que la revocación "conserva el registro histórico del consentimiento en `AiInteractionLog`" pero no aclara el destino de los mensajes ya guardados.
4. **Sin manejo de errores/timeouts especificado para el cliente `fetch` directo a la API de Anthropic.** §4.5/§7 mencionan el cliente y su test con fetch mockeado, pero no especifican timeout, reintentos, ni comportamiento ante error de red distinto del "fallback a plantilla" ya cubierto para errores de la propia llamada — razonable inferir que aplica igual, pero no está explícito.

## Riesgos

- Si el Hallazgo 1 no se cierra antes de implementar, el proyecto podría lanzar el Copiloto con una garantía de minimización que se audita a sí misma como completa (el test de regresión pasa) mientras una vía real de fuga de datos permanece sin cobertura — el peor escenario para un control de privacidad: parecer verificado sin estarlo.
- El Hallazgo 2 puede exponer datos identificables de terceros (familiares, contactos, ubicaciones) mencionados por el usuario al nombrar sus deudas o gastos fijos, no solo datos del propio usuario.
- Sin política de retención de conversaciones (Hallazgo 3), el historial de chat se convierte en el repositorio de datos financieros sensibles de mayor volumen y menor gobernanza del sistema, justo cuando el resto del diseño (allowlist, log sin texto, consentimiento revocable) se esfuerza por minimizar exactamente ese tipo de exposición.

## Fortalezas

- Trata el consentimiento como opt-in real (apagado por defecto), versionado, y revocable con caída inmediata a modo plantillas — no hay ambigüedad ni "opt-out disfrazado de opt-in".
- El diseño del log de auditoría (`AiInteractionLog` sin texto, solo grupos de campos) es una buena solución al problema de "cómo auditar sin duplicar el riesgo de guardar lo mismo dos veces".
- El criterio de allowlist (no blocklist) es la decisión de diseño correcta para este tipo de control — mucho más seguro por defecto que intentar enumerar exhaustivamente qué excluir.
- El modo sin IA como base funcional (no como degradación de emergencia) es coherente con el principio "determinismo primero" de ARQ-0001 y evita que el Copiloto dependa de que todo funcione para ser útil.
- Honestidad explícita en §17 sobre lo que este ARQ no resuelve (validación legal) — no intenta ocultar el bloqueo ni forzar una aprobación completa.
- Tool-use estrictamente de solo lectura, sin ninguna acción de escritura — respeta el límite de alcance frente a FIN-007 con disciplina.
- Reutiliza el patrón de gate técnico de producción ya aprobado en DEC-0004, en vez de inventar uno nuevo — consistencia entre ciclos.

## Oportunidades

- Extender expresamente el allowlist y el test de regresión de minimización para cubrir también las respuestas de las tools de solo lectura, no solo lo que construye el `ContextAssembler` directamente (podría resolverse haciendo que las propias tools llamen al `ContextAssembler` o a funciones que comparten el mismo allowlist, en vez de llamar a los servicios crudos).
- Excluir `Debt.name`/`FixedItem.name` del contexto, o sustituirlos por su `type`/categoría (ya presentes en el allowlist) más un identificador genérico ("tu deuda #1"), preservando la utilidad explicativa sin exponer texto libre.
- Definir una política de retención para `Conversation`/`Message`, y aclarar explícitamente si la revocación de consentimiento debe (o no) purgar el historial de chat.
- Especificar timeout y reintentos del cliente `fetch` hacia Anthropic.

## Observaciones críticas

- **Hallazgo 1** (tool-use como vía de contexto no cubierta por el allowlist/test de minimización): se eleva a observación crítica. Es una falla en el mecanismo que el propio documento presenta como su garantía central frente al mandato de DEC-0001 §10.6, y no se detecta por las pruebas que el propio ARQ propone.
- **Hallazgo 2** (`Debt.name`/`FixedItem.name` de texto libre permitidos pese al mismo criterio que excluye `Transaction.note`): se eleva a observación crítica por ser una inconsistencia directa dentro del razonamiento del propio documento, no una omisión externa.

## Observaciones menores

- Hallazgo 3 (retención de `Conversation`/`Message`) es relevante pero de menor urgencia que 1 y 2, dado que ya existe consentimiento explícito para el contenido de la conversación en sí (el usuario sabe que está chateando con una IA); aun así debe resolverse antes de producción.
- Hallazgo 4 (timeout/retries del cliente fetch) es un detalle de robustez operativa razonable de resolver en la implementación, no en el ARQ.

## Recomendaciones

1. Rediseñar el flujo de tool-use para que sus resultados pasen por el mismo allowlist/`ContextAssembler` (o una función equivalente con el mismo test de regresión) antes de llegar al LLM, cerrando la segunda vía de contexto.
2. Retirar `Debt.name` y `FixedItem.name` del allowlist de §4.3, o sustituirlos por identificadores no libres (tipo + índice), consistente con la razón ya usada para excluir `Transaction.note`.
3. Definir una política de retención para `Conversation`/`Message`, incluyendo el efecto de la revocación de consentimiento sobre el historial ya almacenado.
4. Especificar timeout/reintentos del cliente `fetch` hacia la API de Anthropic.

## Priorización

| Recomendación | Clasificación |
|---|---|
| Cerrar la vía de tool-use en el allowlist/test de minimización (Rec. 1) | Debe hacerse antes del desarrollo — es condición de entrada del propio DEC-0001 §10.6 |
| Retirar o sustituir `Debt.name`/`FixedItem.name` del contexto (Rec. 2) | Debe hacerse antes del desarrollo |
| Política de retención de `Conversation`/`Message` (Rec. 3) | Debe hacerse antes de producción |
| Timeout/reintentos del cliente fetch (Rec. 4) | Puede resolverse durante la implementación |

## Veredicto

**REQUIERE AJUSTES.**

ARQ-0005 tiene una base sólida (consentimiento real, log auditable, modo sin IA, disciplina de alcance) y no debe descartarse ni reescribirse desde cero. Pero el mecanismo de minimización — la razón de ser de este ARQ frente al mandato de DEC-0001 §10.6 — tiene una vía no cubierta (tool-use) y una inconsistencia interna (`Debt.name`/`FixedItem.name` vs. `Transaction.note`) que deben corregirse en el propio ARQ antes de que el CTO pueda considerar cerrar ese punto del mandato, con independencia de que `DEC-0005` ya esté bloqueado por la validación legal pendiente. Recomiendo que la Arquitectura emita una revisión de §4.3/§4.5 (no necesariamente un ARQ nuevo) que incorpore las Recomendaciones 1 y 2 antes de que el CTO evalúe el resto del documento.

---
*Esta auditoría no implementa ni decide. Queda a la espera de la decisión oficial del CTO (`DEC-0005`), que además permanece bloqueado por la validación legal pendiente (DEC-0001 §10.7).*
