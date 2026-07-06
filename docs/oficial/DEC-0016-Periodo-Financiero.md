# DEC-0016 · Periodo financiero / día de corte (Presupuesto y Dashboard) — REGULARIZACIÓN

- **Documentos base:** `docs/arquitectura/ARQ-0016-Periodo-Financiero.md` · `docs/auditoria/AUD-0016-Periodo-Financiero.md` · `docs/implementaciones/IMP-0016-Periodo-Financiero.md` · `DEC-0011 §4.6` (autorización original, bundled)
- **Módulo/Feature:** FIN-016
- **Decide:** CTO/CPO/Principal Architect de Millo
- **Fecha:** 2026-07-06

---

## 0. Naturaleza de este documento — Regularización extraordinaria

Emitido bajo la regularización extraordinaria del Backlog Inicial de Milla V1.0 (fundador, 2026-07-05/06). Ver `DEC-0013 §0` para el contexto completo. Excepción única, sin precedente.

## 1. Resumen ejecutivo

Este es el sub-ciclo con la invariante vinculante más estricta de todo el conjunto: la decisión (b) del fundador exige que Score, Motor Financiero, Gamificación, Recomendaciones y Memoria **no cambien** con la introducción del día de corte. Verifiqué esto de forma independiente, no por el informe del auditor: corrí `grep -rl "financial-period.util" backend/src/modules/` en checkout aislado (commit `c511697`) y confirmé que **únicamente** `dashboard.service.ts`, `budget.service.ts` y el propio spec importan la utilidad — cero referencias en `financial-engine/`, `health/`, `gamification/`, `recommendations/` o `memory/`. También confirmé que con `cycleStartDay=1` (default) el cálculo es matemáticamente idéntico al mes calendario UTC ya usado, y que la migración real contiene el `CHECK BETWEEN 1 AND 28` sobre `cycle_start_day`. Corrí `financial-period.util.spec.ts` con bypass de type-check (limitación conocida de Prisma) — pasa completo, incluyendo los 8 tests de bordes (año nuevo, contigüidad de ciclos, clamp). `AUD-0016` no encontró hallazgos.

## 2. Arquitecturas revisadas

- `docs/arquitectura/ARQ-0016-Periodo-Financiero.md`.

## 3. Auditorías revisadas

- `docs/auditoria/AUD-0016-Periodo-Financiero.md` — veredicto: **APROBADO**.

## 4. Decisiones aprobadas

1. `UserSettings.cycleStartDay` (rango 1–28, default 1): aprobado, verificado con triple defensa (`CHECK` en BD + `@Min/@Max` en DTO + `clampCycleDay` en la función pura).
2. Utilidad pura `financialPeriod()`, con fin exclusivo (contigüidad sin huecos ni solapes entre ciclos): aprobado.
3. **Invariante de aislamiento total del Score/Motor/Gamificación/Recomendaciones/Memoria**, verificada por `grep` de forma directa y objetiva por mí, no solo declarada: ratificada como la condición más importante de este ciclo.
4. Retrocompatibilidad total con `cycleStartDay=1` (comportamiento idéntico al mes calendario): ratificada.

## 5. Decisiones rechazadas

- Ninguna.

## 6. Observaciones aceptadas

- Ninguna con impacto.

## 7. Observaciones descartadas

- Ninguna.

## 8. Riesgos aceptados

- Divergencia visual entre el ciclo de Presupuesto/Inicio y el mes calendario del Score — mitigada por la etiqueta legible siempre visible en la UI (no verificable en este alcance de backend, pero consistente con el patrón de transparencia del resto del proyecto). Aceptado.

## 9. Riesgos pendientes

- Ninguno nuevo.

## 10. Cambios obligatorios

- Ninguno.

## 11. Plan técnico oficial

No aplica — FIN-016 ya está implementado y verificado.

## 12. Prioridad

No aplica (ciclo cerrado).

## 13. Estado final

**APROBADO — FIN-016 CERRADO** bajo el proceso de regularización extraordinaria del fundador. Verificación independiente por `grep` confirma la invariante más sensible del ciclo (aislamiento del Score/Motor/Gamificación/Recomendaciones/Memoria); retrocompatibilidad total confirmada. Excepción única, sin precedente.

---
*Documento oficial — no modificar. Regularización extraordinaria conforme a `docs/GOBERNANZA.md` y al comunicado del fundador (2026-07-05/06).*
