# AUD-0031 · Fase 1 — La espina + compra con tarjeta de crédito de punta a punta

- **Documento auditado:** `docs/arquitectura/ARQ-0031-Fase1-Espina-Compra-Tarjeta.md` v1.0 (commit de trabajo, §36.2)
- **Insumos:** `ARQ-0030` umbrella · `AUD-0030` · `DEC-0030` §3 (cambios obligatorios) · guardarraíles A–K · `GOBERNANZA.md` §31/§32/§42 · código verificado contra `HEAD`
- **Realiza:** Auditor de Milla
- **Fecha:** 2026-07-14

---

## 1. Resumen Ejecutivo

`ARQ-0031` diseña la Fase 1 (la espina) con el caso compra-con-tarjeta de punta a punta.
La condición de cierre que exigió `DEC-0030` §3.1 — la política de reversión con
dependientes — está **resuelta con precisión y bien razonada** (§4.5). El patrón de
cupo/saldo derivados (no almacenados) es correcto §32. **Una observación con peso: el
diseño da por automático el flujo de las cuotas de tarjeta hacia "lo comprometido"
(teQueda/desembolso), y contra código eso NO ocurre solo** — hay que extender la fuente
única, no asumir que "ya entra". Sin hallazgos bloqueantes.

## 2. La política de reversión (§4.5) — condición de cierre CUMPLIDA y bien resuelta

`DEC-0030` §3.1 (mi observación de `AUD-0030`) exigía declarar la política de reversión
con dependientes. El ARQ la fija como **regla, no alternativa suelta**:
- **Sin cuotas pagadas → anulación limpia** (anular la tx origen vía servicio central
  FIN-028 → `CardPurchase`/cuotas anuladas → saldo/cupo derivados vuelven solos).
- **Con ≥1 cuota pagada → bloquear la anulación directa + ruta de corrección** (Alt A).

**El razonamiento es correcto y es el punto fino:** rechaza Alt B (contra-asiento
compensatorio) porque es *reversible pero no explicable* — §42 exige **ambas**, y fabricar
un asiento que la usuaria no hizo viola "nunca mentir hacia arriba" aunque deje el saldo
"correcto". Es exactamente la protección de Confianza que el CPSAO pidió vigilar por encima
de todo. **Confirmo Alt A como la correcta.** El copy (§29.2, no culpa, explica) es el
adecuado.

## 3. §32 — cupo/saldo derivados (correcto) y un GAP de integración (observación con peso)

- **Correcto:** `usedAmount`/`availableCredit` se **DERIVAN** en `CardService` hoja
  (`usedAmount = Σ saldo pendiente de compras vivas`; `availableCredit = creditLimit −
  usedAmount`), no se almacenan — evita la columna que se desincroniza. Patrón
  `DebtOutlayService`. Verifiqué que `creditLimit` no existe hoy en `Debt` (grep vacío):
  es extensión nueva, no rompe nada. La amortización para el caso con interés reusa la
  función pura de FIN-012 (`finance/amortization` + `interest.util`) — cero fórmula nueva
  para el plan de cuotas. ✓
- **GAP (observación con peso):** el ARQ §4.4/§8 afirma que "las cuotas comprometidas
  entran por `SpendableService` (ya lee `nextDueDate`/desembolso — FIN-020/023). **Cero
  fórmula nueva**". **Contra código, eso no ocurre solo:** `SpendableService` computa la
  cuota comprometida vía `DebtOutlayService`, que la calcula desde
  `Debt.monthlyPayment` + `insurances` (`debt-outlay.service.ts:40`, `paymentBreakdown`) —
  **no** desde ningún modelo de tarjeta. Las nuevas `CardInstallment` **no fluyen
  automáticamente** a teQueda/desembolso/Motor. Para que lo hagan, o bien (a) se persiste
  el agregado de cuotas en `Debt.monthlyPayment` (columna que se desincroniza — contradice
  el propio §4.1 "derivar, no almacenar"), o bien (b) se **extiende la fuente única**
  (`DebtOutlayService`, la autoridad §32 de "lo comprometido") para incluir las
  `CardInstallment` del ciclo. La opción correcta es (b), pero **es un cambio real**, no el
  "cero cambio / ya entra" que el ARQ sugiere.

  **Riesgo si no se corrige el encuadre:** que el `IMP` calcule el compromiso de la tarjeta
  en `CardService` **y** el resto en `DebtOutlayService` → dos rutas de "lo comprometido" =
  exactamente el bug §32 que la iniciativa entera viene a evitar, ahora en Fase 1. El
  criterio de grep §32 (§4.7) debe cubrir explícitamente que el compromiso de la cuota de
  tarjeta viva en **una** autoridad (`DebtOutlayService` extendido), consumida por
  inyección, nunca recomputada en `CardService` ni en pantalla.

## 4. Composición sobre Registrar (§42/G) y sin duplicados (I)

- El alta ya emite `TransactionCreated` por outbox (verificado, `transactions.service.ts`);
  la compra emite `CardPurchaseRegistered` con `sourceTransactionId` (causalidad G) y los
  listeners componen — cero lógica financiera en la mutación (DEC-0028 §5.1). Correcto.
- **I (sin duplicados):** `CardPurchase` ligado a `debtId` — la compra actualiza la tarjeta
  existente, no crea una 2ª deuda. Test declarado. ✓
- **Trazabilidad + acuse:** `sourceTransactionId` en cada `CardPurchase`/`CardInstallment`
  + acuse explícito (FIN-029) — §42 por construcción. ✓

## 5. Otras piezas

- **"Flujo de caja" fuera de Fase 1 (J):** correcto — no pasa el gate del DSS ("Te queda"
  ya responde su pregunta; solo se justifica la dimensión proyectiva, otra FIN). Bien
  diferido.
- **H (baja fricción):** el flujo pide solo el delta (cuotas, con/sin interés); contado = 1
  tap. Criterio de aceptación, correcto.
- **Confirmación en dos niveles:** la compra (hecho directo) sin 2º paso; modificación no
  ingresada (cambiar cupo) con confirmación. Codifica la decisión 3 del Fundador.
- **Regresión:** tarjeta sin `creditLimit` = comportamiento actual (nullable, sin backfill)
  — test declarado.

## 6. Filtro §31

Sustantiva — "ves cuánto te queda de tu tarjeta y tus compras a cuotas viven solas, sin
registrarlas dos veces, y pudiendo deshacer lo que no tocó plata real". Primer eslabón
donde "registrar un hecho" se vuelve "Milla registra sus consecuencias". Cumple.

## 7. Observaciones

1. **GAP §32 de integración (con peso, no bloqueante):** el compromiso de las cuotas de
   tarjeta NO entra solo a teQueda/desembolso; el `IMP` debe **extender `DebtOutlayService`**
   (la autoridad única de "lo comprometido") para incluir `CardInstallment`, y el grep §32
   debe verificar que el compromiso de tarjeta vive en una sola autoridad — nunca dos rutas
   (CardService + DebtOutlay). Corregir el §4.4/§8 del ARQ: no es "cero fórmula nueva / ya
   entra", es "extender la fuente única, una vez".
2. **Reversión (§4.5):** cerrada; el test de reversibilidad (crear→efectos; anular sin
   pagos→revierte; anular con pagos→bloquea+corrige) es criterio de cierre de FIN-031 — la
   Validación lo ejecutará en vivo.
3. **Costo de derivar en cada lectura:** negligible (una suma por tarjeta); el ARQ ya
   declara el cache por evento como diferido si pesara.

## 8. Veredicto

**APROBADO CON OBSERVACIONES.**

Fase 1 resuelve la condición de cierre (política de reversión con dependientes) con
precisión y el razonamiento §42 correcto (reversible **y** explicable; rechaza el
contra-asiento fantasma) — la protección de Confianza central queda bien puesta. El patrón
cupo/saldo derivados es §32 correcto. La observación con peso es de integración: las cuotas
de tarjeta **no** fluyen solas a "lo comprometido" (SpendableService/DebtOutlay leen
`Debt.monthlyPayment`, no `CardInstallment`); el `IMP` debe extender la fuente única
`DebtOutlayService` para incluirlas — en **una** autoridad, por inyección — y el §4.4/§8 del
ARQ debe corregir el "cero fórmula nueva / ya entra". Es precisamente donde el bug §32
multiplicado por tipos entraría; el grep de cierre debe cubrirlo. Ninguna observación exige
rehacer el diseño.
