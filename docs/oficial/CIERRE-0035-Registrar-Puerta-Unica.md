# CIERRE-0035 · FIN-035 — Registrar como puerta única del ecosistema (P2 del EOC)

- **Versión:** 1.0
- **Fecha:** 2026-07-16
- **Autor:** CTO (Claude)
- **Estado:** **CERRADA.** Primera FIN implementada de punta a punta bajo `DEC-ORG-001`
  (Arquitecto diseña → CTO audita y decide → Arquitecto implementa → CTO valida y
  cierra, sin Auditor de un tercero en ninguna fase).
- **Base:** `IMP-0035` (`8cdaef8`) · `DEC-0035` · `ARQ-0035` (`168af9d`)

---

## 1. Verificación independiente del CTO (contra código y BD reales)

| Condición (`DEC-0035` §3) | Cómo la verifiqué | Resultado |
|---|---|---|
| Patrón de confirmación (commit+acuse+`deshacer` nivel 1) | lectura de `AddTransactionScreen.tsx` + e2e | ✅ `transactions.remove`/`voidPurchase` reusados; acuse enumera la cascada (lee `teQueda` real). |
| **Corrección `sourceTransactionId`** (no cablear ahí) | grep en todo el diff del IMP | ✅ Las únicas 4 coincidencias son comentarios que **documentan la corrección** — cero uso real. |
| Cascada §42 reversible | e2e contra Postgres real | ✅ gasto→`teQueda` baja→`deshacer`→vuelve exacto; pago de deuda→saldo baja→`deshacer`→saldo restaurado; compra con tarjeta→compromiso aparece→`voidPurchase`→desaparece. |
| Coherencia (obs. 8) | e2e | ✅ dos gastos idénticos mueven `teQueda` igual, mismo `create`. |
| §32 — sin ramas por tipo | grep en `AddTransactionScreen.tsx` | ✅ cero `debtType ===`/`isCard`. |
| "Flujo disponible" = `SpendableService` | lectura de código (`budgetApi.monthly().teQueda`) | ✅ ningún número nuevo. |
| Contextual (obs. 4) — efectivo nunca pregunta cuotas | lectura del enrutado `método` | ✅ solo `credito` abre la ruta de cuotas. |
| Compatibilidad total con FIN-034 | diff del commit | ✅ cero cambios en `AddDebtScreen`/selector/entidades. |
| Unit + tsc back/front | `jest` + `tsc --noEmit` (corridos por mí) | ✅ **366/366** unit (sin cambios de backend, esperado); ambos `tsc` limpios. |
| e2e FIN-035 | `jest-e2e fin035-registrar` contra Postgres real | ✅ **4/4**. |
| Sin ideas sueltas de la Beta | lectura del diff completo | ✅ solo `AddTransactionScreen.tsx` + test + capturas; nada de tipos de tarjeta/seguros/retanqueo. |

## 2. Ajuste del CTO durante el cierre

Ninguno. El Arquitecto incorporó la corrección de `sourceTransactionId` exactamente
como se le pidió, con evidencia (comentarios + test), no solo de palabra.

## 3. Estado de cierre

**FIN-035 (P2 del EOC): cerrada.** Registrar es ahora la puerta única, componiendo
sobre `transactions.service`/outbox existentes, con la cascada visible (acuse) y
reversible (`deshacer`) por el mecanismo real (recompute del Motor), no por un campo
reservado. Nivel 2 (confirmar antes de cometer para datos no ingresados) no tuvo
escenario que ejercitar en este alcance (los 3 flujos de P2 —gasto/ingreso/pago de
deuda— son todos hechos directos); queda declarado para cuando FIN-037 introduzca
modificaciones de datos no ingresados (refinanciación, cambio de condiciones).

- **Siguiente en el programa:** `FIN-036` (P3, inteligencia de actualización) — su
  ARQ debe declarar cómo funciona sin depender de una cadencia de uso aún inmadura
  de Registrar, como ya se le advirtió al Arquitecto.
- **OTA:** el frontend de FIN-035 se agrupa con FIN-032/034 en la publicación única
  que sigue retenida por instrucción directa del Fundador.

## 4. Trazabilidad

`8cdaef8` (IMP) · suites, grep §32 y e2e re-ejecutados por el CTO contra Postgres
real. Detalle de flujo: `docs/correspondencia/FIN-035-Registrar-Puerta-Unica.md`.
