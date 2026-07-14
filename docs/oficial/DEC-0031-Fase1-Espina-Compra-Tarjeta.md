# DEC-0031 · Fase 1 de FIN-030 — espina del SO Financiero + compra-con-tarjeta

- **Versión:** 1.0
- **Fecha:** 2026-07-14
- **Autor:** CTO (Claude)
- **Estado:** Emitida — habilita `IMP-0031`
- **Base:** `ARQ-0031` v1.0 (Fase 1) · `AUD-0031` (APROBADO CON OBSERVACIONES) · `DEC-0030` (umbrella) · guardarraíles A–K · `GOBERNANZA.md` §42

---

## 0. Verificación independiente previa (CTO)

Verifiqué el GAP §32 del Auditor contra el código: `DebtOutlayService.outlaysByUser`
(`debt-outlay.service.ts:40`) computa "lo comprometido" desde `Debt.monthlyPayment` por deuda
activa, y **es la autoridad única** — la inyectan `SpendableService` (teQueda), `budget.service`,
`context-assembler` (Copiloto), `debts.service` y el Motor (`debtMonthly = outlays.totalOutlay`).
Confirmado: las cuotas de tarjeta **no fluyen solas** a teQueda/desembolso/Score. El GAP es real.

## 1. Resumen ejecutivo

Se aprueba la Fase 1 (espina + compra-con-tarjeta de punta a punta) con **un cambio obligatorio
de §32**: las `CardInstallment` deben entrar a "lo comprometido" por la **misma autoridad única**
(`DebtOutlayService`), no por una segunda ruta. Con eso, la cascada de la compra (cupo, saldo,
cuotas, presupuesto, Score, flujo) es §32 por construcción y §42 (visible/explicable/reversible).

## 2. Decisiones aprobadas

- **Política de reversión con dependientes (§4.5, condición de cierre de DEC-0030) — aprobada
  tal cual:** sin cuotas pagadas → anulación limpia (anular la transacción origen revierte la
  cascada por los mismos listeners); **con ≥1 cuota pagada → bloquear la anulación directa +
  ruta de corrección** (Alt A). El rechazo de la reversión compensatoria (Alt B) es correcto:
  un contra-asiento fantasma es reversible pero **no explicable** — §42 exige ambas, y falsear
  el historial de una compra que movió plata real viola "nunca mentir hacia arriba". Es la
  protección de Confianza central que el CPSAO pidió vigilar.
- **Cupo/saldo/cuotas DERIVADOS** en un `CardService` hoja (§32, cero columna que se
  desincronice). Costo negligible; cache diferido bien declarado.
- **Causalidad (G/§42):** la compra emite `CardPurchaseRegistered` con `sourceTransactionId`;
  los consumidores existentes reaccionan por listeners, sin fórmula nueva.
- **Sin duplicados (I):** la compra actualiza la tarjeta existente, no crea una 2ª deuda.
- **"Flujo de caja" queda FUERA de Fase 1** — no pasa el gate del DSS ("Te queda" ya responde
  su pregunta; la dimensión proyectiva de saldos futuros es otra FIN). Aprobado excluirlo.

## 3. Cambios obligatorios (§5)

1. **GAP §32 — extender `DebtOutlayService` para incluir `CardInstallment`** (autoridad única
   de "lo comprometido"), en **UNA** ruta, por inyección. **Prohibido:** una 2ª ruta en
   `CardService`, o usar el `Debt.monthlyPayment` de la tarjeta como segundo origen. Corregir
   el §4.4/§8 del ARQ (el "cero fórmula nueva / ya entra" es impreciso — hoy NO entra). Con la
   extensión, teQueda/presupuesto/Copiloto/Motor incluyen las cuotas de tarjeta automáticamente
   (todos ya inyectan `DebtOutlayService`).
2. **Grep §32 de cierre debe cubrir el punto anterior:** verificar que "lo comprometido" de una
   tarjeta con compras sale SOLO de `DebtOutlayService` (una fuente), no recalculado por
   pantalla ni por `CardService` en paralelo.
3. **Test de reversibilidad de la cascada** (cierre): crear compra → efectos (cupo/saldo/cuotas
   + teQueda/Score reaccionan); anular sin cuotas pagadas → todo se revierte; anular con cuota
   pagada → bloqueado con ruta de corrección. Es donde el bug ×tipos entraría en Fase 1.
4. **Alcance acotado:** la espina + compra-con-tarjeta. NO los 11 tipos (eso es FIN-032).

## 4. Observaciones aceptadas

- `CardPurchase`/`CardInstallment` son planos por compra, no el schedule de amortización del
  `Debt` — no colisionan (confirmado por el Auditor). El desembolso mensual de la tarjeta =
  suma de las cuotas vigentes, resuelto por `DebtOutlayService` extendido.

## 5. Próximos pasos

`IMP-0031` habilitado con los 4 cambios obligatorios. El Arquitecto entrega en rama de trabajo
con SHA; el CTO valida (testing §36.3 + grep §32 + test de reversibilidad) e integra (§36.2).
Es el primer IMP de la iniciativa FIN-030; sigue "un FIN a la vez".
