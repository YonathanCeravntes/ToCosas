# ARQ-0022 · Experiencia de Deudas

- **Versión:** 1.0
- **Fecha:** 2026-07-12
- **Autor:** Agente Arquitecto
- **Estado:** Emitido — para AUD-0022
- **Historial de cambios:**
  - v1.0 (2026-07-12) — emisión tras la autorización del CTO (hilo FIN-022) con
    "conectar, no inventar" aprobado y mora diferida por defecto.
- **Módulo/Feature:** FIN-022 · **Origen (§27):** Mejora de revisión de producto
  (hoja de ruta UX: Inicio ✅ · Salud ✅ · Presupuesto ✅ · **Deudas** · Simulador · Copiloto)
- **Documentos base:** `COMPRENSION-FIN022-Deudas.md` v1.0 · hilo
  `docs/correspondencia/FIN-022-Experiencia-de-Deudas.md` · GOBERNANZA §29/§31/§32

## 0. Intención

Que el usuario con deudas deje de ser un archivador de cuotas y pase a ser un
estratega: ver el frente completo, saber **cuál atacar primero y por qué**, y
ejecutar ahí mismo — con cifras que ya calculamos y hoy están escondidas.

## 1. Objetivo

Rediseñar la LISTA de deudas como zona de decisión (frente completo → orden de
ataque → costo por deuda), conectando el motor de estrategias de FIN-007. El
detalle (la casa del contrato: FIN-012/013) se conserva.

## 2. Problema

Verificado en `COMPRENSION-FIN022` §previa: la lista actual responde "¿cuánto
debo de ESTA?" y nada más. Sin total, sin costo mensual, sin orden, sin fecha de
libertad; el `nextDueDate` confiable de FIN-018 no se muestra (se muestra
`payoffDate`); la comparación avalancha/bola de nieve — con su cifra real de
"cuánto cuesta pagar a ciegas" — vive escondida en el Simulador y en una
recomendación condicionada a DTI>0.35.

## 3. Alcance

`DebtsListScreen` (rediseño) + extensión de `GET /debts/summary` (bloque de
estrategia, sin persistencia). **Fuera de alcance, declarado:** el detalle
(estructuralmente correcto — FIN-012/013); **mora** (diferida 3ª vez → FIN-024,
con la única concesión visual de P4); **desembolso real con seguros aparte**
(FIN-023, prioridad inmediata tras esta — aquí las cuotas se etiquetan como lo
que son); DTI (pertenece a Salud, no se duplica).

## 4. Diseño — alternativas por pieza

### P1 — El frente completo (hero de la lista)

| | **Alt A — Hero agregado único (recomendada)** | **Alt B — Statu quo (tarjetas sueltas)** |
|---|---|---|
| Qué es | Tarjeta verde Millo: "Debes {totalDebt} · {N} deudas" + "Tus cuotas suman {monthlyPaymentsTotal} al mes" + "🏁 Libre de todo: {máx payoffDate}" | Sin agregado |
| Ventajas | Responde de entrada "¿cuánto debo y cuándo salgo?"; fecha de libertad TOTAL no existe en ninguna pantalla; mismo patrón de hero único (FIN-017 P2) | Cero cambios |
| Desventajas | Un número grande arriba puede sentirse pesado — se mitiga con la fecha de libertad al lado (norte, no castigo) | La pregunta agregada sigue sin casa |

Fuentes §32: `totalDebt` y `monthlyPaymentsTotal` del MISMO `GET /debts/summary`
que ya alimenta Inicio (una fuente); fecha de libertad = máx `projection.payoffDate`
del list (amortización FIN-003/012, la misma del detalle). La línea de cuotas se
copia como "tus cuotas suman" (contrato programado) — NUNCA "pagas al mes", que
insinuaría desembolso real (FIN-023) o pagado del ciclo (Inicio).

### P2 — El orden de ataque (conectar FIN-007 — el corazón de la FIN)

| | **Alt A — Bloque "orden de ataque" con el motor (recomendada)** | **Alt B — Reordenar la lista silenciosamente** | **Alt C — Depender de la recomendación activa** |
|---|---|---|---|
| Qué es | Bajo el hero: "⭐ Tu orden de ataque — {avalancha/bola de nieve}" + la cifra del motor ("pagar en este orden te ahorra {interestDifference} en intereses frente a pagar a ciegas") + ranking 1º/2º/… con 🎯 en la primera + "🧪 Verlo en el simulador →" (`estrategia_deudas`) | La lista principal se ordena por estrategia sin decirlo | Mostrar solo si existe la recomendación `estrategia` |
| Ventajas | El porqué y el cuánto visibles; la lista principal conserva su orden (vencimiento) — cero sorpresas; mismo patrón jugada (FIN-019 P2) | "Automático" | Cero backend |
| Desventajas | Requiere extender `/debts/summary` | Reordenar sin explicar viola Claridad Radical; el usuario pierde su ancla | La recomendación solo existe con DTI>0.35 — el orden importa SIEMPRE |

Fuente §32: `SimulationsService.projectOnly({type:'estrategia_deudas'})` — el
MISMO motor del Simulador y de la recomendación, inyectado en el summary (thin,
sin persistir; patrón agregador de FIN-014). Nada se recalcula a mano.
Degradación declarada (§29.1): con 1 deuda el bloque muta a la jugada de abono
("cada peso extra a {nombre} te ahorra intereses — 🧪 simúlalo") y con 0 deudas
no existe; si el motor no puede comparar (datos incompletos), el bloque SE OMITE.

### P3 — El costo visible en cada tarjeta

| | **Alt A — Pesos concretos (recomendada)** | **Alt B — Dejar tasa sola** |
|---|---|---|
| Qué es | Cada tarjeta suma dos líneas de datos que el list YA trae: "vence {nextDueDate}" (mejora registrada en ARQ-0018 §10, coherente con Presupuesto) e "intereses restantes: {projection.totalInterest}" | Tasa + cuota como hoy |
| Ventajas | La tasa es abstracta; los pesos son la lengua de la casa (familia FIN-017); el costo por deuda sustenta el orden de P2 a simple vista | Menos denso |
| Desventajas | Tarjeta con una línea más | "32% EA" no le dice a nadie cuánto le duele |

### P4 — Frontera con la mora (diferida, con etiqueta honesta)

La lista ordena por `nextDueDate` y ahora lo muestra: si la fecha ya pasó, la
etiqueta es NEUTRA — "venció el {fecha}" sin color de juicio ni lógica nueva
(mismo criterio §4.1-bis de FIN-020: no sabemos más de lo que sabemos). Todo lo
demás del dominio mora (detección, avisos, normalización) es FIN-024 — declarado.

### P5 — El detalle se conserva

Sin cambios estructurales: ya es la casa del contrato (abono real, seguros,
proyección, plan). Única pieza nueva: ninguna. (Si el DEC quisiera micro-copys,
serían ajustes puntuales, no diseño.)

### 4.6 — Composición (si el DEC aprueba las recomendadas)

```
[Mis deudas]
┌─ Debes $11.059.801 · 2 deudas ────────────┐
│ Tus cuotas suman $451.234 al mes          │
│ 🏁 Libre de todo: mar 2028                │
└───────────────────────────────────────────┘
┌─ ⭐ Tu orden de ataque — avalancha ────────┐
│ Pagar en este orden te ahorra $2.4M en    │
│ intereses frente a pagar a ciegas.        │
│ 🎯 1º Tarjeta de crédito (32% EA)         │
│    2º Crédito libre inversión (18% EA)    │
│ 🧪 Verlo en el simulador →                │
└───────────────────────────────────────────┘
[+ Nueva deuda]
┌─ Tarjeta de crédito      $2.999.801 ──────┐
│ 32% EA · Cuota $97.199 · vence 28 jul     │
│ Intereses restantes: $610.230             │
│ 🏁 Terminas: nov 2027                     │
└───────────────────────────────────────────┘
[… más tarjetas, orden por vencimiento …]
```

## 5. Respuesta al filtro §31

Si Deudas no existiera, el usuario perdería **el único lugar donde la deuda se
ATACA en vez de solo observarse y pagarse**: el ciclo de vida del contrato (alta,
seguros/endoso, abono real con recibo, pago total), la vista del costo futuro
(intereses totales, fecha de libertad — nadie más mira lo que la deuda VA a
costar) y, con esta FIN, la decisión estratégica multi-deuda con su precio
calculado. Inicio muestra el stock, Presupuesto el flujo del ciclo, Salud el
ratio: ninguna puede absorber el contrato sin romper su cadencia. Valor
diferencial: **la única experiencia que mira la deuda hacia adelante y permite
cambiarle el final.**

## 6. Componentes
Backend: `debts.service.summary()` extendido con `strategy` (inyecta
`SimulationsService.projectOnly`, sin persistencia) + tests. Frontend:
`DebtsListScreen` rediseñada. Detalle intacto.

## 7. Base de datos
Ninguna.

## 8. Backend
Solo la extensión del summary. Sin cambios al motor de simulación ni a
recomendaciones; sin migraciones; sin IA (§9: ninguno).

## 9. Uso de IA
Ninguno.

## 10. Riesgos
- `projectOnly(estrategia_deudas)` se diseñó para excedente explícito — verificar
  en implementación que con `extraBudget: 0` la comparación de orden sigue siendo
  válida; si el motor exige excedente, el bloque usa el excedente real del mes y
  lo declara ("con tu excedente de $X…"). Cuantificarlo en AUD.
- Costo de latencia del summary (una simulación por carga): aceptable a escala
  actual; si pesara, cache por usuario/mes — decisión diferida y declarada.
- El hero agregado hace MÁS visible la deuda total — puede doler; la fecha de
  libertad al lado es la narrativa de salida (norte, no castigo).

## 11. Dependencias
Motor de estrategias FIN-007, amortización FIN-003/012, `nextDueDate` confiable
FIN-018, summary FIN-014/017. Ninguna nueva.

## 12. Impacto
1 pantalla rediseñada + 1 endpoint extendido. Tres preguntas nuevas con
respuesta: ¿cuánto debo en total? ¿cuál ataco primero y cuánto vale pagar bien?
¿cuándo quedo libre de todo?

## 13. Criterios de aceptación
1. **§32:** el total del hero == `totalDebt` del mismo summary que consume Inicio
   (test de igualdad); la estrategia y su cifra salen del motor (test: mismo
   resultado que el escenario `estrategia_deudas`); grep: cero fórmulas nuevas de
   deuda en la pantalla/endpoint.
2. Caso a mano del bloque estrategia (2 deudas con tasas distintas → orden y
   ahorro esperados) + degradaciones (1 deuda → jugada de abono; 0 → nada; motor
   sin datos → bloque omitido).
3. Capturas reales full-scroll antes/después de la lista (usuaria demo, 2 deudas)
   + cold-start real (usuario sin deudas).
4. "Tus cuotas suman" jamás se copia como desembolso/pagado (revisión de copy —
   frontera FIN-023).
5. Suites completas verdes; typecheck; detalle sin cambios en el diff.
6. Filtro §31 respondido (§5).

## 14. Plan
1. AUD-0022 → 2. DEC-0022 → 3. summary extendido + tests → 4. `DebtsListScreen`
rediseñada → 5. capturas antes/después + cold-start → 6. IMP-0022 con SHA y
juicio razonado → validación → cierre.
