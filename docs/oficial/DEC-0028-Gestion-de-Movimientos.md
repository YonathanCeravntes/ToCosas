# DEC-0028 · Gestión integral de movimientos

- **Versión:** 1.0
- **Fecha:** 2026-07-13
- **Autor:** CTO (Claude)
- **Estado:** Emitida — habilita `IMP-0028`
- **Base:** `ARQ-0028` v1.0 (`7cdbdf0`) · `AUD-0028` (APROBADO CON OBSERVACIONES) · 10 decisiones del Fundador (`docs/correspondencia/FIN-028-Gestion-de-Movimientos.md`)

---

## 0. Verificación independiente previa (CTO)

No firmo sobre el reporte del Arquitecto/Auditor. Verifiqué contra el código real
(`backend/src/modules/transactions/transactions.service.ts`, `prisma/schema.prisma`,
`modules/events/domain-events.ts`, `financial-engine/engine.listener.ts`):

1. **Bug confirmado (evento faltante).** `update()` (`:160-168`) y `remove()`
   (`:171-178`) escriben directo con `prisma.transaction.update`, **sin outbox**.
   `create()` sí emite (`:110-114`, patrón FIN-002). Los tipos `transaction.updated` y
   `transaction.deleted` **ya existen** (`domain-events.ts:14-15`) y el Motor **ya los
   escucha** (`engine.listener.ts:24-26`) — el listener espera eventos que hoy nunca se
   disparan. La corrección es mínima: envolver ambas mutaciones en `outbox.enqueue`.
2. **La anulación lógica YA EXISTE.** `remove()` no borra físicamente: hace
   `deletedAt: new Date()` (`:175`). El modelo `Transaction` tiene `deletedAt`
   (`schema.prisma`), y **97** filtros `deletedAt: null` en el código ya excluyen los
   anulados de los cálculos. La `DEC-028-001` (eliminación lógica, preservada, excluida,
   recuperable) está **estructuralmente satisfecha por `deletedAt`**.
3. **`descartada` está dormante.** El enum `TxStatus` es
   `confirmada|pendiente_confirmacion|descartada`; `descartada` no se usa en ningún flujo
   (solo un comentario en `retention.job.ts`).
4. **`undoLast` escribe por fuera.** `conversation.service.ts:186` — confirmado.

## 1. Resumen ejecutivo

Se aprueba la gestión integral de movimientos honrando las 10 decisiones del Fundador,
**con una corrección de diseño de peso** respecto del `ARQ-0028`: la anulación **no**
introduce un mecanismo nuevo — reutiliza el `deletedAt` que ya existe. El núcleo técnico
es cerrar el bug del evento faltante para que el Motor recalcule (DEC-028-005/006). Cero
lógica financiera en la mutación.

## 2. Decisiones aprobadas

- **P1 · Emisión de eventos en `update`/`remove`** (cierra el bug, DEC-028-005/006).
  Ambas mutaciones se envuelven en el patrón outbox (misma transacción de BD, como
  `create`), emitiendo `TransactionUpdated` / `TransactionDeleted`. El recálculo de
  **todo lo derivado** sale del listener del Motor ya existente — no de la mutación.
- **P2 · Edición amplia** (DEC-028-002): campos editables fecha, valor, categoría,
  subcategoría, cuenta, descripción, etiquetas, observaciones. La mutación solo cambia el
  registro y emite el evento.
- **P3 · UX rápida + confirmación** (DEC-028-003/007): flujo mínimo Editar→Guardar;
  diálogo de confirmación **solo** en la anulación.
- **P4 · Servicio central único** (DEC-028-009): la edición/anulación vive en el servicio
  de dominio de transacciones; es el **único** punto de entrada. `undoLast` de mensajería
  se reencamina a él (liga con `ARQ-0029` — el motor conversacional lo invoca, no
  reimplementa).
- **P5 · Evento rico para auditoría/IA** (DEC-028-004/008): el payload del evento lleva
  `changedFields` + `before`/`after` estructurados (no texto libre). Con eso el historial
  de auditoría y el aprendizaje futuro del Copiloto son reconstruibles **sin rediseñar la
  BD** — la forma vive en el evento, no en columnas nuevas.
- **P6 · Guardarraíl de movimientos ligados a deuda** (DEC-028-006): editar monto/fecha
  de un pago de deuda en sitio dejaría el saldo mentiroso; esos campos se **anulan y
  recrean** (el recompute lo hace el Motor por evento), nunca lógica financiera dentro de
  la mutación. Campos neutros (nota, etiquetas, categoría) sí editables en sitio.

## 3. Cambios obligatorios (§5)

1. **NO se añade el estado `anulada` ni el campo `voidedAt`.** La anulación **es**
   `deletedAt` (único mecanismo). Razón: `deletedAt` ya implementa borrado lógico
   recuperable y ya está excluido por 97 filtros; sumar `anulada`/`voidedAt` crearía un
   **tercer** concepto de anulación junto a `deletedAt` y al dormante `descartada` —
   violación directa de §32 (única definición por concepto). El argumento del ARQ
   ("`deletedAt` mata la recuperación futura") es incorrecto: `deletedAt = null` es
   precisamente la recuperación. La etiqueta "Anulado" que ve el usuario se **deriva** de
   `deletedAt != null`, no es un enum nuevo.
2. **`ACTIVE_TX_FILTER` con alcance acotado y verificado por diff.** Se aprueba extraer el
   filtro compartido, **pero solo** sobre consultas del modelo `Transaction`. Los 97
   `deletedAt: null` del repositorio abarcan otros modelos (accounts, debts, categories,
   etc.) — **prohibido** reemplazarlos a ciegas. El IMP debe mapear consulta por consulta
   y el CTO lo verificará por diff (observación del Auditor, elevada a condición).
3. **Impacto retroactivo declarado.** Anular un movimiento antiguo mueve cifras
   históricas — se declara abiertamente (mismo trato honesto que la mora de FIN-024), no
   se esconde.
4. **Sin tocar infraestructura validada** (Render/Neon/Expo/EAS Update) y sin encender
   nada del gate DPA+PIA (los eventos de IA se preparan, no se consumen).

## 4. Observaciones aceptadas

- El Auditor y el Arquitecto coinciden (y el CTO concuerda) en la secuencia de IMP
  **028 → 027 → 029**: 028 corrige un bug activo y es prerequisito de 029.
- Los tests: al tocar el patrón outbox y los filtros, el IMP debe incluir pruebas de que
  `update`/`remove` emiten el evento y de que el listener recalcula; regresión de que un
  movimiento anulado desaparece de dashboards/presupuesto/Salud.

## 5. Próximos pasos

`IMP-0028` habilitado con los 4 cambios obligatorios. El Arquitecto entrega en rama de
trabajo con su SHA; el CTO valida (testing §36.3: unit/e2e/tsc) e integra (§36.2). No se
abre `IMP-0027` ni `IMP-0029` hasta cerrar `IMP-0028` (un FIN a la vez para implementación).
