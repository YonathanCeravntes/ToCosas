# IMP-0015 · Proyección de ahorro con interés compuesto (ilustrativa)

- **Módulo/Feature:** FIN-015
- **Documentos base:** `ARQ-0011` §4.4/§13 · `AUD-0011` · `DEC-0011` §4.4/§4.5 (autorizado)
- **Autor:** Agente Desarrollador · **Fecha:** 2026-07-05
- **Referencia inmutable:** commit **`6f622e31bce5da6d803421bf38fa0a1285f74513`**
- **Estado:** Entregado — a la espera de validación del CTO

## 1. Resumen
Octavo escenario **puro** `proyeccion_ahorro` en `simulation-engine.ts`: interés
compuesto con capitalización mensual usando la MISMA conversión EA→mensual del motor
de amortización (consistencia entre motores). Cumple la decisión (a) del fundador:
solo proyección ilustrativa — disclaimer fijo, tasa elegida por el usuario, cero
escritura en cuentas/series reales.

## 2. Archivos
- `simulation-engine.ts` — caso `proyeccion_ahorro` + `SAVINGS_PROJECTION_DISCLAIMER`
  exportado; FV = inicial·(1+i)^n + aporte·((1+i)^n−1)/i; serie anual `valueYearN`;
  **el estado financiero no se modifica** (before === after en métricas).
- `simulations.service.ts` — validación: aporte>0, tasa 0–100, meses 1–600 entero,
  inicial ≥0 opcional. `simulations.controller.ts` — enum del DTO + 4 campos.
- Migración `20260705123000_fin015_proyeccion_ahorro` — **cambio ADITIVO** de enum
  (`SimulationType` + `proyeccion_ahorro`) para el registro `Simulation`.
- Frontend: quinto chip "¿Cuánto tendría ahorrando?" en el simulador; tarjeta de
  resultado propia (FV, aportes, interés ganado, serie anual, disclaimer visible);
  CTA desde la tarjeta de ahorro del Inicio (`Simulator` acepta `{scenario}`).

## 3. Funcionalidades
Proyección con aporte mensual, tasa EA ilustrativa y horizonte hasta 50 años;
consume la **cuota free compartida** de 5 simulaciones/mes (mismo `run()` y misma
tabla `Simulation` que el resto de escenarios — DEC-0011 §4.5).

## 4. Pruebas
- Suite completa **292/292** en el commit (287 + 5 anclas):
  - **Ancla exacta por definición de EA:** 1M al 8% EA sin aportes = 1.080.000 en 12 meses.
  - **Ancla exacta tasa 0:** suma aritmética (2.4M en 24 meses de 100k).
  - Cota superior: FV < aportes·(1+EA) para aportes mensuales.
  - `delta.score/cashflow/netWorth === 0` (ilustrativo, no delta de hoy).
  - Disclaimer presente + serie anual creciente.
- E2E real: 200k/mes al 8% EA por 36 meses → FV **8.073.073,81**, interés
  **873.073,81**, serie {2.486.777 / 5.172.497 / 8.073.074}; `months=900` → 400.

## 5. Incidencias
- El DTO del controller tenía enum en whitelist → el escenario nuevo devolvía 400.
  Detectado por E2E, corregido en el mismo commit (enum + campos añadidos).

## 6. Limitaciones / desviación declarada
- ARQ-0011 §6 decía "FIN-015 sin cambios de BD"; el registro `Simulation` persiste
  `type` como enum de Postgres, así que fue necesario **un valor de enum aditivo**
  (sin tablas ni columnas nuevas). Desviación mínima, declarada aquí para el CTO.
- La serie es anual (no mensual) para mantener `specifics` plano.

## 7. Resultado
Completo conforme a DEC-0011 §4.4/§4.5. Guardarraíles de la decisión (a) activos:
disclaimer no removible, tasa del usuario, motor puro sin persistencia real.
