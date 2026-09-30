# DEC-0036 · Inteligencia de actualización + confirmación mensual por corte (P3 del EOC)

- **Versión:** 1.0
- **Fecha:** 2026-07-16
- **Autor:** CTO (Claude)
- **Estado:** Emitida — habilita `IMP-0036`. Segunda FIN auditada bajo `DEC-ORG-001`
  sin Auditor de tercero.
- **Base:** `ARQ-0036` v1.0 (`7c75070`) · `DEC-0033` §3/§4 · `DEC-0030` §5 / `DEC-0035`
  · `CIERRE-0035`

---

## 0. Auditoría del CTO (verificación independiente contra código real)

- ✅ **`debts.service.update`** existe (`:185`) — la vía de aplicación del nivel 2.
- ✅ **`NotificationBudgetService`**: `DAILY_CAP.proactivo = 1` — coincide exactamente
  con el "≤1/usuario/día" del ARQ.
- ✅ **`ProactivityJob`**: `@Cron('0 0 7 * * *', {timeZone: ENGINE_TZ})`, respeta
  `proactiveEnabled`/`quietHours` — confirmado.
- ✅ **`paymentDay`/`nextDueDate`** existen en `Debt` (`schema.prisma:395-396`).

**Corrección — a mi propia directiva, no al ARQ.** Le pedí al Arquitecto revisar
`pendiente_confirmacion`/`parseConfidence` como base "existente desde el día 1".
Verifiqué yo mismo: **`parseConfidence` sí está en uso real** (`transactions.service.ts`,
`conversation.service.ts`); pero **`pendiente_confirmacion` es un valor de enum
`TxStatus` sin un solo uso en `src/`** — dormante, igual que `descartada`. El
Arquitecto verificó esto correctamente y no intentó forzar el diseño sobre un
mecanismo que no existe en la práctica; propuso en cambio un concepto nuevo
(`DebtFieldReview`) apropiado para lo que hace falta (confirmar campos de `Debt`, no
estados de `Transaction`). **Su corrección es acertada; la mía fue imprecisa** — quede
así en el registro.

## 1. Resumen ejecutivo

Se aprueba `ARQ-0036`: la confirmación mensual se dispara por una señal determinista
(fecha de corte) — no por cadencia de uso —, es otra puerta al motor único de FIN-029
con el presupuesto anti-fatiga ya existente, aplica cambios como nivel 2 (confirmar
antes de cometer) sobre `debts.service.update`, y no toca Registrar.

## 2. Decisiones aprobadas

- **Comportamiento día-1** (§2 del ARQ): dispara por fecha de corte, cero dependencia
  de historial de uso — responde exactamente a mi condición de apertura.
- **`updatePolicy`** como extensión de `PRODUCT_TYPE_DESCRIPTORS` (config-sin-código).
- **Nivel 2 de confirmación** sobre `debts.update`, con valor anterior guardado
  (reversible), nunca en silencio.
- **Reutilización del `ProactivityJob`/`NotificationBudgetService`** para "calmada,
  no ansiosa" por construcción, no por buena intención.
- **`DebtFieldReview`** (mínimo, deferido al IMP con su migración) para no repreguntar
  lo ya congelado.

## 3. Condición de cierre — restricción a la cadencia `auto_detectable`

El ARQ declara una cadencia `auto_detectable` que **podría aplicar un cambio sin
preguntar** ("por defecto se propone... si el DEC lo aprueba"). **No lo apruebo en
este IMP.** §42 exige propuesto→confirmado→reversible; un campo que se auto-aplica
sin confirmación previa es una excepción que merece su propia decisión explícita, no
una activación por defecto silenciosa dentro de esta FIN. **Ninguna fila real de
`updatePolicy` en `IMP-0036` puede usar `auto_detectable` para escribir sin
confirmación** — todas aplican por nivel 2 (`al_corte`/`anual`/`una_vez`/`nunca`). Si
en el futuro se quiere auto-aplicar algo, es una `DEC` aparte.

## 4. Condiciones de cierre (criterios de aceptación del ARQ, ratificados)

1. Test día-1: deuda recién creada, 0 confirmaciones antes del corte, exactamente los
   campos `al_corte` de su modalidad al llegar el corte, sin depender de uso.
2. Config-sin-código: una regla nueva en `updatePolicy` dispara sin tocar el flujo.
3. §42 nivel 2: propone → confirma antes de aplicar → guarda valor anterior →
   reversible.
4. Calma: lo congelado/`nunca`/`una_vez` no se repregunta; respeta el presupuesto
   anti-fatiga (≤1/día, verificado real).
5. §32 (grep): cero fórmula nueva, detección determinista, **cero toque de
   `transactions.service`** (grep de cierre, no solo declaración).
6. Independencia: informa, no recomienda ni presiona.

## 5. Próximos pasos

`IMP-0036` habilitado con la restricción de §3 incorporada a los criterios de
aceptación. Entrega con SHA — auditoría y decisión directa del CTO, sin tercero.
