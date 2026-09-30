# AUD-0028 · Gestión integral del ciclo de vida de movimientos

- **Documento auditado:** `docs/arquitectura/ARQ-0028-Gestion-de-Movimientos.md` v1.0 (commit `7cdbdf0`)
- **Insumos:** `docs/correspondencia/FIN-028-Gestion-de-Movimientos.md` (DEC-028-001…010) · `GOBERNANZA.md` v3.14 §31/§32/§36 · código verificado contra `HEAD`
- **Realiza:** Auditor de Milla
- **Fecha:** 2026-07-13

---

## 1. Resumen Ejecutivo

`ARQ-0028` da al dato primario del producto (el movimiento) un ciclo de vida completo —
anulación lógica, edición, recálculo automático — y de paso mata **dos incumplimientos
reales y activos** que verifiqué contra código. Es el más urgente de los tres frentes: hoy
una corrección no recalcula nada. Diseño sólido, honra las 10 DEC-028. Sin hallazgos
bloqueantes.

## 2. Los dos incumplimientos — CONFIRMADOS reales

1. **`update`/`remove` no emiten eventos** (`transactions.service.ts:160-178`): ambos
   escriben directo en Prisma (`prisma.transaction.update`) **sin `outbox.withEvent`**, a
   diferencia del alta. Consecuencia verificada: el `EngineListener` **ya escucha**
   `transaction.created/updated/deleted` (`engine.listener.ts:24-26`) — hay listener, pero
   **nunca llega el evento**, así que tras una corrección el Score/métricas persistidas/
   fondo/insights quedan sobre el dato viejo hasta el job nocturno. DEC-028-005/006
   incumplidas de raíz. Real.
2. **`undoLast` fuera del servicio central** (`conversation.service.ts:186`): la mensajería
   tiene su propia ruta de mutación. Segundo camino de escritura — la clase de dualidad que
   §32 combate. Real.

**Fortaleza del diseño derivada:** como el listener ya existe, la corrección es mínima —
**emitir** los eventos (el emisor es lo que falta, no el consumidor) + extender el listener
solo a `voided`. El recálculo (~25 s, límite ya aceptado `DEC-0021` §4.2) cubre todo lo
derivado porque el Motor es la fuente de las métricas persistidas (FIN-021).

## 3. Diseño por pieza

- **P1 anulación (`status:'anulada'` + `voidedAt`):** correcto. El enum `TxStatus`
  (confirmada/pendiente_confirmacion/descartada, `schema.prisma:80`) admite `ADD VALUE`
  (patrón FIN-023); las rutas críticas (teQueda, home, Motor) ya filtran por
  `status:'confirmada'`, así que los anulados quedan excluidos **por el mecanismo
  existente**, no por lógica nueva. Semántica explícita y recuperable (DEC-028-001).
- **P2 evento rico (before/after, changedFields, source):** correcto y previsor — deja la
  forma que DEC-028-004/008 exigen sin rediseñar BD después. Minimización bien cuidada:
  `note`/`rawMessage` FUERA del payload (los eventos podrían fluir a IA — regla FIN-005).
  El `IMP` debe fijar por test que esos campos no viajan.
- **P3 servicio central único:** `TransactionsService` ya es el punto de entrada real; se
  formaliza y `undoLast` **se migra** a él (cierra el 2º incumplimiento). Criterio de grep
  correcto.
- **P4 `ACTIVE_TX_FILTER` compartido:** reemplazo mecánico de los ~24 filtros
  `deletedAt:null` repetidos (confirmé 24 archivos). **Es el mayor riesgo de regresión**
  (§5).
- **P5 UX:** acierto clave — los movimientos de flujos especiales (pago de deuda `debtId`,
  abonos FIN-012) son editables solo en campos NEUTROS; monto/fecha/tipo **se anulan-y-
  recrean**, porque editar el monto de un pago de deuda sin recomputar la deuda dejaría el
  saldo mentiroso. La alternativa (revertir en el Motor desde la mutación) está
  correctamente rechazada por meter lógica financiera en la mutación (viola DEC-028-006).

## 4. Observaciones (no bloqueantes)

1. **Riesgo de regresión del reemplazo de filtros (P4):** los ~24 filtros no son todos
   idénticos — algunas consultas deben incluir `pendiente_confirmacion` y otras no. El
   fragmento `ACTIVE_TX_FILTER` (y su variante) debe mapearse consulta por consulta, no
   con un reemplazo ciego; la Validación debe confirmar por diff que ninguna consulta
   cambió su semántica de estado. La suite (326+) y el grep son la red, pero este punto
   merece revisión manual del diff en el `IMP`.
2. **Anulación retroactiva mueve cifras históricas** (Score/series del mes): declarado,
   mismo tratamiento que la mora retroactiva de FIN-024 — a narrar con insights de cambio
   de banda, a mirar en RC.
3. **Coordinación 028↔029:** verificado consistente — ambos ARQ referencian
   `TransactionsService` como la única ruta de mutación; FIN-029 la invoca, no crea una
   segunda. Alineados.

## 5. Filtro §31 y experiencia (§28-29)

- **§31:** sustantiva — "ningún registro es una sentencia; corregir es parte de registrar".
  Es el ciclo de vida del dato del que todas las experiencias viven. Cumple.
- **§28-29:** el copy dice "anular", no "eliminar" (verdad del sistema, prepara la
  recuperación futura); confirmación previa (DEC-028-003, patrón payoff FIN-012). Sin
  jerga nueva.

## 6. Veredicto

**APROBADO CON OBSERVACIONES.**

El más urgente y sólido de los tres frentes: corrige dos incumplimientos reales y activos
(mutaciones sin evento; `undoLast` fuera del servicio) con cambio mínimo (el listener ya
existe — falta emitir), da anulación lógica recuperable y una sola ruta de mutación. La
única observación con peso es el reemplazo de los ~24 filtros (P4): debe mapearse consulta
por consulta y verificarse por diff en la Validación, no aplicarse a ciegas. Ninguna
observación exige rehacer el diseño.
