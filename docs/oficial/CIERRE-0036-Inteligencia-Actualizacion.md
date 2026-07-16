# CIERRE-0036 · FIN-036 — Inteligencia de actualización + confirmación mensual (P3 del EOC)

- **Versión:** 1.0
- **Fecha:** 2026-07-16
- **Autor:** CTO (Claude)
- **Estado:** **CERRADA.** Segunda FIN cerrada de punta a punta bajo `DEC-ORG-001`,
  sin Auditor de un tercero en ninguna fase.
- **Base:** `IMP-0036` (`6d62b34`) · `DEC-0036` · `ARQ-0036` (`7c75070`)

---

## 1. Verificación independiente del CTO (contra código y BD reales)

| Condición (`DEC-0036` §3/§4) | Cómo la verifiqué | Resultado |
|---|---|---|
| **Restricción `auto_detectable`** (§3) | grep en todo el código + lectura del tipo `UpdateCadence` | ✅ El valor **ni siquiera existe** en el tipo (`al_corte`\|`al_corte_si_variable`\|`anual`\|`una_vez`\|`nunca`); cero ocurrencias en el código. |
| Día-1 sin cadencia madura | e2e + lectura de `lastCutDate()` | ✅ deuda recién creada → `cut=null` → cero confirmaciones; test explícito pasa. |
| Config-sin-código (`updatePolicy`) | lectura de `product-type.descriptor.ts` | ✅ extiende el descriptor existente; una regla = una fila (`R.cupoAlCorte` etc.), reusadas por tipo. |
| §42 nivel 2 (propone→confirma→reversible) | lectura de `update-review.service.ts` + e2e | ✅ `answer()` exige confirmación explícita, guarda `previousValue`, emite `DebtUpdated`. |
| **`DebtUpdated` recomputa de verdad** | grep en `engine.listener.ts` | ✅ `@OnEvent('debt.updated')` **ya estaba** en la lista de eventos escuchados — no es una promesa, el listener existe. |
| Calma (≤1/día, no repregunta lo congelado) | lectura de `seedReviewInsights()` + e2e | ✅ siembra vía `InsightsService.createIfNew` (dedupe por `(userId, dedupeKey)`, verificado); entrega gobernada por `ProactivityJob`/`NotificationBudgetService` ya auditados en `DEC-0036`. |
| Whitelist del descriptor (§32) | e2e | ✅ campo no declarado → 400. |
| Migración | inspección directa en Postgres (`\d debt_field_reviews`) | ✅ tabla real, FK a `debts`, índice `(debt_id, field, reviewed_at)`. |
| Cero toque a `transactions.service` | `git diff` del rango completo del IMP | ✅ diff vacío en `src/modules/transactions`. |
| Cero imports de IA | grep en `modules/debts` | ✅ limpio. |
| Unit + tsc back/front | `jest` + `tsc --noEmit` (corridos por mí) | ✅ **374/374** unit (+8 de `update-review.service.spec.ts`); ambos `tsc` limpios. |
| e2e FIN-036 | `jest-e2e fin036-actualizacion` contra Postgres real | ✅ **5/5** (día-1, corte dispara, nivel 2, calma, whitelist). |
| UI cumple §42 | lectura de `ReviewSection` en `DebtDetailScreen.tsx` | ✅ propone, exige "No cambió"/"Sí, cambió" explícito, acuse visible, mensaje de calma. |

## 2. Ajuste del CTO durante el cierre

Ninguno. El Arquitecto respetó la restricción de `auto_detectable` de forma completa
(no solo lo dejó sin usar: lo quitó del tipo, imposible de reintroducir sin tocar el
contrato).

## 3. Estado de cierre

**FIN-036 (P3 del EOC): cerrada.** El modelo se mantiene al día en el tiempo,
preguntando solo ante señal determinista de corte, con confirmación explícita y
reversible — nunca en silencio.

- **Siguiente en el programa:** `FIN-037` (P4, profundidad bancaria por evento,
  progresiva y guiada por lo que los usuarios Beta realmente tienen). Última FIN de
  la secuencia 035→036→037 antes de la Revisión Integral de Producto.
- **OTA:** el frontend de FIN-036 se agrupa con FIN-032/034/035 en la publicación
  única que sigue retenida por instrucción directa del Fundador.

## 4. Trazabilidad

`6d62b34` (IMP) · suites, greps de cierre y e2e re-ejecutados por el CTO contra
Postgres real. Detalle de flujo: `docs/correspondencia/FIN-036-Inteligencia-Actualizacion.md`.
