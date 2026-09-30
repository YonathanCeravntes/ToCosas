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

## FIN-050 · Presupuesto → "Mi mes" (Fundador, 2026-09-29)
**Pregunta del Fundador:** ¿qué queremos transmitir con Presupuesto? **Respuesta acordada:** "¿cuánto puedo gastar sin tocar lo comprometido hasta que me vuelva a entrar plata?". Se eligió el nombre **"Mi mes"** y la **opción 1 · La cuenta del mes** (boceto en el lienzo de diseño).

- **Tarjeta principal:** barra Comprometido / Día a día / Libre y la cuenta a la vista: *Te entra − Comprometido (fijos y deudas) − Día a día (ya gastado) = Libre*. Es "Te queda" (§32) partido en tres: `TeQueda` suma `committedPaid`, `dailySpent` y `paidCommitments` (backend), y siempre cuadra: `incomeBase − committedPaid − protectedTotal − dailySpent = amount`.
- **Comprometido, uno por uno:** lo que falta (con fecha; si ya pasó, etiqueta neutra §4.1-bis) y lo ya hecho: **Registrado** (gasto fijo) o **Pagado** (cuota con pago registrado). Reemplaza "Por pagar este ciclo" y "Cuotas de tus deudas".
- **Te entra:** ingresos fijos (solo lectura). **"Editar fijos e ingresos"** abre la edición de FIN-047/048 en la misma pantalla.
- "Con lo libre" (plan FIN-045) se mantiene bajo la tarjeta.
- Renombrado en Más, en el título, en los acuses de Registrar, en Ajustes, en el botón del Copiloto ("Ver mi mes") y en el bot de Telegram.
- Verificación: unit 425/425, e2e 112/112 (caso nuevo: la cuenta de Mi mes cuadra con Te queda). Web revisada con Playwright.

## FIN-051 · Mi perfil de ingresos: "De bruto a neto" + deducciones sugeridas (Fundador, 2026-09-29)
**Decisión:** opción 2 del boceto y darle uso a "¿De qué vives?" (antes se guardaba y nada lo usaba).

- **Tarjeta blanca** con el neto disponible, barra Te llega / Variable estimado / Deducciones y la cuenta: *Fijo − deducciones + variables*. Si hay deducciones que paga la persona, se indica que quedan apartadas en Mi mes.
- **Fuentes separadas en FIJOS y VARIABLES.** El alta pide fija o variable, monto bruto (o estimado) y el **día que llega** (antes no se pedía aquí).
- **Deducciones sugeridas por perfil** (`frontend/src/utils/deductionPresets.ts`), se agregan con un toque y se pueden borrar o ajustar:
  - Empleado: Salud 4% + Pensión 4%, sobre el total, retenidas (nota: +1% al fondo de solidaridad desde 4 SMMLV).
  - Independiente (y Empresario que no está en nómina): Salud 12,5% + Pensión 16% sobre el 40% del ingreso, las paga la persona (se apartan como compromiso).
  - Pensionado: Salud 12%, retenida (nota: con mesadas bajas puede ser menor).
  - Estudiante / Otro: sin sugerencia.
- Solo se sugieren las que falten por tipo; cambiar de perfil no borra ni cambia deducciones ya creadas.
- Cada deducción muestra su valor en pesos, sobre qué base y si te la descuentan o la pagas tú.
- Sin cambios de backend (usa `NetIncomeService` y la API existente). Web revisada con Playwright.

## FIN-052 · Simulador "¿Qué pasa si…?" opción 2 (Fundador, 2026-09-29)
- Escenarios en una **fila de chips** con nombre corto (Abono extra, Crédito, Recortar gastos, Cambio de ingreso, Avalancha o bola, Refinanciar, Vender activo, Ahorro); la pregunta completa va de título y "Nada de esto cambia tus datos reales".
- **Deuda en lista de opción única** (tarjeta blanca, fila elegida en verde suave) con saldo, tasa y marca "tu plan empieza aquí" o "la más cara". La deuda por defecto es la primera del **plan para liberar flujo** (FIN-045), no el orden de ataque anterior.
- **Campos grandes con unidad** ($, meses, % EA) y **montos rápidos** de un toque ("100 mil", "200 mil", "1 millón", "36 meses"…).
- Resultado con los colores nuevos y el siguiente paso como botón verde ("Hazlo real: abonar a capital"); "Ajusta tus compromisos en Mi mes".
- Sin cambios de backend. Web revisada con Playwright (abono extra y crédito).

## FIN-053 · Copiloto opción 2 "Conversación + chips" (Fundador, 2026-09-29)
- Arranca como una conversación: el Copiloto saluda en su burbuja (con su ícono) y las preguntas sugeridas son **chips** debajo; al tocar una se envía.
- **Novedades** y **Recomendado para ti** en tarjeta blanca con filas (ícono en círculo por tipo, título, detalle y ✕ para descartar). Tocar una novedad se la pregunta al Copiloto.
- El estado de la IA pasa al pie, junto al campo de escribir: "Modo básico · Activar IA para preguntas abiertas" o "IA activa · te quedan N mensajes hoy". Se quitó la franja de arriba.
- El permiso de un toque (FIN-046) se mantiene arriba mientras no se haya aceptado.
- Burbujas nuevas: la del Copiloto en blanco con esquina recta hacia su ícono; la tuya en verde.
- Sin cambios de backend. Web revisada con Playwright (permiso, novedades, chips y respuesta).
