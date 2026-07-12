# ARQ-0021 · Única definición del fondo de emergencia (§32)

- **Versión:** 1.0
- **Fecha:** 2026-07-12
- **Autor:** Agente Arquitecto
- **Estado:** Emitido — para verificación del CTO y pase a Auditoría
- **Historial de cambios:**
  - v1.0 (2026-07-12) — emisión por apertura de FIN-021 (encargo del CTO en
    `docs/correspondencia/FIN-021-Fondo-de-Emergencia.md`).
- **Módulo/Feature:** FIN-021 · **Origen (§27):** Corrección de deuda técnica,
  prioridad inmediata (decisión CPSAO en hilo FIN-020)
- **Documentos base:** hilos de correspondencia FIN-020/FIN-021 ·
  `GOBERNANZA.md` §32 · `VALIDACION-0020` (hallazgo out-of-scope del Copiloto)

## 0. Intención

Que la pregunta "¿cuántos meses tengo cubiertos?" tenga **una sola respuesta**
en toda la app, salga donde salga — igual que "Te queda" tras FIN-020.

## 1. Objetivo

Una fuente única de la cobertura del fondo de emergencia (fórmula + meta),
inyectada por todos los consumidores; cero fórmulas ni metas paralelas.

## 2. Problema — inventario completo (verificado contra código en `614ef81c`)

La app ya TIENE una definición canónica que la mayoría consume; el §32 se rompe
en dos puntos concretos:

| # | Consumidor | Qué usa hoy | ¿Alineado? |
|---|---|---|---|
| 1 | Motor (`core-metrics.ts:61`) | **`EmergencyFundMonths = fondo marcado / gasto esencial`** (esencial = gastos fijos + cuotas de deuda); persistida como `MetricReading` mensual | **ES la canónica** (auditada FIN-003/004) |
| 2 | Salud (`health.service.ts:142-156`) | Lee la lectura persistida; verde ≥6 / amarillo 3–6 / rojo <3; acción "hasta llegar a 6 meses" | ✓ |
| 3 | Score (`score.util.ts`, pilar ahorro) | La misma métrica como insumo | ✓ |
| 4 | Simulador (`simulation-engine.ts:102`) | `computeCoreMetrics` (misma fórmula) para el antes/después | ✓ |
| 5 | Gamificación (`gamification.service.ts:101-105`) | Lectura persistida; logros `fondo_3m` ("Colchón inicial") y `fondo_6m` ("Fondo de emergencia completo") | ✓ |
| 6 | Insights (`insights.generator.ts:67-79`) | Lectura persistida; celebra al cruzar 6 | ✓ |
| 7 | Copiloto glosario (`templates.ts:26-27`) | Texto estático "meta típica: 6 meses de gastos esenciales" | ✓ (texto, no fórmula) |
| 8 | **Inicio** (`dashboard.service.ts`, `interpretSavings`) | **Otra fórmula:** ahorro TOTAL (cuentas de ahorro + fondo) / gastos fijos SOLO (sin cuotas); verde ≥3 / amarillo ≥1 / rojo <1; "cubres ~N meses de tus gastos fijos" | ✗ base, denominador y cortes propios |
| 9 | **Recomendaciones** (`recommendations.service.ts:105-125`) | Misma base y denominador que la canónica, pero **meta 3 meses** ("llegarías a 3 meses de gastos cubiertos") | ✗ meta distinta de la que Salud llama verde (6) |

**Encargo 3 del CTO (4º consumidor no visto):** el grep amplio (`emergency`,
`fondo`, `meses` en backend y frontend) encontró los consumidores 3–7 además de
los tres del hallazgo original. El frontend no calcula nada (todos los textos de
cobertura vienen del servidor), así que la unificación es 100% backend + copys.

**Nota para el Auditor (re-verificación pedida):** el matiz intra-servicio de tu
mensaje en el hilo FIN-020 (disparo línea 106 vs objetivo línea 109 con bases
distintas) no coincide con lo que leo en `614ef81c`: ambas líneas evalúan la
misma expresión `fixedExpense + Σ monthlyPayment`. Puede que mirara yo otra
versión — pido el ejemplo concreto o la corrección del matiz en tu AUD. El resto
del hallazgo (meta 3 vs 6, y la fórmula propia de Inicio) está confirmado.

## 3. Alcance

Backend: `dashboard.service` (interpretación de ahorro), `recommendations.service`
(candidato fondo), `copilot/templates.ts` (1 línea de glosario), un módulo de
constantes oficiales. **Fuera de alcance:** cortes del indicador de Salud y del
Score (no cambian — evita re-auditar FIN-004), pantallas (solo copys que ya
vienen del servidor), el `available` del context-assembler del Copiloto (hallazgo
distinto, ya registrado en VALIDACION-0020).

## 4. Diseño — alternativas por pieza

### P1 — Cuál es LA fórmula (§32, condición estructural)

| | **Alt A — La del Motor es la oficial (recomendada)** | **Alt B — Fórmula nueva (p. ej. incluir ahorro total)** |
|---|---|---|
| Qué es | Declarar `EmergencyFundMonths` (fondo marcado / gasto esencial) como LA definición; los 2 divergentes se pliegan | Rediseñar el concepto y migrar a todos |
| Ventajas | Ya auditada (FIN-003/004), ya persistida, ya consumida por 6 de 9 puntos; el fondo MARCADO es la señal con intención del usuario ("este dinero es para emergencias") | Podría capturar "colchón real" más amplio |
| Desventajas | El ahorro no marcado deja de contar como cobertura en Inicio (ver P2) | Obliga a re-auditar Score, Salud, logros e insights — máximo radio de daño para el mismo resultado |

Constantes oficiales exportadas de un único módulo (patrón `DEBT_RATIO_CUTS` de
FIN-017): hitos y cortes viven UNA vez y todos los copys los importan.

### P2 — Cómo se pliega Inicio

| | **Alt A — Leer la lectura persistida del Motor (recomendada)** | **Alt B — Recalcular en vivo con util pura compartida** |
|---|---|---|
| Qué es | `interpretSavings` pasa a leer la MISMA `MetricReading` que Salud/logros y a hablar del fondo: "Tu fondo cubre ~N meses de lo esencial" | El dashboard calcula la fórmula con sus propios datos ya cargados |
| Ventajas | Igualdad con Salud POR CONSTRUCCIÓN — mismo número persistido, imposible divergir; cero fórmula nueva | Valor al segundo |
| Desventajas | Frescura atada a la cadencia de recálculo del Motor (eventos outbox — verificar cadencia real en AUD) | Dos caminos de datos para el mismo concepto: el bug §32 renace por la puerta de atrás (mismo argumento que FIN-020 P2) |

Reglas §29.1: sin fondo marcado o sin lectura → la línea SE OMITE (la acción de
marcarlo ya existe en Salud y en Cuentas). La tarjeta de Inicio sigue mostrando
el MONTO de ahorro total (eso no es "meses cubiertos" — no viola §32), solo
cambia su línea de interpretación.

### P3 — La meta única (pregunta de producto del CPSAO — decide él, no yo)

| | **Alt A — 6 meses en todo** | **Alt B — 3 meses en todo** | **Alt C — Una escala, dos hitos nombrados (recomendada)** |
|---|---|---|---|
| Qué es | La recomendación apunta a 6 | Salud da verde a los 3 | "**Colchón inicial**" = 3 · "**Fondo completo**" = 6; la recomendación apunta al PRÓXIMO hito del usuario y lo nombra |
| Ventajas | Un solo número, estándar prudente | Alcanzable, motivador | La escala YA existe en la app (logros `fondo_3m`/`fondo_6m`, cortes de Salud amarillo≥3/verde≥6) — se le pone nombre en vez de elegir un bando; nada se re-audita |
| Desventajas | Meta lejana desmotiva con excedentes chicos; el logro de 3 queda sin narrativa | Rebaja el listón verde de Salud → re-auditar FIN-004; contradice el glosario | Dos números conviven — exige que el copy SIEMPRE nombre el hito ("para tu colchón inicial de 3 meses") |

Con Alt C, la contradicción visible hoy ("~4 meses" vs "llegarías a 3") se vuelve
narrativa coherente: "ya tienes tu colchón inicial (3) — te falta esto para el
fondo completo (6)".

### P4 — Recomendaciones y glosario

El candidato `fondo_emergencia` toma disparo, objetivo y copy de las constantes
oficiales (hito siguiente del usuario, nombrado). El glosario del Copiloto se
alinea en una línea ("colchón inicial: 3 meses · fondo completo: 6 meses de
gastos esenciales"). Sin cambios de mecánica de priorización (FIN-007 intacta).

## 5. Filtro §31

No aplica en su forma de cierre: FIN-021 no crea ni elimina una experiencia —
corrige la consistencia (§32) de un concepto transversal a tres pantallas ya
aprobadas. Ninguna pantalla pierde capacidad; Inicio cambia el sujeto de una
línea (del ahorro total al fondo) para decir la verdad única.

## 6. Componentes

Backend: módulo de constantes del fondo (hitos/cortes) + `dashboard.service` +
`recommendations.service` + `templates.ts` + tests (unit de igualdad y de copys;
actualización de snapshots de recomendaciones). Frontend: ninguno (textos vienen
del servidor).

## 7. Base de datos
Ninguna.

## 8. Backend
Solo lo listado en §6. Sin cambios al Motor ni a sus lecturas persistidas (la
fórmula canónica NO se toca — se adopta).

## 9. Uso de IA
Ninguno.

## 10. Riesgos

- **Frescura en Inicio (P2 Alt A):** si el Motor recalcula por eventos con
  retraso, Inicio podría mostrar una cobertura vieja tras un movimiento grande —
  cuantificar la cadencia real en AUD antes del DEC.
- **Percepción de pérdida en Inicio:** la usuaria demo hoy ve "~4 meses" (sobre
  ahorro total); con la definición oficial verá la cobertura del fondo marcado
  (menor si tiene ahorro sin marcar). Es la honestidad del concepto — mitigación:
  el copy invita a marcar cuentas como fondo (la acción existe).
- Snapshots de tests de recomendaciones cambian con el copy — esperado y
  declarado.

## 11. Dependencias
Motor FIN-003 (métrica persistida), logros FIN-008, recomendaciones FIN-007.
Ninguna nueva.

## 12. Impacto
3 servicios tocados, 0 pantallas, 0 migraciones. §32 cumplido por construcción
para el segundo concepto financiero de la app.

## 13. Criterios de aceptación

1. **Grep §32:** ninguna fórmula de "meses de cobertura" fuera del módulo oficial
   (`core-metrics` + constantes); ningún literal `3`/`6` de meta en copys — todo
   importado de la constante.
2. **Test de igualdad:** para el mismo usuario, la cobertura que expone Inicio ==
   lectura persistida del Motor == la que muestra Salud.
3. Caso a mano unitario de la fórmula y de la selección de hito (usuario <3, entre
   3 y 6, ≥6).
4. Capturas reales de las tres pantallas co-visibles (Inicio, Salud, Presupuesto
   P5) leyéndose como UNA historia coherente.
5. Suites completas verdes; cortes del Score y de Salud INTACTOS (verificable en
   el diff).
6. Revisión CPSAO de P3 **antes** del DEC (pedida por él en el hilo FIN-020).

## 14. Plan
1. AUD-021 (incluye re-verificación del matiz intra-servicio y cadencia del
   Motor) → 2. revisión CPSAO de P3 → 3. DEC-021 → 4. implementación + tests →
5. capturas de las 3 pantallas → 6. IMP-0021 con SHA y juicio razonado →
validación → cierre.
