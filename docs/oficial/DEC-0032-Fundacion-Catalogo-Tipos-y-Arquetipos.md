# DEC-0032 · Fundación de FIN-030 — catálogo de tipos + los 4 arquetipos por configuración

- **Versión:** 1.0
- **Fecha:** 2026-07-14
- **Autor:** CTO (Claude)
- **Estado:** Emitida — habilita `IMP-0032`. Su cierre **consolida el umbrella FIN-030** (DEC-0030 §6).
- **Base:** `ARQ-0032` v1.0 (`8361cbc`) · `AUD-0032` (APROBADO CON OBSERVACIONES) · `DEC-0030` §6 (criterio de cierre) · guardarraíles A–K

---

## 0. Verificación independiente previa (CTO)

Verifiqué contra el código el hallazgo con peso del Auditor: el ARQ nombra 3 ramas por tipo,
pero contra código hay **más**:
- Backend: `card.service.ts:179` (`debtType !== 'tarjeta_credito'`), `debts.service.ts:268`
  (`debtType === tarjeta_credito`), `debt-outlay.service.ts:59` (rama sancionada FIN-031).
- Frontend: `AddDebtScreen` **ramifica todo el alta por `isCard`** (`:13,38-55,75+`);
  `DebtDetailScreen` gobierna medio detalle por `isCard`.
Confirmado: si el grep §32 de cierre solo cubre las 3 ramas nombradas, el bug ×11 tipos
sobrevive por la puerta del frontend.

## 1. Resumen ejecutivo

Se aprueba la fundación (catálogo de 11 + los 4 arquetipos por **configuración, no por lógica
por-tipo**) con un cambio obligatorio: **disolver TODAS las ramas por `debtType`/`isCard`**
(backend y frontend) en el descriptor/`scheduleModel`, y correr el grep §32 de cierre sobre el
**conjunto completo**. Con eso, FIN-032 cumple (a)–(d) de DEC-0030 §6 y consolida FIN-030.

## 2. Decisiones aprobadas

- **(a) Catálogo:** `DebtType` 9 → 12 por extensión pura (+`libranza`/`compra_a_cuotas`/`fintech`;
  `otro` = personalizable, escape del guardarraíl F). 11 de 1ª clase + comodín.
- **(b) Los 4 arquetipos → 3 `scheduleModel` existentes** (`amortizado` FIN-012 = hipoteca+libranza;
  `cuotas_por_compra` FIN-031 = compra a cuotas+tarjeta; `saldo_y_cuota_pactada` = gota a gota/
  informal). La única pieza nueva es **nombrar** el tercer modelo. Lo divergente por arquetipo es
  un **flag de datos** (libranza `paymentSource:'nomina'`; hipoteca seguro endosable FIN-013 +
  tasa `fija_o_variable`; gota a gota `rate:'opcional'`+`informal`), no un número aparte.
- **(c) Números núcleo por §32:** cuota/saldo/fecha por `scheduleModel`; "lo comprometido" en la
  autoridad única `DebtOutlayService` (extender solo el brazo informal); "Te queda" en
  `SpendableService`; DTI = `DebtOutlayService.totalOutlay` ÷ `NetIncomeService.netIncome`. La
  autoridad única de tipo = registro `PRODUCT_TYPE_DESCRIPTORS` (el único lugar con `debtType`).
- **(d) Alta mínima:** `descriptor.requiredFields` renderiza el alta; ningún tipo pide más que su
  mínimo (guardarraíl B).

## 3. Cambios obligatorios (§5)

1. **Disolver TODAS las ramas por tipo** (el GAP §32 del Auditor, elevado a condición dura):
   `card.service.ts:179`, `debts.service.ts:268`, y el `isCard` completo de `AddDebtScreen` +
   `DebtDetailScreen`, disueltas en el descriptor/`scheduleModel`. Tras el IMP, `debtType`
   aparece **solo** en `PRODUCT_TYPE_DESCRIPTORS` + el único `switch(scheduleModel)`; cero en
   pantallas ni otros servicios. El **grep §32 de cierre corre sobre el conjunto completo
   (backend + frontend)**, no las 3 ramas nombradas — es donde el bug ×tipos entraría por el
   frontend.
2. **Guarda de doble-conteo de libranza:** la cuota de libranza es compromiso en
   `DebtOutlayService` y **nunca además** deducción de ingreso (FIN-027). Condición cruzada
   testeable.
3. **Gota a gota SIN fecha de libertad falsa** (§29.2): no inventar un cronograma que no existe.
4. **Regresión de los 9 tipos existentes:** `ALTER TYPE ADD VALUE` + `saldo_y_cuota_pactada`
   reusa `currentBalance`/`monthlyPayment` sin columnas nuevas — cifras de los 9 idénticas (test).
5. **Prueba de los 4 arquetipos** (condición de cierre de DEC-0030 §6): tests que registren
   libranza/hipoteca/gota a gota/compra a cuotas y verifiquen sus cifras núcleo **sin rama
   ad-hoc**.

## 4. Observaciones aceptadas

- Profundidad avanzada por producto (retanqueo/refinanciación/abonos extraordinarios),
  re-proyección por tasa variable y confirmación mensual → FIN-033+, no bloquean el cierre.
  "Flujo de caja" sigue fuera del gate DSS.
- Toca Registrar/Transacciones (autorizado por el Fundador para toda la iniciativa).

## 5. Próximos pasos

`IMP-0032` habilitado con los 5 cambios obligatorios. Cierre auditable: grep §32 sobre el
conjunto completo + tests de los 4 arquetipos + regresión de los 9. Su cierre + el visto de
producto del CPSAO **consolidan FIN-030**. Sigue "un FIN a la vez".
