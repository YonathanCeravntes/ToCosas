# CIERRE-0032 · FIN-032 — Fundación del catálogo de tipos + los 4 arquetipos

- **Versión:** 1.0
- **Fecha:** 2026-07-14
- **Autor:** CTO (Claude)
- **Estado:** **CERRADA (técnica).** Consolida el umbrella FIN-030 **a reserva del visto de
  producto del CPSAO** (criterio DEC-0030 §6).
- **Base:** `IMP-0032` (`c96c355`) · `DEC-0032` · `AUD-0032` · `DEC-0030` §6

---

## 1. Verificación independiente del CTO (contra código y BD reales, no sobre el reporte)

Corrí yo mismo todo lo verificable; no cerré sobre el acuse del Arquitecto.

| Condición (DEC-0032 §3 / DEC-0030 §6) | Cómo la verifiqué | Resultado |
|---|---|---|
| **Grep §32 — TODAS las ramas disueltas** (back+front) | grep de `debtType`/`isCard`/literales de tipo | ✅ `isCard` **eliminado**; `debtType` solo en `product-type.descriptor.ts` + DTO/tipo-unión; todo despacha por `scheduleModelFor()`/`descriptorFor()`. `card.service:179` y `debts.service:268` y `AddDebtScreen` disueltos. |
| Descriptor = autoridad única de tipo | lectura de `product-type.descriptor.ts` | ✅ 12 tipos (11 de 1ª clase + `otro` comodín); 3 `scheduleModel`. |
| Unit + tsc back/front | `jest` + `tsc --noEmit` (corridos por mí) | ✅ **361/361** unit; ambos `tsc` limpios. |
| e2e 4 arquetipos + regresión | `jest-e2e fin032-arquetipos` contra Postgres real | ✅ **6/6** (libranza/hipoteca/gota a gota/compra a cuotas + catálogo 12 + regresión crédito personal). |
| Gota a gota SIN fecha falsa (§29.2) | aserción e2e | ✅ `payoffDate=null`, `numberOfPayments=0`, cuota pactada = compromiso. |
| Regresión de los 9 tipos | migración + e2e | ✅ enum aditivo `ALTER TYPE ADD VALUE`; BD real con los 12 valores; `rate_kind`/`monthly_payment` preexistentes (schema en sync); crédito personal da su cifra idéntica. |
| **Guarda doble-conteo libranza** (§3.2) | grep de `paymentSource` + **aserción e2e añadida por el CTO** | ✅ `paymentSource` no aparece fuera del descriptor (grep-proof: `NetIncomeService` no lo lee); **blindé la regresión** afirmando en la e2e de libranza que `income/summary` no gana deducción alguna. |

## 2. Ajuste del CTO durante el cierre

- El IMP dejó la guarda de libranza correcta **por construcción** pero sin aserción. Como
  integrador (§36) y por "cero regresiones", **añadí la aserción** a `fin032-arquetipos.e2e`
  (la cuota de libranza no reduce el ingreso neto). 6/6 verde. Es el único delta que introduje.
- Nota menor: el acuse del Arquitecto reportó "7/7" en esa suite; el archivo tiene **6** `it()`
  y pasan 6. Sin impacto — corregido el registro.

## 3. Estado de cierre

- **FIN-032: cerrada técnicamente.** Cumple (a)–(d) de DEC-0030 §6 con evidencia ejecutable.
- **Consolidación de FIN-030:** DEC-0030 §6 exige, además del cumplimiento técnico, el **visto
  de producto del CPSAO**. Ruto el cierre al CPSAO para ese visto; **con él, FIN-030 queda
  consolidada**.
- Profundidad avanzada por producto y confirmación mensual → **FIN-033** (roadmap, no bloquea).

## 4. Trazabilidad

`c96c355` (IMP) · aserción de guarda de libranza añadida en el cierre · suites y grep §32
re-ejecutados por el CTO. Detalle de flujo: `docs/correspondencia/Rediseno-Modulo-Deudas.md`.
