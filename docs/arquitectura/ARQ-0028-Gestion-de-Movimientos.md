# ARQ-0028 · Gestión integral del ciclo de vida de movimientos

- **Versión:** 1.0
- **Fecha:** 2026-07-13
- **Autor:** Agente Arquitecto
- **Estado:** Emitido — para validación del CTO y pase a AUD-0028 (flujo §36.2)
- **Historial de cambios:**
  - v1.0 (2026-07-13) — emisión tras el levantamiento de la retención (las 10
    decisiones del Fundador son requisitos vinculantes).
- **Módulo/Feature:** FIN-028 · **Origen (§27):** Instrucción del Fundador ·
  Prioridad Alta
- **Documentos base:** `docs/correspondencia/FIN-028-Gestion-de-Movimientos.md`
  (DEC-028-001…010) · GOBERNANZA v3.14 §31/§32/§36 · patrón outbox FIN-002

## 0. Intención

Que corregir sea tan fácil como registrar (DEC-028-010): editar o anular un
movimiento sin miedo, con todas las cifras derivadas actualizándose solas y con
la historia íntegra para siempre.

## 1. Objetivo

Anulación lógica + edición completa sobre **un** servicio central de
movimientos, con recálculo automático vía el bus de eventos existente y un
modelo de eventos listo para auditoría e IA futuras — las 10 DEC-028 honradas.

## 2. Problema (verificado contra código — dos incumplimientos REALES hoy)

1. **Editar y eliminar NO emiten eventos de dominio**
   (`transactions.service.ts:160-178`: `update` y `remove` escriben directo en
   Prisma, sin `outbox.withEvent` — a diferencia del alta). Consecuencia: el
   Motor NO recalcula tras una corrección — Score, métricas persistidas, fondo,
   insights y recomendaciones quedan calculados sobre el dato viejo hasta el
   job nocturno. DEC-028-005/006 incumplidas de raíz.
2. El "eliminar" actual es `deletedAt` (soft) pero **sin estado, sin evento y
   sin distinción semántica** entre "anulado por la usuaria" y limpieza
   técnica; el filtro `deletedAt: null` está repetido literalmente en ~25
   consultas (grep) — cada query nueva puede olvidarlo (la clase de riesgo que
   §32 combate).
3. La edición desde la UI ni existe como pantalla (solo el endpoint PATCH); los
   canales conversacionales solo saben deshacer EL último movimiento
   (`undoLast`).

## 3. Alcance

Backend: estado `anulada` + eventos de mutación + servicio central formalizado
+ filtro compartido + listener del Motor verificado. Frontend: edición rápida y
anulación con confirmación desde Movimientos. **Fuera (declarado):** historial
visible al usuario (DEC-028-004: solo el MODELO queda listo), consumo de los
eventos por el Copiloto (DEC-028-008: solo la forma del evento), los comandos
conversacionales de edición (viven en FIN-029 — este ARQ deja el servicio
listo), recuperación de anulados en UI (semilla).

## 4. Diseño — alternativas por pieza

### P1 — Anulación lógica (DEC-028-001/003)

| | **Alt A — `status: 'anulada'` + `voidedAt` (recomendada)** | **Alt B — Reutilizar `deletedAt` como anulación** |
|---|---|---|
| Qué es | `TxStatus` gana `anulada` (el enum ya existe: confirmada/pendiente_confirmacion/descartada — migración `ADD VALUE`); `voidedAt` timestamp; `deletedAt` conserva su semántica actual (técnica/legacy) | Declarar que `deletedAt` ES la anulación |
| Ventajas | Semántica explícita y consultable ("mis anulados" recuperables en el futuro — DEC-028-001 lo pide); el dominio YA filtra por `status: 'confirmada'` en las rutas críticas (teQueda, home, Motor) → los anulados quedan excluidos POR el mismo mecanismo | Cero migración |
| Desventajas | Migración de enum (trivial, patrón FIN-023) | "Anulado" y "borrado técnico" indistinguibles para siempre; imposible listar/recuperar sin arqueología |

Confirmación previa (003): diálogo nativo "¿Anular este movimiento?
Cancelar / Anular" — mismo patrón del payoff de FIN-012. El copy dice "anular",
no "eliminar": es la verdad del sistema y prepara la recuperación futura.

### P2 — Mutaciones sin lógica financiera + eventos (DEC-028-002/005/006/008)

| | **Alt A — `outbox.withEvent` con evento rico (recomendada)** | **Alt B — Emitir evento "algo cambió" sin detalle** |
|---|---|---|
| Qué es | `update` y `void` del servicio central envuelven la escritura en el outbox (patrón FIN-002, idéntico al alta) emitiendo `transaction.updated`/`transaction.voided` con payload: `{ userId, txId, source (app/telegram/whatsapp), changedFields, before: {campo: valor}, after: {campo: valor}, occurredAt }` | Solo `{ userId, txId }` |
| Ventajas | El Motor recalcula igual (solo necesita el userId), pero el evento ya tiene la forma que DEC-028-004/008 exigen: un historial futuro se reconstruye del log de eventos SIN rediseñar BD, y el Copiloto podrá narrar "cambiaste el mercado de 180k a 165k" | Menos payload |
| Desventajas | Payload mayor en `domain_events` (aceptable: texto corto) — `rawMessage` y notas quedan FUERA del payload (minimización: los eventos podrían fluir a IA después) | Habría que rediseñar el evento cuando llegue la auditoría — exactamente lo que 004 prohíbe |

La mutación NO recalcula nada (006): el `EngineListener` existente ya escucha
`transaction.*` — se verifica y extiende a `voided`; el recálculo (005) sale de
ahí (~25 s, límite ya aceptado en DEC-0021 §4.2) y cubre TODO lo derivado
porque el Motor es la fuente de las métricas persistidas (FIN-021).

### P3 — Servicio central único (DEC-028-009, liga con FIN-029)

`TransactionsService` YA es el punto de entrada real (UI y
`ConversationService` lo consumen — verificado). Se FORMALIZA: `update` y
`void` son las únicas rutas de mutación; el controller y cualquier canal
conversacional las invocan tal cual. Criterio verificable: grep — ninguna otra
ruta escribe `transaction.update/delete` fuera del servicio (hoy `undoLast` de
mensajería escribe directo: **se migra al servicio central** — segundo
incumplimiento §32 que esta FIN corrige de paso).

### P4 — Filtro compartido por construcción

Fragmento exportado `ACTIVE_TX_FILTER = { deletedAt: null, status: 'confirmada' }`
(y variante que incluye `pendiente_confirmacion` donde aplique) consumido por
las consultas de dominio — reemplazo mecánico de los ~25 filtros repetidos, con
grep de criterio: cero `deletedAt: null` literales en consultas de Transaction
fuera del fragmento. (Lecturas administrativas/sync declaradas aparte.)

### P5 — UX (DEC-028-002/007)

Desde Movimientos (lista completa existente): tap → hoja de edición con los
campos de DEC-028-002 (fecha, valor, categoría, cuenta, nota, etiquetas) →
Guardar → recarga. Anular vive dentro de la misma hoja (acción secundaria, con
confirmación 003). Sin formularios nuevos de varias pantallas. Los movimientos
generados por flujos especiales (pago de deuda con `debtId`, abonos FIN-012)
son editables en campos NEUTROS (nota, categoría, etiquetas) pero **monto/
fecha/tipo se anulan-y-recrean** en vez de editarse — editar el monto de un
pago de deuda sin recomputar la deuda dejaría el saldo mentiroso; la anulación
dispara la reversión correcta vía evento. Alternativa (editar todo y revertir
en el Motor) rechazada: mete lógica financiera en la mutación (viola 006).

## 5. Respuesta al filtro §31

Sin esta capacidad, cada error de dedo es deuda permanente: la usuaria aprende
a NO registrar (mata el hábito que sostiene todo el producto) o vive con cifras
falsas que Salud/Presupuesto/Score amplifican. Ninguna otra experiencia puede
absorberla: es el ciclo de vida del dato primario del que TODAS viven. Valor
diferencial: **la confianza de que ningún registro es una sentencia — corregir
es parte de registrar.**

## 6. Componentes
Backend: migración de enum + `voidedAt`, `TransactionsService.update/void` con
outbox, evento rico, `ACTIVE_TX_FILTER`, migración de `undoLast` al servicio,
listener verificado, tests (unit de eventos/filtro + e2e: editar → métrica
persistida recalculada; anular → excluido de teQueda/home/Motor; regresión).
Frontend: hoja de edición + anulación con confirmación en Movimientos.

## 7. Base de datos
`ALTER TYPE "TxStatus" ADD VALUE 'anulada'` + columna `voided_at` (nullable).
Sin backfill.

## 8. Backend
Sin cambios al Motor salvo escuchar `voided`; cero lógica financiera nueva en
mutaciones (006 por construcción).

## 9. Uso de IA
Ninguno (los eventos quedan CON FORMA para IA futura; no se consumen).

## 10. Riesgos
- **Anulación retroactiva mueve cifras históricas** (Score/series del mes
  re-calculadas — declarado como exigió la directiva, mismo tratamiento que la
  mora retroactiva de FIN-024): es la verdad corregida; los insights de cambio
  de banda narran el movimiento.
- Reemplazo mecánico de ~25 filtros: riesgo de regresión — mitigado por la
  suite completa (326+) y el criterio de grep.
- Eventos con before/after: cuidar que `note`/`rawMessage` NO viajen en el
  payload (minimización pre-IA) — solo campos estructurados.

## 11. Dependencias
Outbox FIN-002 (existente), Motor FIN-003/021 (listener), FIN-029 (consumirá el
servicio central — coordinado: UN servicio, cero segunda lógica).

## 12. Impacto
El dato primario del producto gana ciclo de vida completo con una sola ruta de
mutación, un solo filtro y recálculo automático — y dos incumplimientos reales
de hoy (mutaciones sin evento; `undoLast` por fuera del servicio) mueren.

## 13. Criterios de aceptación
1. Editar un movimiento actualiza las métricas PERSISTIDAS del Motor sin
   intervención (e2e con recompute por evento).
2. Anular excluye el movimiento de teQueda, home, Presupuesto y Motor (e2e) y
   el registro sigue en BD con `status='anulada'` + `voidedAt`.
3. Grep §32: mutaciones solo vía servicio central; filtros solo vía fragmento;
   `undoLast` migrado.
4. El evento persistido permite reconstruir qué cambió (before/after) sin
   campos de texto libre.
5. Confirmación previa a anular capturada; edición rápida capturada
   (antes/después de una corrección visible en Inicio).
6. Suites + typecheck + build + migración (§36.3). Filtro §31 (§5).

## 14. Plan
1. Validación CTO → AUD-0028 → DEC-0028 → 2. migración + servicio central +
eventos → 3. filtro compartido + listener → 4. UI → 5. capturas/tests →
6. IMP-0028 (secuencia de IMPs la fija el CTO) → validación → cierre.
