# AUD-0021 · Única definición del fondo de emergencia (§32)

- **Documento auditado:** `docs/arquitectura/ARQ-0021-Fondo-de-Emergencia.md` v1.0 (commit `77ddffd`)
- **Insumos:** hilos `FIN-020`/`FIN-021` · `GOBERNANZA.md` §27, §31, §32 · código verificado en checkout aislado sobre `125c5c6` (`git show`, no working tree)
- **Realiza:** Auditor de Milla
- **Fecha:** 2026-07-12

---

## 1. Resumen Ejecutivo

`ARQ-0021` resuelve el hallazgo §32 confirmado en el cierre de FIN-020 (tres lecturas
divergentes de "meses de fondo de emergencia") con la misma disciplina que
`SpendableService` aplicó a "Te queda": **una fórmula canónica única, adoptada — no
inventada — y consumida por construcción**. Verifiqué el inventario, la fórmula
canónica y la cadencia de frescura contra el código real. El diseño es correcto; las
observaciones son no bloqueantes. Una de las tres piezas (P3, la meta única) es una
decisión de producto del CPSAO, correctamente diferida por el ARQ (no la decide el
Arquitecto).

## 2. Concesión previa — corrección de mi matiz intra-servicio (FIN-020)

El Arquitecto y el CTO pidieron re-verificación de mi observación en el hilo FIN-020
("`recommendations.service.ts` línea 106 vs 109 usarían bases distintas"). **La
retiro: no se sostiene.** Leído sobre `125c5c6`, la línea 108 define
`const essential = state.fixedExpense + state.debts.reduce((a,d)=>a+d.monthlyPayment,0)`
— idéntica a la expresión del disparo (línea 106). No hay divergencia intra-servicio;
ambas usan `fixedExpense + Σ cuotas`. Mi grep original capturó las líneas 106 y 109
sin la definición intermedia (108) y sobreinterpreté. **Mi hallazgo principal (tres
fórmulas divergentes ENTRE servicios) sí se sostiene** y queda confirmado abajo.

## 3. Verificación del inventario §2 del ARQ (contra código)

Confirmado sobre `125c5c6`:

- **Fórmula canónica** (`core-metrics.ts:48,61`): `essential = fixedExpense +
  debtMonthly`; `EmergencyFundMonths = emergencyBalance / essential`. Persistida como
  `MetricReading`. Es la que el ARQ propone adoptar (P1 Alt A) — real, ya auditada.
- **Consumidores que leen la lectura persistida** (`git grep EmergencyFundMonths`):
  engine, health, score, simulation-engine, gamification, insights — 6 puntos
  alineados, sin recálculo propio. Coincide con el inventario §2.
- **Los dos divergentes reales:**
  - **Inicio** (`dashboard.service.ts`, `interpretSavings`): base `ahorro total /
    gastos fijos` (sin cuotas), cortes propios ≥3/≥1 — fórmula, base y denominador
    distintos. ✗ confirmado.
  - **Recomendaciones** (`recommendations.service.ts:105-125`): misma base/denominador
    que la canónica pero **meta 3** (no la 6 de Salud) y **recalculada inline** (no lee
    la lectura persistida) — divergencia de meta + riesgo §32-por-recálculo. ✗
    confirmado.
- **Búsqueda de un 4º/10º consumidor no visto:** grep amplio (`emergency`, `fondo`,
  `/essential`, `meses de cobertura`) no encontró ninguna otra computación
  independiente de "meses cubiertos" fuera de Inicio y Recomendaciones. El
  `context-assembler.ts` del Copiloto (`available`) es un concepto distinto, ya
  registrado en `VALIDACION-0020` y correctamente excluido del alcance por el ARQ §3.
  **El inventario de 9 está completo.**

## 4. Riesgo cuantificado — frescura de Inicio bajo P2 Alt A (encargo explícito del CTO/Arquitecto)

P2 Alt A hace que Inicio lea la `MetricReading` persistida en vez de calcular en vivo.
El ARQ §4-P2/§10 pide cuantificar la cadencia real de recálculo del Motor. Verificado
en código:

1. Los eventos de dominio (incl. `account.balance_updated`, que es el que mueve el
   saldo del fondo) los emite el **OutboxDispatcher** con `@Cron(EVERY_10_SECONDS)`
   (`outbox.dispatcher.ts:36`) → hasta ~10 s hasta emitir.
2. `EngineListener` no recomputa por evento: marca el usuario `dirty`
   (`engine.listener.ts`) y un `@Interval(DEBOUNCE_MS)` drena una vez por ventana;
   `DEBOUNCE_MS = 15_000` (`engine.constants.ts:21`) → hasta ~15 s de debounce.
3. El `@Cron` nocturno (2 a. m.) es solo backstop de reconciliación, **no** la vía
   principal.

**Peor caso de frescura ≈ 10 s + 15 s ≈ 25 segundos** tras un movimiento grande antes
de que la línea de cobertura de Inicio se actualice (típico ~12-18 s). **Evaluación:**
aceptable — la cobertura del fondo es un concepto que cambia lento (meses), y un
retraso acotado de segundos no induce error de interpretación. **No es la staleness de
24 h que la palabra "cadencia del Motor" podría sugerir.** Recomiendo que el `DEC`
acepte P2 Alt A dejando constancia explícita de este límite de ~25 s (el mismo patrón
de "límite conocido documentado" que se usó en FIN-002).

## 5. Fortalezas

- **§32 por construcción, no por disciplina:** P1 Alt A + P2 Alt A logran que Inicio,
  Salud y el motor consuman la MISMA lectura persistida — imposible divergir sin romper
  el test de igualdad (§13.2), exactamente el patrón validado en FIN-020 (P2).
- **Adopta la canónica en vez de inventar una nueva** — radio de daño mínimo: no
  re-audita Score ni Salud (FIN-004 intacta), evita el error de Alt B.
- **P3 correctamente diferida al CPSAO** como Alt A/B/C con trade-offs, cumpliendo la
  instrucción del hilo FIN-020 (no la decide el Arquitecto). Alt C (dos hitos
  nombrados, "colchón inicial" 3 / "fondo completo" 6) resuelve la contradicción
  visible "~4 vs 3" convirtiéndola en narrativa coherente, sin re-auditar los cortes
  existentes — es la opción de menor riesgo, aunque la elección es de producto.
- Constantes oficiales en un módulo único (patrón `DEBT_RATIO_CUTS`) — cero literales
  de meta en copys, verificable por grep (§13.1).

## 6. Observaciones críticas

Ninguna bloqueante.

## 7. Observaciones menores

1. **Frescura P2 Alt A (~25 s):** aceptable, pero debe quedar aceptada explícitamente
   en el `DEC` (§4 de este AUD).
2. **Percepción de pérdida en Inicio:** al pasar de "ahorro total" (hoy "~4 meses") a
   "fondo marcado / esencial", la usuaria demo verá un número **menor** si tiene ahorro
   sin marcar. El ARQ §10 lo declara y mitiga (el copy invita a marcar cuentas como
   fondo). Es honestidad del concepto, no un defecto — pero es el mismo tipo de costo
   que FIN-020 dejó en Inicio; conviene vigilarlo junto con aquel en la RC integral.
3. **Divergencia por recálculo en Recomendaciones:** aunque hoy su fórmula coincide con
   la canónica, sigue recalculando inline. El diseño debe hacer que también consuma la
   fuente/constantes oficiales (no solo alinear la meta), o el §32 podría reabrirse por
   recálculo si esa base cambia en el futuro — el ARQ §4-P4 lo contempla; el `IMP`
   debe verificarlo.

## 8. Revisión de experiencia de usuario (Gobernanza §28-29, §32)

Aplica: la FIN toca copys visibles en tres pantallas ya aprobadas.

1. **¿Interpretación incorrecta?** Riesgo actual (contradicción "~4 vs 3") es
   precisamente lo que la FIN corrige. Bajo Alt C desaparece; bajo Alt A/B también,
   pero Alt A/B dejan un hito huérfano de narrativa (§4). Sin la meta única resuelta,
   el riesgo persiste — por eso P3 es condición de producto antes del DEC.
2. **¿Terminología confusa?** No, si Alt C nombra los hitos ("colchón inicial", "fondo
   completo"); son términos llanos. Con Alt A/B el número queda sin nombre pero sin
   ambigüedad.
3. **¿Carga cognitiva?** No aumenta: Inicio cambia el sujeto de UNA línea; no añade
   elementos ni interacción.
4. **¿Jerarquía visual?** Sin cambio estructural (solo copys server-side).
5. **¿Coherencia con el producto? (§32)** Es el objeto de la FIN: verificado que el
   diseño unifica el concepto por construcción y que no queda una computación
   independiente fuera del módulo oficial (§3). Cumple el espíritu y la letra de §32
   para el segundo concepto financiero de la app.
6. **Test emocional — ¿calificado u orientado?** Orientado: el copy apunta al próximo
   hito nombrado y ofrece la acción (marcar cuenta / aportar). Cuidar la percepción de
   pérdida (Obs. menor 2) para que el cambio no se lea como retroceso.

**§31 (filtro de valor diferencial):** de acuerdo con el ARQ §5 — **no aplica en su
forma de cierre**: FIN-021 no crea ni elimina una experiencia, corrige la consistencia
de un concepto transversal. Ninguna pantalla pierde capacidad.

## 9. Recomendaciones

1. Que el `DEC` acepte explícitamente el límite de frescura de ~25 s (P2 Alt A).
2. Que el `IMP` verifique que Recomendaciones consume la fuente/constantes oficiales
   (no solo alinea la meta) — cerrar la divergencia por recálculo (Obs. menor 3).
3. P3: decisión de producto del CPSAO antes del `DEC`, como el propio ARQ y el hilo
   FIN-020 establecen. Alt C es la de menor radio de daño; la elección no me compete.

## 10. Priorización

- **Bloqueante:** nada arquitectónico. La única condición de avance es la decisión de
  producto P3 (CPSAO) antes del `DEC` — por diseño, no por defecto.
- **No bloqueante:** las tres observaciones menores (§7).

## 11. Veredicto

**APROBADO CON OBSERVACIONES.**

El diseño logra §32 por construcción con el menor radio de daño posible (adopta la
canónica ya auditada, no re-audita FIN-004, no toca pantallas). El inventario de
consumidores está completo y verificado contra código; no hay un 4º cálculo
independiente oculto. Concedo y retiro mi matiz intra-servicio de FIN-020 (§2). Las
observaciones son no bloqueantes: aceptación explícita del límite de frescura ~25 s,
vigilancia de la percepción de pérdida en Inicio, y cierre de la divergencia por
recálculo en Recomendaciones en el `IMP`. La meta única (P3) es decisión de producto
del CPSAO antes del `DEC`, correctamente diferida por el Arquitecto.
