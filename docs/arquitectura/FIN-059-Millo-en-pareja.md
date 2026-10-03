# FIN-059 · Millo en pareja

- **Fecha:** 2026-10-03 · **Pide:** Fundador (idea "ParejasFin"). Estudio de mercado y boceto: lienzo "Millo en pareja" (https://claude.ai/artifact/BaEM6WCcDcc7H6u6HQieMj). Decisión: **"Lo que dice, así es, aprobado. Darle, de una."**
- **Ejecuta:** Arquitecto.

## 1. Decisiones del Fundador (2026-10-03)
| Decisión | Elegida |
| --- | --- |
| ¿App aparte o dentro de Millo? | **Dentro de Millo** ("Millo en pareja", en Más). |
| Modelo | **Tuyo, mío y nuestro** con cuadre de fin de mes. |
| Reparto | **Proporcional al ingreso** si los dos comparten su proporción; si no, mitad y mitad. Editable. |
| Deudas personales del otro | **Solo totales** (cuota del mes y saldo), apagado por defecto. |
| Cuándo | **Ahora** ("de una"), en lugar de después del lanzamiento como recomendaba el Arquitecto. La validación con 10 parejas se hace con la función ya hecha. |

## 2. Reglas que no se negocian (Ley 1257 y Ley 1581)
- Lo personal es privado: solo cuenta en el hogar lo marcado "de la casa" (movimientos, gastos fijos, deudas).
- Del ingreso viaja **solo el porcentaje** y solo si la persona lo activa; el monto nunca sale del servidor (probado en e2e).
- De las deudas personales, solo totales y solo si la persona lo activa; nunca nombres ni compras.
- Cada persona acepta por separado (consentimiento guardado) y **sale sola, en un toque**, sin permiso del otro. Al salir, sus fijos y deudas de la casa vuelven a ser solo suyos y "Nuestro mes" deja de sumar lo suyo. Borrar la cuenta también saca del hogar.
- La pantalla muestra la Línea Púrpura (Bogotá) y la Línea 155.

## 3. Implementado

### Servidor
- **Migración `20261003090000_fin059_millo_en_pareja`** (escrita a mano, sin la deriva M11): `households` (modo de reparto, presupuesto de la casa), `household_members` (consentimiento, `share_income`, `share_debts`, salida; **un hogar activo por persona** con índice único parcial), `household_invites` (código de 6 caracteres sin ambiguos, 7 días), `household_goals` y `household_goal_contributions`; columna `household_id` en `transactions`, `fixed_items` y `debts`.
- **`modules/household`:** `HouseholdService` + `HouseholdController` (`/v1/household`): estado, crear (con consentimiento), invitar, unirse (10 intentos/min), privacidad propia, modo de reparto y presupuesto, salir, `month` ("Nuestro mes"), metas (crear, aportar, borrar) y marcar una deuda propia como de la casa.
- **"Nuestro mes"** (mes calendario, el mismo para los dos): lo que ya salió de la casa, fijos y cuotas de la casa por pagar (desembolso real, misma autoridad que "Te queda"), "Nos queda" si hay presupuesto, aporte justo y cuadre (`household.util.ts`, puro y probado: 60/40 → "Andrea te pasa $150.000"; diferencias < $1.000 no generan cuadre), deudas de la pareja en totales, metas con ritmo estimado y lo último de la casa.
- **Movimientos y fijos:** `household: true` en crear/editar marca "de la casa" contra el hogar activo; los fijos de la casa se registran solos como gastos de la casa.
- **Bot:** "casa", "de la casa" u "hogar" en el mensaje marca el gasto ("mercado 186.000 casa"); el acuse dice "gasto de la casa".
- **Exportar datos** incluye la pertenencia al hogar.

### App
- **Más → Millo en pareja** (`HouseholdScreen`): bienvenida con qué se comparte y qué no + consentimiento; crear e invitar o unirse con código; espera con el código grande y "Compartir"; **Nuestro mes** con avatares (azul tú, rosado tu pareja), cifra de la casa y barra, **aporte justo** (selector proporcional / mitad, avance de cada uno, cuadre), fijos y cuotas de la casa, deudas de la pareja en totales, **metas juntos** (crear, sumar aporte, ritmo), lo último de la casa; **"Lo tuyo que es de la casa"** para marcar fijos y deudas propios; **presupuesto de la casa**; **privacidad** con interruptores y **salir** con confirmación en la misma pantalla.
- **Registrar:** "Mío / De la casa" en gastos (solo si la persona está en un hogar), también para gastos fijos nuevos.

## 4. Verificación
- Servidor: `tsc` limpio; unitarias 493/493 (nuevas: `household.util.spec`); e2e 132/132 (nueva: `fin059-millo-en-pareja.e2e-spec.ts`, 8 casos con dos personas reales y un intruso).
- App: `tsc` limpio. Revisión visual pendiente por OTA y en la web.

## 5. Pendiente / siguiente
- Marcar como "de la casa" un movimiento ya registrado desde Editar movimiento (hoy: al registrarlo, o por el bot).
- Cobro de **Millo+ Pareja** (COP 14.900/mes sugerido) cuando se active el cobro en tiendas.
- Validar con 10 parejas (preguntas en el lienzo).
