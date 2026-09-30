# ARQ-0014 · Dashboard de Inicio v2

- **Módulo/Feature:** FIN-014
- **Origen:** derivado del umbrella `ARQ-0011` §4.3 (este documento FORMALIZA el diseño
  ya auditado por AUD-0011 y aprobado por DEC-0011 §4.3 — **no introduce ningún
  cambio**; se emite para trazabilidad individual del ciclo ARQ→AUD→DEC→IMP)
- **Autor:** Agente Arquitecto · **Fecha:** 2026-07-05
- **Estado:** Aprobado vía DEC-0011 · implementado en `IMP-0014` (commit `1af29b1`)

---

## 1. Objetivo
Que la pantalla de Inicio muestre la foto financiera completa: patrimonio, ahorro
total, ingresos y gastos con fijo/variable diferenciados, y movimientos completos.

## 2. Problema
Verificado por el CTO: el widget de gastos solo agregaba variables (sin `FixedItem`);
no había widget de ingresos; el patrimonio existía en backend (`networth.util`) pero
no se exponía en Inicio; no había ahorro total.

## 3. Alcance
**Incluye:** endpoint agregador nuevo, pantalla Inicio v2.
**Excluye:** lógica financiera nueva (es composición de fuentes ya auditadas) y
cambios al endpoint clásico `/transactions/dashboard` (se conserva, no breaking).

## 4. Arquitectura
Módulo `dashboard` **thin**: `GET /dashboard/home` compone en paralelo (`Promise.all`)
fuentes ya auditadas — `computeNetWorth` (FIN-002, misma fuente que `/net-worth`),
`FixedItem` (fijo declarado), transacciones del ciclo activo (`financialPeriod` de
FIN-016 — consumidor autorizado), cuentas de ahorro/fondo de emergencia (sin doble
conteo), 10 movimientos recientes con categoría/deuda. Respuesta:
`{period, netWorth, savings, income{fixed,variable,total,byCategory}, expense{…},
debtPayments, estimatedCashflow, recentTransactions}`.

## 5. Componentes
`DashboardService` (agregador), `DashboardController`, `DashboardModule` (registrado
en `app.module`).

## 6. Base de datos
Sin cambios.

## 7. Backend
Un solo endpoint `GET /dashboard/home` (JWT).

## 8. Frontend
Inicio v2: tarjetas patrimonio + ahorro total (con CTA a la proyección de FIN-015),
ingresos y gastos con desglose "fijo · variable", sección nueva de ingresos por
categoría, etiqueta del ciclo en el flujo, movimientos completos del servidor con la
caché local como respaldo offline.

## 9. Uso de IA
Ninguno (no se crean tools de LLM ni vistas minimizadas).

## 10. Riesgos
Latencia por agregar 5 fuentes → consultas ya indexadas en paralelo, sin N+1.

## 11. Dependencias
`networth.util` (FIN-002), `financialPeriod` (FIN-016), `FixedItem` (previo).

## 12. Impacto
`/transactions/dashboard` intacto; la pantalla de Inicio migra al endpoint nuevo.

## 13. Criterios de aceptación
**Test de consistencia:** `home.netWorth` idéntico al util auditado con la misma
entrada; sumas fijo/variable correctas; flujo = ingresos − gastos − pagos de deuda;
E2E contra `/net-worth` real; respeta el día de corte configurado.

## 14. Plan
Fase C de ARQ-0011 §14: módulo + test de consistencia → pantalla v2. (Ejecutado en
`IMP-0014`.)
