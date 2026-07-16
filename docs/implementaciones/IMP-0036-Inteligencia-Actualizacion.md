# IMP-0036 · Inteligencia de actualización — confirmación mensual por corte (P3 del EOC)

- **Versión:** 1.0
- **Fecha:** 2026-07-16
- **Autor:** Agente Arquitecto/Desarrollador
- **Estado:** Entregado — en rama de trabajo, para VALIDACIÓN e integración del CTO
  (§36.2, `DEC-ORG-001` — auditoría directa del CTO).
- **Historial de cambios:**
  - v1.0 (2026-07-16) — P3 del programa EOC; secuencia 035→036→037.
- **Módulo/Feature:** FIN-036 (P3 de DEC-0033) · **Origen (§27):** Visión del Fundador ·
  Prioridad Alta
- **Documentos base:** `ARQ-0036` v1.0 (`7c75070`) · `DEC-0036` (§3 restricción
  `auto_detectable` + §4 condiciones) · `DEC-0030` §5 · GOBERNANZA §32/§42
- **Referencia inmutable (regla GOBERNANZA):** commit
  **`6d62b34b11a88e98c8c4d99fbc2f5522a41f2d3f`**

## 1. Resumen

Milla mantiene el modelo al día en el tiempo **preguntando solo ante señal real** — la fecha de
corte que cada producto conoce desde su alta — y **nunca por rutina**. La pregunta se **propone**,
el usuario confirma o descarta (**nivel 2**, nunca un cambio silencioso), y "no cambió" congela
hasta el próximo corte. **NO toca `transactions.service`/Registrar.**

## 2. Cumplimiento (DEC-0036 §3 + §4)

| Condición | Implementación | Verificación |
|---|---|---|
| **§3 — `auto_detectable` no escribe sin confirmación** | La cadencia **no existe en el código** (omitida por completo del tipo `UpdateCadence`; reservada a una DEC futura). Toda cadencia aplica por nivel 2. | grep `auto_detectable` = 0 en `src/` |
| **§4.1 — test día-1** | El detector deriva el **último corte ocurrido** de `nextDueDate`/`paymentDay` y exige que sea **posterior a `createdAt`**: una deuda recién creada calla hasta su primer corte. Cero dependencia de uso. | unit: deuda creada hoy → 0 pendientes; e2e día-1 contra BD real |
| **§4.2 — config-sin-código** | `updatePolicy` en `PRODUCT_TYPE_DESCRIPTORS` (tarjeta/fintech → cupo `al_corte` + tasa `al_corte_si_variable`; hipoteca → tasa si variable; informal → cuota pactada; el resto → vacío = calma). | unit: inyectar una regla la hace disparar sin tocar el flujo |
| **§4.3 — §42 nivel 2** | Propuesta ("¿Cambió el cupo? Estaba en $X") → confirmar aplica el campo **existente** de `Debt` + `DebtUpdated` (Motor recomputa) + **`previousValue` guardado** (reversible); descartar solo congela. | e2e: 3M→4M con `previousValue: 3M`; "no cambió" no toca el valor |
| **§4.4 — calma** | `DebtFieldReview` congela la ventana del corte; tasa fija jamás pregunta; la entrega proactiva **siembra un `Insight` idempotente** (dedupe por ventana) que entrega el `ProactivityJob` existente bajo el presupuesto **≤1/usuario/día**. | unit: congelado/ventana nueva; e2e: no repregunta tras responder |
| **§4.5 — §32 (grep)** | Cero fórmula nueva: el cambio escribe campos existentes por el patrón hoja sancionado (tx + outbox, como `CardService`/`DebtInsuranceService`); detección determinista (fechas + config). **Cero toque de `transactions.service`** (grep, no solo declaración). | greps: 0 `transactions` en el servicio (solo doc), 0 IA, 0 cálculo propio |
| **§4.6 — Independencia** | El copy informa ("¿Cambió…? Estaba en $X"), no recomienda ni presiona a contratar. | revisión de copy + captura |

## 3. Nota de mecanismo (por qué tx+outbox y no `debts.service.update` a secas)

`debts.service.update` hace un `prisma.debt.update` **sin emitir evento** (preexistente): usarlo
tal cual dejaría al Motor sin recomputar y la cascada §42 quedaría muda. Por eso la aplicación del
cambio usa el **patrón hoja ya sancionado** (FIN-023/031): la misma escritura del campo de `Debt`
dentro de una transacción **+ `DebtUpdated` por outbox** (razón `update_review`, con
`previous`/`next` en el payload — causalidad). Es la misma vía de actualización del modelo, con el
evento que el Motor necesita; no se modificó `debts.service.update` para no alterar el
comportamiento de sus otros llamadores (cero regresiones).

## 4. Suites y evidencia

- **Unitaria 374/374** (+8: `update-review.service.spec` — día-1, exactitud por modalidad, tasa
  variable, calma/ventanas, config-sin-código, degradación sin corte).
- **E2E 16 suites / 70** — `fin036-actualizacion` **5/5**: día-1; pregunta exacta al corte; nivel
  2 aplica con `previousValue`; "no cambió" congela; whitelist del descriptor (400). Sin regresión.
- **`tsc` limpio** (back+front). **Migración** `debt_field_reviews` aplicada (`migrate deploy`).
- **Capturas reales** (`docs/producto/capturas/fin-036/`): la tarjeta "🔎 Una confirmación rápida"
  (¿Cambió el cupo total? Estaba en $3.000.000 — No cambió / Sí, cambió); el acuse de calma tras
  "No cambió" ("sigue igual… no te lo vuelvo a preguntar hasta el próximo corte").

## 5. Archivos

- **Backend:** `product-type.descriptor.ts` (`updatePolicy` + reglas compartidas);
  `update-review.service.ts` (detector por corte + respuesta nivel 2 + siembra de insight `@Cron`
  6:30 antes del ProactivityJob) + spec; `debts.controller.ts` (`GET /debts/reviews`,
  `POST /debts/:id/reviews/:field`); `dto/debt.dto.ts` (`AnswerReviewDto`); `debts.module.ts`
  (+`InsightsModule`); `schema.prisma` (`DebtFieldReview`) + migración;
  `test/fin036-actualizacion.e2e-spec.ts`.
- **Frontend:** `api/types.ts` (`PendingReview`); `api/endpoints.ts` (`pendingReviews`/
  `answerReview`); `DebtDetailScreen.tsx` (`ReviewSection`); `capture-fin036.js`.

## 6. Pendiente para el CTO (§36.2/§36.3)

Validar (greps de cierre + tests día-1/nivel 2/calma) e **integrar**. El frontend se suma a la
publicación OTA agrupada pendiente del aviso del Fundador. Fuera de alcance (declarado):
profundidad por evento (FIN-037), habilitación real de IA, y cualquier auto-aplicación sin
confirmación (DEC futura).
