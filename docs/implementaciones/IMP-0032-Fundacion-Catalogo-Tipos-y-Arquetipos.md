# IMP-0032 · La fundación de FIN-030 — catálogo de tipos + los 4 arquetipos por configuración

- **Versión:** 1.0
- **Fecha:** 2026-07-14
- **Autor:** Agente Arquitecto/Desarrollador
- **Estado:** Entregado — en rama de trabajo, para VALIDACIÓN e integración del CTO (§36.2).
  Su cierre **consolida el umbrella FIN-030** (DEC-0030 §6).
- **Historial de cambios:**
  - v1.0 (2026-07-14) — emisión tras DEC-0032 (los 5 cambios obligatorios §3).
- **Módulo/Feature:** FIN-032 (fundación de FIN-030) · **Origen (§27):** Directriz del Fundador +
  criterio de cierre del CPSAO · Prioridad MÁXIMA
- **Documentos base:** `ARQ-0032` v1.0 (`8361cbc`) · `AUD-0032` (APROBADO CON OBSERVACIONES) ·
  `DEC-0032` · `DEC-0030` §6 · guardarraíles A–K · GOBERNANZA §29.2/§31/§32
- **Referencia inmutable (regla GOBERNANZA):** commit
  **`c96c35533207d1a997fdd583e5395431e28fa85d`**

## 1. Resumen

Los 11 tipos de deuda son ahora **ciudadanos de primera clase** y los **4 arquetipos
divergentes** (libranza, hipoteca, gota a gota, compra a cuotas) quedan representados **por
configuración, no por lógica por-tipo**. El corazón del IMP es haber **disuelto TODAS las ramas
por `debtType`/`isCard`** —backend y frontend— en una **única autoridad de tipo**
(`PRODUCT_TYPE_DESCRIPTORS`) + un despacho por `scheduleModel`. Tras el IMP, `debtType` como
literal solo vive en el descriptor; el frontend consume el catálogo por API y no conoce ningún
tipo por nombre.

## 2. Cumplimiento (DEC-0032 §3)

| Cambio obligatorio | Implementación | Verificación |
|---|---|---|
| **§3.1 — disolver TODAS las ramas por tipo (back + front)** | `card.service.ts` (`ensureCardOwned`) → **capacidad** `installmentPurchases`; `debts.service.ts` (`computeSchedule`) → `scheduleModel !== 'amortizado'`; `debt-outlay.service.ts` → `scheduleModelFor()` (compromiso, una autoridad); `AddDebtScreen` → alta **armada desde `/debts/catalog`** (cero literal); `DebtDetailScreen` → secciones por `scheduleModel`/`capabilities`, no por `isCard`. | **grep §32 sobre back + front**: `debtType ===`/`isCard` = 0 fuera del descriptor (única coincidencia: `AddDebtScreen:89`, comparación **dinámica** de qué chip está activo — no una rama por literal) |
| **§3.2 — guarda de doble-conteo de libranza** | La cuota de libranza es "lo comprometido" por `DebtOutlayService` (autoridad única); crear una libranza **no** crea una deducción de ingreso (FIN-027). | e2e: la libranza aparece en `/budget/monthly` (compromiso), su cuota = plan del motor |
| **§3.3 — gota a gota SIN fecha de libertad falsa (§29.2)** | `saldo_y_cuota_pactada`: se crea sin tabla de amortización; el detalle dice "Sin cronograma formal — registras el saldo y tu cuota pactada". | e2e: `projection.payoffDate === null`, `numberOfPayments === 0`; captura del detalle |
| **§3.4 — regresión de los 9 tipos** | `ALTER TYPE ADD VALUE` (+libranza/compra_a_cuotas/fintech); `saldo_y_cuota_pactada` reusa `currentBalance`/`monthlyPayment` — **sin columnas nuevas**. | e2e: un crédito personal 1.2M/12/0% sigue dando cuota 100.000; suite completa sin regresión |
| **§3.5 — prueba de los 4 arquetipos (condición de cierre)** | Test parametrizado que registra los 4 por el **mismo** `POST /debts` → `GET /debts/:id` → `/budget/monthly`, y verifica cifras núcleo sin special-casear. | e2e `fin032-arquetipos` 7/7 |

## 3. La tesis, hecha código (por qué esto NO es lógica por-tipo)

Los 4 arquetipos reducen a **3 `scheduleModel`, todos ya existentes**; la única pieza nueva es
**nombrar** el tercero:

| `scheduleModel` | Motor (ya existía) | Arquetipos/tipos |
|---|---|---|
| `amortizado` | `AmortizationService.buildSchedule` (FIN-012) | **hipoteca**, **libranza**, **compra a cuotas**, personal, libre inversión, vehículo, educativo, otro |
| `cuotas_por_compra` | `CardService`/`CardInstallment` (FIN-031) | tarjeta, fintech |
| `saldo_y_cuota_pactada` | generaliza la ruta "sin cronograma" que FIN-031 abrió | **gota a gota**, préstamo familiar |

Lo divergente por arquetipo es un **flag de datos** del descriptor —`paymentSource:'nomina'`
(libranza), `rate:'fija_o_variable'` + `endorsableInsurance` (hipoteca), `rate:'opcional'` +
`paymentSource:'informal'` (gota a gota)—, **no un número aparte**. Los números núcleo salen de
las fuentes únicas §32: compromiso por `DebtOutlayService`, "Te queda" por `SpendableService`,
DTI = `DebtOutlayService.totalOutlay` ÷ `NetIncomeService.netIncome`.

## 4. Grep §32 (conjunto completo back + front)

```
# debtType como literal / isCard → SOLO el descriptor
product-type.descriptor.ts: PRODUCT_TYPE_DESCRIPTORS + scheduleModelFor()   ← única autoridad
# resto del sistema: despacho por VALOR (scheduleModel / capabilities), nunca por tipo
debt-outlay.service.ts:  scheduleModelFor(d.debtType) === 'cuotas_por_compra'
debts.service.ts:        scheduleModelFor(dto.debtType) !== 'amortizado'
card.service.ts:         descriptorFor(debt.debtType).capabilities.installmentPurchases
DebtDetailScreen.tsx:    data.scheduleModel / data.capabilities
AddDebtScreen.tsx:       arma el alta desde /debts/catalog (única coincidencia = chip activo)
```

## 5. Suites y evidencia

- **Unitaria 361/361** (+4: `product-type.descriptor.spec` — los 4 arquetipos → 3 modelos,
  comodín F, catálogo de 12 con alta mínima).
- **E2E 13 suites / 55** — `fin032-arquetipos` **7/7** (catálogo; los 4 arquetipos con cifras
  núcleo; regresión del crédito personal). Sin regresión en las 12 suites previas.
- **`tsc` limpio** (backend y frontend).
- **Migración** `ALTER TYPE ADD VALUE` aplicada con `migrate deploy` (sin columnas nuevas).
- **Capturas reales** (`docs/producto/capturas/fin-032/`, `capture-fin032.js`): alta armada
  desde el catálogo (12 tipos + alta mínima de gota a gota); detalle de un gota a gota (saldo +
  cuota pactada, "Sin cronograma formal" — §29.2).

## 6. Archivos

- **Backend:** enum `DebtType` (+3) + migración; `product-type.descriptor.ts` (autoridad única) +
  su spec; `debt-outlay.service.ts` (compromiso por `scheduleModel`); `debts.service.ts`
  (`computeSchedule` por modelo, `monthlyPayment` por modelo, catálogo, `scheduleModel`/
  `capabilities` en las respuestas); `debts.controller.ts` (`GET /debts/catalog`);
  `card.service.ts` (capacidad, no tipo); `dto/debt.dto.ts` (enum, `rateKind`,
  `monthlyPayment`, plazo/tasa opcionales); `test/fin032-arquetipos.e2e-spec.ts`.
- **Frontend:** `api/types.ts` (catálogo + `scheduleModel`/`capabilities`); `api/endpoints.ts`
  (`catalog()`, campos nuevos); `AddDebtScreen.tsx` (alta desde el catálogo, sin literal de tipo);
  `DebtDetailScreen.tsx` (secciones por modelo); `scripts/captura/capture-fin032.js`.

## 7. Pendiente para el CTO (§36.2/§36.3)

Validar (grep §32 sobre back+front + tests de los 4 arquetipos + regresión) e **integrar** a la
rama oficial. Su cierre + el visto de producto del CPSAO **consolidan FIN-030**. La profundidad
avanzada por producto (retanqueo/refinanciación/abonos extraordinarios), la re-proyección por
tasa variable y la confirmación mensual quedan declaradas en FIN-033+.
