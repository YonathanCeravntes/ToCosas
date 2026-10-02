# FIN-057 · Deudas e ingresos en Inicio

- **Fecha:** 2026-10-02 · **Pide:** Fundador ("¿por qué no podemos colocar ahí las deudas?… no hay otra opción que diga cómo te llega el dinero… Hago Didi con el carro… presenta una propuesta que cubra esos ámbitos y los puntos ciegos"). Tras ver el boceto: **"Aceptado, incluyendo tus requerimientos. Proceder."**
- **Ejecuta:** Arquitecto. Boceto: lienzo "Deudas e ingresos en Inicio" (https://claude.ai/artifact/UGYXp5Y5fWuEkd3WZaYr1v).

## 1. Decisiones del Fundador (2026-10-02)
| Decisión | Elegida |
| --- | --- |
| Qué cifra lleva la fila de deudas | Lo pagado en el ciclo; en pequeño, lo que falta de la cuota del mes y la fecha de vencimiento. |
| Base del porcentaje de "En qué se te va" | Gastos **más** pagos de deudas (lo que de verdad salió del bolsillo). |
| Dónde vive "Cómo te llega la plata" | Bloque propio en Inicio, **solo cuando hay más de una fuente**. Para quien vive de un salario, Inicio no cambia. |
| Base de "Te queda" (punto ciego 1) | Por partes: salario con salario, extra con extra. Actualiza BT-004. |
| Categoría del rebusque | Una sola, **Plataformas** (Didi, Uber, InDriver, Rappi, Picap…). |

## 2. Implementado

### Servidor
- **`budget/income-split.util.ts`** (nuevo, fuente única §32): `splitIncomeBase` = parte fija `max(salario neto declarado + deducciones auto-pagadas, salario recibido)` + parte variable `max(variable estimado, extra recibido)`. "Salario recibido" son los ingresos del ciclo en la categoría de salario **o sin categoría** (un ingreso sin categoría es ambiguo y se compara con el salario, como antes, para no contarlo doble); "extra" son los ingresos con otra categoría. Pruebas en `income-split.util.spec.ts`.
- **`SpendableService`** ("Te queda"): usa el util; expone `incomeFixedBase`, `incomeVariableBase`, `receivedSalary`, `receivedExtra`. Caso del Fundador probado: salario declarado 3.200.000 sin registrar + 224.000 de Didi → base 3.424.000 (antes 3.200.000 y Didi no aportaba nada).
- **`DashboardService.home`**:
  - `debt`: `{ paid, committed, remaining, percent, nextDueDate, byDebt[] }`. `committed` es el desembolso real del mes por deuda (`DebtOutlayService`, misma autoridad que "Te queda" y Endeudamiento). `percent` sobre `expense.totalWithDebt` = gastos + pagos de deudas; `expense.byCategory[].percent` usa la misma base.
  - `income.sources`: una fila por fuente — la parte fija de "Te queda" como "Salario" (si lo recibido manda y hubo ingresos sin categoría, estos salen como fila "Sin categoría" para que se organicen) y lo extra por categoría, con `count` (14 carreras) y `previous` (ciclo anterior). `income.fixed/variable/total` ahora son las partes de la base (antes "variable" era todo lo registrado y un salario registrado se contaba doble).
- **Categoría global `Plataformas`** (ingreso, 🚗) con palabras clave; se siembra sola al arrancar.
- **Bot** (`rule.parser.ts`, `conversation.service.ts`):
  - "uber" y "didi" salen de Transporte. Con verbo se resuelve ("me gané 16.000 en didi" → ingreso Plataformas; "pagué 12.000 de uber" → gasto Transporte; "carrera 16.000" → ingreso Plataformas). Sin verbo ("didi 16.000") el bot pregunta **"¿los pagaste o te los ganaste?"** una vez y guarda la respuesta por plataforma (`category_hints`, clave `plataforma:didi`); la próxima vez no pregunta.
  - La pregunta genérica del tipo ("¿gasto, ingreso o pago de deuda?") ya tiene respuesta: antes era un callejón sin salida porque "ingreso" solo no se entendía. Ahora el movimiento queda pendiente (`bot_pending_actions`, tipo `tipo_movimiento`, 30 min) y la palabra lo completa. Si lo que la persona ya le enseñó a Millo sobre ese comercio trae el tipo, tampoco pregunta (`suggestCategoryAny`).

### App
- **Inicio:** fila morada "Cuotas de deudas" dentro de "En qué se te va" (siempre visible con deudas; pagado, % sobre lo que salió, "Faltan $X de las cuotas de este mes · vence el 15"); las otras dos filas son las categorías más altas. Bloque nuevo **"Cómo te llega la plata"** (barra por fuente + hasta tres filas: "Salario · fijo", "Didi · 14 veces · unos $16.000 cada una · el ciclo pasado $190.000"), solo con más de una fuente. Tocar el salario abre Mi mes; tocar una fuente abre sus movimientos.
- **Pantalla "Ver todo"** (`CategoriesScreen`): pestañas **Gastos** (con la fila de deudas abierta por deuda → detalle de la deuda) e **Ingresos** (las fuentes completas). El título cambia con la pestaña.
- **Mi mes:** bajo "Te entra", "$3.200.000 de salario + $224.000 extra" cuando hay plata extra.
- Token de color `colors.debt` / `debtSoft` (morado, distinto de cualquier categoría).

## 3. Puntos ciegos anotados (fase 3, sin fecha)
- Categoría en las compras a cuotas con tarjeta (hoy aparecen como cuota al pagarlas, no en "Ropa").
- Gastos del carro ligados a la plataforma ("Didi te dejó $224.000 y te costó $70.000").
- Meta por fuente ("esperabas $300.000 de Didi; llevas $224.000").

## 4. Verificación
- Servidor: `tsc` limpio; unitarias completas en verde (nuevas: `income-split.util.spec`, `kind-reply.spec`, casos FIN-057 en `spendable.service.spec`, `dashboard.spec`, `rule.parser.spec`); e2e 124/124.
- App: `tsc` limpio. Revisión visual pendiente en la web y por OTA.

## 5. Pendiente
- OTA desde el PC del Fundador (junto con lo de FIN-056).
- Probar en Telegram: "didi 16.000" → pregunta → "ingreso" → acuse; la segunda vez sin pregunta.
