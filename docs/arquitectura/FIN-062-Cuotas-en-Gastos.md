# FIN-062 · Las cuotas pagadas cuentan en Gastos

Fundador, 2026-10-04: "¿por qué en Gastos no se reflejan las cuotas de créditos? … si toco que pagué la cuota de una TC, se sumaría ahí. La libranza (descuento por nómina) sí o sí va ahí." Confirmó que su salario registrado es **antes** del descuento de la libranza (no hay doble conteo).

## Qué cambia
1. **Gastos de Inicio = gastos + cuotas YA pagadas** del ciclo. Tercera línea: "$ X cuotas pagadas". Lo que falta por pagar no se suma (no se da por hecho); sigue apartado en "Te queda" y en la fila "Cuotas de deudas" de "En qué se te va". Servidor: `expense.debtPaid` y `expense.totalWithPaidDebt` en `/dashboard/home` (`expense.total` no cambia: es la base de otras vistas).
2. **"Ya la pagué"** en la tarjeta Próximo pago de Inicio: registra el pago sin salir. En tarjetas ofrece primero el **pago sugerido** (FIN-061 2.4), luego total y mínimo; en créditos, la cuota. Otro monto → Registrar.
3. **Libranza automática:** una deuda cuyo pago es por nómina (`paymentSource: 'nomina'` del descriptor) se registra sola el día de pago (`FixedExpenseService.materializePayroll`, mismo recorrido de los gastos fijos: al abrir la app y en el pipeline diario). Monto = cuota del contrato (`DebtOutlayService.basePayment`). Idempotente por ciclo; si la persona anula el automático, no reaparece ese ciclo. En Inicio la libranza no lleva botón: "Se descuenta de tu nómina: Millo la registra sola".
4. `/debts/summary` → `upcoming[].amount` es la cuota real del mes (con cargos aparte; en tarjetas, sus cuotas) y trae `payroll` e `isCard`.

## Supuesto importante
El ingreso fijo declarado es **antes** del descuento de la libranza. Si alguien declara el salario ya sin la libranza, la contaría dos veces: Millo debe preguntarlo al crear una libranza (pendiente de texto de ayuda en Agregar deuda).

## Verificación
Unitarias 545/545; e2e 140/140 (nueva `fin062-cuotas-en-gastos.e2e-spec.ts` ×2); `tsc` limpio; recorrido en la web contra servidor local ("Ya la pagué" → sugerido → Gastos y Te queda actualizados).
