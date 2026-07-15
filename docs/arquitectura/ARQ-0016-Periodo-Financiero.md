# ARQ-0016 · Periodo financiero / día de corte (Presupuesto y Dashboard)

- **Módulo/Feature:** FIN-016
- **Origen:** derivado del umbrella `ARQ-0011` §4.5 (este documento FORMALIZA el diseño
  ya auditado por AUD-0011 y aprobado por DEC-0011 §4.6 — **no introduce ningún cambio**;
  se emite para trazabilidad individual del ciclo ARQ→AUD→DEC→IMP)
- **Autor:** Agente Arquitecto · **Fecha:** 2026-07-05
- **Estado:** Aprobado vía DEC-0011 · implementado en `IMP-0016` (commit `40700bc`)

---

## 1. Objetivo
Que Presupuesto y Dashboard sigan el ciclo real de nómina del usuario (día de corte
configurable) en lugar del mes calendario estricto.

## 2. Problema
Todo el sistema usa mes calendario UTC. Un usuario que cobra el 15 ve su presupuesto
"reiniciarse" a mitad de su ciclo real (verificado por el CTO contra el código el
2026-07-05).

## 3. Alcance
**Incluye:** columna de configuración, utilidad pura de cálculo de periodo, consumo en
Budget y Dashboard, selector en Ajustes.
**Excluye (invariante vinculante — decisión (b) del fundador):** Score, Motor
Financiero, Gamificación, Recomendaciones y Memoria NO cambian; siguen en mes
calendario. Verificable por grep: ninguno importa la utilidad.

## 4. Arquitectura
- `UserSettings.cycleStartDay Int @default(1)`, rango **1–28** (existe en todos los
  meses; DEC-0011 §4.6) con `CHECK` en BD.
- Utilidad **pura** `financialPeriod(now, cycleStartDay) → {start, end, label}`:
  si `now.getUTCDate() >= día` el ciclo empezó este mes; si no, el mes anterior.
  `end` exclusivo = inicio del ciclo siguiente (ciclos contiguos sin huecos).
  Con `cycleStartDay=1` el resultado es exactamente el mes calendario
  (retrocompatibilidad total).
- Etiqueta legible ("15 jun – 14 jul"; "jul 2026" si es mes completo) siempre visible
  en la UI para que la divergencia con el Score (mes calendario) sea explícita.

## 5. Componentes
`financial-period.util.ts` (+spec) en `modules/budget/`; extensión de `BudgetService`
y `BudgetController`; consumo posterior por el módulo `dashboard` (FIN-014, consumidor
autorizado).

## 6. Base de datos
Migración `fin016_periodo_financiero`: `user_settings.cycle_start_day INTEGER NOT NULL
DEFAULT 1` + `CHECK BETWEEN 1 AND 28`.

## 7. Backend
`GET /budget/monthly` devuelve `period {start, end, label, cycleStartDay}`;
`PATCH /budget/period` (DTO `@IsInt @Min(1) @Max(28)`).

## 8. Frontend
Etiqueta del ciclo en la tarjeta principal de Presupuesto; stepper 1–28 en Ajustes con
nota "aplica a Presupuesto e Inicio; tu Score sigue el mes calendario".

## 9. Uso de IA
Ninguno.

## 10. Riesgos
Divergencia visual ciclo vs. mes calendario del Score → mitigada con la etiqueta
visible y la nota en Ajustes.

## 11. Dependencias
Ninguna. Es base opcional de FIN-014.

## 12. Impacto
Cero en Score/Motor/Gamificación/Recomendaciones/Memoria (invariante por grep). Con
día 1 el comportamiento es byte-a-byte el actual.

## 13. Criterios de aceptación
Tests de bordes (año nuevo, febrero con corte 28, contigüidad, clamp); grep confirma
que solo Budget/Dashboard importan la utilidad; día 1 = comportamiento actual exacto;
PATCH fuera de rango → 400.

## 14. Plan
Fase B de ARQ-0011 §14: migración → util + tests → Budget la consume → selector en
Ajustes. (Ejecutado en `IMP-0016`.)
