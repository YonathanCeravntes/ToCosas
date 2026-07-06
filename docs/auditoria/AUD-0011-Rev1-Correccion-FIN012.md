# AUD-0011-Rev1 · Re-auditoría acotada de la corrección de FIN-012 (§4.1)

- **Documento auditado:** `docs/arquitectura/ARQ-0011-Rev1-Correccion-FIN012.md`
- **Módulo/Feature:** FIN-012 (abono a capital y pago total anticipado)
- **Alcance de esta auditoría:** exclusivamente los cambios obligatorios #1 y #2 de `DEC-0011 §10`, tal como el propio DEC instruye ("el Auditor debe volver a verificar solo esa sección"). No se re-audita el resto de `ARQ-0011` (FIN-013/014/015/016), ya autorizados y fuera de este alcance.
- **Documentos base:** `AUD-0011` (hallazgos originales), `DEC-0011` (cambios obligatorios #1/#2), `ARQ-0011-Rev1-Correccion-FIN012.md`
- **Referencia inmutable verificada:** cálculos matemáticos de la propia corrección, verificados de forma independiente a mano (no hay código nuevo de FIN-012 que verificar todavía — este documento sigue en fase de arquitectura).
- **Fecha:** 2026-07-05
- **Auditor:** Auditor Oficial de Milla (rol de solo lectura)

> Esta auditoría no modifica el ARQ ni el código. Verifica si la corrección cierra,
> de forma sustantiva y no solo declarativa, los dos hallazgos críticos que motivaron
> el rechazo parcial de FIN-012 en `DEC-0011`.

---

## Resumen Ejecutivo

La corrección cierra ambos hallazgos críticos con rigor verificable, no con una respuesta superficial. Para el Crítico #1 (cálculo), la revisión retira por completo la reutilización de `simulateExtraPayment` y la reemplaza por dos métodos puros nuevos y aditivos (`remainingSchedule`, `prepaymentReceipt`) que modelan correctamente un abono único sobre un plan con cuota fija. Verifiqué de forma independiente, a mano, los dos números de ancla que la propia corrección propone como test: el nuevo pago bajo `reducir_cuota` (376.587,79 sobre saldo de 8.000.000) es matemáticamente consistente con la cuota original por proporcionalidad directa, y el número de cuotas restantes bajo `reducir_plazo` (19 cuotas) se verifica correctamente resolviendo la ecuación de amortización para ese caso. Ambos cálculos son correctos.

Para el Crítico #2 (concurrencia), la corrección aplica el patrón adecuado a cada caso según su complejidad real: bloqueo de fila (`SELECT ... FOR UPDATE`) para las rutas nuevas que necesitan leer y derivar varios campos de forma consistente (saldo, plazo, cuota), y una actualización atómica condicional (`UPDATE ... RETURNING`) más barata para el manejador existente de `pago_deuda`, que no requiere recálculo. Esta es la aplicación correcta de los dos patrones que el propio proyecto ya había validado por separado (el lock de fila en general, y el `UPDATE...RETURNING` específicamente en el canje de `PromoCode` de FIN-009) — no inventa un tercer patrón, reutiliza los dos correctos según el caso.

No se encuentran hallazgos nuevos en esta corrección acotada.

## Verificación de los cambios obligatorios de DEC-0011 §10

| # | Cambio exigido | Verificación |
|---|---|---|
| 1 | Recalcular el abono único con `buildSchedule`/`computeMonthlyPayment` sobre el saldo reducido, nunca con `simulateExtraPayment`; test de ancla + test de no-inflación + test de regresión de semántica | ✅ Cumple — §2.1 retira `simulateExtraPayment` de FIN-012 por completo (verificado que no se invoca en ningún punto descrito); introduce `remainingSchedule`/`prepaymentReceipt` como métodos puros aditivos; §2.2 especifica los 3 tests exigidos, incluyendo el de no-inflación que documenta explícitamente la confusión original |
| 2 | Actualización atómica o bloqueo de fila para toda escritura de `Debt.currentBalance`, incluyendo el manejador preexistente; test de concurrencia | ✅ Cumple — §3.1 usa `FOR UPDATE` para las rutas nuevas (justificado: necesitan derivar varios campos bajo el mismo saldo leído); §3.2 usa `UPDATE ... RETURNING` para el manejador existente (justificado: no hay recálculo, patrón más barato es suficiente); §3.3 especifica el test de concurrencia con dos pagos paralelos y el resultado matemáticamente correcto esperado |

## Verificación matemática independiente (no declarativa)

- **`reducir_cuota`:** cuota original A(10.000.000, 1%, 24) = 470.734,72. Sobre saldo reducido de 8.000.000 con la misma tasa y plazo, la cuota escala linealmente con el principal (la fórmula de cuota fija es lineal en `P`): 470.734,72 × 0,8 = 376.587,776 ≈ **376.587,79** — coincide con el valor que la corrección declara. ✅
- **`reducir_plazo`:** resolviendo `(1+i)^-n = 1 − P·i/A` para P=8.000.000, i=1%, A=470.734,72 se obtiene `n ≈ 18,72`, que redondea a **19 cuotas** (la última cuota, parcial, liquida el resto) — coincide exactamente con el valor que la corrección declara. ✅

Ambas verificaciones manuales confirman que los números de ancla propuestos para los tests exigidos por `DEC-0011` son correctos, no solo plausibles.

## Hallazgos

Ninguno nuevo. La corrección es acotada, aditiva (no modifica funciones existentes), y cierra ambos críticos con el patrón correcto para cada caso.

## Riesgos

- Ninguno nuevo introducido por esta corrección. El riesgo residual es el mismo que cualquier ARQ en fase de diseño: la calidad final depende de que la implementación siga exactamente lo especificado (mismo riesgo genérico de todos los ciclos, mitigado por los tests de ancla exigidos y por la regresión de `simulateExtraPayment`).

## Fortalezas

- Corrección genuinamente acotada: no reescribe `ARQ-0011` completo ni introduce cambios fuera del alcance exacto de los dos críticos, respetando la instrucción de `DEC-0011 §10.3`.
- Aditiva por diseño: no modifica ninguna función existente de `AmortizationService` (`simulateExtraPayment` queda intacta para su propósito original de FIN-007), minimizando el riesgo de regresión sobre código ya auditado y en producción.
- El test de "no-inflación" (§2.2) no solo corrige el cálculo sino que documenta explícitamente, como test permanente, la confusión que originó el hallazgo — convierte una lección de auditoría en una regla verificable para siempre, no solo en una corrección puntual.
- Elección correcta y diferenciada del mecanismo de concurrencia según la complejidad real de cada operación (lock de fila para lo que recalcula varios campos; actualización atómica condicional para lo que no) — evita tanto la sobre-ingeniería (usar lock donde no hace falta) como la sub-ingeniería (repetir el patrón fràgil donde sí hace falta).
- El test de concurrencia (§3.3) reproduce exactamente el escenario de riesgo real (dos rutas de pago distintas sobre la misma deuda en paralelo), no un caso sintético simplificado, y usa el mismo estándar de evidencia ya aplicado al canje de `PromoCode` en FIN-009.
- Dos verificaciones matemáticas independientes practicadas en esta auditoría (cuota proporcional y número de cuotas restantes) confirman que los valores de ancla propuestos son correctos, dando confianza adicional de que la corrección no solo suena razonable sino que es numéricamente exacta.

## Oportunidades

Ninguna adicional dentro del alcance acotado de esta re-auditoría.

## Observaciones críticas

Ninguna.

## Observaciones menores

Ninguna.

## Recomendaciones

Ninguna adicional. La corrección está lista para pasar a implementación en lo que respecta a los dos puntos exigidos.

## Priorización

No aplica — no hay recomendaciones pendientes de esta re-auditoría acotada.

## Veredicto

**APROBADO.**

La corrección cierra íntegramente los dos hallazgos críticos que bloquearon FIN-012 en `DEC-0011`, con verificación matemática independiente favorable en esta auditoría (no solo revisión de que "existe una respuesta", sino de que la respuesta es numéricamente correcta). No se requiere una nueva iteración del ARQ. Recomiendo al CTO autorizar el desarrollo de FIN-012 mediante adenda a `DEC-0011`, exigiendo que la implementación entregue exactamente los 4 tests especificados (ancla, no-inflación, regresión de semántica, concurrencia) como condición de cierre de `IMP-0012`.

---
*Esta auditoría no implementa ni decide. Queda a la espera de la adenda oficial del CTO a `DEC-0011`.*
