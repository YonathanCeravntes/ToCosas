# IMP-0028 · Gestión integral del ciclo de vida de movimientos

- **Versión:** 1.0
- **Fecha:** 2026-07-13
- **Autor:** Agente Arquitecto/Desarrollador
- **Estado:** Entregado — en rama de trabajo, para VALIDACIÓN e integración del CTO (§36.2)
- **Historial de cambios:**
  - v1.0 (2026-07-13) — emisión tras DEC-0028 (los 4 cambios obligatorios honrados).
- **Módulo/Feature:** FIN-028 · **Origen (§27):** Instrucción del Fundador · Prioridad Alta
- **Documentos base:** `ARQ-0028` v1.0 · `AUD-0028` · `DEC-0028` (§5.1 corrección de
  diseño) · 10 decisiones del Fundador
- **Referencia inmutable (regla GOBERNANZA):** commit
  **`65104e1d38b3ba84efdd9fa6f4db7db54deb7824`**

## 1. Resumen

El bug de raíz está cerrado: editar y anular un movimiento ahora emiten eventos
de dominio por el outbox y el Motor recalcula todo lo derivado. La anulación es
`deletedAt` — **sin** estado nuevo, acatando la corrección §5.1 del DEC (mi ARQ
proponía `anulada`/`voidedAt`; el CTO tenía razón: sería un tercer concepto de
anulación). Anular un pago de deuda revierte el saldo de forma atómica. Corregir
es ahora tan fácil como registrar (DEC-028-010).

## 2. Cumplimiento (DEC-0028)

| Pieza | Implementación | Verificación |
|---|---|---|
| **P1 — eventos** | `update`/`remove` envueltos en el patrón outbox (misma tx de BD); emiten `TransactionUpdated`/`TransactionDeleted`; el `EngineListener` ya los escuchaba | e2e "editar recalcula las métricas persistidas" (2.5M→2.2M sin intervención) |
| **§5.1 — anular = `deletedAt`** | Cero estado nuevo; `remove` conserva su `deletedAt`; la etiqueta "anulado" se deriva | e2e: el anulado sigue en BD con `deletedAt != null` y `status='confirmada'` (no se inventó `anulada`) |
| **P6 — guardarraíl deuda** | `DEBT_LOCKED_FIELDS` (monto/fecha/tipo/deuda): editar en sitio un pago de deuda → 400; anular un pago REVIERTE el saldo (`+amount`, `pagada→activa`) atómico + `DebtUpdated` | e2e: 400 al editar monto; nota sí; reverso 1.7M→2.0M; captura del modal con la nota como único campo |
| **P5 — evento rico** | `diffTransaction`: `changedFields` + `before`/`after` de campos ESTRUCTURADOS; `note`/`rawMessage` excluidos (minimización pre-IA) | unit (5 casos): note nunca en el diff; valor igual no cuenta como cambio |
| **§5.2 — `ACTIVE_TX_FILTER`** | Fragmento exportado, aplicado SOLO a las consultas de `Transaction` del servicio (findAll/findOne); los ~97 `deletedAt: null` de otros modelos intactos | Diff acotado (verificable) |
| **P4 — servicio central** | `undoLast` de mensajería reencaminado a `transactions.remove` (antes escribía directo — segundo incumplimiento §32 muerto) | Diff de `conversation.service.ts` |
| **P2/P3 UX** | Filas de "Movimientos recientes" del Inicio tocables → `EditTransactionModal` (monto/fecha/nota + Anular con confirmación DEC-028-003); la vista ejecutiva FIN-018 no cambia de forma | Captura del modal |

## 3. Suites y evidencia

- Unitaria **331/331** (+5 del diff). E2E **27/27** (+4: recompute por edición,
  anulado excluido + `deletedAt`, reverso de saldo, guardarraíl 400). `tsc`
  limpio en ambos lados. Migración: **ninguna** (§5.1 la eliminó).
- Capturas (`docs/producto/capturas/fin-028/`): Inicio con Movimientos; modal
  abierto sobre un pago de deuda mostrando el guardarraíl P6 (solo nota
  editable + Anular).

## 4. Juicio razonado

**¿Registrar dejó de ser una sentencia? Sí, y sin romper el §32:** la corrección
del CTO (anular = `deletedAt`) evitó exactamente el bug que esta línea de FIN
viene cazando — un tercer concepto de anulación. El resultado es más pequeño y
más correcto que mi ARQ. El bug real (mutaciones mudas para el Motor) está
cerrado con evidencia e2e de recálculo automático, y anular un pago de deuda ya
no deja el saldo mentiroso.

**Reservas honestas (declaradas):** (1) **`next_due_date` tras anular un pago de
deuda no se reconstruye** — el reverso restaura saldo y estado, pero no la fecha
previa (no la inventamos; el próximo pago la re-ancla vía FIN-018). Es la
limitación de mayor peso y la señalo para que el Auditor decida si basta en la
iteración 1 o exige una pieza de reconstrucción de fecha; (2) la UX vive en las
filas del Inicio porque **no existe una pantalla de lista completa de
movimientos** — el DEC asumía una ("lista existente") que en el frontend no
está; el modal es su casa natural hoy, pero una pantalla dedicada de
Movimientos es candidata de follow-up; (3) el modal edita monto/fecha/nota;
categoría y cuenta quedan como extensión (los campos de mayor uso —el ejemplo
"mercado 180k→165k" del DEC— están cubiertos).

## 5. Para la validación

- Reproducir: `npx jest` (331) · `npm run test:e2e` (27, docker) · `npx tsc
  --noEmit` (ambos).
- Grep §32: mutaciones de Transaction solo por el servicio central; `undoLast`
  migrado; `ACTIVE_TX_FILTER` solo en Transaction.
- Capturas: `docs/producto/capturas/fin-028/` (`capture-fin028.js`).
- Entregado en rama de trabajo (§36.2): el CTO valida (testing §36.3) e integra.
