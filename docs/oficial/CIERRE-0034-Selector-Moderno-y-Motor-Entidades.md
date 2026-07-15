# CIERRE-0034 · FIN-034 — Selector moderno de obligaciones + motor de entidades (P1 EOC)

- **Versión:** 1.0
- **Fecha:** 2026-07-15
- **Autor:** CTO (Claude)
- **Estado:** **CERRADA.**
- **Base:** `IMP-0034` (`df5348a`) · `DEC-0034` · `AUD-0034` · `DEC-0033` (umbrella EOC)

---

## 1. Verificación independiente del CTO (contra código y BD reales)

| Condición (DEC-0034 §3) | Cómo la verifiqué | Resultado |
|---|---|---|
| Grep §32 — alcance corregido (lecturas de cálculo, no toda ref) | grep de `typicalRate` en todo `backend/src` | ✅ Solo dentro de `modules/entities/` (catálogo + siembra); **cero** en servicios de cálculo. |
| Gate DPA+PIA | grep de imports de IA en `entities/` | ✅ Cero. |
| §3.2 — la tasa del usuario gana | lectura de `AddDebtScreen.onSubmit` + e2e | ✅ El payload usa `values.interestRate` (editado por el usuario), nunca `entity.typicalRate`; e2e confirma `Debt.interestRate=15` con pista=32. |
| §3.3 — tipo siempre editable | lectura de UI (botón "Cambiar" real, `reset()`) + e2e | ✅ e2e: la misma entidad (Bancolombia) sostiene `hipotecario` y `credito_personal`. |
| Independencia (sin score/rank) | lectura de `EntitiesService.search` + e2e | ✅ Solo señales de orden (`own`/`recent`/`prefix`); e2e verifica ausencia de `score`/`rank`/`recommended`. |
| Camino libre | e2e | ✅ Deuda con `entityId: null` se crea sin bloqueo. |
| Migración (índice único parcial) | lectura de SQL + verificación en BD (`\di`) | ✅ Dedupe primero, luego índice; aplicada y presente en Postgres real. |
| Unit + tsc back/front | `jest` + `tsc --noEmit` (corridos por mí) | ✅ **366/366** unit; ambos `tsc` limpios. |
| e2e FIN-034 | `jest-e2e fin034-selector-entidades` contra Postgres real | ✅ **6/6**. |
| No toca Registrar | lectura del diff completo (`git show --stat df5348a`) | ✅ Confirmado — solo `entities/` + `AddDebtScreen`. |

## 2. Ajuste del CTO durante el cierre

Ninguno. El IMP incorporó las 3 condiciones del Auditor como tests reales, no solo como texto —
no fue necesario blindar nada adicional (a diferencia de FIN-032, donde añadí una aserción).

## 3. Estado de cierre

**FIN-034 (P1 del EOC): cerrada.** Reemplaza el muro de 12 chips por un selector en 1ª persona,
extendiendo el motor de entidades existente sin esquema nuevo, sin fórmula nueva, sin IA.

- **Siguiente en el programa:** FIN-035 (P2, Registrar como puerta) — **retenida**, bajo la
  instrucción permanente del Fundador; su ARQ no abre sin las observaciones del Fundador sobre
  Registrar (aviso anticipado ya emitido).
- **OTA:** el frontend de FIN-034 se agrupa con FIN-032 en una sola publicación gateada (§40/§41),
  como decidió el Fundador.

## 4. Trazabilidad

`df5348a` (IMP) · suites y grep §32 re-ejecutados por el CTO contra Postgres real. Detalle de
flujo: `docs/correspondencia/Ecosistema-Creditos-y-Obligaciones.md`.
