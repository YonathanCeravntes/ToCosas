# FIN-043 · Pagos de tarjeta aplicados a cuotas (BT-018) + cifras reales de tarjeta (BT-016/019)

- **Fecha:** 2026-09-28 · **Autor:** Arquitecto (ciclo compacto `DEC-ORG-002`) · **Estado:** **Implementado, pendiente de validación del Fundador.**
- **Origen (§27):** pregunta del Fundador en la primera prueba real de FIN-042: "si abono 300.000, ¿toma capital e interés? ¿abonar es distinto de pagar cuota?". Al revisar, se encontró que un pago a una tarjeta **no descontaba sus cuotas** (y podía marcar la tarjeta como pagada): defecto pre-existente de FIN-031 (su "flujo de pago" quedó diseñado en `ARQ-0031` pero no implementado).

## Regla (§32, una sola autoridad)
- En una **tarjeta** el saldo = Σ cuotas pendientes de sus compras (FIN-031). Un **pago** (`pago_deuda`) se aplica a esas cuotas **de la más antigua a la más nueva**: cuota cubierta → pagada (`paid_at`, `paid_tx_id`); cuota cubierta en parte → la parte pagada se separa en una fila propia (`split_of_id`) y la original conserva lo que falta. Sobrante → no se inventa saldo negativo. `next_due_date` = cuota pendiente más próxima. La tarjeta **nunca** pasa a "pagada" por un pago (sigue activa con saldo 0).
- **Anular** el pago devuelve exactamente las cuotas que cubrió (reunifica las separadas).
- **No hay "abono a capital" aparte en tarjetas**: pagar más de la cuota del mes simplemente cubre cuotas futuras. El endpoint de abono responde 400 con ese mensaje. (En créditos amortizados el abono a capital sigue igual: FIN-012.)
- **Intereses y cargos de tarjeta:** las cuotas importadas desde un extracto son **capital**; los intereses, seguros y cargos del banco aparecen en el siguiente extracto. Camino recomendado: enviar cada mes el nuevo extracto al bot (FIN-042). Candidata: conciliación automática entre extractos ("cargos del periodo" como compra sin cuotas).
- **Lista y resumen** (BT-016/BT-019): `GET /debts` expone para tarjetas `currentBalance` = saldo usado y `monthlyPayment` = cuota del mes (próxima cuota de cada compra); `GET /debts/summary` suma tarjetas en `totalDebt` y usa la misma autoridad del desembolso para `monthlyPaymentsTotal`. Sin OTA: la app ya pinta esos campos.

## Componentes
`debts/card-payment.util.ts` (nuevo: `isCardDebt`, `applyCardPayment`, `revertCardPayment`, `refreshCardNextDue`) · `transactions.service.ts` (create/remove ramifican por tarjeta) · `debts.service.ts` (lista y resumen) · `debt-prepayment.service.ts` (guarda de tarjeta) · Prisma `card_installments.paid_tx_id`, `split_of_id` (migración `20260928190000_fin043_card_payments`, a mano).

## Verificación
`tsc` 0 · unit 399/399 · e2e **86/86** incl. `fin043-pagos-tarjeta` (5 casos: lista/resumen, pago parcial con separación, anulación exacta, sobrepago, abono bloqueado). **Pendiente Fundador:** registrar el pago real del mes a la tarjeta Serfinanza y ver bajar el saldo y avanzar el vencimiento.
