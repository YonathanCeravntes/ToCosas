# Asunto: Sprint de Pulido de Experiencia (Polish) — previo a continuar el roadmap

> Hilo append-only. Convención EOC. Instrucción directa del Fundador (2026-07-18):
> sprint de UX/bug-fix, **NO es una FIN nueva** — sin arquitectura, sin Motor
> Financiero, sin modelo de datos, sin nuevas fuentes §32. Se rastrea como
> `SPRINT-PULIDO-001` en `BACKLOG.md`, no como `FIN-XXX`. Bajo `DEC-ORG-001`: el CTO
> organiza, audita y decide directamente, sin Auditor de tercero.

---

## 2026-07-18 — De: Fundador — Para: Equipo

**Memo completo:** "Sprint de Pulido de Experiencia (Polish) previo a continuar el
roadmap" — 13 puntos (navegación atrás, reconstrucción de `deshacer`, mensajes
contextuales, explicar consecuencias automáticas, botón "Registrar otra cosa",
contexto del `Deshacer`, celebrar logros, reducir repeticiones, sensación de
continuidad, enriquecer pantallas de producto, consistencia visual, microinteracciones)
+ restricciones explícitas (§13: nada de funcionalidad nueva, arquitectura, Motor,
modelo de datos, fuentes §32, ni FIN nueva) + criterio de aceptación.

MENSAJE PARA EQUIPO

---

## 2026-07-18 — De: CTO — Para: Arquitecto — CC: Fundador

**Asunto:** Directiva del sprint de pulido — diagnóstico ya hecho, alcance acotado por prioridad

Antes de organizar la directiva, diagnostiqué los 13 puntos contra código real (no
sobre la descripción del memo) para que la directiva sea precisa, no vaga. Resumen
por prioridad:

## P0 — Los 2 bugs funcionales reales (violan principios ya establecidos)

### 1. Navegación atrás (punto 1 del memo)

**Diagnóstico:** `AddTransactionScreen` guarda el paso en un único
`useState<Step>('tipo')` (`:47`) — **no existe historial/pila de pasos**, todas las
transiciones son hacia adelante (9 llamadas a `setStep`, ninguna regresiva). **No hay
ningún botón "Atrás" en la UI** (grep confirma cero coincidencias). La pantalla está
montada como `Tab.Screen` de nivel raíz en `MainTabs.tsx` (`:49-58`), **no dentro de
un Stack** — React Navigation nunca pinta una flecha nativa de back para ella. El
"atrás" físico/gesto lo procesa el historial de pestañas del Tab Navigator, **ajeno
por completo al `step` interno**: si hay una pestaña previa, salta a otra pantalla
abandonando el wizard a mitad de camino; si "Registrar" es la primera pestaña de la
sesión, no hay a dónde ir y la pantalla "se queda" tal cual. `reset()` (`:78-83`,
usado solo por "Registrar otra cosa") no es un "un paso atrás", es un reinicio total.

**Precedente:** no existe ningún patrón reutilizable de "volver un paso" en el
proyecto — `AddDebtScreen` (FIN-034) resuelve su único caso de 2 fases con un link
manual "Cambiar" que llama `reset()`, no con historial. Es un problema nuevo a
resolver, idealmente con un mecanismo genérico reutilizable.

**Pedido:** implementa una pila de pasos real (el árbol es no lineal — bifurca por
`flow`/`method` — así que no basta un contador, hace falta el historial real de
valores visitados) + un botón "Atrás" visible en cada paso (excepto 'tipo') que haga
`pop` de esa pila, restaurando exactamente los datos ya diligenciados (nunca los
borra) — regla explícita del Fundador. El botón físico/gesto de Android debe
interceptarse (`BackHandler`/`beforeRemove`) para que dispare el mismo `pop` en vez
de saltar de pestaña. **No es obligatorio** resolver el mismo hueco en `AddDebtScreen`
en este sprint, pero si el mecanismo queda genérico, decláralo reutilizable para
cuando se priorice ahí también (regístralo como candidata si no lo tocas ahora).

### 2. `Deshacer` no reconstruye el estado completo (punto 2 del memo)

**Diagnóstico — descarté la hipótesis del debounce del Motor, es 100% caché de
pantalla en el frontend:**
- **Backend correcto:** `transactions.service.remove()` (`:231-267`) revierte
  `current_balance`/`status` de la deuda de forma **síncrona y atómica**, dentro de
  la misma transacción SQL del `DELETE` — antes de que el HTTP response regrese.
  `debts.service.findOne()` (usado por `GET /debts/:id`) calcula **todos** los
  derivados (`depthReadings`, `projection`, `paymentBreakdown`) **en vivo por
  request** — nunca depende del debounce de 15s del `EngineListener` (ese debounce
  alimenta solo métricas globales — Score/DTI/cashflow —, un módulo distinto). Para
  cuando `await undo()` resuelve, la BD ya está 100% correcta.
- **El bug real:** `DebtDetailScreen` **no tiene `useFocusEffect`** (a diferencia de
  su hermana `DebtsListScreen`, que sí lo tiene — por eso la deuda SÍ
  desaparece/reaparece correctamente "de la lista"). Fragmenta sus datos en **3
  hooks `useApi` independientes** (detalle base, `CardSection`, `ReviewSection`),
  cada uno cargando **una sola vez al montar**, sin invalidación cruzada.
  `AddTransactionScreen` es una pestaña hermana (no un modal apilado) — tras
  "Deshacer" no navega a ningún lado. React Navigation, por defecto, **no desmonta
  pantallas al perder foco** — si `DebtDetailScreen` ya estaba montada, el usuario
  vuelve a ver la instancia congelada del último fetch, no una reconstrucción fresca.

**Pedido:** agrega `useFocusEffect` a `DebtDetailScreen` que recargue **las 3 fuentes**
(detalle base + `CardSection` + `ReviewSection`) cada vez que la pantalla gana foco —
mismo patrón ya correcto de `DebtsListScreen`. Esto resuelve el síntoma reportado sin
tocar el backend (que ya está bien) ni el Motor.

## P1 — Mensajes contextuales y consecuencias automáticas (puntos 3, 4, 8, 9)

**Diagnóstico (citas textuales del código actual):**
- De los 4 tipos de movimiento, solo "gasto" y "pago_deuda" traen una consecuencia
  numérica en el acuse (`AddTransactionScreen.tsx:101-111`); **"ingreso" no trae
  ninguna** aunque `budgetApi.monthly()` ya da el dato; el **fallback offline borra
  todo contexto** para los 4 tipos (`:116-126`, string fijo sin interpolar nada).
- **Ningún acuse menciona "indicadores"/"salud"/"score"** — no hay ninguna llamada a
  esos datos dentro de `commitCashTx`/`commitCardPurchase` hoy; para decirlo en
  lenguaje humano no hace falta traer un número nuevo (evita scope creep), basta la
  frase — pero si quieres mostrar un delta real, avísame antes, eso sí tocaría una
  llamada nueva a evaluar.
- **"No te lo vuelvo a preguntar hasta el próximo corte"** está redactado por
  separado en **4 lugares** (`update-review.service.ts:177`, `:203`, `:204`, y
  hardcodeado en `DebtDetailScreen.tsx:446`) — y puede **mostrarse 2 veces en la
  misma pantalla para la misma acción** (`:405` + `:444-448`). El título "Una
  confirmación rápida" también está duplicado (backend `:200` + frontend `:403`).
- **Falta de continuidad:** registrar una compra a tarjeta desde
  `AddTransactionScreen` da un acuse rico; la MISMA acción desde
  `DebtDetailScreen → CardSection` (`:242-260`) **no muestra ningún acuse** — el
  formulario se cierra en silencio.

**Pedido:** (a) agrega el `tail` contextual para "ingreso"; preserva el contexto en
el fallback offline en vez de reemplazarlo por un string genérico; (b) agrega la
frase de consecuencias en lenguaje humano ("Actualicé tu presupuesto"/"tu deuda"/etc.
según el tipo) sin necesariamente traer un número nuevo — cíñete a lo que ya se
calcula; (c) consolida la copy de "no te lo vuelvo a preguntar" en **una sola fuente**
(reutilizada por los 3 sitios del backend) y elimina el duplicado hardcodeado del
frontend — que `DebtDetailScreen` renderice solo el `ack` que ya trae la respuesta,
no un segundo texto fijo aparte; (d) haz que `CardSection.add()` muestre el mismo
patrón de acuse que `AddTransactionScreen.commitCardPurchase()` en vez de cerrarse en
silencio.

## P2 — Microinteracciones (puntos 5, 6, 7)

- **Punto 5 ya está implementado tal cual** ("Registrar otra cosa" existe con ese
  texto exacto, `AddTransactionScreen.tsx:355`) — no requiere cambio.
- **Punto 6 (contexto de `Deshacer`):** hoy el botón no tiene límite de tiempo,
  contador ni aviso — permanece disponible indefinidamente. **No existe ningún
  componente Toast/Snackbar en el proyecto** para adaptar (`components/ui.tsx` solo
  tiene `Card`/`Button`/`Field`/`Screen`/`Row`) — hay que construirlo desde cero: un
  componente pequeño y reutilizable con cuenta regresiva visual. Decide si expira
  solo la UI o si también hace falta una ventana del lado del servidor (hoy
  `undoLast`/`voidPurchase`/`transactions.remove` no tienen concepto de expiración) —
  si optas por ventana server-side, es un cambio de comportamiento, decláralo
  explícito para que lo revise antes de implementar.
- **Punto 7 (celebrar logros):** la premisa de "todo es alerta" es falsa — **ya
  existe** un `InsightType.logro` de primera clase, un motor de gamificación
  completo (`gamification.service.ts`, rachas/XP/logros) y un insight `felicitacion`
  (`suggestions.engine.ts:105-113`). El problema es de **superficie, no de
  concepto**: hoy la celebración solo llega por push asíncrono (7 AM, compitiendo por
  el mismo cupo que las alertas de riesgo) o en `AchievementsScreen` aparte —
  **ninguna vive in-line** en el acuse de `AddTransactionScreen`, en `HealthScreen` ni
  en `DebtDetailScreen`. Pedido: conecta la señal existente (p. ej., "esta acción
  saldó una deuda" o "tu Score subió de banda") al acuse síncrono de esas pantallas —
  reutiliza lo que el motor ya calcula, no inventes una regla de negocio nueva.

## P3 — Pantallas de producto y consistencia visual (puntos 10, 11, 12)

**Punto 10 — acotado, excluye 2 sub-ítems fuera de alcance por §13 del memo:**
De los 7 datos candidatos, **4 entran en este sprint** (esfuerzo bajo/medio, sin
modelo nuevo): próximo vencimiento (`nextDueDate` **ya viaja en el payload** y ya se
pinta en `BudgetScreen.tsx:83` para la misma deuda — hoy `DebtDetailScreen` tiene
**cero referencias**, es trabajo de frontend puro); última compra (ya ordenada
`occurredAt desc` por el backend — solo falta destacarla como "última", no como ítem
genérico de lista); último pago (`AmortizationEntry.paidAt` ya existe en BD, falta
tipar en `types.ts` y consumir); días restantes (resta simple sobre `nextDueDate` ya
disponible). **2 sub-ítems quedan FUERA de este sprint** — "progreso vs. mes anterior"
y "cupo liberado este ciclo" **exigirían una tabla de historización/snapshots
mensuales que no existe** — eso es modelo de datos nuevo, prohibido explícitamente
por el memo (§13). Regístralos como candidatas en la cola de intake del BACKLOG, no
los implementes ahora.

**Punto 11 — consistencia visual:** el theme centralizado (`colors.ts`/`spacing`) **sí
existe y se usa** para la estructura grande — el problema es una fuga en los ajustes
finos: ~25 `marginTop`/`marginBottom` sueltos en `DebtDetailScreen.tsx` (valores 2/4/6/8
fuera de la escala `spacing`), patrón repetido en `BudgetScreen`/`HealthScreen`;
colores hex duplicados sueltos (`#EAF7F1` idéntico en 2 archivos, dos opacidades
distintas de scrim `#00000088`/`#00000066` para el mismo propósito); `AddDebtScreen`
define una paleta paralela completa (`CATEGORY`, 6 hex propios) fuera de `colors.ts`;
incluso `components/ui.tsx` (el propio design system compartido) tiene magic numbers
que no coinciden con la escala. Pedido: no reescribas cada pantalla — extiende
`colors.ts`/`spacing` con los tokens que faltan (una micro-escala + tokens para los
casos de un solo propósito que se repiten: fondo de acuse/éxito, scrim de modal,
blanco translúcido) y aplica esos tokens donde encontraste la fuga, empezando por los
casos duplicados exactos (mismo hex en 2+ archivos) — no hace falta perseguir cada
número aislado del proyecto en este sprint.

**Punto 12 — microinteracciones/estados:** `useApi.ts` expone
`{data, loading, error, reload}` de forma consistente, pero cada pantalla lo consume
distinto — `DebtDetailScreen` **ignora `error`** (un fallo de red se ve como
"Cargando…" eterno); `CardSection`/`ReviewSection` retornan `null` en silencio ante
error (peor que su propio padre); `HealthScreen` tiene el tratamiento más cuidado
(copy narrativo dedicado); `AddDebtScreen` ni siquiera destructura `loading`. Pedido:
no hace falta un sistema de diseño nuevo — como mínimo, que `DebtDetailScreen` y sus
2 secciones hijas **lean y muestren `error`** con el mismo patrón ya usado en otras
pantallas (`<Text style={{color: colors.danger}}>{error}</Text>`, ya repetido en 4
lugares) en vez de quedarse en loading eterno o desaparecer en silencio.

## Restricciones (recordatorio del memo, §13)

Nada de funcionalidad nueva, arquitectura, Motor Financiero, modelo de datos, ni
fuentes §32 nuevas. **No es una FIN** — se documenta como `IMP-PULIDO-001` (o el
identificador que uses), sin abrir `ARQ-FIN-XXX`. Cero regresión funcional.

## Criterio de cierre

Corre los mismos criterios que cualquier IMP: suites completas (unit + e2e + tsc
back+front) sin regresión, y evidencia concreta (capturas) de los 2 bugs P0
corregidos + al menos los cambios de copy de P1. Entrega con SHA — te audito y decido
yo directamente (`DEC-ORG-001`), sin tercero. Si algo de lo pedido por el Fundador
requiere, en la práctica, tocar arquitectura/Motor/modelo de datos más allá de lo que
diagnostiqué aquí, detente y avísame — no lo implementes sin que yo lo revise primero
(Paso 5, `DEC-ORG-001`).

**MENSAJE PARA ARQUITECTO** — sprint de pulido habilitado, alcance por prioridad
P0→P3 con diagnóstico ya hecho; 2 sub-ítems del punto 10 quedan fuera por exigir
modelo de datos nuevo; entrega con SHA para mi validación directa.
