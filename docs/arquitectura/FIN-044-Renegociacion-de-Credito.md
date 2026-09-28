# FIN-044 · Renegociación de un crédito

- **Fecha:** 2026-09-28 · **Autor:** Arquitecto (ciclo compacto `DEC-ORG-002`) · **Estado:** **Implementado, pendiente de validación del Fundador.**
- **Origen (§27):** Fundador: "debería dejarme modificar el crédito (número de cuotas, tasa fija o variable) porque hay negociaciones, y preguntar desde qué fecha aplica y si el ciclo de facturación queda igual". Aprobado ("Dale").

## Qué hace
- En el detalle de una deuda (no tarjeta): **Renegociar / actualizar condiciones**. Por el bot: `renegociar <nombre> [cuotas N] [tasa X] [fija|variable] [cuota N] [saldo N] [dia N] [desde AAAA-MM-DD]`.
- Cambios admitidos (uno o varios): cuotas que faltan, tasa y **tipo (fija/variable)**, cuota pactada (en créditos con plan, si no se da el plazo se derivan las cuotas de ella; si no cubre los intereses del mes, se rechaza con explicación), saldo recompuesto, día de pago.
- **"¿Desde cuándo aplica?"**: próxima cuota (por defecto) u otra fecha. **"¿El día de pago sigue igual?"**: sí (se conserva) o no (nuevo día). La primera cuota con las condiciones nuevas = primera fecha ≥ "desde" que cae en el día de pago elegido.
- **Antes → después** antes de confirmar: cambios en lenguaje llano, fecha de fin e intereses por pagar. Nada cambia hasta confirmar (§42). El bot usa la misma propuesta pendiente de FIN-042 (sí/no).
- Al confirmar (una transacción): plan recalculado sobre el saldo pendiente desde la primera cuota nueva (lo pagado no cambia), deuda actualizada (saldo, cuota, tasa, tipo, plazo, día, próximo vencimiento), **huella inmutable** en `debt_renegotiations` (antes, después, desde, ciclo conservado, canal, nota) y evento `DebtUpdated` → Motor, Score y "Te queda" (§32, DEC-0042) se recalculan.
- Historial visible en la pantalla de renegociación.
- **No entra:** tarjetas (su saldo sale de las compras; respuesta honesta); tasa variable automática por DTF (el usuario la actualiza con una renegociación o, a futuro, con el extracto mensual por el bot); simular antes de negociar con el banco (usar el simulador).

## Componentes
Backend: `debts/debt-renegotiation.service.ts` (plan/preview/apply/history, `nextOccurrence`, `termForPayment`, `describeChanges`), `dto/renegotiate.dto.ts`, endpoints `POST /debts/:id/renegotiate/preview`, `POST /debts/:id/renegotiate`, `GET /debts/:id/renegotiations`; Prisma `DebtRenegotiation` (migración `20260928210000_fin044_debt_renegotiations`, a mano). Bot: `messaging/renegotiation-command.ts` + `ConversationService.handleRenegotiation*`. App: `RenegotiateDebtScreen` + botón en el detalle (OTA).

## Verificación
tsc front/back 0 · unit 407/407 (+ `renegotiation-command.spec` 4) · e2e **91/91 (20)** incl. `fin044-renegociacion` (vista previa sin efectos, aplicar con cambio de día y fecha, cuotas derivadas de la cuota pactada, cuota que no cubre intereses, tarjeta rechazada).
