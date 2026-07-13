# DEC-0023 · Desembolso real de deuda como "lo comprometido" (§32)

- **Documentos base:** `docs/arquitectura/ARQ-0023-Desembolso-Real-Deuda.md` (v1.0, commit `3f74873`) · `docs/auditoria/AUD-0023-Desembolso-Real-Deuda.md`
- **Módulo/Feature:** FIN-023 (única FIN activa) · **Origen (§27):** Deuda técnica §32, prioridad inmediata (decisión CPSAO) + requisito del Fundador (cuota de manejo)
- **Decide:** CTO de Milla
- **Fecha:** 2026-07-12

---

## 0. Verificación independiente previa a esta decisión

- Confirmé por lectura directa que los 3 consumidores adicionales propuestos (no listados en el hallazgo original) son reales: `budget.service.ts:105-132` (`debtPayments`/`committed`/lista de cuotas usan `d.monthlyPayment`), `context-assembler.ts:149` (`debtMonthly` del contexto del Copiloto), `conversation.service.ts:171` (`monthly` del resumen de WhatsApp/Telegram) — los tres a secas, mismo patrón que los 3 ya confirmados en `FIN-022`.
- Confirmé por `git grep` que `debts.module.ts` importa exactamente `[FinanceModule, AuthModule, RemindersModule, SimulationsModule]`, y que ningún módulo de ese subárbol (debts/simulations/billing/finance/reminders/auth) reimporta `BudgetModule`/`FinancialEngineModule`/`CopilotModule`/`MessagingModule` — sin ciclos.

Conclusión: **AUD-023 es preciso. El diseño resuelve §32 por construcción para el tercer concepto financiero de la app, adoptando la maquinaria ya auditada de FIN-013 en vez de inventar una nueva — mismo patrón que FIN-020/021/022.**

## 1. Resumen ejecutivo

`ARQ-0023` unifica "lo comprometido" por deuda (`totalMonthlyOutlay`, ya auditado en FIN-013) como fuente única inyectada por los consumidores que hoy usan `monthlyPayment` a secas, y añade la cuota de manejo como dato aportado por el usuario (requisito del Fundador). El Auditor no encontró hallazgos bloqueantes de diseño. Quedan dos decisiones de alcance (P4, P5) y dos condiciones obligatorias del modelo de cargo.

## 2. Arquitecturas revisadas
`docs/arquitectura/ARQ-0023-Desembolso-Real-Deuda.md` (v1.0).

## 3. Auditorías revisadas
`docs/auditoria/AUD-0023-Desembolso-Real-Deuda.md` — veredicto: **APROBADO CON OBSERVACIONES** (nada bloqueante para el diseño).

## 4. Decisiones aprobadas

1. **P1 — Modelo de la cuota de manejo (Alt A, extender `DebtInsuranceKind`):** aprobada.
2. **P2 — Fuente única `outlaysByUser()` (Alt A):** aprobada.
3. **P3 — Presupuesto y teQueda consumen `outlay`:** aprobada.
4. **P4 — Línea condicional en el hero de Deudas (Alt A):** **aprobada explícitamente**, autorizando tocar `FIN-022` (cerrada horas atrás) — es una línea condicional que solo aparece cuando `totalOutlay > monthlyPayment`, no altera el diseño ya validado para el caso común, y deja la frontera FIN-022→023 documentada en el propio copy.
5. **P5 — Copiloto y mensajería (consumidores 5-6):** **incluidos en el alcance.** Una línea cada uno; dejar el §32 parcialmente cerrado sería repetir el patrón que ya costó tres FIN — el Auditor lo recomienda y coincido.

## 5. Cambios obligatorios

1. **Validación server-side (DTO) que rechace `endorsed=true` para `kind:'cuota_manejo'`** con 400 — no basta con ocultarlo en la UI (exigencia del Auditor §4, consistente con el requisito del Fundador).
2. **Sin valor por defecto en ninguna capa** para la cuota de manejo — verificable por grep de literales en el `IMP` (criterio §13.4 del ARQ). El Fundador fue explícito: se aporta, nunca se asume.
3. **Orden de corrección fijado: el Motor (`engine.service.ts`) se corrige antes que la lectura persistida que consume Recomendaciones** — el `IMP` debe incluir un test que confirme que la lectura persistida ya incluye el outlay antes de que Recomendaciones la consuma (AUD §3).
4. **Precisar el wording de `ARQ-0023` §5 (o del `IMP`) sobre el `available` del context-assembler:** su componente de deuda mejora como efecto colateral de esta FIN, pero no se unifica con `teQueda` (esa unificación sigue pendiente para la futura FIN de Copiloto, hallazgo de `VALIDACION-0020`) — no describir esto como "no se toca" sin matiz.

## 6. Observaciones aceptadas

- Mayor acoplamiento transitivo de Budget/Motor/Messaging hacia Simulations+Billing (AUD §2, Punto 1): aceptado, no bloqueante; si molestara a futuro, `outlaysByUser` puede moverse a un módulo más liviano.
- El Score/fondo/DTI de usuarias con cargos aparte empeorará de un día para otro al corregir el insumo: aceptado como la promesa "nunca mentir hacia arriba" materializándose — declarar en la RC integral, apoyarse en los insights de cambio de banda del Motor.
- Frontera de `minPayment` en simulaciones (no es compromiso, es insumo de amortización): confirmada como requisito de correctitud, no elección — no se toca.

## 7. Próximos pasos

1. Arquitectura implementa según el Plan de `ARQ-0023` §14, incorporando los 4 cambios obligatorios de la sección 5 desde el diseño.
2. Capturas reales: detalle con cuota de manejo registrada, líneas condicionales de Presupuesto/Deudas con cargo real, cold-start sin cambios.
3. `IMP-0023` con SHA y juicio razonado, verificando explícitamente los criterios §13 del ARQ.
4. `BACKLOG.md`/`ESTADO_PROYECTO.md` se actualizan en el mismo acto (ya reflejado).
