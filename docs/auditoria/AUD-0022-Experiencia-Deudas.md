# AUD-0022 · Experiencia de Deudas

- **Documento auditado:** `docs/arquitectura/ARQ-0022-Experiencia-Deudas.md` v1.0
- **Insumos:** `COMPRENSION-FIN022-Deudas.md` · hilo `FIN-022` · `GOBERNANZA.md` §29/§31/§32 · código verificado contra `HEAD` (`git show`/`git grep`)
- **Realiza:** Auditor de Milla
- **Fecha:** 2026-07-12

---

## 1. Resumen Ejecutivo

`ARQ-0022` aplica el patrón correcto — "conectar, no inventar": trae la estrategia
avalancha/bola de nieve que el motor de FIN-007 ya calcula a la lista de Deudas, sin
motor nuevo. El enfoque es sólido y la respuesta al filtro §31 es sustantiva. Verifiqué
los tres puntos que el Arquitecto pidió y las fronteras §32. **Dos se sostienen; el
tercero (§32 del ranking) tiene un vacío real de "coincide hoy" vs "no puede divergir"
— el mismo que `DEC-0021` §5.1 acaba de cerrar para el fondo.** Ninguna observación
bloquea el enfoque; una debe volverse cambio obligatorio del `DEC`.

## 2. Los tres puntos que el Arquitecto pidió verificar

### Punto 1 — `estrategia_deudas` con `extraBudget: 0` produce comparación de orden válida → **SE SOSTIENE**

Verificado en `portfolio.simulator.ts`: `simulatePortfolio` usa
`constantBudget = extraBudget + Σ minPayment`. Con `extraBudget:0`, tras pagar los
mínimos el remanente es 0 **hasta que se salda la primera deuda**; ahí su cuota
liberada (roll-over, "bola de nieve") se redirige al objetivo — y `pickTarget` elige
distinto por estrategia (mayor tasa vs menor saldo). **Avalancha y bola de nieve
divergen incluso con extra 0**, luego la comparación es válida. *Caveat:* con extra 0 el
ahorro proviene solo del reordenamiento de mínimos — puede ser modesto o **0** cuando
ambas estrategias coinciden (ver Obs. crítica 2).

### Punto 2 — Latencia de una simulación por carga del summary → **NEGLIGIBLE, con un matiz**

`compareStrategies` corre dos `simulatePortfolio` (avalancha+bola de nieve), O(meses ×
deudas), aritmética pura en memoria, datos cargados una vez, meses tope 1200 →
sub-milisegundo para carteras reales. **Matiz:** `/debts/summary` está también en la
ruta de carga de **Inicio** (el frontend lo consume para la tarjeta "Deuda total",
`DashboardScreen.tsx:108`). Extender el summary con la simulación la ejecuta también en
cada carga de Inicio. Costo absoluto despreciable, pero **debe gatearse a
`debtsCount > 1`** para que usuarios con 0/1 deuda no paguen una simulación que se
descarta. Cache innecesaria a la escala actual.

### Punto 3 — §32 del ranking (que el orden mostrado y el del Simulador no diverjan) → **VACÍO REAL, recomiendo cambio obligatorio**

Dos gaps concretos:

**(3a) El motor no expone el orden de ataque.** `SimulationResult.specifics` solo
propaga `avalancheMonths/Interest`, `snowballMonths/Interest`, `recommended`,
`interestDifference` (`simulation-engine.ts:205-208`). `PortfolioResult` sí tiene
`payoffOrder`, pero (i) no se propaga al resultado que consumen summary/Simulador y
(ii) es orden de **saldadas**, no de **ataque** (cuál pagar primero). Por tanto el
ranking "🎯 1º/2º" del mockup tendría que **re-derivarse en el summary** (ordenar por
tasa/saldo) — eso es "coincide hoy", no "no puede divergir". **Recomiendo cambio
obligatorio del `DEC`** (análogo a `DEC-0021` §5.1): exponer el orden de ataque de la
estrategia recomendada desde un helper puro compartido en `portfolio.simulator.ts`
(p. ej. `attackOrder(debts, strategy)`), consumido idénticamente por el summary y por
el Simulador si algún día lo muestra.

**(3b) El resultado depende de `extraBudget` — y hoy no es único.** Recomendaciones
llama con `extraBudget: surplus*0.3` (`recommendations.service.ts:90`); el Simulador
usa el input del usuario. Si el summary usa un `extraBudget` distinto (el ARQ §10
baraja 0 o el excedente real), **`interestDifference` e incluso `recommended` pueden
diferir de lo que muestra el Simulador** — divergencia §32 por parámetro, no por
fórmula. El **orden** es estable (avalancha siempre por tasa, bola por saldo — no
depende del extra), pero la **cifra de ahorro** sí depende. El `DEC` debe fijar el
contrato de `extraBudget` del bloque y alinear la apertura del Simulador al mismo valor,
o anotar el supuesto en el copy.

## 3. Fronteras §32 declaradas — verificación

- **`totalDebt` del hero (P1):** **correcto, fuente única real.** Inicio muestra "Deuda
  total" desde `summary.totalDebt` (`GET /debts/summary` → `debts.service.summaryForUser`),
  y ese endpoint y `dashboard.home` usan el **mismo filtro**
  `{deletedAt:null, status:'activa'}` — no hay segunda fórmula. El hero de Deudas
  reusando `summary.totalDebt` no crea divergencia. ✓
- **Fecha de libertad total:** máx `payoffDate` de la amortización FIN-003/012 — misma
  fuente del detalle. ✓ (nueva como agregado, no como fórmula nueva).
- **Cuotas etiquetadas "tus cuotas suman":** correcto — nunca "pagas al mes"
  (desembolso real = FIN-023) ni "pagado del ciclo" (Inicio). El `IMP` debe respetar esa
  disciplina de copy (criterio §13.4).
- **DTI no se duplica:** correcto, pertenece a Salud.

## 4. Fortalezas

- "Conectar, no inventar": cero motor nuevo, reutiliza `SimulationsService.projectOnly`
  ya auditado (FIN-007) — mínimo radio de riesgo.
- P4 (mora) con la disciplina §4.1-bis de FIN-020: etiqueta neutra "venció el {fecha}",
  sin juicio ni lógica nueva; frontera FIN-024 correctamente declarada.
- P1/P2 reutilizan patrones ya auditados (hero único FIN-017, jugada FIN-019).
- Respuesta §31 sustantiva y específica (temporalidad prospectiva de la deuda; ninguna
  otra experiencia puede absorber el contrato sin romper su cadencia).

## 5. Observaciones críticas

1. **§32 del ranking (Punto 3a):** el orden debe venir del motor/helper compartido, no
   re-derivarse en el summary. → cambio obligatorio recomendado para el `DEC`.
2. **Cifra "te ahorra {interestDifference} frente a pagar a ciegas" (P2, §29 + honestidad
   numérica):** `interestDifference = |avalancha − bola de nieve|` — es la diferencia
   entre **dos estrategias buenas**, NO entre la óptima y "pagar a ciegas" (sin
   estrategia). El número no corresponde con la afirmación. Además, cuando ambas
   estrategias coinciden (p. ej. la de mayor tasa es también la de menor saldo)
   `interestDifference = 0` y el copy diría "te ahorra $0". La cláusula de degradación
   del ARQ (§4-P2) cubre "datos incompletos" pero **no** este caso. Corregir el copy
   para que describa lo que la cifra es, y omitir/reformular el bloque cuando
   `interestDifference ≈ 0`.

## 6. Observaciones menores

- Gatear la simulación a `debtsCount > 1` (Punto 2) para no ejecutarla en la ruta de
  Inicio con 0/1 deuda.
- P3 añade una línea por tarjeta (`nextDueDate` + intereses restantes): coherente con
  Presupuesto/ARQ-0018 §10; sin objeción, solo densidad — validar en captura que no
  sobrecarga la tarjeta.

## 7. Revisión de experiencia de usuario (§28-29, §32)

1. **¿Interpretación incorrecta?** Riesgo en la cifra de ahorro (Obs. crítica 2): el
   usuario podría creer que ahorra esa suma "por usar la app", cuando es la brecha
   entre dos estrategias. Corregir copy.
2. **¿Terminología confusa?** "Orden de ataque", "libre de todo", "vence" son llanos.
   "Pagar a ciegas" es la única frase problemática (Obs. crítica 2).
3. **¿Carga cognitiva?** Aceptable: hero → orden → tarjetas, una idea por bloque; el
   detalle se conserva aparte.
4. **¿Jerarquía visual?** Correcta según §4.6 (hero, luego orden con 🎯, luego lista).
5. **¿Coherencia §32?** Es el eje del AUD: `totalDebt` unificado (✓); el ranking y su
   cifra son el cabo suelto (Obs. crítica 1 y 2) — deben quedar por construcción, no por
   coincidencia, antes de implementar.
6. **Test emocional — ¿calificado u orientado?** Orienta bien (norte = fecha de
   libertad, no castigo), siempre que el número de ahorro sea honesto y el bloque no
   muestre "$0".

**§31:** de acuerdo con el ARQ §5 — la experiencia aporta valor diferencial claro (la
única que mira la deuda hacia adelante y permite cambiarle el final). Cumple el filtro.

## 8. Recomendaciones

1. **Cambio obligatorio (DEC):** exponer el orden de ataque desde el motor/helper puro
   compartido; summary y Simulador lo consumen idéntico (§32 por construcción, Obs. 1).
2. Fijar el contrato de `extraBudget` del bloque y alinear la apertura del Simulador
   (Punto 3b), o anotar el supuesto.
3. Corregir el copy de ahorro y manejar `interestDifference ≈ 0` (Obs. 2).
4. Gatear la simulación a `debtsCount > 1` (Obs. menor).

## 9. Priorización

- **Bloqueante para implementar P2:** Obs. críticas 1 y 2 (el corazón de la FIN es el
  bloque de estrategia; su ranking y su cifra deben ser correctos y no divergentes).
- **No bloqueante:** P1, P3, P4, P5 y las observaciones menores.

## 10. Veredicto

**APROBADO CON OBSERVACIONES.**

El enfoque "conectar, no inventar" es correcto y de mínimo riesgo; P1 (fuente única de
`totalDebt` verificada), P3, P4 y P5 están listos. El bloque de estrategia (P2) — el
corazón de la FIN — requiere cerrar dos puntos antes/durante el `IMP`: (1) el orden de
ataque debe venir del motor por construcción, no re-derivarse (cambio obligatorio
recomendado para el `DEC`, análogo a `DEC-0021` §5.1); (2) la cifra "te ahorra X" debe
describir lo que realmente es y manejar el caso `≈0`. Los puntos 1 y 2 que el Arquitecto
pidió verificar se sostienen (extraBudget 0 válido; latencia negligible con el matiz de
gatearla). Ningún hallazgo invalida el diseño — todos son precisables sin rehacerlo.
