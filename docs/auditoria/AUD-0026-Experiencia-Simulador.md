# AUD-0026 · Experiencia de Simulador

- **Documento auditado:** `docs/arquitectura/ARQ-0026-Experiencia-Simulador.md` v1.0
- **Insumos:** `COMPRENSION-FIN026-Simulador.md` · hilo FIN-026 · `GOBERNANZA.md` §29/§31/§32 · código verificado contra `HEAD` (`git show`/`git grep`)
- **Realiza:** Auditor de Milla
- **Fecha:** 2026-07-13

---

## 1. Resumen Ejecutivo

`ARQ-0026` cierra la última experiencia sobre un motor ya completo y auditado (8
escenarios): es diseño de PANTALLA y PUERTAS, no de motor — "conectar, no inventar". El
bug de navegación activo (la jugada de abono aterriza en el escenario opuesto) está bien
diagnosticado y correctamente elevado a P1. Verifiqué los tres puntos que el Arquitecto
pidió y el núcleo §32; **los tres resuelven**, con una precisión importante sobre P2 y
una respuesta afirmativa (con mitigación) a su pregunta de frescura. Sin hallazgos
bloqueantes.

## 2. Los tres puntos que el Arquitecto pidió verificar

### Punto 1 — Mapa completo kinds→escenario tras P1 → **el gap es real; P1 lo cierra, con una condición**

- Los **kinds** que emite el motor de recomendaciones son cuatro: `abono_extra`,
  `estrategia`, `fondo_emergencia`, `recorte_categoria`
  (`recommendations.service.ts`).
- `SIM_BY_KIND` (en **Salud** `:212` y **Presupuesto** `:205`) mapea solo tres —
  **`abono_extra` falta**. `goSimulator(SIM_BY_KIND['abono_extra'])` pasa `undefined` →
  `SimulatorScreen:59` `SCENARIOS.find(undefined) ?? SCENARIOS[0]` → aterriza en "¿y si
  tomo un crédito?". Bug confirmado, real y activo.
- **Condición para que P1 lo cierre de verdad:** el `IMP` debe (a) agregar
  `abono_extra → abono_extra` en **ambos** mapas (Salud **y** Presupuesto), no solo uno,
  y (b) reemplazar el `?? SCENARIOS[0]` por el aviso visible. Con ambas, los 4 kinds
  tienen puerta y no queda fallback mudo. Verificable por revisión de código (criterio
  §13.1). ✓

### Punto 2 — ¿La precarga por params puede esquivar las validaciones del backend? → **NO — y una precisión sobre P2**

- El backend valida en **cada** `POST /simulations`: DTO (`@IsNumber` por campo) +
  validación por escenario en `simulations.service.ts` (campos requeridos vía
  `value <= 0`; `estrategia_deudas` rechaza `extraBudget < 0`; `proyeccion_ahorro`
  acotado). La precarga solo PRE-LLENA; el backend valida igual. **No hay forma de que
  la pantalla inyecte un valor que el backend no valide.** ✓
- **Precisión importante (corrige la premisa de P2):** el backend **ya acepta
  `extraBudget: 0`** para `estrategia_deudas` (`:216` solo rechaza `< 0`; no pasa por el
  `value <= 0`). Quien rechaza `0` hoy es el **frontend**: `SimulatorScreen.tsx:73`
  `if (!v || v <= 0) throw` sobre TODOS los campos. Por tanto **el fix de P2 es
  frontend-only** (relajar ese guard para `extraBudget` en el escenario de estrategia);
  **no se toca la validación del backend**, que ya es correcta. No existe ningún caso en
  que el frontend sea más laxo que el backend (el riesgo real de "esquivar") — es al
  revés.

### Punto 3 — Frescura del "antes" (vivo vs persistido de Salud) → **sí hay un caso que confunde; mitigación concreta**

Verificado: el "antes" se calcula **en vivo** — `simulations.service.ts:57 loadState` →
`simulation-engine.ts:128 before = snapshotOf(state)` con `computeScore`/`computeCoreMetrics`
sobre el estado cargado; **no** lee la `MetricReading` persistida que muestra Salud.

- **Por qué es correcto (no es un §32 arreglable):** el "después" es una proyección
  desde el estado VIVO; si el "antes" se leyera del persistido (~25 s viejo) y el
  "después" del vivo, el **delta** (después−antes) mezclaría dos líneas base y sería
  incorrecto. El "antes" vivo es requisito de correctitud del delta — misma clase que la
  frontera `minPayment` de FIN-023.
- **El caso que sí confunde (respuesta a tu pregunta):** si la pantalla destaca un
  **"antes: {Score}" absoluto** justo después de que la usuaria vio otro Score en Salud
  (persistido, hasta ~25 s atrás), ve dos "Score de ahora" distintos — exactamente el
  tipo de desconfianza que §32 previene. **Mitigación (recomendada):** que el titular
  §29 lidere con el **cambio** ("tu Score pasaría de X a Y" — el movimiento, siempre
  internamente consistente), no con el valor absoluto del "antes"; y declarar la ventana
  ~25 s (mismo trato que `DEC-0021` §4.2). No bloqueante, pero conviene fijarlo en el DEC.

## 3. Núcleo §32

Bien resuelto: la deuda default del abono/refinanciación viene de `attackOrder`/summary
(FIN-022, inyección — la jugada aterriza en la deuda recomendada); estrategia usa el
mismo motor y el mismo copy §5.2; activos = lista real de Cuentas; los hitos del fondo
**NO** se narran desde el frontend (evita duplicar los literales 3/6 de `DEC-0021` §5.2 —
disciplina correcta, semilla declarada). La pantalla no calcula cifras (solo formatea).
El único cabo es el Score "antes" vivo (Punto 3), inherente y mitigable por display.

## 4. Fortalezas

- Prioriza el bug activo (la usuaria puede simular HOY lo contrario de lo recomendado) —
  P1, no parche suelto.
- El default §32 (`attackOrder[0]`) resuelve elegantemente el hueco declarado (el kind
  `abono_extra` no trae `debtId` en su `impact`): la jugada aterriza en la deuda correcta
  sin recalcular.
- P4 (puentes de vuelta) solo donde la acción real existe — sin CTAs fabricados (§29.1);
  nueva deuda/refinanciación sin CTA, honesto.
- §31 sustantiva ("la única zona segura — el futuro condicional con datos propios, donde
  equivocarse no cuesta nada").

## 5. Observaciones (no bloqueantes)

1. **P2 es frontend-only** (§2): no tocar la validación del backend (ya acepta 0). Que el
   `IMP`/`DEC` lo digan así para no "arreglar" algo correcto.
2. **Punto 1 exige tocar AMBOS mapas** (Salud + Presupuesto) y matar el `?? SCENARIOS[0]`
   — si el `IMP` hace solo uno, el bug sobrevive por la otra pantalla.
3. **Punto 3:** liderar el resultado con el delta, no con el "antes" absoluto; declarar
   ~25 s.
4. **Limitación de evidencia declarada:** FIN de frontend, sin suite unitaria de pantalla
   (precedente FIN-017). La aceptación se apoya en revisión de código (mapa de kinds,
   §13.1) + capturas + los e2e existentes del motor. Aceptable por precedente, pero el
   mapa completo de kinds debe verificarse por lectura en la Validación, no por captura.

## 6. Filtro §31 y experiencia (§28-29)

- **§31:** de acuerdo con el ARQ §5 — valor diferencial claro y no absorbible por otra
  pantalla. Cumple.
- **§28-29:** narrativa §29 desde `specifics` existentes, sin números fabricados, sin
  juicio ("tu banda bajaría a…" es información). Estados vacíos honestos (P6). El único
  riesgo de interpretación (Q1/Q5) es el Score "antes" transitorio (Punto 3), mitigable
  por display. Sin jerga nueva.

## 7. Recomendaciones

1. `IMP`: agregar `abono_extra` a **ambos** `SIM_BY_KIND` y reemplazar el fallback mudo
   por el aviso visible (Obs. 2).
2. `DEC`/`IMP`: P2 solo en frontend; no tocar la validación del backend (Obs. 1).
3. `DEC`: liderar el titular con el delta del Score y declarar la ventana ~25 s (Obs. 3).
4. Validación: verificar el mapa completo de kinds por lectura de código (Obs. 4).

## 8. Priorización

- **Bloqueante:** nada de diseño.
- **No bloqueante:** las 4 observaciones (precisiones de implementación).

## 9. Veredicto

**APROBADO CON OBSERVACIONES.**

El diseño cierra un motor ya pagado y auditado con la disciplina correcta, mata un bug de
navegación activo y respeta §32 (inyección desde fuentes únicas, hitos del fondo no
duplicados). Los tres puntos pedidos resuelven: el gap de kinds es real y P1 lo cierra
(tocando ambos mapas + matando el fallback mudo); la precarga no puede esquivar el backend
(y P2 es frontend-only — el backend ya acepta `extraBudget: 0`); y el "antes" vivo es
correcto para el delta pero puede diverger transitoriamente del Score de Salud —
mitigable liderando con el cambio, no con el absoluto. Ninguna observación exige rehacer
el diseño.
