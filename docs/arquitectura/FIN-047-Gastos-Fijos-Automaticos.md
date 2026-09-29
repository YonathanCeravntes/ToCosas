# FIN-047 · Gastos fijos automáticos y Presupuesto rediseñado

- **Fecha:** 2026-09-29 · **Estado:** Implementado (app en la próxima OTA; backend por auto-deploy)
- **Pedido del Fundador:** "Debemos modificar esto, y modificar gastos fijos e ingresos fijos… gastos fijos como arriendo son mes a mes y son gastos que no hay que registrar."

## Decisiones del Fundador (2026-09-29)
1. **El día que toca, el gasto fijo se registra solo** (movimiento "automático", aparece en Movimientos y en "Gastos del mes", sale de "Por pagar").
2. **Si alguien igual lo registra a mano, se cruza con el fijo** y no se cuenta doble.

## Diseño
- `transactions.fixed_item_id` (migración `20260929120000_fin047_fixed_expenses_auto`).
- `budget/fixed-expense.util.ts`: fecha del fijo en el ciclo (tope día 28, igual que "Te queda"), normalización de nombres y `matchFixed` (nombre del fijo en la nota o la categoría y monto entre 0,5× y 1,5×).
- `FixedExpenseService.materialize`: crea el movimiento por el servicio central (`source = system`), idempotente por ciclo; un movimiento borrado no reaparece; un fijo creado después de su día empieza el ciclo siguiente (ese mes queda apartado). Corre al calcular "Te queda" (como mucho cada 5 min por persona) y en el recorrido diario (paso `gastos_fijos`).
- `TransactionsService.create`: cruce a mano → enlaza el fijo y retira el automático del ciclo si existía.
- `SpendableService`: el compromiso de un fijo es su monto menos lo ya registrado de él en el ciclo (§32 intacto).
- `DashboardService`: "fijos del mes" = lo registrado de los fijos (antes, lo declarado aunque no hubiera llegado su día).
- `BudgetService.monthlySummary`: estado del ciclo por fijo (`registrado` solo/a mano, o `pendiente` con fecha).
- Bot y Registrar avisan "ya lo tenías como gasto fijo: quedó cruzado".

## App · Presupuesto (lenguaje de Mis deudas / Inicio G)
Tarjeta blanca de "Te queda" con la barra del ingreso · **Con lo libre** = jugada del plan (FIN-045) · **Por pagar este ciclo** · **Ingresos fijos** y **Gastos fijos** con agregar, **editar** (nombre, monto, día) y borrar en la misma pantalla · cada gasto fijo dice "Se registró solo el 5 sep" / "Se registra solo el 5 oct" · cuotas de deudas. Movimientos muestra "automático (gasto fijo)".

## Verificación
Unit 424/424 (utilidades nuevas + specs ajustadas a la regla nueva), e2e 107/107 (nuevo `fin047-fijos-automaticos`: se registra solo, cruce sin doble conteo, borrado sin reaparecer, edición de fijo e ingreso). Web revisada con Playwright.
