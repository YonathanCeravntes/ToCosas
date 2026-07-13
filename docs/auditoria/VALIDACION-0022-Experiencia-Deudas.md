# VALIDACIÓN-0022 · Experiencia de Deudas

- **Documentos base:** `DEC-0022-Experiencia-Deudas.md` · `IMP-0022` v1.0 · `ARQ-0022` v1.0 · `AUD-0022`
- **Realiza:** Auditor de Milla
- **Fecha:** 2026-07-12
- **Referencia inmutable verificada:** commit `0f75a5cd187a121337d3016491d5e1aa92383486` (ancestro de HEAD confirmado)

---

## 1. Método

Cuatro capas DEC→IMP→Código→Evidencia sobre `0f75a5c` (`git show`, no working tree),
suites en vivo. Foco pedido por el CTO: que `attackOrder()` sea **genuinamente la misma
función** que consumen summary y simulación (no "mismo resultado hoy"), y el manejo de
`interestDifference ≈ 0`.

## 2. Los 4 cambios obligatorios del DEC §5

| # | DEC-0022 §5 exige | Código del commit confirma |
|---|---|---|
| **5.1** | Orden de ataque desde helper puro compartido, nunca re-derivado | `attackOrder(debts, strategy)` es helper puro en `portfolio.simulator.ts:120`; **`pickTarget` (paso 3 de la simulación, el que dirige el pago) devuelve `attackOrder(...)[0]`** (línea 136); `strategyOverview` (el summary) devuelve `attackOrder(portfolio, recommended)` (`simulations.service.ts`). **Misma función en la simulación y en la vista — no puede divergir por construcción.** ✓ |
| **5.2** | Copy describe lo que la cifra ES; manejar `≈0`, nunca "$0" ni "a ciegas" | `DebtsListScreen.tsx:166`: "Pagar la más cara primero (avalancha) en vez de la más pequeña (bola de nieve) te ahorra {X}"; `showSavings = interestDifference >= 1000` (línea 157); `≈0` → "ambos órdenes cuestan casi lo mismo — este es el recomendado" (línea 167). Grep "a ciegas": **vacío**. ✓ |
| **5.3** | Fijar contrato de `extraBudget` del bloque, documentado | `strategyOverview` llama `compareStrategies(portfolio, 0)` — extra fijo en 0 ("el orden no depende del excedente; la cifra es el PISO del ahorro"); divergencia con Recomendaciones (`surplus*0.3`) declarada en código e IMP §2. ✓ |
| **5.4** | Gatear la simulación a `debtsCount > 1` | Doble gate: `debts.length > 1` en `debts.service.ts:207` **y** `if (portfolio.length < 2) return null` en `strategyOverview`. Inicio no dispara la simulación con 0/1 deuda. ✓ |

## 3. Verificación del punto crítico (CTO): §32 por construcción, no por coincidencia

- `attackOrder` es el **único** punto que define el orden (comentario `portfolio.simulator.ts:115`). La simulación lo usa para dirigir el pago; el summary lo usa para el ranking mostrado. Son la misma llamada, no dos ordenamientos que "coinciden hoy".
- `strategyOverview` también omite (`return null`) si `!feasible` (presupuesto mínimo no amortiza) — degradación §29.1.
- **e2e `fin022-orden-ataque`**: asevera `sim.specifics.recommended === summary.strategy.recommended` y `sim.specifics.interestDifference ≈ summary.strategy.interestDifference` contra BD real — la igualdad summary==Simulador está protegida por prueba, no solo por lectura. Con 1 deuda `strategy: null` (gate); con 3 deudas escalonadas `interestDifference > 0` y orden por tasa.

## 4. Fuentes §32 (fronteras del ARQ) — confirmadas en captura

- **`totalDebt`:** el hero muestra **$11.059.801**, idéntico a la tarjeta "Deuda total" de Inicio (mismo `GET /debts/summary`). Las dos tarjetas suman exacto: 1.752.801 + 9.307.000 = 11.059.801. ✓
- **Cuotas:** "Tus cuotas suman $451.234 al mes" (= 97.199 + 354.035) — nunca "pagas"/"desembolso" (frontera FIN-023). ✓
- **Fecha de libertad:** "10 de may de 2029" = máx `payoffDate` de las dos amortizaciones. ✓
- **P4 mora:** solo vencimiento neutro, sin juicio. **DTI** no aparece (es de Salud). ✓

## 5. Pruebas — ejecución EN VIVO

| Suite | IMP declara | Ejecución del Auditor | Resultado |
|---|---|---|---|
| Unitaria | 313/313 | `npx jest` | **313/313, 39 suites** ✓ (incl. `attackOrder` + consistencia con la simulación) |
| E2E | 15/15 | `npm run test:e2e` | **15/15, 5 suites** ✓ (incl. `fin022-orden-ataque`: gate, orden real, igualdad §32 summary==Simulador) |
| Frontend tsc | limpio | — | detalle intacto en el diff (`DebtDetailScreen` ausente, P5) ✓ |

## 6. El caso `≈0` de la captura — evaluación

La demo (2 deudas de plazos similares, solo cuotas mínimas) cae exactamente en el caso
`interestDifference ≈ 0`: el bloque muestra "ambos órdenes cuestan casi lo mismo — este
es el recomendado (la más cara primero)". **Es matemáticamente correcto** (con solo
mínimos y plazos parecidos, el orden casi no cambia el costo — el ahorro nace del
excedente dirigido, que aquí es 0) y **honesto** (no inventa un ahorro que no existe, no
muestra "$0"). El caso de diferencia grande está demostrado en el e2e de 3 deudas. La
observación crítica 2 de `AUD-0022` queda resuelta tal como se pidió.

## 7. Reservas del IMP §4 — evaluación

Honestas, sin defecto oculto:
1. **Fecha de libertad = contrato actual (máx `payoffDate`), no la simulación con
   roll-over** — conceptos distintos; solo el primero está en pantalla. Correctamente
   declarado; no es una divergencia §32 (son dos preguntas distintas: "¿cuándo termino
   pagando lo pactado?" vs "¿cuándo si acelero?").
2. **`strategy.months` viaja en el payload pero la UI no lo usa** — reserva de producto,
   sin impacto técnico.
3. **Latencia de la doble simulación** — negligible hoy (coincide con `AUD-0022` §2).

## 8. Las 6 preguntas UX (§28-29, §32)

Sin hallazgos nuevos. La observación crítica de copy (`AUD-0022` §5.2) está resuelta: el
texto ya describe la cifra como avalancha-vs-bola de nieve y maneja el `≈0` sin culpa ni
"$0". §32 (pregunta 5) queda por construcción: `totalDebt` único y orden/cifra desde el
motor. Test emocional: orienta (norte = fecha de libertad), no califica.

## 9. Hallazgos

Ninguno bloqueante. Los 4 cambios obligatorios del `DEC` están implementados desde el
diseño, no parchados. Observación menor ya registrada (RC): revisar si el copy
alternativo `≈0` merece un puente más directo al abono extra — producto, no técnico.

## 10. Veredicto

**APROBADO.**

`IMP-0022` corresponde exactamente con `DEC-0022` en las cuatro capas, verificado sobre
`0f75a5c` con suites en vivo. El punto que el CTO marcó como crítico está confirmado
**por construcción**: `attackOrder()` es la única función que define el orden, la
consume tanto el `pickTarget` de la simulación como el `strategyOverview` del summary, y
la igualdad summary==Simulador está protegida por e2e — es "no puede divergir", no
"coincide hoy", cerrando el hallazgo bloqueante de `AUD-0022` con el mismo estándar que
`DEC-0021` §5.1. El copy de ahorro y el caso `≈0` quedaron correctos y honestos.
Recomiendo al CTO proceder con su verificación independiente y el cierre de FIN-022;
habilitado `FIN-023` (desembolso real, §32) según la secuencia del CPSAO.
