# DEC-0013 · Seguros asociados al crédito (financiados, endosables) — REGULARIZACIÓN

- **Documentos base:** `docs/arquitectura/ARQ-0013-Seguros-Credito.md` · `docs/auditoria/AUD-0013-Seguros-Credito.md` · `docs/implementaciones/IMP-0013-Seguros-Credito.md` · `DEC-0011 §4.1/§4.2` (autorización original, bundled)
- **Módulo/Feature:** FIN-013
- **Decide:** CTO/CPO/Principal Architect de Millo
- **Fecha:** 2026-07-06

---

## 0. Naturaleza de este documento — Regularización extraordinaria

Este DEC se emite bajo la **regularización extraordinaria del Backlog Inicial de Milla V1.0** ordenada por el fundador (2026-07-05/06), después de que FIN-013 fuera diseñado, auditado (dentro del umbrella `AUD-0011`), decidido (dentro de `DEC-0011`, junto con otros tres sub-ciclos) e **implementado** (commit `9607c3f`) antes de que existiera el ciclo individual por-FIN que la gobernanza exige desde el comunicado del fundador. Por decisión expresa del fundador: no se revierte el código, no se repite el ciclo de desarrollo, y este documento formaliza la decisión individual que debió existir desde el principio, sobre la base de una auditoría completa e independiente ya realizada (`AUD-0013`) y de mi propia verificación adicional contra el código en checkout aislado. **Esta regularización es una excepción única y no crea precedente**; desde este punto, ninguna funcionalidad se implementa sin su DEC individual previo.

## 1. Resumen ejecutivo

Verifiqué de forma independiente, en un clon aislado del repositorio (commit `c511697`), las afirmaciones centrales de `AUD-0013`: el modelo `DebtInsurance` existe en `schema.prisma` con los campos exactos declarados (`kind`, `monthlyPremium`, `financed`, `endorsed`, soft-delete); `paymentBreakdown()` en `debt-insurance.service.ts` implementa la regla correcta (primas financiadas informativas dentro de la cuota, primas aparte sí suman al desembolso real); el test de no-impacto sobre el Motor existe y recorre el código fuente de `financial-engine/` buscando referencias a seguros. Corrí la suite del módulo con bypass de type-check (limitación conocida de Prisma en este sandbox, documentada en cada ciclo desde FIN-002): `debt-insurance.spec.ts` pasa completo. No encontré ninguna divergencia entre lo declarado y lo implementado.

`AUD-0013` señala una única imprecisión de redacción sin efecto funcional (la justificación de orden de rutas es más defensiva de lo estrictamente necesario) — no amerita ningún cambio.

## 2. Arquitecturas revisadas

- `docs/arquitectura/ARQ-0013-Seguros-Credito.md`.

## 3. Auditorías revisadas

- `docs/auditoria/AUD-0013-Seguros-Credito.md` — veredicto: **APROBADO**.

## 4. Decisiones aprobadas

1. Modelo mínimo `DebtInsurance` (prima plana, sin cálculo actuarial): aprobado, ya implementado.
2. `paymentBreakdown()` (financiado vs. aparte vs. inactivo): aprobado, verificado contra código y tests.
3. Las primas **no impactan el Motor** (DTI/gasto esencial) en este ciclo, con test de no-impacto verificable: ratificado.
4. Flujo de endoso (pausar seguro del banco + registrar póliza propia): aprobado.

## 5. Decisiones rechazadas

- Ninguna.

## 6. Observaciones aceptadas

- Imprecisión de redacción sobre el orden de declaración de rutas (`AUD-0013`) — aceptada como observación menor sin efecto funcional; no requiere cambio de código.

## 7. Observaciones descartadas

- Ninguna.

## 8. Riesgos aceptados

- Modelo sin cálculo actuarial (ya evaluado y ratificado en `DEC-0011 §8`).

## 9. Riesgos pendientes

- Ninguno nuevo. Si en el futuro se requiere que las primas cuenten como gasto fijo real del Motor, es una decisión de un ciclo nuevo con evidencia propia.

## 10. Cambios obligatorios

- Ninguno. Sin observaciones críticas ni bloqueantes.

## 11. Plan técnico oficial

No aplica — FIN-013 ya está implementado y verificado. No se autoriza ningún cambio adicional de alcance sobre este módulo fuera de un ciclo de gobernanza nuevo.

## 12. Prioridad

No aplica (ciclo cerrado).

## 13. Estado final

**APROBADO — FIN-013 CERRADO** bajo el proceso de regularización extraordinaria del fundador. Verificación independiente en checkout aislado confirma que el código implementado corresponde exactamente a lo diseñado y auditado, sin hallazgos críticos ni bloqueantes. Esta regularización no constituye precedente: toda funcionalidad futura requiere su `DEC` individual **antes** de iniciar implementación.

---
*Documento oficial — no modificar. Regularización extraordinaria conforme a `docs/GOBERNANZA.md` y al comunicado del fundador (2026-07-05/06).*
