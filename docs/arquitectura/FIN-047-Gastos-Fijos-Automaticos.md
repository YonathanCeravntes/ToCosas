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

## FIN-048 · Tipos de gasto fijo separados de los variables (Fundador, 2026-09-29)
**Pedido:** "El nuevo gasto fijo debería tener una lista de tipos (arriendo, etc.) y una nota… toca ir separando estos ítems: una cosa son fijos y otra gastos variables."

**Decisiones:** (1) dos listas; (2) Registrar muestra solo las variables, con el atajo "¿Es algo que pagas cada mes? Créalo como gasto fijo".
- **Tipos fijos:** Arriendo · Administración · Servicios públicos · Internet y TV · Celular · Educación · Seguros · Suscripciones · Transporte fijo · Gimnasio · Apoyo familiar · Otro fijo.
- **Variables:** Comida · Mercado · Transporte · Salud · Salidas y entretenimiento · Ropa · Hogar · Otros gastos.
- `categories.is_fixed` (migración `20260929140000_fin048_fixed_categories`); "Servicios" → "Servicios públicos" y "Entretenimiento" → "Salidas y entretenimiento" conservando su id (el historial no cambia). El sembrado mantiene las globales alineadas (tipo y palabras clave) y asigna tipo a los fijos antiguos por su nombre.
- Nuevo gasto fijo = elegir tipo (cuadrícula con ícono) → monto, día y **nota** opcional ("Otro fijo" pide qué es). Los fijos creados por el bot o el Copiloto infieren su tipo por el nombre.
- El cruce (FIN-047) también usa las palabras del tipo: "pagué la luz" → Servicios públicos (palabra completa: "gas" no cruza con "gasolina").
- Verificación: unit 425/425, e2e 110/110 (3 casos nuevos en `fin047-fijos-automaticos`). Web revisada con Playwright.

## FIN-049 · Fijo o variable se elige al registrar (Fundador, 2026-09-29)
**Pedido:** "Se da mucha vuelta para ingresar un gasto fijo o variable, así mismo ingresos fijos o variables. Debería elegirse ahí, cuando vas a registrar."

- **Registrar → "Un último detalle"** tiene ahora "¿Se repite cada mes?" con dos opciones: **Solo esta vez** (variable, como siempre) y **Cada mes** (fijo). Reemplaza el atajo que mandaba a Presupuesto.
- **Gasto + Cada mes:** la cuadrícula cambia a los tipos de gasto fijo (FIN-048), pide el día de pago (por defecto, el día de la fecha) y la nota ("Otro fijo" pide qué es). Crea el gasto fijo y registra el de este mes **enlazado** (`fixedItemId` explícito, validado como propio): no se cuenta doble y el próximo mes se registra solo.
- **Ingreso + Cada mes:** misma cuadrícula de ingresos + día + nombre opcional (por defecto, la categoría). Crea el ingreso fijo y registra lo recibido este mes; "Te queda" usa max(ingreso fijo, recibido), así que tampoco se cuenta doble.
- Sin conexión el fijo no se guarda a medias (si el movimiento falla, se retira el fijo recién creado) y se avisa. "Deshacer" retira ambos.
- **Bug corregido:** si las categorías no cargaban (p. ej. backend despertando o desplegando), la cuadrícula quedaba vacía sin aviso; ahora dice "No pude cargar las categorías · Reintentar".
- Backend: `CreateTransactionDto.fixedItemId` (solo al crear; la edición no lo acepta).
- Verificación: unit 425/425, e2e 111/111 (caso nuevo en `fin047-fijos-automaticos`). Web revisada con Playwright (gasto fijo y ingreso fijo de punta a punta).
