# ARQ-0015 · Proyección de ahorro con interés compuesto (ilustrativa)

- **Módulo/Feature:** FIN-015
- **Origen:** derivado del umbrella `ARQ-0011` §4.4 (este documento FORMALIZA el diseño
  ya auditado por AUD-0011 y aprobado por DEC-0011 §4.4/§4.5 — **no introduce ningún
  cambio**; se emite para trazabilidad individual del ciclo ARQ→AUD→DEC→IMP)
- **Autor:** Agente Arquitecto · **Fecha:** 2026-07-05
- **Estado:** Aprobado vía DEC-0011 · implementado en `IMP-0015` (commit `6f622e3`)

---

## 1. Objetivo
Mostrar cuánto tendría el usuario ahorrando un aporte mensual a una tasa ilustrativa,
sin que Millo capte dinero ni ofrezca rendimiento (decisión (a) del fundador).

## 2. Problema
No existía dashboard de ahorro proyectado ni concepto de tasa en cuentas/activos
(verificado por el CTO). El fundador acotó el alcance a proyección/simulación
ilustrativa — cero riesgo regulatorio nuevo.

## 3. Alcance
**Incluye:** escenario nuevo en el motor de simulación (FIN-007), UI en simulador,
CTA desde la tarjeta de ahorro del Inicio.
**Excluye:** cualquier producto de rendimiento real, captación o recomendación de
inversión; escritura en cuentas/series reales.

## 4. Arquitectura
Octavo escenario **puro** `proyeccion_ahorro` en `simulation-engine.ts`:
- Interés compuesto con capitalización mensual usando la **misma conversión
  EA→mensual** del motor de amortización (`toMonthlyEffectiveRate` — consistencia
  entre motores): `FV = inicial·(1+i)^n + aporte·((1+i)^n − 1)/i` (aportes a fin de
  mes; con `i=0`, suma aritmética).
- Salida en `specifics`: `futureValue`, `totalContributed`, `interestEarned`, serie
  anual `valueYearN`, y **disclaimer fijo no removible**
  (`SAVINGS_PROJECTION_DISCLAIMER`: "Millo no ofrece productos de inversión ni
  garantiza rendimientos. La tasa la eliges tú.").
- **El estado financiero no se modifica** (before === after en métricas): es una foto
  del futuro, no un delta de hoy.
- Consume la **cuota free compartida** de 5 simulaciones/mes (mismo `run()` y tabla
  `Simulation` — DEC-0011 §4.5, consistencia con DEC-0009 §10.3).

## 5. Componentes
Caso nuevo en el switch del motor; validación en `SimulationsService`; enum del DTO
del controller.

## 6. Base de datos
Valor **aditivo** de enum (`SimulationType.proyeccion_ahorro`) para el registro
`Simulation` — sin tablas ni columnas nuevas. (Desviación mínima del "sin BD" del
umbrella, declarada en IMP-0015 §6.)

## 7. Backend
Validación: aporte > 0; tasa 0–100; meses 1–600 entero; inicial ≥ 0 opcional.

## 8. Frontend
Quinto chip "¿Cuánto tendría ahorrando?" en el simulador; tarjeta de resultado propia
(FV, aportes, interés ganado, serie anual, disclaimer visible); la ruta `Simulator`
acepta `{scenario}` para el CTA del Inicio.

## 9. Uso de IA
Ninguno.

## 10. Riesgos
Percepción de asesoría de inversión → disclaimer fijo + tasa ingresada por el usuario
(con placeholder ilustrativo) + cero persistencia real.

## 11. Dependencias
`SimulationEngine` (FIN-007), cuota de simulaciones (FIN-009), tarjeta de ahorro del
Inicio (FIN-014, solo CTA).

## 12. Impacto
La cuota free se reparte ahora entre 8 escenarios sin cambiar el límite. El contrato
del motor (puro, nunca escribe) se conserva.

## 13. Criterios de aceptación
Anclas exactas: 1M al 8% EA sin aportes = 1.080.000 en 12 meses (definición de EA);
tasa 0 = suma aritmética; FV acotado por aportes·(1+EA); `delta` de métricas = 0;
disclaimer presente en API y UI; validación de rangos → 400.

## 14. Plan
Fase E de ARQ-0011 §14: escenario puro + tests de ancla → chip + CTA. (Ejecutado en
`IMP-0015`.)
