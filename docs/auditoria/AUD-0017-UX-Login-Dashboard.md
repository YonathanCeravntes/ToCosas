# AUD-0017 · Auditoría de ARQ-0017 v1.1 (UX — Login y Dashboard)

- **Documento auditado:** `docs/arquitectura/ARQ-0017-UX-Login-Dashboard.md`, versión 1.1, commit `948bddb`
- **Módulo/Feature:** FIN-017 (única FIN activa, Gobernanza v3.5 §27 / PRODUCT_REVIEW_001 / Lote 01)
- **Referencia visual verificada:** `docs/producto/capturas/lote-01/01-login.png`, `02-inicio-dashboard.png`, `03-salud-score.png` (commit `0bfa154`)
- **Referencia de código verificada:** `git show HEAD:backend/src/modules/dashboard/dashboard.service.ts`, `backend/src/modules/health/health.service.ts`, `backend/src/modules/health/score.util.ts`, `backend/src/modules/financial-engine/metrics/core-metrics.ts`, `backend/src/modules/budget/financial-period.util.ts`, `frontend/src/screens/auth/LoginScreen.tsx` (commit `b87ef89`, salvo que se indique otro)
- **Fecha:** 2026-07-11
- **Auditor:** Auditor Oficial de Milla (rol de solo lectura)

> Esta auditoría no modifica el ARQ ni el código ni diseña la solución. Por instrucción
> del CTO, además de la revisión habitual, esta auditoría responde explícitamente las 6
> preguntas de experiencia de usuario para toda FIN con impacto en UX.

---

## Resumen Ejecutivo

ARQ-0017 v1.1 diagnostica con precisión el estado real del producto: contrasté cada afirmación del §2 contra las capturas del Lote 01 y las tres se sostienen — el tagline del Login es tono sin propuesta de valor, el Dashboard tiene tres elementos oscuros/grandes compitiendo por protagonismo junto al bloque de gamificación arriba, y las cifras (`$6.240.000`, `9,9%`) se muestran sin interpretación. El documento cumple con el requisito del CPSAO de presentar ≥2 alternativas con ventajas/desventajas por cada decisión relevante, incluida la decisión antes implícita del bloque de gamificación (§4.5) — un ejercicio honesto que no descarta la opción de eliminarlo, sino que argumenta por qué compactar preserva el mecanismo de hábito de FIN-008.

Sin embargo, verificar contra el código real la alternativa recomendada de la Prioridad 3 (3-A, interpretación server-side) reveló un defecto estructural en el propio ejemplo que el documento usa como diseño objetivo (§4.6): la composición propone mostrar bajo "Deuda total" el texto **"Tus cuotas pesan 9,9% de tu ingreso — nivel sano"**, pero ese `9,9%` es el indicador de Endeudamiento del pilar del Score (`HealthService`/`score.util.ts`, FIN-004), calculado por el Motor como `debtMonthly / ingreso_mensual_ref` sobre el **mes calendario UTC** (snapshot mensual ya persistido) — mientras que el resto de las cifras de esa misma tarjeta del Dashboard (`cuotas del mes $451.234`, ingresos, gastos) se calculan en vivo sobre el **ciclo financiero del usuario** (`financialPeriod()`, FIN-016, que puede diferir del mes calendario si `cycleStartDay ≠ 1`). Además, el numerador del DTI (`debtMonthly`, suma de cuotas *programadas* de deudas activas) no es la misma cifra que "cuotas del mes" que el Dashboard ya muestra (`debtPayments`, cuotas *efectivamente pagadas* en transacciones del ciclo) — son dos números con significado distinto que la composición propuesta coloca uno junto al otro sin distinguirlos. Esto es exactamente el tipo de defecto que la Prioridad 3 busca eliminar (números sin interpretación clara), no introducir uno nuevo por composición apresurada de dos fuentes con cadencias distintas.

## Hallazgos

1. **Desalineación de periodo entre el Dashboard (ciclo FIN-016) y el DTI del Score (mes calendario, snapshot del Motor).** Verificado en código: `DashboardService.home()` calcula todo sobre `financialPeriod(now, cycleStartDay)`; `HealthService.score()` lee `MetricKey.Dti` vía `readMonth(userId, monthStart(now))` — un snapshot mensual persistido por el job nocturno del Motor, ajeno al día de corte del usuario. Para cualquier usuario con `cycleStartDay ≠ 1`, el rango de fechas que respalda "Deuda total" y sus cifras vecinas en el Dashboard NO es el mismo rango que respalda el `9,9%` que la composición propone mostrar en la misma tarjeta.
2. **Desalineación semántica del numerador: "cuotas programadas" (DTI) vs. "cuotas pagadas del ciclo" (Dashboard).** Verificado en `core-metrics.ts`: `MetricKey.Dti = debtMonthly / ref`, donde `debtMonthly` es la "suma de cuotas mensuales de deudas activas" (compromiso programado, `Debt.monthlyPayment`), no lo efectivamente pagado. El Dashboard, en cambio, ya muestra "cuotas del mes $451.234" como `debtPayments` — la suma de transacciones `pago_deuda` reales del ciclo (`DashboardService.home()`). Un usuario que pagó de más, de menos, o adelantó una cuota (FIN-012, cuando se autorice) vería dos cifras de "cuota" adyacentes que no coinciden entre sí, sin que la tarjeta explique por qué.
3. **Dependencia nueva no declarada con precisión en §11.** El documento afirma "Datos ya expuestos por `GET /dashboard/home` (FIN-014) y umbrales de indicadores (FIN-004)... Ninguna dependencia nueva", pero la 3-A recomendada requiere que `DashboardService` (o el endpoint del home) consuma el **valor calculado** del DTI de `HealthService`/`EngineService` — hoy `dashboard.service.ts` no importa ni depende de ningún módulo de `health`/`financial-engine`. No es un "umbral" lo que se necesita (los umbrales ya están en `score.util.ts` y son estáticos), sino el **dato ya computado** por un servicio distinto con una cadencia distinta — sí es una dependencia nueva en tiempo de ejecución, aunque no requiera tocar el Motor.
4. **Falta de mención de "presupuesto" en la propuesta de valor recomendada del Login (Alt A).** El propio §2.1 diagnostica que el tagline actual no dice "QUÉ hace la app (deudas, presupuesto, score, copiloto)" — cuatro pilares — pero la Alt A recomendada en §4 solo cubre tres (`💳 deudas`, `🩺 score/salud`, `🤖 copiloto`); Presupuesto queda fuera de las tres micro-líneas propuestas como solución. No invalida la alternativa, pero es una inconsistencia entre el diagnóstico (4 pilares) y la solución (3 líneas) que vale la pena resolver antes del DEC — o justificar por qué Presupuesto no necesita representación en el ≤5s del Login.

## Riesgos

- Si el Hallazgo 1+2 no se resuelven antes de implementar, el Dashboard rediseñado podría mostrar, en el peor caso de tarjeta más visible junto al hero, una interpretación numérica que no reconcilia con la cifra cruda de al lado — el riesgo específico es que la Prioridad 3 ("interpretación antes que datos", el corazón de este ARQ) termine produciendo el mismo tipo de confusión que busca eliminar, pero ahora respaldada por un texto que aparenta autoridad ("nivel sano"). Es un riesgo silencioso: no rompe ningún test funcional existente, solo produce una experiencia contradictoria para un subconjunto de usuarios (los que configuraron un día de corte distinto de 1, o los que pagaron su cuota de forma distinta a la programada).
- El Hallazgo 4 es de bajo impacto pero, si no se decide conscientemente, deja al Login sin representar uno de los 4 pilares que el propio diagnóstico identificó como necesarios de comunicar.

## Fortalezas

- Diagnóstico honesto y verificado: las tres afirmaciones del §2 sobre el estado actual del producto se confirmaron contra las capturas reales, no son una descripción aproximada.
- Cumple genuinamente el requisito de ≥2 alternativas con ventajas/desventajas por cada decisión importante, incluyendo una decisión que estaba implícita (gamificación, §4.5) y que el propio Arquitecto decidió explicitar por directriz del CTO — no se limitó a lo mínimo pedido.
- La alternativa recomendada de Prioridad 2 (hero de flujo) es la de menor riesgo técnico real: verificado que `estimatedCashflow` ya existe en `DashboardService.home()` — "cero backend" para esa prioridad es una afirmación cierta.
- El tratamiento del glosario (Alt 4-B) prioriza correctamente la coherencia entre pantallas (mantener "Patrimonio" con coletilla) en vez de la máxima simplicidad aislada — decisión consciente y bien argumentada, no la opción más fácil de implementar.
- El criterio de aceptación #4 ("Glosario aplicado, verificable por grep") aplica el mismo estándar de verificación objetiva ya usado en invariantes de ciclos anteriores (FIN-009, FIN-013, FIN-016), en vez de dejarlo a revisión subjetiva.
- La sección 4.6 (composición integrada) es justamente lo que permitió a esta auditoría encontrar el Hallazgo 1+2 — al mostrar el diseño objetivo completo con datos concretos, expuso una inconsistencia que una lista de alternativas abstractas no habría revelado. Es un ejemplo de por qué la directriz del CTO ("diseñar la mejor evolución, no la lista de parches") mejora la calidad de la auditoría también.

## Oportunidades

- Resolver el Hallazgo 1+2 con una de estas rutas (no elijo por el Arquitecto, señalo las opciones): (a) que la interpretación de "Deuda total" en el Dashboard NO reutilice el DTI del Score, sino que calcule su propia interpretación sobre las mismas cifras que ya usa el Dashboard (cuotas del ciclo / ingreso del ciclo) — mismo espíritu de "interpretación antes que datos" pero sin mezclar cadencias; o (b) si se reutiliza el DTI del Score deliberadamente, etiquetar explícitamente que es una lectura del mes calendario (coherente con la nota que FIN-016 ya exige en Ajustes: "tu Score sigue el mes calendario") para que la diferencia sea explicable, no oculta.
- Decidir explícitamente si Presupuesto debe representarse en el Login (Hallazgo 4) o documentar por qué 3 de 4 pilares son suficientes para el objetivo de ≤5 segundos.

## Observaciones críticas

- **Hallazgo 1 y 2** (desalineación de periodo y de numerador entre el DTI del Score y las cifras del Dashboard, ambas verificadas contra el código real) se elevan a crítica: afectan directamente el mecanismo central de la Prioridad 3, que es el corazón de este ARQ, y podrían producir una interpretación que contradice sus propios datos vecinos en la tarjeta más visible del diseño objetivo (§4.6).

## Observaciones menores

- Hallazgo 3 (dependencia nueva no declarada con precisión en §11) y Hallazgo 4 (Presupuesto ausente de la propuesta de valor del Login) son observaciones de especificación, no defectos del mecanismo central.

## Revisión de experiencia de usuario (6 preguntas, instrucción del CTO)

1. **¿Algo induce a interpretación incorrecta en un usuario nuevo?** En el Login, no — Alt A es literal y no promete de más. En el Dashboard, sí hay un riesgo concreto: el texto "nivel sano" bajo `9,9%` presenta una interpretación con tono de autoridad sobre un número que, por el Hallazgo 1+2, puede no corresponder al mismo periodo/definición que las cifras adyacentes — un usuario nuevo no tiene forma de saber que "cuotas del mes" y el `9,9%` de al lado no necesariamente miden lo mismo.
2. **¿Hay terminología confusa?** El glosario propuesto (Alt 4-B) reduce la terminología confusa de forma medida, sin romper coherencia. No detecté términos nuevos confusos introducidos por el propio ARQ.
3. **¿Se incrementa la carga cognitiva innecesariamente?** No — el diseño reduce carga cognitiva (un hero, tarjetas del mismo peso, gamificación compactada). Es la dirección correcta.
4. **¿La jerarquía visual deja clara la acción principal?** Sí en el diseño objetivo de §4.6: un solo elemento dominante (el hero de flujo), verificable como criterio de aceptación #2. Antes del rediseño, no (ese es precisamente el problema que motiva el ARQ).
5. **¿Hay coherencia con el resto del producto?** Mayormente sí — Alt 4-B preserva "Patrimonio" para no romper consistencia con Salud/Cuentas/Copiloto. Pero el Hallazgo 1+2 introduce una *incoherencia nueva*: la etiqueta de ciclo financiero (FIN-016) que el Dashboard ya usa en otras cifras no se refleja en la interpretación del DTI, que sigue el mes calendario del Score — dos nociones de "mes" conviviendo sin distinguirse en la misma pantalla.
6. **¿Se respeta el Principio de Claridad Radical?** Parcialmente. El diseño lo respeta en intención y en la mayoría de sus decisiones (un dato protagonista, lenguaje cotidiano, interpretación visible sin interacción). Pero el Hallazgo 1+2, de no resolverse, violaría el principio en el caso específico de la tarjeta de Deuda: mostraría una interpretación que no es radicalmente clara porque no es radicalmente correcta respecto de los datos que la rodean.

## Recomendaciones

1. Antes de que el CTO emita `DEC-017`, que Arquitectura aclare cómo se resuelve la desalineación de periodo/numerador entre el DTI del Score y las cifras del Dashboard para la interpretación de "Deuda total" (Hallazgo 1+2) — con una de las dos rutas señaladas en Oportunidades u otra equivalente.
2. Decidir explícitamente si la propuesta de valor del Login debe representar los 4 pilares diagnosticados (incluyendo Presupuesto) o justificar la omisión (Hallazgo 4).
3. Ratificar en el DEC cuál alternativa se elige por prioridad (1 a 4, más 4.5), dado que el propio documento las presenta como opciones, no como decisiones tomadas.

## Priorización

| Recomendación | Clasificación |
|---|---|
| Resolver desalineación de periodo/numerador del DTI en la interpretación de Deuda (Rec. 1) | Debe hacerse antes del desarrollo — bloqueante solo si el DEC elige la alternativa 3-A para Prioridad 3 |
| Decidir representación de Presupuesto en el Login (Rec. 2) | Debe hacerse antes del desarrollo |
| Ratificación de alternativas por prioridad (Rec. 3) | Corresponde al DEC, no es una corrección de Arquitectura |

## Veredicto

**REQUIERE AJUSTES** (acotado a la Prioridad 3 / interpretación de Deuda total).

Las Prioridades 1, 2 y 4, y la decisión de gamificación (§4.5), están bien diseñadas, cumplen el requisito de alternativas comparadas del CPSAO, y no presentan hallazgos bloqueantes — pueden pasar a `DEC-017` para que el CTO elija entre las alternativas presentadas. La Prioridad 3 (interpretación server-side, alternativa recomendada 3-A) tiene un defecto verificado contra el código real en su propio ejemplo de diseño objetivo (§4.6): mezcla una cifra de cadencia y definición distintas (DTI del Score, mes calendario, cuotas programadas) con las cifras del Dashboard (ciclo financiero, cuotas pagadas) sin distinguirlas, arriesgando precisamente el tipo de confusión que esta FIN busca eliminar. Recomiendo que el CTO no autorice la implementación de la interpretación de "Deuda total" con el diseño actual de 3-A hasta que Arquitectura aclare la reconciliación de periodo/numerador — el resto del documento puede avanzar sin devolverse.

---
*Esta auditoría no implementa ni decide. Queda a la espera de la decisión oficial del CTO (`DEC-017`).*
