# AUD-0013 · Auditoría de ARQ-0013 (Seguros asociados al crédito — formalización post-implementación)

- **Documento auditado:** `docs/arquitectura/ARQ-0013-Seguros-Credito.md`
- **Módulo/Feature:** FIN-013 — **ya implementado** (`IMP-0013`, commit `9607c3f`)
- **Naturaleza del documento:** formaliza en un ARQ numerado individual un diseño que ya fue auditado dentro del umbrella (`AUD-0011`, sin hallazgos para este sub-ciclo) y ya aprobado por `DEC-0011` §4.1/§4.2. Al estar ya implementado, esta auditoría pudo verificar las afirmaciones del documento contra el código real, no solo contra la promesa de diseño.
- **Referencia inmutable verificada:** `git show HEAD:backend/prisma/schema.prisma`, `git show HEAD:backend/src/modules/debts/debt-insurance.service.ts`, `git show HEAD:backend/src/modules/debts/debts.controller.ts`, `git show HEAD:backend/src/modules/debts/debt-insurance.spec.ts` (commit `b87ef89`)
- **Fecha:** 2026-07-06
- **Auditor:** Auditor Oficial de Milla (rol de solo lectura)

> Esta auditoría no modifica el ARQ ni el código.

---

## Resumen Ejecutivo

Verifiqué cada afirmación de ARQ-0013 contra el código real y todas se sostienen: el modelo `DebtInsurance` en `schema.prisma` reproduce exactamente los campos y el enum declarados (incluyendo el comentario explícito de que las primas no impactan el Motor, DEC-0011 §4.2); `paymentBreakdown` en `debt-insurance.service.ts` implementa con exactitud la regla de negocio descrita (primas financiadas informativas, primas aparte sí suman al desembolso total), confirmada además por 5 casos de test que cubren el caso base, financiado, aparte, mezcla con inactivos, y el escenario de endoso; las rutas `insurances/:insuranceId` (PATCH/DELETE) están efectivamente declaradas antes de `:id` en `debts.controller.ts`; y el test de no-impacto sobre el Motor (`debt-insurance.spec.ts`, que recorre el código fuente de `financial-engine/` buscando referencias a seguros) existe y sigue el mismo estándar ya validado por el guardarraíl de Ley 1266 de FIN-009.

Una precisión menor, sin impacto funcional: el ARQ justifica el orden de declaración de rutas como necesario "para no colisionar" con `:id`, pero las rutas en cuestión (`insurances/:insuranceId`, de dos segmentos) no colisionarían con `:id` (un segmento) en ningún orden, dado cómo Express/Nest resuelven el número de segmentos de la ruta — el orden elegido es una práctica defensiva razonable, no una necesidad estricta para evitar la colisión que el documento describe.

## Hallazgos

Ninguno con impacto funcional. Ver la precisión menor en Resumen Ejecutivo.

## Riesgos

- Ninguno nuevo. El riesgo aceptado de modelo mínimo sin cálculo actuarial ya fue evaluado y ratificado en `DEC-0011` §8.

## Fortalezas

- Todas las afirmaciones del documento son verificables y ciertas contra el código ya implementado — no hay ninguna promesa de diseño sin respaldo, a diferencia de auditorías anteriores que sí encontraron afirmaciones falsas sobre código existente (p. ej. FIN-001, FIN-006).
- El test de no-impacto sobre el Motor reutiliza literalmente el mismo patrón de verificación de invariantes por código fuente ya validado en el guardarraíl de Ley 1266 de FIN-009, en vez de inventar un mecanismo nuevo.
- La cobertura de test de `paymentBreakdown` incluye explícitamente el caso de seguros inactivos (endosados y reemplazados) que no deben contarse — el caso de borde más propenso a error en este tipo de agregación.
- Ownership verificado en ambos sentidos (`ensureDebtOwned` para list/create, `ensureInsuranceOwned` que además valida que la deuda no esté borrada) — mismo rigor de aislamiento multi-usuario ya exigido en ciclos anteriores.

## Oportunidades

Ninguna adicional dentro del alcance de este ciclo, ya cerrado.

## Observaciones críticas

Ninguna.

## Observaciones menores

- La justificación de "declarar `insurances/:insuranceId` antes de `:id` para evitar colisión" es imprecisa: dado que son rutas de distinto número de segmentos, no colisionarían en ningún orden. No representa ningún riesgo (el orden elegido es inocuo y defendible como buena práctica), solo una imprecisión de redacción en la documentación.

## Recomendaciones

Ninguna. El ciclo ya está cerrado y verificado.

## Priorización

No aplica.

## Veredicto

**APROBADO.**

ARQ-0013 documenta con exactitud un diseño ya implementado, ya auditado sin hallazgos dentro del umbrella, y ya aprobado por el CTO. La verificación directa contra el código confirma que cada afirmación es cierta, con una única imprecisión de redacción sin ningún efecto funcional. No se requiere ninguna acción adicional del CTO sobre este documento.

---
*Esta auditoría no implementa ni decide. FIN-013 ya está cerrado (IMP-0013); este documento es una formalización retroactiva sin efecto sobre su estado.*
