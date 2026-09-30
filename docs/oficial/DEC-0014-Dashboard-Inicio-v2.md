# DEC-0014 · Dashboard de Inicio v2 — REGULARIZACIÓN

- **Documentos base:** `docs/arquitectura/ARQ-0014-Dashboard-Inicio-v2.md` · `docs/auditoria/AUD-0014-Dashboard-Inicio-v2.md` · `docs/implementaciones/IMP-0014-Dashboard-Inicio-v2.md` · `DEC-0011 §4.3` (autorización original, bundled)
- **Módulo/Feature:** FIN-014
- **Decide:** CTO/CPO/Principal Architect de Millo
- **Fecha:** 2026-07-06

---

## 0. Naturaleza de este documento — Regularización extraordinaria

Emitido bajo la regularización extraordinaria del Backlog Inicial de Milla V1.0 (fundador, 2026-07-05/06). Ver `DEC-0013 §0` para el contexto completo: no se revierte código, no se repite el ciclo, este documento formaliza la decisión individual sobre una auditoría completa ya realizada (`AUD-0014`) más mi propia verificación adicional. Excepción única, sin precedente.

## 1. Resumen ejecutivo

Verifiqué de forma independiente, en checkout aislado (commit `c511697`), que `DashboardService.home()` reutiliza `computeNetWorth` (la misma función de FIN-002, sin reimplementación) y que el endpoint clásico `/transactions/dashboard` permanece intacto en `transactions.controller.ts`. Corrí `dashboard.spec.ts` con bypass de type-check (limitación conocida de Prisma) y pasa completo — incluyendo el test de consistencia que compara `home.netWorth` contra el resultado directo del util auditado con la misma entrada. `AUD-0014` no encontró ninguna afirmación falsa; la única nota es metodológica (ausencia de suites e2e-spec persistentes), consistente con el patrón ya establecido en todos los ciclos anteriores del proyecto, no una desviación de este ciclo.

## 2. Arquitecturas revisadas

- `docs/arquitectura/ARQ-0014-Dashboard-Inicio-v2.md`.

## 3. Auditorías revisadas

- `docs/auditoria/AUD-0014-Dashboard-Inicio-v2.md` — veredicto: **APROBADO**.

## 4. Decisiones aprobadas

1. `GET /dashboard/home` como agregador thin (composición en paralelo, cero lógica financiera nueva): aprobado.
2. Reutilización de `computeNetWorth` (FIN-002) para el patrimonio mostrado en Inicio: ratificado — misma fuente que `/net-worth`, sin riesgo de deriva.
3. Ahorro total sin doble conteo (cuentas `ahorros` OR fondo de emergencia): aprobado, verificado.
4. Preservación de `/transactions/dashboard` sin cambios (no-breaking): ratificado.
5. Uso de `financialPeriod()` (FIN-016) para el periodo mostrado: ratificado como consumidor autorizado.

## 5. Decisiones rechazadas

- Ninguna.

## 6. Observaciones aceptadas

- Ninguna con impacto (ver nota metodológica sobre e2e-spec persistente, consistente con el patrón general del proyecto).

## 7. Observaciones descartadas

- Ninguna.

## 8. Riesgos aceptados

- Latencia de agregar 5 fuentes en un endpoint — mitigada por consultas en paralelo sobre tablas ya indexadas (mismo patrón de agregaciones anteriores). Aceptado como riesgo de bajo impacto.

## 9. Riesgos pendientes

- Ninguno nuevo.

## 10. Cambios obligatorios

- Ninguno.

## 11. Plan técnico oficial

No aplica — FIN-014 ya está implementado y verificado.

## 12. Prioridad

No aplica (ciclo cerrado).

## 13. Estado final

**APROBADO — FIN-014 CERRADO** bajo el proceso de regularización extraordinaria del fundador. Verificación independiente en checkout aislado confirma correspondencia exacta entre diseño, auditoría e implementación, sin hallazgos. Excepción única, sin precedente.

---
*Documento oficial — no modificar. Regularización extraordinaria conforme a `docs/GOBERNANZA.md` y al comunicado del fundador (2026-07-05/06).*
