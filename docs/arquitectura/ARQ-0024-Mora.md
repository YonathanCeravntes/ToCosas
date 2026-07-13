# ARQ-0024 · Mora de deudas — visibilidad y conciliación (iteración 1)

- **Versión:** 1.0
- **Fecha:** 2026-07-13
- **Autor:** Agente Arquitecto
- **Estado:** Emitido — para AUD-0024
- **Historial de cambios:**
  - v1.0 (2026-07-13) — emisión con el alcance fijado en el hilo: P1+P2+P3;
    P4 (notificación) fuera por decisión del CPSAO, fast-follow agendado.
- **Módulo/Feature:** FIN-024 · **Origen (§27):** Dominio diferido 3 veces
  (ARQ-0018 §4.9, ARQ-0020 §4.1-bis, FIN-022 P4), activado por el CPSAO
- **Documentos base:** `COMPRENSION-FIN024-Mora.md` v1.0 · hilo FIN-024 ·
  GOBERNANZA §29/§31/§32

## 0. Intención

Que Milla hable exactamente cuando más cuesta su silencio: el día después de un
vencimiento sin pago — con estado visible, "hace cuánto" y la acción correcta al
lado, sin regañar (§29.2).

## 1. Objetivo

1. **P1:** un solo escritor de `debt.nextDueDate` (semántica FIN-018: avanza al
   PAGAR) — el cron de recordatorios deja de moverla al vencer.
2. **P2:** estado de mora DERIVADO en lectura para deudas (vencida + hace N
   días) visible en la lista y el detalle, con CTA doble de conciliación
   (registrar el pago / abonar).
3. **P3:** Score/Salud intactos; semilla registrada.

## 2. Problema

Verificado en `COMPRENSION-FIN024` (y confirmado por el CTO contra código):
`reminders.service.ts:158-172` escribe `debt.nextDueDate = +1 mes` cuando llega
el vencimiento, se haya pagado o no — con el cron activo la mora es
estructuralmente indetectable y el recordatorio de una cuota impaga se silencia
solo. Además, tras FIN-018 nada sincroniza `reminder.dueDate` cuando el pago
adelanta la fecha real: el recordatorio puede avisar de una cuota ya cubierta.
Y no existe ningún camino post-vencimiento: ni estado, ni "hace N días", ni CTA.

## 3. Alcance

Backend: `reminders.service` (P1) + estado derivado en el list/summary de
Deudas + tests. Frontend: etiqueta de estado en la tarjeta (upgrade del
"(ya pasó)" de FIN-022 P4) + bloque de conciliación en el detalle. **Fuera
(declarado):** fijos (siguen con "ya pasó su fecha"; conciliación
`fixedItemId` = mejora futura registrada), Score/Salud (P3), notificación
post-vencimiento (P4 — fast-follow del CPSAO), `SpendableService` §4.1-bis
(mora informa, no recalcula lo comprometido — fijado por el CTO), interés de
mora/cálculo de sanciones (no inventamos números que no conocemos).

## 4. Diseño — alternativas por pieza

### P1 — Escritor único de `nextDueDate`

| | **Alt A — El recordatorio de deuda DERIVA su fecha de la deuda (recomendada)** | **Alt B — Solo borrar la escritura y sincronizar `reminder.dueDate` al pagar** |
|---|---|---|
| Qué es | `dispatchDue` deja de escribir en `debt.nextDueDate` Y, para recordatorios con `debtId`, evalúa `shouldFireToday` contra el **`nextDueDate` actual de la deuda** (join que ya carga) — `reminder.dueDate` deja de ser autoritativo para deudas | Quitar la escritura a `debt` y agregar un sync de `reminder.dueDate` en el flujo de pago (FIN-018) |
| Ventajas | UNA fecha por deuda en todo el sistema (la de FIN-018) — el recordatorio no puede desincronizarse NUNCA; corrige de paso el bug latente de "recordatorio de cuota ya pagada" (hoy nada sincroniza al pagar); cero migración | Cambio más pequeño en reminders |
| Desventajas | El roll mensual del recordatorio desaparece: si el usuario NO paga, no hay nueva fecha y el recordatorio calla tras el vencimiento (comportamiento DECLARADO — el aviso post-vencimiento es exactamente P4) | Tercer punto de escritura para mantener dos copias de la misma fecha — la clase de dualidad que esta FIN viene a matar |

Los recordatorios manuales (sin `debtId`) no cambian.

### P2 — Estado de mora derivado + conciliación (solo deudas)

| | **Alt A — Derivado en el backend, un solo helper (recomendada)** | **Alt B — Derivar en el frontend (hoy − fecha)** |
|---|---|---|
| Qué es | Util puro `overdueDays(nextDueDate, today)` en el módulo de deudas; el list y el summary exponen `overdueDays` (null si no vencida) — la pantalla solo PINTA | Cada pantalla calcula la resta |
| Ventajas | El concepto "hace cuánto" tiene UNA definición (medianoche UTC de fechas puras — la lección del ajuste de FIN-022); reutilizable por Copiloto/mensajería/futura notificación P4 sin re-derivar | Cero backend |
| Desventajas | Un campo más en el payload | Cada consumidor repite la resta con su propio manejo de zona horaria — el bug de "un día corrido" renacería por §32 |

**Superficies (iteración 1):**
- **Tarjeta de la lista:** el "(ya pasó)" de FIN-022 sube a estado con dato:
  "⏰ venció hace {N} día{s}" (naranja `warning`, no rojo — §29.2: es un aviso,
  no un juicio; con N=0: "vence hoy").
- **Detalle:** bloque de conciliación visible solo si vencida — "⏰ Esta cuota
  venció hace {N} días. Si ya la pagaste por otro medio, **regístrala** para
  que tus números digan la verdad; si no, cada día suma intereses." + CTA doble:
  "✅ Registrar el pago →" (Registrar con tipo `pago_deuda` — la preselección de
  la deuda es detalle de implementación si la navegación lo permite) y el
  "💸 Abonar a capital" que YA existe en la misma pantalla (se referencia, no se
  duplica).
- El texto NUNCA afirma impago como hecho ("no has pagado") — afirma lo
  observable ("no está registrada") con la salida digna al lado. Mismo criterio
  §4.1-bis de FIN-020.

**Qué NO se muestra:** interés de mora estimado (no conocemos la tasa de mora
del contrato — inventarla violaría "cero números fabricados"); "cuotas
atrasadas acumuladas" (derivable, pero la iteración 1 informa el estado, no el
histórico — semilla).

### P3 — Score/Salud: semilla registrada, sin cambios

Un indicador de mora exigiría cortes auditados y datos de comportamiento que
aún no existen (mismo criterio que DEC-0019 P1 aplicó al semáforo de pilares).
Semilla registrada aquí: cuando exista historial real de mora (post-RC), FIN
propia con su auditoría de cortes.

### P4 — Notificación post-vencimiento (FUERA — decisión CPSAO)

Solo pantalla en esta iteración. El fast-follow (aviso "venció ayer" con copy
§29.2, reutilizando canal y presupuesto 2/día) queda agendado en BACKLOG por el
CTO — no es "mejora futura" genérica.

## 5. Respuesta al filtro §31

Sin esta capacidad, Milla acompaña mientras todo va bien y calla en el momento
de mayor costo — la promesa de copiloto falla donde más importa. Ninguna
experiencia existente puede absorberla: es un ESTADO transversal (hoy invisible
por el bug de P1) con su acción de conciliación, no una pantalla nueva. Valor
diferencial: **la única voz que dice "esto YA venció, haz esto hoy" — y que
además protege la honestidad de todas las cifras anteriores** (sin conciliar,
FIN-020/021/023 calculan sobre pagos fantasma).

## 6. Componentes
Backend: `reminders.service` (P1 Alt A) + `overdue.util` + list/summary de
Deudas + tests (unit del util y del dispatch sin escritura; e2e del estado
derivado). Frontend: `DebtsListScreen` (etiqueta) + `DebtDetailScreen` (bloque
de conciliación). Sin migraciones, sin IA.

## 7. Base de datos
Ninguna.

## 8. Backend
Solo lo listado. El flujo de pago (FIN-018) no se toca — es la semántica que gana.

## 9. Uso de IA
Ninguno.

## 10. Riesgos
- **Deudas con fecha vencida "de fábrica"** (usuarias que nunca registraron
  pagos): al corregir P1, la mora aflorará retroactivamente con números grandes
  ("venció hace 94 días") — es la verdad, pero la primera impresión puede ser
  dura; mitigación: el copy de conciliación existe exactamente para ese caso.
- El recordatorio de deuda impaga calla tras el vencimiento (Alt A) — declarado;
  P4 lo cubre en el fast-follow.
- `reminder.dueDate` queda como dato legado para recordatorios de deuda —
  documentado en código para que nadie vuelva a leerlo como autoritativo.

## 11. Dependencias
`nextDueDate` confiable (FIN-018), etiqueta FIN-022 P4, fechas puras UTC
(ajuste FIN-022). Ninguna nueva.

## 12. Impacto
1 bug fundacional corregido (escritor doble) + el estado de mayor costo del
usuario por fin visible y accionable, con 2 pantallas tocadas y cero modelo nuevo.

## 13. Criterios de aceptación
1. **P1:** test — `dispatchDue` con cuota vencida NO escribe en
   `debt.nextDueDate` (y el recordatorio de deuda evalúa contra la fecha REAL
   de la deuda); grep: un solo punto de escritura de `nextDueDate` fuera del
   flujo de pago (el de creación de deuda).
2. **P2:** caso a mano del util (hoy, ayer, N días, futura → null) con fechas
   puras UTC; e2e: deuda con fecha pasada expone `overdueDays` correcto en list
   y summary; regresión: deuda al día → null y CERO cambios visuales.
3. Capturas reales antes/después: lista con "venció hace N días" y detalle con
   el bloque de conciliación (deuda vencida real), y una deuda al día idéntica
   a FIN-022/023.
4. El copy no afirma impago ("no está registrada", nunca "no pagaste") —
   revisión de texto.
5. Suites completas verdes; typecheck; `SpendableService`/Score/Salud sin
   cambios en el diff.
6. Filtro §31 respondido (§5).

## 14. Plan
1. AUD-0024 → 2. DEC-0024 → 3. P1 (escritor único) + util + payload → 4. UI
(etiqueta + bloque) → 5. capturas → 6. IMP-0024 con SHA y juicio razonado →
validación → cierre.
