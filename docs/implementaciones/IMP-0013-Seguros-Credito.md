# IMP-0013 · Seguros asociados al crédito (financiados, endosables)

- **Módulo/Feature:** FIN-013
- **Documentos base:** `ARQ-0013-Seguros-Credito.md` (derivado de `ARQ-0011`)  · umbrella `ARQ-0011` §4.2/§13 · `AUD-0011` · `DEC-0011` §4.1/§4.2 (autorizado)
- **Autor:** Agente Desarrollador · **Fecha:** 2026-07-05
- **Referencia inmutable:** commit **`9607c3f664fee36c7aac9f0ed57ecef379164a50`**
- **Estado:** Entregado — a la espera de validación del CTO

## 1. Resumen
Modelo mínimo `DebtInsurance` (DEC-0011 §8: prima mensual plana, sin cálculo
actuarial): tipo, prima, **financiado** (dentro de la cuota) o aparte, **endosado**
(póliza propia), aseguradora, soft-delete. Desglose de **cuota real** en el detalle de
deuda. **Las primas NO tocan el Motor** (§4.2, ratificado) — verificado por test.

## 2. Archivos
- `backend/prisma/migrations/20260705121000_fin013_seguros_credito/` — enum
  `DebtInsuranceKind` + tabla `debt_insurances` (FK cascade, índice `(debt_id, active)`).
- `debt-insurance.service.ts` — CRUD con ownership vía deuda + `paymentBreakdown`
  (cuota base + primas financiadas informativas + primas aparte = desembolso real).
- `debt-insurance.dto.ts`; rutas en `debts.controller.ts` (**`insurances/` declaradas
  antes de `:id`** para no colisionar); `debts.service.findOne` incluye seguros +
  desglose; `debts.module` registra el servicio.
- `debt-insurance.spec.ts` — 6 tests: desglose (financiado no suma al desembolso,
  aparte sí, inactivos no cuentan, endoso baja el total) + **test de no-impacto**:
  recorre el código fuente de `financial-engine/` y falla si alguna línea referencia
  seguros (mismo estándar del guardrail de FIN-009).
- Frontend: tipos `DebtInsurance`/`PaymentBreakdown`, 4 endpoints, sección "🛡️
  Seguros del crédito" en el detalle (desglose, alta con financiado/aparte, pausa
  para endoso, eliminación).

## 3. Funcionalidades
Registro de seguros del crédito; cuota total real visible; flujo de endoso: pausar el
seguro del banco + crear la póliza propia → el ahorro mensual se ve al instante.

## 4. Pruebas
- Suite completa **286/286** en el commit (280 + 6).
- E2E real: deuda 10M@18%EA/24m (cuota 492.819,84) + vida 60k aparte + incendio 25k
  financiado → desembolso real **552.819,84**; endoso (pausa banco + póliza propia
  35k) → **527.819,84**; `PATCH` de un seguro ajeno → **404**.

## 5. Incidencias
Ninguna.

## 6. Limitaciones
Prima plana v1 (riesgo aceptado DEC-0011 §8); las primas no entran al costo total
proyectado de la amortización ni al Motor — solo desglose mensual (alcance §4.2).

## 7. Resultado
Completo conforme a DEC-0011. El Motor no cambia ningún valor con o sin seguros
(test de no-impacto en verde).
