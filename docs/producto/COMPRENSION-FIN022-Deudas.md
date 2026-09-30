# Comprensión del problema · FIN-022 (Experiencia de Deudas)

- **Versión:** 1.0
- **Fecha:** 2026-07-12
- **Autor:** Agente Arquitecto
- **Estado:** Entregado — para evaluación del CTO y el CPSAO (requisito previo a ARQ-0022)
- **Historial de cambios:**
  - v1.0 (2026-07-12) — respuesta a las 5 preguntas, verificada contra el código real.

---

## Verificación previa contra el código (lo que existe HOY)

`DebtsListScreen.tsx` + `DebtDetailScreen.tsx` + `AddDebtScreen` (stack propio en la
pestaña Deudas), verificados en esta fecha:

- **La lista:** una tarjeta por deuda con nombre, saldo (`currentBalance`), tasa
  (`interestRate` + base), cuota (`monthlyPayment`) y "🏁 Terminas de pagar el
  {payoffDate}". Sin total agregado, sin orden estratégico (llegan en el orden del
  API), sin próximo vencimiento (muestra `payoffDate`, no `nextDueDate` — mejora ya
  registrada en ARQ-0018 §10).
- **El detalle (rico, fruto de FIN-012/013):** hero saldo+cuota; resumen del
  crédito (fecha de liquidación, cuotas restantes, **total en intereses**, total a
  pagar); **abono a capital REAL** con recibo (terminar antes / bajar cuota);
  seguros del crédito con **desembolso mensual real** (`totalMonthlyOutlay` =
  cuota + seguros aparte, `debt-insurance.service.ts:85`); simulador de abono con
  impacto en Score; plan de amortización (12 primeras cuotas).
- **Lo que el producto YA sabe y esta pantalla no usa:** la comparación
  avalancha/bola de nieve (motor FIN-007 — vive como recomendación `estrategia` y
  como escenario `estrategia_deudas` del Simulador, con cifra real de "diferencia
  en intereses entre estrategias"); el `nextDueDate` que FIN-018 volvió confiable
  (avanza al pagar); los insights de mora NO existen (dominio mora sigue diferido —
  ARQ-0018 §4.9, ARQ-0020 §4.1-bis).

### Inventario §32 — cifras de deuda ya visibles en otras pantallas (encargo del CTO)

| Concepto | Fuente única actual | Dónde se ve |
|---|---|---|
| Deuda total (stock) | `Σ currentBalance` | Inicio (tarjeta "Deuda total"); misma suma en patrimonio |
| Pagado este ciclo | transacciones `pago_deuda` reales | Inicio ("$590.199 pagado desde el 1 de jul") |
| Interpretación de cuotas | `interpretDebt` (pagado/ingreso del ciclo) con `DEBT_RATIO_CUTS` | Inicio |
| DTI (cuotas programadas / ingreso ref.) | Motor (`MetricKey.Dti`), **mismos cortes** `DEBT_RATIO_CUTS` | Salud (indicador Endeudamiento) — ratio DISTINTO al de Inicio que comparte cortes a propósito (FIN-017 ruta (a), documentado) |
| Cuotas del mes y vencimientos | `debt.monthlyPayment` + `nextDueDate` vía `SpendableService` | Presupuesto (protegido + casa de cuotas), Inicio (próximo vencimiento) |
| Costo total futuro (intereses, fecha libertad) | `projection` (amortización FIN-003/012) | SOLO el detalle de deuda |

**Hallazgo §32 a resolver en el ARQ (misma clase que los dos anteriores):** el
"desembolso mensual real" de FIN-013 (cuota + seguros que se pagan aparte) existe
SOLO en el detalle. Presupuesto, `SpendableService`, el DTI del Motor y las
recomendaciones usan `monthlyPayment` a secas — para una usuaria con seguros
aparte, "lo comprometido" está subestimado en todas las pantallas menos una.
Verificable: `debt-insurance.spec.ts:29-33` (545.000 vs 500.000). No lo decido
aquí; lo dejo como pregunta formal para el ARQ-0022/DEC.

## Las 5 preguntas

### 1 · ¿Qué problema cotidiano intenta resolver realmente?

**"¿Cuál pago primero y cuánto me está costando de verdad?"** El usuario con 2–5
deudas no sufre por falta de datos por deuda — sufre porque nadie le ordena el
ataque: paga la cuota que le cobran, por instinto o por miedo (la más chica, la
más gritona), mientras la más cara le crece. Hoy la pantalla es un archivador:
responde "¿cuánto debo de ESTA?" pero no "¿cuánto debo en total, cuánto se me va
al mes en deudas, cuál me cuesta más por peso prestado, y cuándo quedo libre si
sigo así?". La respuesta estratégica existe en el producto (motor de estrategias,
FIN-007) pero vive escondida en el Simulador y en una recomendación que puede no
estar activa.

### 2 · ¿Por qué merece experiencia propia y no se resuelve desde Inicio o Presupuesto?

Porque la deuda es la única entidad del producto **con contrato**: tasa, plazo,
seguros, amortización. Inicio muestra el stock (foto ejecutiva); Presupuesto
muestra el flujo del ciclo (la cuota como compromiso de ESTE mes); Salud muestra
el ratio (qué parte del ingreso se va). Ninguna puede cargar las decisiones
ESTRUCTURALES — abonar a capital, elegir orden de ataque, endosar un seguro,
decidir entre bajar cuota o acortar plazo — sin romper su cadencia. Además ya es
la casa de dos capacidades reales que no tienen otro lugar: el abono a capital con
recibo (FIN-012) y los seguros con desembolso real (FIN-013).

### 3 · ¿Qué cambia en la capacidad de decisión del usuario?

Hoy: administra deudas una por una y ejecuta pagos que le cobran. Después debería:
**decidir el orden y el destino del excedente con el costo real sobre la mesa** —
ver el frente completo (total, costo mensual real, intereses futuros totales,
fecha de libertad), saber cuál atacar primero y por qué (la cifra de "la
diferencia entre estrategias son $X en intereses" ya se calcula), y ejecutar ahí
mismo (el abono real ya existe). El cambio es de administrador de archivos a
estratega: la misma distancia que Salud recorrió en FIN-019 entre "ver
indicadores" y "conocer tu jugada".

### 4 · ¿Qué error común evita?

Tres, todos observables con datos que ya tenemos: **(a)** pagar primero la deuda
equivocada — el motor ya cuantifica cuánto cuesta ese error (`interestDifference`
entre estrategias); **(b)** creer que la cuota es el costo — ignorando seguros
aparte (FIN-013 lo hizo visible pero solo dentro del detalle) y el total de
intereses futuros (solo en el detalle); **(c)** no saber cuándo termina — la
fecha de libertad existe por deuda pero nadie la agrega ("¿cuándo quedo libre de
TODO?"), que es la que sostiene la motivación.

### 5 · ¿Qué perdería el usuario si esta experiencia no existiera? (anticipo §31)

**El contrato y su costo.** Se perdería: (a) la administración del ciclo de vida
de la deuda — alta con condiciones, seguros/endoso, abono real, pago total: nada
de eso cabe en otra pantalla; (b) la única vista del **costo futuro** del stock
(intereses totales, fecha de liquidación, plan de pago) — Inicio/Presupuesto/Salud
miran el presente del flujo, nadie más mira lo que la deuda va a costar; (c) el
lugar natural de la decisión estratégica multi-deuda. El valor diferencial
anticipado para el filtro §31: **es la única experiencia donde la deuda se ATACA,
no solo se observa y se paga.**

## Nota de alcance para la decisión del CTO/CPSAO (previa al ARQ)

1. **Conectar, no inventar (patrón FIN-019):** el orden estratégico y su cifra ya
   existen en el motor; la candidata natural es traerlos a la lista como
   narrativa (jugada/orden de ataque), no construir un motor nuevo.
2. **Mora:** sigue siendo dominio diferido (`nextDueDate` solo se normaliza al
   pagar). ¿Entra en FIN-022 (la pantalla de deudas es su lugar natural) o se
   difiere otra vez de forma explícita? Ambas defendibles; pido decisión.
3. **Hallazgo del desembolso real (§32, arriba):** si se confirma que "lo
   comprometido" debe incluir seguros aparte, toca a FIN-020/021 ya cerradas
   (SpendableService, DTI, recomendaciones) — sería FIN propia o pieza explícita
   de esta, no un arreglo silencioso.
