# ARQ-0013 · Seguros asociados al crédito (financiados, endosables)

- **Módulo/Feature:** FIN-013
- **Origen:** derivado del umbrella `ARQ-0011` §4.2 (este documento FORMALIZA el diseño
  ya auditado por AUD-0011 y aprobado por DEC-0011 §4.1/§4.2 — **no introduce ningún
  cambio**; se emite para trazabilidad individual del ciclo ARQ→AUD→DEC→IMP)
- **Autor:** Agente Arquitecto · **Fecha:** 2026-07-05
- **Estado:** Aprobado vía DEC-0011 · implementado en `IMP-0013` (commit `9607c3f`)

---

## 1. Objetivo
Representar los seguros del crédito (vida deudor, incendio/terremoto, etc.) para que
el usuario vea su **cuota real** y el ahorro de **endosar** una póliza propia.

## 2. Problema
No existía ningún campo/modelo de seguro (verificado por el CTO). En Colombia los
créditos de libranza/hipotecarios llevan seguros obligatorios, frecuentemente
financiados en la cuota y endosables — sin esto Millo no representa el costo real.

## 3. Alcance
**Incluye:** modelo mínimo, CRUD anidado en deudas, desglose de cuota real, flujo de
endoso, UI en detalle de deuda.
**Excluye:** cálculo actuarial (prima plana v1 — riesgo aceptado DEC-0011 §8) y
**cualquier impacto en el Motor** (DTI/gasto esencial no cambian — DEC-0011 §4.2
ratificado; si a futuro deben contar como gasto fijo, es un ciclo nuevo).

## 4. Arquitectura
Modelo `DebtInsurance {debtId, kind (vida_deudor|incendio_terremoto|todo_riesgo|
desempleo|otro), name, monthlyPremium, financed (va dentro de la cuota), endorsed
(póliza propia), insurer?, notes?, active, soft-delete}`.
Desglose **solo de presentación** `paymentBreakdown`: cuota base + primas financiadas
(informativas, ya dentro de la cuota) + primas aparte (SÍ suman) = desembolso mensual
real. Endoso = pausar el seguro del banco (`active=false`) + crear la póliza propia
(`endorsed=true`) → el ahorro se ve al instante.

## 5. Componentes
`DebtInsuranceService` (CRUD con ownership vía deuda + `paymentBreakdown` puro),
DTOs, rutas en `DebtsController` (**`insurances/` declaradas antes de `:id`** para no
colisionar), `findOne` de deuda incluye seguros + desglose.

## 6. Base de datos
Migración `fin013_seguros_credito`: enum `DebtInsuranceKind` + tabla `debt_insurances`
(FK cascade a `debts`, índice `(debt_id, active)`).

## 7. Backend
`GET/POST /debts/:id/insurances`, `PATCH/DELETE /debts/insurances/:id`.

## 8. Frontend
Sección "Seguros del crédito" en el detalle de deuda: desglose de cuota real, alta
(nombre, prima, dentro de la cuota / aparte), pausa (endoso) y eliminación.

## 9. Uso de IA
Ninguno.

## 10. Riesgos
Dominio asegurador complejo → modelo mínimo deliberado con campos libres para lo no
modelado (aceptado por DEC-0011 §8).

## 11. Dependencias
Solo pantalla compartida con FIN-012 (detalle de deuda); independiente en backend.

## 12. Impacto
El Motor no cambia ningún valor con o sin seguros — garantizado por **test de
no-impacto** que recorre el código fuente de `financial-engine/` y falla ante
cualquier referencia a seguros (mismo estándar del guardrail Ley 1266 de FIN-009).

## 13. Criterios de aceptación
CRUD completo con ownership (404 para terceros); desembolso real = cuota + primas
aparte activas; endoso baja el desembolso al instante; test de no-impacto en verde.

## 14. Plan
Fase D de ARQ-0011 §14: migración → CRUD + desglose → UI. (Ejecutado en `IMP-0013`.)
