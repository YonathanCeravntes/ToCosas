# IMP-0031 · Espina del SO Financiero — compra con tarjeta de crédito (Fase 1)

- **Versión:** 1.0
- **Fecha:** 2026-07-14
- **Autor:** Agente Arquitecto/Desarrollador
- **Estado:** Entregado — en rama de trabajo, para VALIDACIÓN e integración del CTO (§36.2)
- **Historial de cambios:**
  - v1.0 (2026-07-14) — emisión tras DEC-0031 (los 4 cambios obligatorios §3).
- **Módulo/Feature:** FIN-030 (Fase 1) · **Origen (§27):** Instrucción del Fundador · Prioridad Alta
- **Documentos base:** `ARQ-0031` v1.0 · `AUD-0031` (APROBADO CON OBSERVACIONES) ·
  `DEC-0031` · `DEC-0030` (umbrella) · guardarraíles A–K · `GOBERNANZA.md` §32/§42
- **Referencia inmutable (regla GOBERNANZA):** commit
  **`8473ed5e351d5456126ce32ada698ae3025444f5`**

## 1. Resumen

La tarjeta de crédito deja de ser un "crédito de contrato" y pasa a ser un
**producto con cupo**: se registra una **compra a cuotas** de punta a punta, y la
cascada (cupo → saldo → cuotas → presupuesto → Score → flujo) es **§32 por
construcción** y **§42** (visible / explicable / reversible). Es la espina de
FIN-030: un caso real que atraviesa toda la arquitectura, no los 11 tipos.

El corazón del IMP es el **cambio obligatorio de §32**: "lo comprometido" de una
tarjeta lo resuelve la **misma autoridad única** (`DebtOutlayService`) desde las
`CardInstallment` — no una 2ª ruta, no el `Debt.monthlyPayment` de la tarjeta.
Con eso, teQueda / presupuesto / Copiloto / Motor incluyen la cuota de tarjeta
automáticamente (ya inyectan `DebtOutlayService`).

## 2. Cumplimiento (DEC-0031 §3)

| Cambio obligatorio | Implementación | Verificación |
|---|---|---|
| **§3.1 — extender `DebtOutlayService` (una autoridad)** | `outlaysByUser` incluye ahora las compras vivas de cada tarjeta; el compromiso mensual = **próxima cuota** de cada compra (`installments[0]` pendiente). Para `debtType='tarjeta_credito'` con compras usa esa suma; sin compras cae a `monthlyPayment` (regresión). UNA ruta, por inyección — `SpendableService`/`budget`/`context-assembler`/`debts`/Motor lo heredan sin tocarse. | unit `debt-outlay.service.spec.ts`: tarjeta con 2 compras → 297.000 (200k+97k), NO el `monthlyPayment`; tarjeta sin compras → `monthlyPayment` |
| **§3.2 — grep §32 de cierre** | "Lo comprometido" de tarjeta sale SOLO de `debt-outlay.service.ts` (`cardPurchases.reduce`); cupo/saldo (`usedAmount`/`availableCredit`) derivados SOLO en `card.service.ts`. Cero recálculo por pantalla, cero 2ª fuente. | grep en `src/modules` (ver §4) |
| **§3.3 — test de reversibilidad (§4.5)** | Anular sin cuotas pagadas → revierte saldo/cupo (cascada limpia por listeners); anular con ≥1 cuota pagada → **409** con la ruta de corrección ("no puedo borrarla sin falsear tu historial… corrige con un ajuste o anula esos pagos primero"). Rechazada la reversión compensatoria (Alt B). | e2e `fin031-tarjeta`: §42 revierte a 600k; §4.5 devuelve 409 con "falsear tu historial" |
| **§3.4 — alcance acotado** | La espina + compra-con-tarjeta. NO los 11 tipos (eso es FIN-032). Sin `HEALTH_SCORE`/`COPILOT` nuevos, sin claves, gate DPA+PIA intacto. | diff acotado a `modules/debts` + su UI |

## 3. Suites y evidencia

- **Unitaria 357/357** (`debt-outlay.service.spec.ts` +2 casos de tarjeta;
  restaurados los 4 casos FIN-023 con defaults `debtType`/`cardPurchases`).
- **E2E 12 suites / 49 tests** — `fin031-tarjeta.e2e-spec.ts` **5/5**: cupo
  inicial derivado; compra mueve saldo/cupo y NO crea 2ª deuda; §32 la cuota
  entra en `/budget/monthly` por la única autoridad; §42 anulación limpia
  revierte; §4.5 anulación con cuota pagada → 409. Sin regresión en las 11
  suites previas.
- **`tsc` limpio** (backend y frontend).
- **Migraciones** aplicadas con `migrate deploy`: `..._fin031_espina_tarjeta`
  (credit_limit + card_purchases + card_installments) y
  `..._fin031_source_tx_nullable` (origen trazable sin forzar un gasto en caja).
- **Capturas reales** (`docs/producto/capturas/fin-031/`, `capture-fin031.js`):
  detalle "Tu tarjeta" (cupo/utilizado + compras con trazabilidad); formulario
  de "registrar compra" (baja fricción, H); alta con selector Tarjeta de
  crédito + campo de cupo.

## 4. Grep §32 (una sola autoridad)

```
# Compromiso de tarjeta → SOLO DebtOutlayService
debt-outlay.service.ts: cardPurchases.reduce(… installments[0] …)  ← única ruta
# Cupo/saldo derivados → SOLO CardService
card.service.ts: usedAmount / availableCredit (Σ cuotas pendientes)
```
No hay 2ª ruta en `CardService` para "lo comprometido", ni uso del
`Debt.monthlyPayment` de la tarjeta como segundo origen.

## 5. Modelo y decisiones (por qué así)

- **Evita el doble conteo:** una compra a crédito **no** es salida de caja hoy —
  la caja sale por las **cuotas**. Por eso la compra NO crea un gasto en efectivo
  (`sourceTransactionId` nullable, `ON DELETE SET NULL`); `CardPurchase` es su
  **origen trazable de primera clase** (causalidad G/§42). La cuota comprometida
  fluye por `DebtOutlayService` (§32), sin sumar dos veces en teQueda.
- **Cupo/saldo DERIVADOS** (`usedAmount` = Σ cuotas pendientes; `availableCredit`
  = `creditLimit − usedAmount`): cero columna que se desincronice.
- **La tarjeta no amortiza un contrato:** al crearla arranca en saldo 0 y sin
  tabla de amortización (el DTO acepta 0; `computeSchedule` devuelve plan vacío
  para tarjetas). El detalle de una tarjeta **oculta** la UI de amortización
  (Resumen/Abonar/Simulador/Plan de pago), que con saldo 0 mostraría "$0" y
  mentiría — coherente con §42 "explicable". La experiencia completa llega en el
  umbrella (FIN-030).
- **Sin duplicados (I):** la compra actualiza la tarjeta existente; no nace una
  2ª deuda (probado en e2e).

## 6. Archivos

- **Backend:** `prisma/schema.prisma` (Debt.creditLimit, CardPurchase,
  CardInstallment) · 2 migraciones · `debts/card.service.ts` (nuevo) ·
  `debts/debt-outlay.service.ts` (extensión §32) · `debts/debts.controller.ts`
  (endpoints cards) · `debts/debts.module.ts` · `debts/debts.service.ts`
  (create sin amortización para tarjeta) · `debts/dto/debt.dto.ts` (creditLimit,
  CreateCardPurchaseDto, saldo 0) · tests unit + `test/fin031-tarjeta.e2e-spec.ts`.
- **Frontend:** `api/types.ts` (CardSummary) · `api/endpoints.ts` (cards) ·
  `screens/debts/DebtDetailScreen.tsx` (sección "Tu tarjeta" + gate de
  amortización) · `screens/debts/AddDebtScreen.tsx` (selector tarjeta + cupo) ·
  `scripts/captura/capture-fin031.js`.

## 7. Pendiente para el CTO (§36.2/§36.3)

Validar (testing + grep §32 + reversibilidad) e **integrar** a la rama oficial.
Este es el primer IMP de FIN-030; sigue "un FIN a la vez". Las Fases siguientes
(otros tipos, flujo de caja proyectivo) quedan fuera por decisión de DEC-0031.
