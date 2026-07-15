# VALIDACIÓN-0023 · Desembolso real de deuda como "lo comprometido" (§32)

- **Documentos base:** `DEC-0023` · `IMP-0023` v1.0 · `ARQ-0023` v1.0 · `AUD-0023`
- **Realiza:** Auditor de Milla
- **Fecha:** 2026-07-13
- **Referencia inmutable verificada:** commit `c7b9804bea21f313ca375fc102557e5dd0c1be95` (ancestro de HEAD confirmado)

---

## 1. Método

Cuatro capas DEC→IMP→Código→Evidencia sobre `c7b9804` (`git show`, no working tree),
suites en vivo. Foco pedido por el CTO: las dos desviaciones del `ARQ` (empaquetado y la
emisión de evento no pedida explícitamente).

## 2. Desviación 1 — la fuente vive en `DebtOutlayModule`, no en `DebtInsuranceService` → **SANA, y superior al diseño original**

- `debt-outlay.module.ts` es un **módulo hoja real**: solo `providers`/`exports`, **no
  importa nada** (Prisma es global). Los 5 consumidores lo inyectan
  (`budget`, `financial-engine`, `copilot`, `messaging`, `debts` — verificado
  `import DebtOutlayModule` en los 5 `.module.ts`). Sin ciclos por construcción.
- **Es UNA función pura compartida, no una segunda implementación:** el cálculo se
  extrajo a `payment-breakdown.util.ts` (`totalMonthlyOutlay = monthlyPayment + separate`
  — financiadas no se doble-cuentan); `DebtOutlayService.outlaysByUser` **y**
  `DebtInsuranceService.paymentBreakdown` (línea 130) **delegan en el mismo util** —
  cero copias. Los tests de FIN-013 pasan sin tocar sus aserciones.
- **Además resuelve mi propia observación de acoplamiento** (`AUD-0023` §2, Punto 1): el
  módulo hoja evita que Budget/Motor/Messaging arrastren Simulations+Billing. La
  desviación es mejor que lo que auditó el ARQ, misma conducta. El ciclo evitado
  (`Messaging → Debts → Reminders → Whatsapp → Messaging`) es real y aparecía solo al
  cablear P5. **Aprobado sin reserva.**

## 3. Desviación 2 — el CRUD de seguros/cargos emite `debt.updated` por outbox → **CONSECUENCIA NECESARIA, dentro de alcance**

`debt-insurance.service.ts` (create/update/remove) ahora envuelve la operación en
`outbox.withEvent` con `DomainEventType.DebtUpdated` (patrón FIN-002).

**Evaluación (la pregunta del CTO):** es consecuencia **necesaria** de cambios ya
aprobados, no scope creep. El cambio obligatorio §5.3 exige que la lectura persistida
(`EssentialExpense`) incluya el outlay **antes** de que Recomendaciones la consuma; esa
lectura solo se actualiza cuando el Motor recomputa, y el Motor recomputa **por evento**
(`engine.listener` `@OnEvent('debt.updated')`). Sin emitir el evento al crear un cargo,
la corrección solo llegaría con el job nocturno — la frescura ~25 s heredada de
`DEC-0021` §4.2 y declarada en `DEC-0023` sería **falsa**. La emisión hace que una
garantía ya aprobada sea real en vez de nominal.

*Efecto colateral verificado:* `insights.generator.ts:140` también escucha
`debt.updated`, así que un cargo nuevo puede generar un insight de cambio — **alineado**
con `ARQ-0023` §10 ("los insights de cambio de banda narrarán el movimiento"), no una
sorpresa. No es un listener espurio.

## 4. Los 4 cambios obligatorios del DEC §5

| # | Exige | Código confirma |
|---|---|---|
| **5.1** | Rechazo server-side de `endorsed`/`insurer` para `cuota_manejo` (400) | `validateChargeSemantics()` (líneas 96-101) lanza `BadRequestException` para `endorsed` e `insurer`; invocada en create (37) y update (68) — no solo UI. e2e asevera el 400 real ✓ |
| **5.2** | Sin default en ninguna capa | grep de `cuota_manejo`: cero montos literales/default (solo enum/DTO/label); la captura muestra $29.900 aportado por la usuaria ✓ |
| **5.3** | Orden Motor→Recomendaciones | Recomendaciones no se tocó (lee `EssentialExpense` persistida); e2e "el gasto esencial PERSISTIDO incluye los 75k" fija que la lectura ya trae el outlay ✓ |
| **5.4** | Precisar `available` del context-assembler | comentario en `context-assembler`: mejora su INSUMO de deuda pero NO se unifica con `teQueda` (hallazgo `VALIDACION-0020` sigue abierto con dueño) ✓ |

## 5. §32 — fuente única correcta y en cascada (captura)

- `outlaysByUser` filtra `{deletedAt:null, status:'activa'}`, incluye seguros activos,
  y calcula con el util puro — un filtro, un cálculo, 6 consumidores. Grep §13.1:
  `monthlyPayment` como compromiso, **cero** fuera de la fuente (usos restantes —
  amortización, recordatorios, `upcoming`, "tus cuotas suman", fallbacks — justificados).
- **Captura del detalle:** "Cuota del crédito $97.199 + Seguros y cargos aparte $29.900 =
  Desembolso mensual real **$127.099**"; "Cuota de manejo · aparte $29.900" (kind nuevo,
  sin endoso). El hero de Deudas "Con seguros y cargos: **$519.134** al mes" = cuotas
  451.234 + aparte (29.900 + 38.000 del otro crédito) — cuadra exacto. El "Te queda" bajó
  exactamente $29.900. Nada calculado dos veces.
- **Regresión:** usuaria sin cargos aparte → `outlay == monthlyPayment`, cifras idénticas
  a hoy (fijado por unit + e2e).

## 6. Pruebas — ejecución EN VIVO

| Suite | IMP declara | Ejecución del Auditor | Resultado |
|---|---|---|---|
| Unitaria | 318/318 | `npx jest` | **318/318, 40 suites** ✓ |
| E2E | 20/20 | `npm run test:e2e` | **20/20, 6 suites** ✓ (incl. `fin023-desembolso-real`: caso a mano +75k, regresión, 400) |
| Migración | limpia | — | `ALTER TYPE ADD VALUE 'cuota_manejo'` en el diff, no destructiva ✓ |

## 7. Reservas del IMP §5 — evaluación

Honestas: (1) el Score/DTI/fondo empeora al sincerar el insumo — la promesa de DEC-0020,
diferida a RC; (2) el `available` del Copiloto mejoró su insumo, no su §32 — hallazgo
`VALIDACION-0020` con dueño; (3) el simulador sigue sobre cuota contractual (correcto per
`AUD-0022`/§2 — usar outlay sobreestimaría el pago). Ninguna oculta un defecto.

## 8. Hallazgos

Ninguno bloqueante. Las dos desviaciones están justificadas y verificadas: la de
empaquetado es superior al diseño original; la de evento es consecuencia necesaria de un
cambio ya aprobado. Los 4 cambios obligatorios están implementados desde el diseño.

## 9. Veredicto

**APROBADO.**

`IMP-0023` corresponde con `DEC-0023` en las cuatro capas, verificado sobre `c7b9804`
con suites en vivo. **Desviación 1 (empaquetado):** confirmada como una única función
pura compartida (`payment-breakdown.util.ts`, ambos servicios delegan), en un módulo
hoja sin ciclos — resuelve además la observación de acoplamiento de mi propio `AUD-0023`.
**Desviación 2 (evento `debt.updated`):** consecuencia necesaria del cambio obligatorio
§5.3 y de la frescura ~25 s ya aceptada — sin ella la garantía sería falsa; el listener
de insights está alineado con `ARQ` §10. Los 4 cambios obligatorios cumplidos, §32
correcto por construcción y en cascada (visible en la captura), regresión fijada.
Recomiendo al CTO proceder con su verificación independiente y el cierre de FIN-023.
