# DEC-0042 · "Te queda": una cuota por deuda por ciclo (refinamiento de §32)

- **Fecha:** 2026-09-28 · **Decide:** Fundador ("Sí") · **Propone y ejecuta:** Arquitecto (`DEC-ORG-002` §44.2: definición §32 → freno y decisión del Fundador)
- **Contexto:** primer uso real con tres deudas nuevas (cuotas del 2 y 7 de octubre) el día 28 del ciclo de septiembre. Inicio decía "de cada $100, $100 libres" y Salud mostraba a la vez "Endeudamiento $246 de cada $100" y "Capacidad de ahorro $100 de cada $100". Causa: Endeudamiento suma la cuota **mensual** de cada deuda; "Te queda" (y por BT-007 la Capacidad de ahorro) solo contaba las cuotas con vencimiento **dentro del ciclo**. Dos relojes, una contradicción visible.

## Decisión
1. **Compromiso de deuda del ciclo = UNA cuota por deuda activa por ciclo**, por su desembolso mensual real (FIN-023, `DebtOutlayService`, la misma autoridad que el pilar de Endeudamiento), **menos lo ya pagado a esa deuda en el ciclo**. No importa si el banco cobra el 30 o el 2 del mes siguiente: la plata de este ciclo la cubre.
2. Al registrar el pago de una cuota, el compromiso desaparece y entra como pago real: **"Te queda" no cambia** (coherencia exigida por el Fundador). Un pago parcial descuenta la parte pagada.
3. Los fijos de gasto y las deducciones auto-pagadas siguen con la política (ii) de `DEC-0020` (comprometidos hasta el cierre del ciclo). FIN-040 propondrá la salida por confirmación (ii-b).
4. Supersede la cláusula "cuotas con `nextDueDate` dentro de lo que resta del ciclo" de `ARQ-0020`/FIN-020. `DEC-0024` (una sola fecha de vencimiento por deuda) no cambia: la fecha sigue siendo informativa en la línea de tiempo; una cuota vencida sigue comprometida (mora).

## Efecto
Inicio, Presupuesto, Capacidad de ahorro (Score, BT-007) y Endeudamiento salen de la misma fuente. Con las tres deudas del Fundador, "Te queda" descuenta las tres cuotas del mes y "de cada 100" da un número real.

## Ejecución
`SpendableService` (docstring y bloque de cuotas), spec con caso nuevo (pago total/parcial en el ciclo), e2e sin cambios (86/86). Documentado en `ESTADO_PROYECTO.md` §"Definición vigente de Te queda".
