# IMP-0002 · Fundaciones de Datos (Cuentas/Activos + eventos con outbox + series)

- **Módulo/Feature:** FIN-002
- **Documentos base:** `ARQ-0002-Fundaciones-de-Datos.md` · `AUD-0002-...` · `DEC-0002-Fundaciones-de-Datos.md`
- **Autor:** Agente Desarrollador
- **Fecha:** 2026-07-04 (reenvío v2 tras rechazo de validación)
- **Estado:** Reenviado — a la espera de re-validación del CTO contra DEC-0002

## 0. Reenvío v2 — respuesta al rechazo de validación

**Hallazgo del CTO:** archivos truncados (`schema.prisma` sin modelos FIN-002;
`app.module.ts`, `debts.service.ts`, `budget.service.ts` cortados a mitad de sentencia)
y `tsc` fallando; el informe no era reproducible.

**Diagnóstico:** el trabajo estaba **sin commitear** (HEAD seguía en `3aadc15`, previo a
todo el desarrollo del día) y la validación se realizó leyendo el working tree en un
estado parcial/concurrente (se encontró además un `index.lock` huérfano de git de esa
franja horaria). El estado que este informe reportó sí existió y fue verificado en vivo
(el backend con FIN-002 sigue corriendo de esa build), pero al no existir un commit no
había una referencia inmutable contra la cual validar. **La falla de proceso fue mía: se
entregó un IMP sin fijar el código en git.**

**Corrección aplicada:**
1. Verificación re-ejecutada sobre el estado final: `tsc` backend **exit 0**, `tsc`
   frontend **exit 0**, **129/129 tests** verdes.
2. Trabajo commiteado en la rama `claude/finance-app-design-pr8qd5`:
   - `6adfc2d` — features de app previas (fechas, proyección de deuda, presupuesto, push, Telegram).
   - **`622bfa1` — FIN-002 completo** (código autorizado por DEC-0002).
   - `0058621` — documentación de gobernanza (ARQ/AUD/DEC/IMP + BACKLOG).
3. Integridad verificada **sobre el contenido commiteado** (`git show 622bfa1:`):
   `schema.prisma` contiene los 6 modelos FIN-002 y cierra correctamente; los tres
   archivos señalados terminan en sentencia completa. Working tree == HEAD (0 diffs).

**Cómo reproducir la validación:**
```bash
git checkout 0058621   # o la punta de claude/finance-app-design-pr8qd5
cd backend && npx tsc --noEmit && npx jest   # exit 0 · 129/129
cd ../frontend && npx tsc --noEmit           # exit 0
```

---

## 1. Resumen de implementación
Se implementó la capa de fundaciones de datos que habilita el cálculo de **patrimonio y
liquidez reales** y una **espina dorsal de eventos con patrón outbox** sobre PostgreSQL
(sin Redis/BullMQ). Incluye modelos `Account`/`Asset`/`AccountBalanceEntry`, el outbox
transaccional con **claim atómico** en el despachador, las tablas de series
(`FinancialSnapshot`, `MetricReading`) creadas para FIN-003, rate limiting global, y la
pantalla móvil de Cuentas/Activos con tarjeta de Patrimonio. Se ejecutaron los 4 cambios
obligatorios del DEC-0002 §10.

## 2. Archivos modificados/creados

**Backend — nuevos**
- `prisma/migrations/20260704232531_fin002_fundaciones_datos/migration.sql`
- `src/modules/events/domain-events.ts` · `outbox.service.ts` · `outbox.dispatcher.ts` · `events.module.ts`
- `src/modules/events/outbox.service.spec.ts` · `outbox.dispatcher.spec.ts`
- `src/modules/accounts/networth.util.ts` (+ `networth.util.spec.ts`)
- `src/modules/accounts/dto/account.dto.ts` · `dto/asset.dto.ts`
- `src/modules/accounts/accounts.service.ts` · `accounts.controller.ts` · `accounts.module.ts`

**Backend — modificados**
- `prisma/schema.prisma` — enums (`AccountType`, `AssetType`, `OutboxStatus`, `MetricPeriod`, `BalanceEntrySource`), modelos `Account`, `Asset`, `AccountBalanceEntry`, `OutboxEvent`, `FinancialSnapshot`, `MetricReading`, columna `Transaction.accountId`, relaciones en `User` y `FinancialEntity`.
- `src/app.module.ts` — `EventsModule`, `AccountsModule`, `EventEmitterModule.forRoot()`, `ThrottlerModule.forRoot([{ttl:60000,limit:120}])` + `APP_GUARD` global.
- `src/modules/transactions/transactions.service.ts` — emite `transaction.created` (+ `debt.updated` en pago) en la misma tx.
- `src/modules/debts/debts.service.ts` — emite `debt.created` en la misma tx.
- `src/modules/budget/budget.service.ts` — emite `fixed_item.changed` en la misma tx.
- `package.json` — `@nestjs/event-emitter`, `@nestjs/throttler`.

**Frontend — nuevos:** `src/screens/AccountsScreen.tsx`.
**Frontend — modificados:** `src/api/types.ts`, `src/api/endpoints.ts`, `src/navigation/types.ts`, `src/navigation/RootNavigator.tsx`, `src/screens/BudgetScreen.tsx`.

## 3. Funcionalidades implementadas
- **Cuentas** (`efectivo/ahorros/corriente/billetera`) y **Activos** (`inmueble/vehículo/inversión/negocio`): CRUD autenticado.
- **Patrimonio on-read** (`GET /net-worth`): `netWorth = Σ activos + Σ saldos − Σ pasivos`; desglose de liquidez y fondo de emergencia. No depende del despachador.
- **Outbox transaccional**: el evento de dominio se escribe en la MISMA transacción Prisma que el cambio de negocio (`OutboxService.enqueue`/`withEvent`).
- **Despachador** (`OutboxDispatcher`, cron cada 10 s) con **claim atómico** (`UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED) RETURNING`), reintento con backoff y marcado `processed/failed`.
- **Productores** instrumentados: transactions, debts, budget, accounts.
- **Rate limiting** global (`@nestjs/throttler`, 120 req/min).
- **Frontend**: pantalla “Cuentas y patrimonio” (tarjeta de patrimonio + CRUD de cuentas/activos + edición de saldo), accesible desde Presupuesto.

## 4. Cambios obligatorios DEC-0002 §10 — cumplimiento
1. **Claim atómico** ✅ — `outbox.dispatcher.ts` usa `UPDATE … FOR UPDATE SKIP LOCKED … RETURNING` (no SELECT+UPDATE separados). Cubierto por test.
2. **`AccountBalanceUpdated`/`AssetChanged` asíncronos** ✅ — `domain-events.ts` (`EVENT_DELIVERY` = `async` para todos); patrimonio resuelto on-read.
3. **Purga del outbox** ✅ — `OutboxDispatcher.purge()` (cron diario 3 AM) elimina `processed` con más de **30 días**. Cubierto por test.
4. **Regla de `AccountBalanceEntry`** ✅ — se escribe automáticamente en la misma transacción en cada alta/cambio de saldo. **Regla de negocio:** se rechaza (`400`) saldo negativo en cuentas `isLiquid=true` o `isEmergencyFund=true`; otros tipos pueden aceptar negativo (sobregiro).

## 5. Pruebas realizadas
- **Unitarias (Jest): 129/129 verdes** (16 suites), incluyendo 12 nuevas:
  - `networth.util.spec.ts` (5): patrimonio, liquidez, fondo de emergencia, exclusiones, patrimonio negativo.
  - `outbox.service.spec.ts` (2): `enqueue` usa el tx recibido; `withEvent` encola en la misma tx.
  - `outbox.dispatcher.spec.ts` (5): claim atómico vía `$queryRaw`, procesado/emisión, reintento con backoff, `failed` tras máximo, purga.
- **Typecheck:** backend ✅ y frontend ✅.
- **End-to-end (API real):** alta de cuenta (fondo emergencia), activo y deuda → `GET /net-worth` = **$171.500.000** (251.5M − 80M); validación de saldo negativo → **400**; actualización de saldo → nueva `AccountBalanceEntry`.
- **Verificación en BD:** `outbox_events` → **4/4 `processed`** (`account.created`, `account.balance_updated`, `asset.changed`, `debt.created`); `account_balance_entries` → 2 filas (1.5M inicial + 1.75M).
- **Frontend:** bundle Android completo **sin errores** (6.44 MB).

## 6. Incidencias encontradas
- `prisma generate` falla con **EPERM** en Windows si el backend en watch sigue vivo; se resolvió deteniendo los procesos node del backend antes de migrar (patrón ya conocido del proyecto).

## 7. Limitaciones
- **Particionamiento físico de `MetricReading`**: las tablas de series se crearon como tablas normales (están **vacías**; las poblará FIN-003). La estrategia ratificada (partición mensual nativa por `captured_at` + retención 180 días para lecturas `day`) se aplicará físicamente en **FIN-003**, cuando comience la población, para evitar drift de tooling de Prisma sobre una tabla vacía. **Decisión de secuencia, no de arquitectura** — se somete a validación del CTO.
- **Cifrado a nivel de campo** de saldos/valores: diferido por DEC-0002 §4.7 (solo cifrado de volumen del proveedor como baseline).
- **Sin derivación automática** de saldos desde transacciones (saldo manual = fuente de verdad), conforme al alcance.
- **Sin consumidores** de eventos aún: el despachador emite por `EventEmitter2` sin listeners; los añade FIN-003.

## 8. Resultado final
**FIN-002 entregado y verificado** (backend + móvil), cumpliendo el plan de DEC-0002 §11 y
los 4 cambios obligatorios §10. Habilita patrimonio/liquidez reales y la infraestructura de
eventos para FIN-003. Pendiente de validación del CTO para cerrar el ciclo.

---
*Informe de implementación — proceso de gobernanza `docs/GOBERNANZA.md`.*
