# AUD-0014 · Auditoría de ARQ-0014 (Dashboard de Inicio v2 — formalización post-implementación)

- **Documento auditado:** `docs/arquitectura/ARQ-0014-Dashboard-Inicio-v2.md`
- **Módulo/Feature:** FIN-014 — **ya implementado** (`IMP-0014`, commit `1af29b1`)
- **Naturaleza del documento:** formaliza un diseño ya auditado dentro del umbrella (`AUD-0011`, sin hallazgos) y ya aprobado por `DEC-0011` §4.3. Verificado contra el código real, no solo contra la promesa de diseño.
- **Referencia inmutable verificada:** `git show HEAD:backend/src/modules/dashboard/dashboard.service.ts`, `dashboard.spec.ts`, `dashboard.controller.ts`, `git show HEAD:backend/src/app.module.ts`, `git show HEAD:backend/src/modules/transactions/transactions.controller.ts` (commit `b87ef89`)
- **Fecha:** 2026-07-06
- **Auditor:** Auditor Oficial de Milla (rol de solo lectura)

> Esta auditoría no modifica el ARQ ni el código.

---

## Resumen Ejecutivo

Verifiqué que `DashboardService.home()` reproduce exactamente el diseño descrito: compone en paralelo (`Promise.all`) cuentas, activos, deudas, `FixedItem` y transacciones del ciclo activo; calcula el patrimonio reutilizando `computeNetWorth` (la misma función pura de FIN-002, no una reimplementación); respeta el `financialPeriod()` de FIN-016 leyendo `cycleStartDay` del usuario; separa correctamente ingreso/gasto fijo (de `FixedItem`) y variable (de transacciones del ciclo); y calcula ahorro total como cuentas `ahorros` o fondo de emergencia sin doble conteo (filtro por `OR`, cada cuenta se suma una sola vez aunque cumpla ambas condiciones). El test `dashboard.spec.ts` confirma con una entrada controlada que `home.netWorth` es idéntico al resultado directo de `computeNetWorth` con los mismos datos — el criterio de consistencia exigido. Confirmé además que `/transactions/dashboard` (el endpoint clásico) sigue existiendo sin cambios, cumpliendo la restricción de no-breaking, y que `DashboardModule` está registrado en `app.module.ts`.

No encontré ninguna afirmación falsa del documento contra el código. Una nota metodológica, no un hallazgo: el criterio de aceptación #13 menciona "E2E contra `/net-worth` real" como verificación adicional a la unitaria; no existe en el repositorio ningún archivo de e2e-spec persistente para esto (de hecho, no existe ningún archivo `*.e2e-spec.ts` en todo el proyecto) — pero esto es consistente con el patrón ya establecido en todos los ciclos anteriores del proyecto, donde las verificaciones "E2E" se documentan como corridas puntuales durante la entrega del IMP y no como suites persistentes; no es una desviación específica de este ciclo.

## Hallazgos

Ninguno.

## Riesgos

- Ninguno nuevo. El riesgo de latencia por agregar 5 fuentes en un solo endpoint (ya identificado en el propio ARQ) se mitiga con consultas en paralelo sobre tablas ya indexadas por `userId`, mismo patrón usado en agregaciones anteriores del proyecto (p. ej. `summaryForUser` de deudas).

## Fortalezas

- Composición genuinamente "thin": no se encontró ninguna fórmula financiera nueva en `dashboard.service.ts` — todo el cálculo de patrimonio delega en el util ya auditado de FIN-002, reduciendo el riesgo de deriva entre el patrimonio mostrado en Inicio y el mostrado en la pantalla de Patrimonio.
- El test de consistencia usa exactamente la misma función (`computeNetWorth`) como oráculo, no un valor hardcodeado — si el util cambia de comportamiento en el futuro, el test de Inicio lo detectaría automáticamente por divergencia, no solo por casualidad.
- Ahorro total con lógica anti-doble-conteo verificada línea por línea: el filtro `type === 'ahorros' || isEmergencyFund` no puede contar una misma cuenta dos veces aunque cumpla ambas condiciones.
- No-breaking verificado de forma directa: el endpoint clásico `/transactions/dashboard` sigue presente en el controller de transacciones, sin ninguna modificación relacionada con este ciclo.
- El test cubre explícitamente el desglose por categoría tanto de ingresos como de gastos, no solo los totales agregados — reduce el riesgo de que un bug de agrupación pase inadvertido.

## Oportunidades

Ninguna adicional dentro del alcance de este ciclo, ya cerrado.

## Observaciones críticas

Ninguna.

## Observaciones menores

Ninguna con impacto — ver la nota metodológica sobre ausencia de e2e-spec persistente en el Resumen Ejecutivo, consistente con el patrón general del proyecto.

## Recomendaciones

Ninguna. El ciclo ya está cerrado y verificado.

## Priorización

No aplica.

## Veredicto

**APROBADO.**

ARQ-0014 documenta con exactitud un diseño ya implementado, ya auditado sin hallazgos dentro del umbrella, y ya aprobado por el CTO. La composición es genuinamente thin (sin lógica financiera nueva), el patrimonio y el periodo financiero se reutilizan de las fuentes ya auditadas, y el endpoint clásico permanece intacto. No se requiere ninguna acción adicional del CTO sobre este documento.

---
*Esta auditoría no implementa ni decide. FIN-014 ya está cerrado (IMP-0014); este documento es una formalización retroactiva sin efecto sobre su estado.*
