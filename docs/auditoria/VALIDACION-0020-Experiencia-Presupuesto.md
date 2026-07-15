# VALIDACIÓN-0020 · Experiencia de Presupuesto ("Te queda" con fuente única)

- **Documentos base:** `DEC-0020-Experiencia-Presupuesto.md` · `IMP-0020-Experiencia-Presupuesto.md` v1.0 · `ARQ-0020-Experiencia-Presupuesto.md` v1.1 · `AUD-0020-Experiencia-Presupuesto.md`
- **Realiza:** Auditor de Milla
- **Fecha:** 2026-07-12
- **Referencia inmutable verificada:** commit `125c5c6f296d36fe6126067e90e09d12c7c4fc5f` (ancestro de HEAD `47f45b3`, confirmado por `git merge-base --is-ancestor`)

---

## 1. Método

Verificación independiente en cuatro capas — DEC→IMP→Código→Evidencia — sin confiar en
ninguna afirmación del IMP por sí sola. **A diferencia de FIN-012/017 (donde la
limitación de entorno ICU/Postgres obligó a aceptar verificación estática), en esta
FIN las suites se ejecutaron EN VIVO** (ver §6):

- `git show --stat 125c5c6`: el commit toca exactamente los 14 archivos que declara
  `IMP §2` — ni uno más. Sin migraciones, sin cambios al Motor, sin IA (coherente con
  ARQ §7–§9).
- Lectura directa del código del commit (`git show 125c5c6:<path>`) de
  `spendable.service.ts`, `budget.service.ts`, `budget.module.ts`,
  `dashboard.service.ts`, `dashboard.module.ts` y los dos specs — no del working tree,
  para blindar contra el bug conocido de desincronización git/working-tree.
- `git grep` sobre el commit para verificar la unicidad de fuente exigida por §32.
- Lectura de `ARQ-0020` v1.1 §4.1-bis y §4.1-ter (las dos políticas de P1 devueltas por
  `DEC-0020` §5) para confirmar que quedan documentadas **en el propio ARQ**, no solo
  en el AUD, como el DEC exigió.
- Inspección visual directa de las dos capturas full-scroll de
  `docs/producto/capturas/fin-020/`, con verificación aritmética cruzada entre ambas.
- Ejecución en vivo: suite unitaria completa, suite e2e completa (Postgres real) y
  `tsc --noEmit` de frontend.

## 2. Las dos correcciones de P1 (el objeto exacto de `AUD-0020` / `DEC-0020` §5)

`AUD-0020` bloqueó P1 con dos hallazgos críticos. Verifico que ambos están resueltos en
código **y** documentados en el ARQ vigente:

| Hallazgo (AUD-0020) | DEC-0020 §5 exige | ARQ v1.1 documenta | Código del commit confirma |
|---|---|---|---|
| **H1** — fijo vencido sin transacción desaparece de ambos términos ⇒ "Te queda" sobreestimado (miente hacia arriba) | Declarar política explícita para fijos vencidos sin transacción, en el ARQ | §4.1-bis: adopta política **(ii)** — todo fijo de gasto activo cuenta como comprometido hasta el cierre del ciclo, con o sin fecha, haya pasado o no; el sesgo posible apunta **siempre hacia abajo** | `spendable.service.ts` consulta `fixedItem.findMany({ kind: 'gasto' })` sin filtrar por fecha; `datePassed` es **solo etiqueta UI**, no excluye del `protectedTotal`. Resuelve H1 por construcción |
| **H2** — umbral 10% de `interpretCashflow` calibrado para Alt C, aplicado en silencio sobre el valor menor de Alt A | Recalibrar (a) o rejustificar documentadamente (b) el corte antes de aplicarlo al hero de Inicio | §4.1-ter: toma **ruta (b)** — el 10% es holgura relativa independiente de la base; bajo Alt A el amarillo llega ANTES (dirección correcta para una definición conservadora); compromiso §13 de recalibrar con datos reales tras la RC integral; **textos recalibrados** | `dashboard.service.ts:147` llama `interpretCashflow(teQueda.amount, teQueda.receivedIncome)` — base = ingreso REAL, numerador = valor Alt A. Rojo SIN culpa ("…supera lo que te queda — mira qué puedes mover"). Los 3 textos coinciden carácter a carácter con la tabla §4.1-ter |

**Ambos hallazgos que motivaron el REQUIERE AJUSTES de `AUD-0020` están genuinamente
cerrados**, con la misma disciplina argumental (criterio rector §32.2 "nunca mentir
hacia arriba") que el propio DEC exigió.

## 3. Correspondencia por pieza (DEC-0020 → código → captura)

| Pieza | DEC-0020 | Código confirma | Captura confirma |
|---|---|---|---|
| **P2 · fuente única §32** | `SpendableService` inyectado por ambos consumidores | `budget.module.ts` **exporta** `SpendableService`; `dashboard.module.ts` **importa** `BudgetModule`; ambos servicios inyectan la misma instancia y devuelven su `teQueda` sin recalcular. `grep`: `teQueda` solo nace en `spendable.service.ts` | **El hero muestra el MISMO `$1.795.602` en Inicio y en Presupuesto** — prueba visual de la fuente única |
| **P1 · Alt A + §4.1-bis** | ingresos reales − salidas reales − pendientes; salario declarado NO suma | fórmula exacta en `compute()`; ingresos futuros excluidos (solo `kind:'gasto'` y cuotas con `nextDueDate` en lo que resta) | Protegido $1.612.199 = 1.100.000+135.000+280.000+97.199 (**suma exacta**); Arriendo/Internet/Servicios con etiqueta neutra "ya pasó su fecha", nunca "pagado" |
| **P1 · §4.1-ter (Inicio)** | interpretación recalibrada sobre Alt A | ver §2 (H2) | "🟢 De cada $100 que te entraron, $39 quedan libres…" = 1.795.602/4.550.000 = 39% ✓ |
| **P3 · por día** | "≈ $X por día"; se omite sin margen | `perDay = amount>0 ? amount/daysLeft : null` | "≈ $89.780 por día (20 días)" = 1.795.602/20 ✓ |
| **P4 · protegido visible** | lista cronológica; fecha pasada = neutra; cuota fuera de ciclo NO aparece | orden por fecha, sin-fecha al final; `datePassed` neutro | La cuota "Crédito libre inversión" (vence fuera del ciclo) **no** está en el protegido y **sí** en la casa de compromisos — exactamente como declara el IMP |
| **P5 · destino de lo libre** | jugada top del motor FIN-007 / puente honesto | reutiliza el patrón ya auditado en FIN-019 | "Aparta $1.066.500/mes para tu fondo de emergencia" (recomendación real del motor) |
| **P6 · casa de compromisos** | CRUD conservado debajo de la decisión, formulario colapsado | — | Orden decisión→casa; "➕ Nuevo compromiso fijo" colapsado |

**Cierre aritmético cruzado (las dos capturas se reproducen entre sí):**
`receivedIncome 4.550.000 − realOut (gasto variable 552.000 + cuotas pagadas 590.199)
− protegido 1.612.199 = 1.795.602`. Todas las cifras visibles en ambas pantallas son
mutuamente consistentes y reproducen el hero al peso.

## 4. §32 — obligación específica del Auditor

`GOBERNANZA §32` obliga al Auditor a aportar evidencia concreta (grep/lectura) de que
no existe una segunda fórmula divergente del mismo concepto:

- **Cifra unificada por construcción, no por disciplina:** una sola implementación
  (`SpendableService`), dos consumidores por inyección. El test e2e `fin020-tequeda`
  asevera `home.teQueda` **`toEqual`** `budget.teQueda` (igualdad estructural completa)
  contra app + Postgres reales — si alguien reintrodujera una fórmula paralela, el test
  rompe. Ejecutado en vivo: **pasa**.
- El `available` estructural de `budget.service.ts` quedó **explícitamente
  reetiquetado** en el código como "balance ESTRUCTURAL fijos-vs-fijos, no puede
  etiquetarse 'te queda'". El `estimatedCashflow` de Inicio se conserva en el contrato
  pero el hero pasó a `teQueda`.

**Observación registrada (no bloqueante, fuera del alcance de FIN-020):**
`copilot/context-assembler.ts:177` mantiene un cálculo `available = fixedIncome −
fixedExpense − debtMonthly` (estructural, tipo Alt C) en la vista minimizada que
alimenta al LLM. Hoy **no** se muestra como "Te queda" en pantalla (es contexto interno
del Copiloto, un concepto distinto), por lo que no viola §32 en el estado actual. Pero
cuando se construya la **Experiencia de Copiloto** (hoja de ruta UX #6) deberá consumir
`SpendableService` para no reabrir §32 por la puerta de atrás. Se recomienda que el CTO
lo registre como restricción de diseño para esa FIN futura. No afecta el cierre de
FIN-020.

## 5. Las 6 preguntas UX (Gobernanza §28-29) + §32

1. **¿Interpretación incorrecta?** El riesgo que `AUD-0020` señaló (pasar a "amarillo"
   solo por el cambio de definición) se mitiga con los textos recalibrados de §4.1-ter:
   el rojo ya **no culpa** ("…supera lo que te queda — mira qué puedes mover") y
   reconoce que un valor negativo no implica sobregasto. Dirección conservadora
   asumida y justificada.
2. **¿Terminología confusa?** No: "Te queda para gastar", "Protegido para lo que
   viene", "por día", "Con lo libre" son términos llanos, consistentes con Inicio/Salud.
3. **¿Carga cognitiva excesiva?** No: una idea por bloque (número → por día → protegido
   → destino), sin interacción requerida para lo esencial. La casa de compromisos queda
   subordinada bajo la decisión.
4. **¿Jerarquía visual correcta?** Sí: hero dominante, cronología subordinada, destino
   accionable como cierre — confirmado en la captura.
5. **¿Coherencia con el resto del producto?** Es el punto que §32 obliga a verificar: la
   cifra queda unificada (misma fuente, mismo valor visible) **y** el juicio derivado
   (Hallazgo 2) ya está recalibrado — el cabo suelto que `AUD-0020 §8.5` dejó pendiente
   queda cerrado.
6. **Test emocional — ¿calificado u orientado?** Orientado: el usuario ve cuánto le
   queda, cuánto por día, qué ya está apartado y qué hacer con lo libre. El costo
   declarado (hero de Inicio baja al volverse honesto) es real y visible; su mitigación
   vive en la sección protegida de Presupuesto, a un tab. Riesgo de percepción "perdí
   plata" correctamente derivado a la RC integral, no negado.

## 6. Pruebas — ejecución EN VIVO (no solo declaración)

| Suite | IMP declara | Ejecución del Auditor | Resultado |
|---|---|---|---|
| Unitaria (sin BD) | 303/303 | `npx jest` | **303/303, 38 suites** ✓ |
| E2E (Postgres real) | 9/9 | `npm run test:e2e` | **9/9, 3 suites** ✓ — incluye `fin020-tequeda.e2e-spec.ts` (igualdad §32) |
| Frontend typecheck | limpio | `npx tsc --noEmit` | **exit 0, sin errores** ✓ |

El spec unitario `spendable.service.spec.ts` cubre explícitamente el escenario de H1
(fijo vencido-sin-transacción contando como pendiente, §4.1-bis) y el corte de ciclo
día 15 — los ejecuté y pasan. **Esta es la primera VALIDACIÓN de la hoja de ruta UX en
la que las cuatro capas quedan verificadas con ejecución real, sin recurrir a la
excepción de entorno.**

## 7. Reservas del IMP §5 — evaluación

Las 3 reservas declaradas son honestas y no ocultan un hallazgo bloqueante:
1. **Doble descuento transitorio** de un fijo pagado y registrado como transacción —
   real, es el sesgo hacia abajo asumido por la política (ii); `fixedItemId` registrado
   como mejora futura. Correctamente declarado, no oculto.
2. **Corte del 10% comprometido a revisión con datos reales post-RC** — coherente con
   §4.1-ter y con el compromiso §13 del ARQ.
3. **`teQueda.amount === 0` exacto queda mudo** — caso límite improbable; decisión
   defendible (no fabricar un mensaje sin diseño aprobado) frente al riesgo de inventar
   copy. Aceptable para v1.

## 8. Hallazgos

Ninguno bloqueante. Una única observación no bloqueante y fuera de alcance (§4: el
`available` del `context-assembler` del Copiloto, a resolver cuando se diseñe la
Experiencia de Copiloto) — registrada para el CTO, sin impacto en el cierre de FIN-020.

## 9. Veredicto

**APROBADO.**

La implementación de FIN-020 corresponde exactamente con `DEC-0020` en las cuatro
capas (decisión, implementación, código real del commit `125c5c6`, y evidencia visual
+ pruebas ejecutadas en vivo). Las dos correcciones de P1 que motivaron el REQUIERE
AJUSTES de `AUD-0020` están genuinamente resueltas y documentadas en `ARQ-0020` v1.1
(§4.1-bis política ii; §4.1-ter ruta b con textos recalibrados). La fuente única §32
queda garantizada por construcción, verificada por grep y por un test e2e de igualdad
estructural que pasa contra BD real — y confirmada visualmente por el mismo
`$1.795.602` en el hero de Inicio y de Presupuesto. Recomiendo al CTO proceder con su
verificación independiente (checkout aislado sobre `125c5c6`) y el cierre formal de
FIN-020, tomando nota de la única restricción de diseño registrada para la futura
Experiencia de Copiloto (§4).
