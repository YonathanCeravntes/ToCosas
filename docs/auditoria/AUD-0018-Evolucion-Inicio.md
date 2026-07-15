# AUD-0018 · Auditoría de ARQ-0018 v1.0 (Evolución de la experiencia Inicio)

- **Documento auditado:** `docs/arquitectura/ARQ-0018-Evolucion-Inicio.md`, versión 1.0, commit `af7c4c8`
- **Módulo/Feature:** FIN-018 (única FIN activa; confirmé que FIN-017 cerró formalmente — `DEC-0017`, `IMP-0017`, validación del CTO contra commit `e914e85`/`52e559a` — antes de que se abriera FIN-018, sin infracción de la regla "un FIN a la vez")
- **Origen verificado:** `docs/producto/capturas/revision-inicio/RECORRIDO-INICIO-001.md` (commit `1b74f41`)
- **Referencia visual verificada:** `docs/producto/capturas/revision-inicio/scroll-01-login-completo.png`, `scroll-02-dashboard-completo.png` (recorrido real, scroll completo)
- **Referencia de código verificada:** `git show HEAD:backend/src/modules/dashboard/dashboard.service.ts`, `backend/src/modules/health/score.util.ts`, `backend/src/modules/debts/debts.service.ts`, `frontend/src/store/auth.store.ts`, `frontend/src/screens/DashboardScreen.tsx`, `frontend/src/screens/debts/DebtsListScreen.tsx` (commit `b87ef89` o el HEAD vigente al momento de esta auditoría)
- **Fecha:** 2026-07-11
- **Auditor:** Auditor Oficial de Milla (rol de solo lectura)

> Esta auditoría no modifica el ARQ ni el código ni diseña la solución. Incluye las 6
> preguntas de comprensión UX (instrucción permanente del CTO) y los criterios §29
> (Gobernanza v3.7: la interpretación nunca introduce una pregunta nueva; lenguaje
> humano antes que financiero) ratificados a raíz de mi propio hallazgo en `AUD-017`.

---

## Resumen Ejecutivo

Verifiqué cada una de las 6 piezas comprometidas (L1, D1, D3, D5, D6, D7) contra la captura real de scroll completo del Dashboard y el Login, y las 6 se sostienen exactamente como el `RECORRIDO-INICIO-001` las describe: el CTA dominante del Login es "Ingresar" (verde sólido) mientras "Crear cuenta" queda secundario; el hero repite literalmente `$6.190.000` en la cifra y en la interpretación; "Deuda total" y "Próximos pagos" están separados por Patrimonio/Ahorro/Ingresos/Gastos; "Gastos fijos $1.515.000" e "Ingresos fijos $4.200.000" aparecen duplicados; las filas de "Próximos pagos" no muestran fecha; y "¿De dónde llega la plata?" muestra únicamente "Sin categoría · 100%". También verifiqué los dos hechos técnicos que el CTO ya había confirmado: `auth.store.ts` persiste la sesión vía `expo-secure-store` con manejo de refresh (sostiene la premisa de L1 de que el recurrente casi nunca ve el Login), y `debts.service.ts` (`summaryForUser`) ya expone `upcoming[].dueDate` en el backend mientras `DashboardScreen.tsx` solo renderiza `name`/`amount` — el dato existe y no se muestra, confirmando D6 con precisión quirúrgica.

El hallazgo más importante de esta auditoría es, en realidad, una confirmación positiva: verifiqué en el código que la corrección que recomendé en `AUD-017` (Hallazgo 1+2, sobre la mezcla de periodo/numerador del DTI) fue resuelta genuinamente, no solo declarada. `interpretDebt()` en `dashboard.service.ts` calcula la interpretación de deuda con `debtPayments` (cuotas pagadas del ciclo) sobre `incomeTotal` (ingreso del ciclo) — exactamente las mismas cifras que la tarjeta ya muestra — y solo reutiliza de `score.util.ts` los cortes estáticos `DEBT_RATIO_CUTS` (0.20/0.35), sin llamar a `HealthService` ni al snapshot mensual del Motor. El propio código lo documenta ("cero llamadas al Score"). Esto es precisamente la "ruta (a)" que `DEC-0017 §5.1` adoptó y que el Fundador ratificó como principio permanente (§29.1: la interpretación nunca traslada al usuario la diferencia entre mes calendario y ciclo financiero). La propuesta de D1 (aplicar el mismo formato "$ de cada $100" al nivel verde del hero) reutiliza esta misma función y el mismo patrón de cifras — no reintroduce el defecto que motivó mi observación crítica anterior.

Encontré un hallazgo nuevo, no crítico: la mitigación que el propio ARQ declara para el riesgo de D3-B ("con varias deudas solo se ve el próximo pago más urgente en Inicio... mitigado: pestaña Deudas a un tap y línea del más urgente siempre visible") está solo parcialmente respaldada por el código. Verifiqué `DebtsListScreen.tsx`: muestra nombre, saldo, tasa, cuota y fecha de **término** del crédito (`projection.payoffDate`), pero no la fecha del **próximo pago** (`nextDueDate`) de cada deuda — el dato que un usuario con 2+ deudas necesitaría para encontrar "el resto" de sus vencimientos tras el tap que el ARQ promete. No es una regresión (hoy Inicio no muestra ninguna fecha de vencimiento; con D3-B+D6 al menos la más urgente se vuelve visible, lo cual ya es una mejora neta), pero la mitigación específica que el documento ofrece para su propio riesgo declarado no es exactamente cierta hoy.

## Hallazgos

1. **La mitigación declarada para el riesgo de D3-B (pestaña Deudas muestra "línea del más urgente siempre visible") no está respaldada por el código actual de `DebtsListScreen.tsx`.** La pantalla de lista de deudas muestra `payoffDate` (fecha en que termina de pagarse la deuda), no `nextDueDate` (fecha de la próxima cuota) — el campo que D6 usa en Inicio. Un usuario con más de una deuda que quiera ver el vencimiento de su *segunda* deuda no lo encontrará en la pestaña Deudas hoy, contrario a lo que el §10 de riesgos sugiere.

## Riesgos

- El Hallazgo 1 es de bajo impacto porque D3-B sigue siendo una mejora neta sobre el estado actual (hoy ninguna fecha es visible en Inicio) y no depende de la pestaña Deudas para cumplir su propio criterio de aceptación (#3, que solo exige que la fecha del *próximo pago más cercano* sea visible). Pero si no se corrige la redacción del riesgo o no se amplía `DebtsListScreen.tsx` en un ciclo futuro, la promesa implícita de "el resto a un tap" queda incumplida para usuarios con varias deudas.

## Fortalezas

- Las 6 piezas comprometidas están diagnosticadas con precisión verificable — cada una la confirmé contra la captura real de scroll completo, no contra una descripción aproximada.
- Cierre genuino y verificado en código del Hallazgo crítico de `AUD-017`: la ruta (a) de `DEC-0017 §5.1` (interpretación con cifras propias del ciclo, cero llamadas al Score) está implementada exactamente como se decidió, y D1 la extiende de forma consistente en vez de reabrir el problema.
- Reutilización inteligente y de bajo acoplamiento: `DEBT_RATIO_CUTS` se importa como constante estática de compilación desde `score.util.ts` para mantener coherencia de umbrales con el Score, sin crear una dependencia en tiempo de ejecución hacia `HealthService` — el mismo objetivo de consistencia que perseguía la alternativa rechazada, logrado sin el riesgo de periodo/numerador.
- D3-B resuelve dos observaciones a la vez (D3 y D6) con un solo cambio de diseño, reduciendo el recorrido en vez de añadir una sección — coherente con el estándar "compactar, no acumular" que el propio §5 aplica al resto de la pantalla.
- El análisis amplio de la mitad inferior (§5) documenta ambas lecturas posibles de D2 (gamificación) sin forzar una — reconoce honestamente que es una decisión de narrativa del CPSAO, no técnica, en vez de resolverla unilateralmente.
- La propuesta analítica de §5 (compactar Movimientos recientes + "Ver todos") se presenta explícitamente como no comprometida, evitando que un análisis exploratorio se cuele como alcance aprobado — disciplina consistente con la lección de FIN-011.

## Oportunidades

- Ajustar la redacción del riesgo de D3-B en §10 para reflejar con precisión que "el resto a un tap" hoy muestra la fecha de término de cada deuda, no la fecha del próximo pago — o registrar como mejora futura (fuera de este ciclo) agregar `nextDueDate` a `DebtsListScreen.tsx`.
- Si el equipo aprueba la propuesta analítica de §5 (compactar Movimientos recientes), definir sus propios criterios de aceptación explícitos (número exacto de filas, texto del "Ver todos", captura de cierre) en el DEC, ya que el ARQ correctamente la deja fuera del criterio #13.6 genérico.

## Observaciones críticas

Ninguna. El hallazgo encontrado es una imprecisión en la justificación de un riesgo ya declarado por el propio documento, no un defecto del mecanismo central — a diferencia de `AUD-017`, donde el defecto sí tocaba el corazón de la Prioridad 3.

## Observaciones menores

- Hallazgo 1 (mitigación de D3-B no totalmente respaldada por `DebtsListScreen.tsx`).

## Revisión de experiencia de usuario (6 preguntas)

1. **¿Algo induce a interpretación incorrecta en un usuario nuevo?** No en los textos propuestos por sí mismos. El único riesgo de interpretación incorrecta indirecta es que un usuario con varias deudas asuma (por la promesa implícita de D3-B) que puede ver todos sus vencimientos en la pestaña Deudas, cuando hoy no puede (Hallazgo 1) — no es un texto engañoso, es una expectativa que el flujo no cumple del todo todavía.
2. **¿Hay terminología confusa?** No. Los textos de §4 (L1, D1, D5, D7) usan lenguaje cotidiano; ninguno introduce jerga nueva.
3. **¿Se incrementa la carga cognitiva innecesariamente?** No — todas las piezas reducen carga cognitiva: D5 elimina duplicación, D3-B consolida dos bloques de deuda en uno, D7 elimina una sección sin valor informativo.
4. **¿La jerarquía visual deja clara la acción principal?** Sí para L1 (un solo CTA dominante para el usuario nuevo, con las alternativas B/C correctamente descartadas por diluir o complejizar esa claridad).
5. **¿Hay coherencia con el resto del producto?** Sí, y verificada en código: D1 reutiliza literalmente el mismo patrón de función y el mismo formato textual (`interpretDebt`) que ya existe para la tarjeta de deuda, en vez de inventar un tercer estilo de interpretación.
6. **¿Se respeta el Principio de Claridad Radical y los criterios §29?** Sí. Verifiqué en código que ninguna interpretación propuesta (ni la existente ni la nueva de D1) requiere que el usuario entienda la diferencia entre mes calendario y ciclo financiero — cumple §29.1 de forma demostrable, no solo declarada. Los textos de las tablas §4 pasan razonablemente la prueba de §29.2 ("¿lo entendería alguien sin conocimientos financieros en la primera lectura?").

## Recomendaciones

1. Corregir o acotar la redacción del riesgo de D3-B en §10 respecto de lo que la pestaña Deudas realmente muestra hoy (Hallazgo 1), o registrar la ampliación de `DebtsListScreen.tsx` como mejora futura fuera de este ciclo.
2. Si el DEC aprueba la propuesta analítica de §5 (compactar Movimientos recientes) dentro de este mismo ciclo, definir sus criterios de aceptación explícitos en el propio `DEC-018`.

## Priorización

| Recomendación | Clasificación |
|---|---|
| Precisar la redacción del riesgo de D3-B (Rec. 1) | Puede esperar — no bloquea el desarrollo, es una corrección de texto del propio ARQ |
| Criterios de aceptación de la propuesta de §5, si se aprueba (Rec. 2) | Debe hacerse antes del desarrollo, solo si el DEC decide incluirla en este ciclo |

## Veredicto

**APROBADO CON OBSERVACIONES.**

Las 6 piezas comprometidas (L1, D1, D3, D5, D6, D7) están bien diagnosticadas, verificadas contra la captura real y contra el código, y ninguna presenta un defecto del mecanismo central — a diferencia de `AUD-017`, donde el Hallazgo crítico tocaba el corazón de la Prioridad 3, aquí verifiqué que esa misma pieza (interpretación de deuda/cashflow) ya está correctamente resuelta y que D1 la extiende sin reabrir el problema. El único hallazgo (mitigación de D3-B parcialmente respaldada) es una observación menor de precisión, no bloqueante. Recomiendo que el CTO proceda a `DEC-018` eligiendo las alternativas de cada pieza y resolviendo si la propuesta analítica de §5 entra en este ciclo, sin necesidad de devolver el documento a Arquitectura.

---
*Esta auditoría no implementa ni decide. Queda a la espera de la decisión oficial del CTO (`DEC-018`).*
