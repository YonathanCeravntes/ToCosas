# AUD-0005 v2 · Auditoría de ARQ-0005 v2 (Copiloto Financiero — reenvío tras DEC-0005 RECHAZADO)

- **Documento auditado:** `docs/arquitectura/ARQ-0005-Copiloto-Financiero.md` (versión 2, mismo número de ciclo por instrucción de `DEC-0005` §10)
- **Módulo/Feature:** FIN-005
- **Documentos base revisados:** `AUD-0005` (v1, veredicto REQUIERE AJUSTES), `DEC-0005` (RECHAZADO), `ARQ-0005 v2`
- **Referencia inmutable verificada:** `git show HEAD:backend/prisma/schema.prisma` para confirmar que `Debt.name`/`FixedItem.name`/`Category.name`/`Account.name`/`Asset.name` siguen siendo campos de texto libre sin restricción (no hay código de FIN-005 todavía que verificar — este ciclo sigue en fase de documento).
- **Fecha:** 2026-07-05
- **Auditor:** Auditor Oficial de Milla (rol de solo lectura)

> Esta auditoría no modifica el ARQ ni el código. Verifica punto por punto si `ARQ-0005 v2`
> cierra los 4 cambios obligatorios que `DEC-0005` exigió como condición de reenvío, antes
> de que el CTO considere un nuevo `DEC-0005`.

---

## Resumen Ejecutivo

`ARQ-0005 v2` responde directamente a los dos hallazgos que el CTO elevó a rechazo (no solo a "observación"): la segunda vía de contexto por tool-use y la inclusión de campos de texto libre (`Debt.name`/`FixedItem.name`) en el contexto del LLM. La corrección no es cosmética: el diseño ahora impide, por restricción de tipos más validación en runtime, que cualquier objeto crudo de `EngineService`/`HealthService`/`DebtsService` llegue al LLM — las tools solo pueden devolver "vistas minimizadas" tipadas construidas por el mismo `ContextAssembler`, y el test de regresión de minimización pasa a cubrir explícitamente esas 4 vistas con PII deliberadamente sembrada. Los nombres libres de deuda y gasto fijo se sustituyen por identificadores no libres con un mapeo reversible que vive solo en el servidor, y el mismo principio se extiende — con transparencia, marcado como "no exigido" y pendiente de ratificación — a categorías creadas por el usuario, cuentas y activos.

Las otras dos condiciones (retención de conversaciones y resiliencia del cliente Anthropic) también quedan resueltas con decisiones explícitas y razonadas, no como huecos dejados abiertos. Se verificó contra `schema.prisma` que los campos que el documento dice excluir (`Debt.name`, `FixedItem.name`, etc.) son efectivamente texto libre sin restricción, confirmando que la exclusión tiene sentido y no es un cambio cosmético sobre un campo que ya fuera seguro.

No se encuentran incumplimientos de los 4 cambios obligatorios de `DEC-0005`. Se identifica una observación menor nueva (asimetría de retención entre el log de auditoría y el contenido de las conversaciones) y una nota de disciplina a futuro (mantener la restricción de tipos cuando se añadan nuevas tools en ciclos posteriores).

## Verificación de los 4 cambios obligatorios de DEC-0005 §10

| # | Cambio exigido | Verificación |
|---|---|---|
| 1 | Cerrar la segunda vía de contexto: tools deben usar el mismo allowlist/`ContextAssembler`, con test que cubra sus salidas | ✅ Cumple — §4.3-A: 4 "vistas minimizadas" tipadas (`buildInitialContext`, `buildSnapshotView`, `buildDebtsView`, `buildScoreView`); el ejecutor de tools solo acepta estos tipos (restricción de tipos + validación en runtime, anticipando que TypeScript borra tipos en runtime); test de regresión serializa las 4 vistas con PII sembrada deliberadamente. |
| 2 | Retirar `Debt.name`/`FixedItem.name` del contexto | ✅ Cumple — §4.3: sustituidos por "deuda #N"/"gasto fijo #N" con mapeo reversible solo en servidor; extendido (con transparencia) a `Category.name` de usuario, `Account.name`, `Asset.name` en la lista de prohibidos. |
| 3 | Definir política de retención de `Conversation`/`Message` | ✅ Cumple — §4.7: decisión explícita y razonada (revocación de consentimiento ≠ borrado de historial; botón autónomo de borrado; purga de conversaciones inactivas a 24 meses). |
| 4 | Especificar timeout/reintentos del cliente Anthropic | ✅ Cumple — §4.8: timeout 30s, 1 reintento en red/5xx con backoff 1s, sin reintento en 429, circuit breaker de 5 fallos/5 min, fallback a plantilla con log de `llm_error`. |

**Conclusión de la verificación:** los 4 cambios obligatorios de `DEC-0005` están cerrados en el documento, no solo declarados.

## Hallazgos

1. **Asimetría de retención entre `AiInteractionLog` (12 meses) y `Conversation`/`Message` (24 meses, inactivas).** El contenido real de la conversación —que puede incluir detalles financieros que el usuario escribió con sus propias palabras— se retiene el doble de tiempo que el log de auditoría que sustenta la trazabilidad de minimización. El documento da una justificación razonable (el chat tiene utilidad continua para el usuario; el log es interno), pero al ser una decisión de privacidad, conviene que quede ratificada explícitamente por el CTO y no solo aceptada por default.
2. **Disciplina de extensión futura no garantizada estructuralmente.** La restricción "el ejecutor de tools solo acepta vistas minimizadas" depende de que cada tool nueva que se añada en ciclos futuros (p. ej. FIN-007, si en algún momento se relajara la restricción de solo-lectura) siga construyéndose sobre el mismo `ContextAssembler`. El diseño actual lo garantiza para las 3 tools de este ciclo, pero no hay, dentro del propio documento, una regla de gobernanza que obligue a los ARQ futuros a mantener el patrón (más allá de la buena práctica ya demostrada en este ciclo).

## Riesgos

- Ninguno de los dos hallazgos bloquea el cierre de este ciclo; son observaciones de higiene a mediano plazo, no defectos del mecanismo de minimización que motivó el rechazo anterior.
- El riesgo regulatorio y de validación legal (DEC-0001 §10.7) sigue vigente y es completamente independiente de esta corrección, tal como el propio ARQ y el DEC rechazado lo declaran.

## Fortalezas

- Corrección sustantiva, no cosmética: la restricción de tipos más validación en runtime en el ejecutor de tools cierra la vía de fuga de raíz, no solo en el caso de uso descrito — cualquier intento futuro de pasar un objeto crudo al LLM fallaría en runtime, no solo en la revisión de código.
- Anticipa correctamente la debilidad de TypeScript (los tipos se borran en runtime) y por eso añade validación en runtime además de la restricción de tipos — nivel de rigor mayor al mínimo exigido por el DEC.
- El mapeo reversible "deuda #N → id" resuelve la tensión entre privacidad (no enviar texto libre al LLM) y utilidad (la UI sigue mostrando el nombre real al usuario) sin sacrificar ninguna de las dos.
- Extiende proactivamente el principio a `Category.name`/`Account.name`/`Asset.name` sin que el DEC lo exigiera, y lo declara honestamente como pendiente de ratificación en vez de imponerlo silenciosamente — exactamente el tipo de transparencia que este proceso de gobernanza busca.
- La política de retención (§4.7) distingue con claridad dos derechos distintos del usuario (revocar el envío a un LLM vs. borrar su propio historial), en vez de conflar ambos en una sola palanca — diseño de privacidad más maduro que el original.
- El cliente Anthropic incorpora circuit breaker además de lo mínimo pedido (timeout/reintentos), previniendo colas de reintentos y costo innecesario ante incidentes del proveedor.
- Verificado contra `schema.prisma`: los campos que el documento excluye son, en efecto, texto libre sin restricción — la corrección resuelve un riesgo real, no uno hipotético.

## Oportunidades

- Que el CTO ratifique explícitamente la asimetría de retención (Hallazgo 1) en el DEC, en vez de dejarla como aceptada por default.
- Considerar, en `GOBERNANZA.md` o en una nota de FIN-006/FIN-007, una regla explícita de que toda tool de LLM futura debe construirse sobre vistas minimizadas del módulo correspondiente — capitalizando la buena práctica de este ciclo como estándar, no como excepción de un módulo.

## Observaciones críticas

Ninguna. Los dos hallazgos que motivaron el rechazo de la versión anterior están cerrados con un diseño verificablemente más sólido, no con una respuesta superficial.

## Observaciones menores

- Hallazgo 1 (asimetría de retención) y Hallazgo 2 (disciplina de extensión futura) son observaciones de gobernanza a mediano plazo, no defectos de este ARQ ni condiciones para su aprobación.

## Recomendaciones

1. Ratificar explícitamente en el DEC la asimetría de retención entre `AiInteractionLog` (12 meses) y `Conversation`/`Message` (24 meses).
2. Registrar en `GOBERNANZA.md` (o en la próxima ARQ que introduzca tools de LLM) la obligación de construir cualquier tool sobre vistas minimizadas, como estándar derivado de este ciclo.

## Priorización

| Recomendación | Clasificación |
|---|---|
| Ratificar la asimetría de retención (Rec. 1) | Puede resolverse en el propio DEC-0005 (no requiere volver al ARQ) |
| Regla de gobernanza para tools futuras (Rec. 2) | Puede esperar al ciclo de FIN-006/FIN-007 |

## Veredicto

**APROBADO CON OBSERVACIONES.**

`ARQ-0005 v2` cierra íntegramente los 4 cambios obligatorios de `DEC-0005 §10`, con correcciones sustantivas verificadas contra el estado real del esquema de datos, no solo declaradas. El mecanismo de minimización que motivó el rechazo anterior ahora es demostrable por diseño (restricción de tipos + validación en runtime + test sobre las 4 vistas), no solo por intención. Las dos observaciones nuevas son de gobernanza y no bloquean el avance. Recuerdo, como ya hizo el propio ARQ en su §17, que la validación legal del encuadre regulatorio (DEC-0001 §10.7) sigue pendiente y es una condición completamente independiente de este informe: aunque el CTO acepte este ARQ, `DEC-0005` no debe autorizar código hasta que esa validación exista.

---
*Esta auditoría no implementa ni decide. Queda a la espera de la decisión oficial del CTO (`DEC-0005`, todavía bloqueado por la validación legal pendiente de DEC-0001 §10.7).*
