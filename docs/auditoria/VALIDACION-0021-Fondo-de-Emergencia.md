# VALIDACIÓN-0021 · Única definición del fondo de emergencia (§32)

- **Documentos base:** `DEC-0021-Fondo-de-Emergencia.md` · `IMP-0021-Fondo-de-Emergencia.md` v1.0 · `ARQ-0021-Fondo-de-Emergencia.md` v1.0 · `AUD-0021`
- **Realiza:** Auditor de Milla
- **Fecha:** 2026-07-12
- **Referencia inmutable verificada:** commit `6ee4d9d9e4403474fd65c0b69b93088db21d5f31` (ancestro de HEAD confirmado)

---

## 1. Método

Cuatro capas DEC→IMP→Código→Evidencia sobre `6ee4d9d` (`git show`, no working tree),
con suites ejecutadas EN VIVO. Foco explícito pedido por el CTO: el cambio obligatorio
`DEC-0021` §5.1.

## 2. Cambio obligatorio §5.1 (el punto crítico) — CUMPLIDO por construcción

`DEC-0021` §5.1 exigía que Recomendaciones **consuma la fuente/constantes oficiales,
no solo alinee la meta** ("no puede divergir nunca", no "coincide hoy"). Verificado en
`recommendations.service.ts` del commit:

- Importa `nextMilestone` de `emergency-fund.constants.ts` (línea 5).
- Lee `EmergencyFundMonths` y `EssentialExpense` de las **métricas persistidas**
  (`readMonthMetrics`, líneas 111-113) — ya **no** recalcula `essential = fixedExpense +
  Σ cuotas` inline y `state.emergencyBalance` fue eliminado del bloque (grep confirma).
- El gap usa `(milestone.months − fundMonths) × essential`, todo desde la lectura
  persistida + la constante oficial.

**Grep §32:** la fórmula `emergencyBalance / essential` existe **una sola vez** en todo
el backend — `core-metrics.ts:61`. No queda ninguna computación paralela.

## 3. Correspondencia por pieza (DEC-0021 → código → captura)

| Pieza | Código confirma | Captura confirma |
|---|---|---|
| **P1 · canónica intacta** | `core-metrics.ts` sin cambios en el diff; fórmula única (grep §2) | — |
| **P2 · Inicio lee al Motor** | `interpretSavings` (fórmula propia) **eliminada**; `interpretEmergencyFund` lee la `MetricReading` persistida (líneas 69,164,245) e importa la constante oficial | Inicio: "Tu fondo cubre ~1.3 meses de lo esencial — tu colchón inicial son 3"; la vieja "~4 meses" desapareció; el monto de ahorro ($5.700.000) se conserva (no es "meses", no viola §32) |
| **P3 · Alt C hitos nombrados** | `EMERGENCY_FUND_MILESTONES` (colchón inicial 3 / fondo completo 6) + `nextMilestone()`; escala coincide con logros/cortes de Salud | Jugada nombra "colchón inicial"; "3 meses de lo esencial cubiertos" |
| **P4+§5.1 · Recomendaciones** | ver §2 | Jugada: "Aparta $1.022.340/mes para tu colchón inicial… en 4 meses" — **idéntica en Salud y en Presupuesto P5** |
| **§5.2 · cero literales** | glosario (`templates.ts`) importa e interpola la constante; grep de "3 meses"/"6 meses" en los 3 archivos: **vacío** | — |

**Prueba visual de §32 (igualdad entre pantallas):** Inicio muestra **~1.3 meses** y
Salud muestra **"Fondo de emergencia: 1.3 meses"** — el mismo dato del mismo
`MetricReading`. La contradicción que abrió la FIN ("~4 meses" vs "llegarías a 3") ya
**no es reproducible**: hoy los tres puntos leen la misma métrica y nombran el mismo
hito.

## 4. Cortes de Salud/Score intactos (§13.5)

El diff no toca `health.service.ts` ni `score.util.ts` — confirmado en `--stat`. Salud
conserva 62/90/63/70 y su escala; FIN-004 no se re-audita, tal como el diseño prometió.

## 5. Pruebas — ejecución EN VIVO

| Suite | IMP declara | Ejecución del Auditor | Resultado |
|---|---|---|---|
| Unitaria | 310/310 | `npx jest` | **310/310, 39 suites** ✓ |
| E2E | 12/12 | `npm run test:e2e` | **12/12, 4 suites** ✓ — incluye `fin021-fondo-unico` (igualdad Inicio == lectura del Motor == Salud contra BD real) |

(El aviso de "worker no salió limpio" es teardown, no falla de test — los 310 pasan.)

## 6. Reservas del IMP §4 — evaluación

Las 3 son honestas y no ocultan un defecto:
1. **Frescura ~25 s** — aceptada en `DEC` §4.2; coincide con mi cuantificación en
   `AUD-0021` §4.
2. **La recomendación de fondo ahora se genera entre 3 y 6 meses** — efecto correcto de
   Alt C (antes se apagaba en 3), es un cambio de comportamiento del motor declarado, no
   un defecto.
3. **Salud conserva literales "hasta llegar a 6 meses"** en sus textos de acción/rango
   porque quedó fuera de alcance. Es honesto y **no viola §32 en el número** (Salud lee
   la misma métrica; el 1.3 es idéntico). Es solo copy no plegado a la constante —
   observación menor para un ciclo futuro, no bloqueante.

## 7. Las 6 preguntas UX (§28-29, §32)

Sin hallazgos nuevos. La FIN mejora directamente la pregunta 1 (interpretación) y la 5
(coherencia §32): elimina la contradicción "~4 vs 3" convirtiéndola en un hito nombrado
coherente. Único costo, ya aceptado en `DEC` §6 y declarado en el IMP: la línea de
ahorro de Inicio baja de "~4" a "~1.3 meses" (honestidad del concepto, mitigada por el
copy que invita al hito/marcar cuenta). El test emocional se sostiene: el usuario sale
orientado al próximo hito, no calificado.

## 8. Hallazgos

Ninguno bloqueante. Una observación menor no bloqueante: los literales de meta en los
textos de Salud (§6.3), plegables a la constante en un ajuste menor futuro.

## 9. Veredicto

**APROBADO.**

`IMP-0021` corresponde exactamente con `DEC-0021` en las cuatro capas, verificado sobre
el commit `6ee4d9d` con suites en vivo. El cambio obligatorio §5.1 está cumplido **por
construcción** — Recomendaciones consume la métrica persistida y las constantes
oficiales, la fórmula existe una sola vez (`core-metrics.ts:61`), y la igualdad entre
Inicio, Salud y la jugada de Presupuesto está confirmada visualmente (1.3 meses,
"colchón inicial") y protegida por el e2e. §32 queda resuelto por construcción para el
segundo concepto financiero de la app. Recomiendo al CTO proceder con su verificación
independiente y el cierre formal de FIN-021.
