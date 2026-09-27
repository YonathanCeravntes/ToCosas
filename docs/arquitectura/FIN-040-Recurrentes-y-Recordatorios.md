# FIN-040 · Recurrentes y recordatorios configurables

- **Versión:** 0.1 (ARQ, para confirmación del Fundador)
- **Fecha:** 2026-09-27
- **Autor:** Arquitecto (ciclo compacto `DEC-ORG-002` §44.3)
- **Estado:** **ARQ propuesto — NO implementar hasta la confirmación del Fundador** (toca Registrar
  y la definición §32 de "Te queda": freno obligatorio §44.2).
- **Origen (§27):** `DEC-0040` §4 (el Fundador acepta la recomendación del Arquitecto tras validar
  la entrega 2026-09-27) · `BLUEPRINT-0001` BP-23 (recordatorios configurables) y BP-27
  (recurrentes) · mejora futura registrada en `ARQ-0020` §4.1-bis ("`fixedItemId` en
  Transaction").
- **Documentos base:** `ARQ-0020`/`DEC-0020` (política de fijos comprometidos) · `FIN-007`/
  `DEC-0007` (presupuesto de notificaciones: máx. 2 recordatorios/día) · `FIN-024`/`DEC-0024` (una
  sola fecha de vencimiento por deuda) · `DEC-0029` (nunca fingir "ya lo anoté") · `GOBERNANZA.md`
  §31, §32, §39, §42, §44.

---

## 0. Frontera
Toca: `FixedItem` (gastos/ingresos fijos), `Reminder`, `Transaction` (una columna nueva),
`SpendableService` (§32, una regla), Presupuesto, Inicio, Registrar (un chip), una pantalla nueva
"Recordatorios" bajo Más. **No toca** Motor Financiero, Score, deudas ni el bot.

## 1. Problema (filtro §31: qué pierde el usuario hoy)
1. **Doble conteo silencioso.** Un gasto fijo activo (arriendo, $1.200.000, día 5) cuenta como
   *comprometido* hasta el cierre del ciclo (`DEC-0020` política ii). Cuando el usuario registra
   el pago real del arriendo como gasto, "Te queda" lo resta **otra vez**: el fijo sigue
   comprometido porque Millo no sabe que ese gasto *es* el arriendo. El usuario ve menos plata
   de la que tiene y deja de confiar en la cifra protagonista.
2. **Registro repetitivo.** Cada mes hay que escribir los mismos 5–10 movimientos (arriendo,
   servicios, salario, cuotas). Es la primera causa de abandono en apps de registro manual
   (`COMPETITIVE_ANALYSIS.md` §3).
3. **Recordatorios rígidos.** Solo existen para deudas, con offsets fijos `[3,1,0]` y sin UI
   para elegir canal o días. Los fijos no avisan.

## 2. Objetivo
Que un compromiso recurrente se registre **de un toque** cuando ocurre, que Millo avise **antes**
por el canal que el usuario elija, y que "Te queda" **nunca cuente dos veces** lo mismo.

## 3. Principio de diseño (DEC-0029, §42)
**Millo no inventa movimientos.** No hay auto-registro "el día 5 a las 00:00". Millo recuerda y
ofrece confirmar ("¿Ya pagaste el arriendo? · Sí, $1.200.000"); el movimiento existe solo cuando
el usuario lo confirma. Un fijo confirmado deja de estar *comprometido* y pasa a *gasto real* por
el monto confirmado (que puede diferir del estimado: servicios).

## 4. Alcance propuesto

### 4.1 Vínculo fijo ↔ movimiento (resuelve el doble conteo)
- `transactions.fixed_item_id` (nullable, índice `(fixed_item_id, occurred_at)`).
- `POST /budget/fixed/:id/pay { amount?, occurredAt?, method?, note? }` → crea la transacción
  (`kind` según `FixedKind`: gasto o ingreso; categoría la del fijo) **vinculada**, dentro de una
  transacción de BD; responde el movimiento y el "Te queda" recalculado (§32 fuente única).
- `GET /budget/fixed` devuelve por ítem `paidInCycle: { transactionId, amount, occurredAt } | null`.
- **Regla §32 (cambio, requiere decisión):** compromiso pendiente del ciclo = fijos activos **sin
  transacción vinculada en el ciclo** + cuotas de deuda no pagadas (sin cambio). Es la política
  **(ii-b)** = (ii) de `DEC-0020` más la salida por confirmación. Efecto neto en "Te queda" al
  confirmar por el monto estimado: **cero** (sale de comprometido, entra como real). Con monto
  distinto: se ajusta a la realidad. El sesgo sigue siendo conservador: un fijo no confirmado
  sigue comprometido hasta el cierre.
- Deshacer (12 s) del pago de un fijo: anula la transacción → el fijo vuelve a comprometido.

### 4.2 Confirmación de un toque
- **Inicio:** bloque "Esta semana" bajo el hero: fijos con `dayOfMonth` en los próximos 7 días o
  vencidos sin confirmar, cada uno con botón **"Ya lo pagué"** (abre una hoja: monto prellenado,
  fecha hoy, medio de pago; un toque más = registrado, con acuse y Deshacer).
- **Presupuesto:** cada fijo muestra estado del ciclo (✓ confirmado $X el día D · pendiente ·
  vencido) y el mismo botón.
- **Registrar (chip, P2):** al registrar un gasto/ingreso, si hay un fijo pendiente del ciclo con
  categoría igual o nota parecida, aparece el chip "¿Es tu pago de *Arriendo*?"; al tocarlo se
  vincula. Sin chip, nada cambia: Registrar sigue siendo la puerta única (`DEC-0035`).

### 4.3 Recordatorios configurables
- `reminders.fixed_item_id` (nullable) + `ensureFixedItemReminder(item)` al crear/activar un fijo
  con `dayOfMonth` (como `ensureDebtReminder`). Fecha autoritativa = próxima ocurrencia del
  `dayOfMonth` (meses cortos → último día), **no** se guarda `dueDate` para fijos (misma lección
  que `DEC-0024`).
- Configurables por recordatorio (fijo o deuda): **días de aviso** (`offsetsDays`, presets
  "7·3·1·el día", "3·1·el día", "solo el día", "ninguno"), **canales** (push · Telegram ·
  WhatsApp, solo los vinculados) y **activo/inactivo**. Se respeta `quiet_hours` y el presupuesto
  global de 2/día (`DEC-0007`), priorizando por cercanía del vencimiento y monto.
- Pantalla **Más → Recordatorios**: lista unificada (fijos + deudas) con próximo aviso, y edición.
  En Detalle de deuda y en cada fijo: acceso directo "Recordatorio · 3·1·el día · push".
- Texto del aviso con acción: "Mañana vence *Arriendo* ($1.200.000). Toca para confirmar el pago".
  El tap abre la hoja de 4.2 (deep link `millo://fixed/:id/pay`).

### 4.4 Ingresos recurrentes
Mismo mecanismo con `FixedKind.ingreso` ("¿Ya te llegó el salario?"). Al confirmar por un monto
menor al estimado, "Te queda" baja de inmediato (§32: `max(declarado, recibido)` no cambia; ver
§7 riesgo R3).

## 5. No entra
- Auto-registro sin confirmación (contradice `DEC-0029`).
- Recurrencias semanales/quincenales (hoy `dayOfMonth` es mensual; candidata H3 si el uso lo pide).
- Recordatorios por correo.
- Sobres/metas (BP-21/22): otra FIN.

## 6. Modelo, backend, app
- **Migración (a mano, M11):** `ALTER TABLE transactions ADD COLUMN fixed_item_id uuid NULL
  REFERENCES fixed_items(id) ON DELETE SET NULL; CREATE INDEX …;` · `ALTER TABLE reminders ADD
  COLUMN fixed_item_id uuid NULL REFERENCES fixed_items(id) ON DELETE CASCADE;`.
- **Backend:** `BudgetService.payFixed`, `SpendableService` (regla ii-b), `RemindersService`
  (`ensureFixedItemReminder`, próxima ocurrencia, deep link), DTOs de recordatorio (offsets,
  canales), `GET /reminders` con `nextFireAt`. Sin IA.
- **App:** hoja `PayFixedSheet`, bloque "Esta semana" en Inicio, estados en Presupuesto, chip en
  Registrar, pantalla `RemindersScreen`, manejo del deep link desde push. Tokens/componentes de
  FIN-038; `parseAmount` (§39) en la hoja.

## 7. Riesgos
- **R1 · §32 cambia (ii → ii-b).** Es un refinamiento, no un giro: el fijo sale de comprometido
  solo por acción explícita del usuario. Aun así es definición de producto → **decisión del
  Fundador (§16.1)**.
- **R2 · Movimientos manuales sin vínculo** siguen contando doble. Mitigación: chip de Registrar
  (4.2) y, en Presupuesto, "Este mes registraste $1.200.000 en Arriendo pero el fijo sigue
  pendiente · ¿Vincular?".
- **R3 · Ingreso recibido menor al declarado**: hoy la base de ingreso es `max(declarado,
  recibido)` (BT-004); confirmar el salario por menos no la baja. Se mantiene (fuera de alcance,
  documentado).
- **R4 · Ruido de notificaciones.** Presupuesto 2/día ya existe; los presets evitan defaults
  agresivos; "ninguno" es una opción real.

## 8. Criterios de aceptación (e2e)
1. Confirmar un fijo crea la transacción vinculada y "Te queda" no cambia (monto igual) / cambia
   por la diferencia (monto distinto). 2. Deshacer devuelve el fijo a comprometido. 3. Un fijo
   confirmado no aparece en compromisos pendientes ni en "Esta semana". 4. `ensureFixedItemReminder`
   crea el recordatorio y `dispatchDue` lo dispara en los offsets configurados, respetando el
   presupuesto diario. 5. Editar offsets/canales persiste y se refleja en `nextFireAt`. 6. Regresión:
   fin020/022/023/024 (consumidores de §32) sin cambios de resultado cuando no hay vínculos.

## 9. Plan
Una entrega (backend + migración + OTA), estimada en un ciclo compacto. Orden: migración y regla
§32 con tests → `payFixed` + hoja + Inicio/Presupuesto → recordatorios configurables + pantalla →
chip de Registrar (P2). Validación del Fundador con la lista de la guía.

## 10. Métricas
% de fijos confirmados por mes (objetivo > 70 %) · movimientos creados desde recordatorio ·
recordatorios desactivados (señal de ruido) · reducción de "Te queda" negativo por doble conteo.

---

## 16. Decisiones del Fundador
- **16.1 (pendiente):** aprobar la regla §32 (ii-b): "un fijo deja de estar comprometido cuando el
  usuario confirma su pago; hasta entonces cuenta hasta el cierre del ciclo".
- **16.2 (pendiente):** confirmar el alcance 4.1–4.4 y que **no** haya auto-registro (§3).
- **16.3 (pendiente):** presets de aviso por defecto propuestos: fijos "3·1·el día" por push;
  deudas siguen "3·1·el día" (sin cambio).
- **16.4 (pendiente):** fecha de inicio de la implementación (recomendación: tras ~2 semanas de
  uso real de la entrega 2026-09-27).
