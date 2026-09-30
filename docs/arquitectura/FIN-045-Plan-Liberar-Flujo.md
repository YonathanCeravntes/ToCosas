# FIN-045 · Plan para liberar flujo de caja

- **Fecha:** 2026-09-29 · **Estado:** Implementado (pendiente validación en dispositivo)
- **Pedido del Fundador:** "En vez de *Simularlo*, la opción más viable para generar flujo de caja: como cuando alguien te dice que debe mucha plata y le das un consejo de cuál abonarle o pagar completamente, dentro de sus posibilidades."

## Decisiones del Fundador (2026-09-29)
1. **Criterio:** liberar flujo primero — la deuda que más cuota mensual libera por peso abonado (cuota ÷ saldo). Empate (±2 %) → la de tasa más alta.
2. **Monto propuesto:** la mitad de lo que queda libre en el ciclo (`teQueda`, §32). La persona puede escribir otro monto.
3. **Fondo de emergencia en paralelo:** si el colchón no cubre 1 mes de gasto esencial, el 30 % del abono va al colchón hasta completarlo; luego se suma a las deudas.

## Diseño
- `backend/src/modules/debts/cashflow-plan.util.ts`: función pura (orden, reparto, proyección mes a mes con intereses y "bola de flujo": la cuota de una deuda terminada se suma al abono de la siguiente). Tarjetas (`cuotas_por_compra`) se proyectan sin interés adicional: su saldo ya son cuotas fijas.
- `cashflow-plan.service.ts`: fuentes únicas — lo libre (`SpendableService`), cuota liberada = desembolso real (`DebtOutlayService`), saldo real (`effectiveDebtBalances`, BT-021), gasto esencial = fijos de gasto + desembolso (misma definición del Motor).
- `GET /v1/debts/cashflow-plan[?monthly=N]`.
- App: pantalla **Tu plan para liberar plata** (este mes, por qué esa primero, tu camino, colchón en paralelo, ajustar monto); **Salud** → la jugada de mayor impacto es el plan ("Termina primero X", botón *Ver mi plan*); **Mis deudas** → "Tu orden para liberar plata" (antes avalancha); **Copiloto** → "¿Qué deuda pago primero?" responde con la misma regla. El simulador queda como "Comparar".

## Verificación
- Unit `cashflow-plan.util.spec.ts` (8, caso real del Fundador: Serfinanza → Finandina → Davivienda), Copiloto actualizado; e2e fin043 (tarjeta en el plan, monto propio).
- Suites: unit 415/415, e2e 94/94; `tsc` 0/0. Revisado en web (Playwright) con backend local.

## Caso del Fundador (datos del 2026-09-29)
Libre ≈ $2,1 M → propone $1.058.000: $741.000 a Serfinanza + $317.000 al colchón. Serfinanza en 4 meses (sin plan 13), Finandina en 30 (56), Davivienda en 45 (110).
