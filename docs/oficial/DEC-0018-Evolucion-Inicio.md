# DEC-0018 · Evolución de la experiencia Inicio (2ª iteración)

- **Documentos base:** `docs/arquitectura/ARQ-0018-Evolucion-Inicio.md` (v1.0, commit `af7c4c8`) · `docs/auditoria/AUD-0018-Evolucion-Inicio.md`
- **Módulo/Feature:** FIN-018 (única FIN activa, Gobernanza v3.5 §27 — Origen: Mejora de revisión de producto, `RECORRIDO-INICIO-001`)
- **Decide:** CTO de Milla
- **Fecha:** 2026-07-11

---

## 0. Verificación independiente previa a esta decisión

Antes de decidir, verifiqué contra el repositorio real (no solo el informe del Auditor):

- Confirmé que `FIN-017` cerró formalmente antes de que se abriera `FIN-018` (mismo verificación que hizo el propio Auditor) — sin infracción de "un FIN a la vez".
- Leí `frontend/src/store/auth.store.ts`: confirmado que la sesión persiste vía `SecureStore` con manejo de refresh — sostiene la premisa técnica de L1.
- Leí `backend/src/modules/debts/debts.service.ts`: confirmado que `upcoming[].dueDate` ya existe en la respuesta — sostiene D6/D3-B.
- Leí `backend/src/modules/dashboard/dashboard.service.ts` y `backend/src/modules/health/score.util.ts`: confirmado que `interpretDebt()` usa exclusivamente `debtPayments`/`incomeTotal` del ciclo y solo reutiliza `DEBT_RATIO_CUTS` como constante estática — cero llamadas a `HealthService`. La ruta (a) de `DEC-0017 §5.1` sigue vigente, D1 la extiende sin reabrir el defecto de `AUD-017`.
- Leí `frontend/src/screens/debts/DebtsListScreen.tsx` y confirmé, mediante grep de `nextDueDate`/`dueDate`, que la pantalla solo muestra `payoffDate` ("Terminas de pagar el...") — el Hallazgo 1 del Auditor sobre la mitigación de D3-B es exacto, no especulativo.

Conclusión: **AUD-018 es preciso y sus hallazgos (uno solo, no bloqueante) se sostienen de forma independiente.**

## 1. Resumen ejecutivo

ARQ-0018 diagnostica con precisión las 6 piezas comprometidas (verificadas contra la captura real de scroll completo) y presenta alternativas comparadas para cada una, además del análisis §5 exigido por el CPSAO sobre la mitad inferior. El Auditor no encontró defectos del mecanismo central — a diferencia de AUD-017, aquí confirmó además que la corrección de `AUD-017` (interpretación de deuda) está genuinamente resuelta en el código, no solo declarada. El único hallazgo (la mitigación de riesgo de D3-B cita una capacidad de `DebtsListScreen.tsx` que hoy no existe) es una imprecisión de redacción, no bloqueante.

## 2. Arquitecturas revisadas

- `docs/arquitectura/ARQ-0018-Evolucion-Inicio.md` (v1.0).

## 3. Auditorías revisadas

- `docs/auditoria/AUD-0018-Evolucion-Inicio.md` — veredicto: **APROBADO CON OBSERVACIONES**.

## 4. Decisiones aprobadas

1. **L1 — Alt A, "Crear cuenta" primario.** Aprobada. La premisa técnica (persistencia de sesión) está verificada en código.
2. **D1 — Alt A, formato "$ de cada $100" en el nivel verde del hero.** Aprobada. Reutiliza el mismo patrón textual que ya existe para la interpretación de deuda — coherencia de lenguaje verificada.
3. **D3 — Alt B, integrar el próximo pago en la tarjeta de Deuda total.** Aprobada. Compacta el recorrido y absorbe D6 dentro de la misma línea ("Próximo: ... · vence 28 jul"), tal como anticipa el propio ARQ.
4. **D6 — resuelto dentro de D3-B**, sin trabajo aparte, conforme a la nota de composición del ARQ §4.
5. **D5 — Alt A, quitar las filas repetidas** de las secciones de categorías, con los títulos aclarando el alcance ("gastos del día a día"). Aprobada — mínima y quirúrgica.
6. **D7 — Alt B, invitación accionable** en vez de ocultar la sección. Aprobada — evita la inconsistencia de una sección que aparece/desaparece entre ciclos.

## 5. Corrección no bloqueante requerida

**Hallazgo 1 del Auditor (mitigación de riesgo de D3-B en §10 del ARQ):** confirmado en código que `DebtsListScreen.tsx` no muestra `nextDueDate`, solo `payoffDate`. No bloquea el desarrollo (D3-B+D6 siguen siendo una mejora neta sobre el estado actual) pero Arquitectura debe corregir la redacción de ese riesgo en el ARQ antes de `IMP-0018`, dejando registrado como mejora futura (fuera de este ciclo) agregar `nextDueDate` a `DebtsListScreen.tsx` si se decide más adelante.

## 6. Sobre la propuesta analítica de §5 (compactar "Movimientos recientes")

El ARQ presenta, sin comprometerla, una propuesta para resolver D8/D9 (compactar a 3-4 filas + "Ver todos"). Dado que el CPSAO reservó explícitamente para sí la decisión de narrativa sobre D2/D8/D9 al abrir esta FIN, **no decido unilateralmente si esta pieza entra en el alcance de FIN-018** — se la traslado al CPSAO para su confirmación antes de instruir a Arquitectura. Si el CPSAO la aprueba, se definen sus criterios de aceptación explícitos en un adendo de este DEC (recomendación 2 del Auditor); si no, FIN-018 continúa solo con las 6 piezas ya aprobadas en §4.

## 6.1 Adendo — el CPSAO aprueba incorporar la propuesta al alcance (2026-07-11)

El CPSAO respondió: aprueba incorporar la compactación de "Movimientos recientes" al alcance de `FIN-018`, no como funcionalidad nueva sino como el cierre natural del trabajo ya iniciado sobre Inicio. Justificación exigida: no es "acortar la pantalla" — es que el recorrido completo termine transmitiendo claridad y control, no la sensación de una lista que continúa indefinidamente (resuelve D8/D9 con ese criterio, no con uno de mera longitud).

**Criterios de producto que Arquitectura debe aplicar, ratificados por el CPSAO:**

1. El enlace "Ver todos" no debe ser una forma de ocultar información — debe comunicar que el usuario pasa de una **vista ejecutiva** a una **vista de detalle**. Arquitectura propone el texto exacto de ese enlace (no un genérico "Ver todos" sin más, salvo que Arquitectura demuestre que ya comunica esa transición) y lo somete al criterio §29.2 (lenguaje humano) como el resto de los textos de esta FIN.
2. Durante la implementación, Arquitectura debe validar que la pantalla completa siga respondiendo la pregunta que ha guiado toda la FIN: **¿al terminar de recorrer Inicio, el usuario entiende mejor su situación financiera que cuando abrió la aplicación?** Esta validación debe quedar documentada en `IMP-0018` (no es un criterio numérico, es un juicio razonado que el equipo pueda revisar).

**Criterios de aceptación adicionales para esta pieza** (extienden ARQ-0018 §13, recomendación 2 de AUD-018):
- Número de filas visibles en "Movimientos recientes": 3-4 (Arquitectura decide el número exacto dentro de ese rango y lo justifica).
- Texto del enlace de transición: definido por Arquitectura bajo el criterio 1 de este adendo, verificable en la captura de cierre.
- Captura de cierre del recorrido completo (scroll hasta el final) que muestre la sección compactada y el enlace, como parte de las capturas antes/después ya exigidas en ARQ-0018 §13.7.

Con este adendo, el alcance completo de `FIN-018` queda: L1-A, D1-A, D3-B/D6, D5-A, D7-B, y la compactación de Movimientos recientes con los criterios de este §6.1. Arquitectura queda autorizada a implementar el alcance completo.

## 7. Decisiones rechazadas

- Ninguna alternativa fue rechazada — el ARQ llegó con recomendaciones ya bien fundamentadas y verificadas.

## 8. Próximos pasos

1. Arquitectura corrige la redacción del riesgo de D3-B (§5 de este DEC) — no requiere nueva Auditoría, confirmación puntual del CTO.
2. En paralelo, el CTO consulta al CPSAO sobre la propuesta analítica de Movimientos recientes (§6 de este DEC).
3. Arquitectura implementa las 6 piezas aprobadas (L1-A, D1-A, D3-B/D6, D5-A, D7-B) según el Plan de ARQ-0018 §14: backend (texto D1) → frontend (Login + Dashboard) → capturas de scroll completo antes/después → `IMP-0018` con SHA → validación → cierre.
4. `BACKLOG.md` se actualiza reflejando: FIN-018 en estado "Decidido — autorizado a implementación (6 piezas), corrección de redacción pendiente, propuesta de Movimientos recientes en consulta con el CPSAO".

## 9. Adendo — VALIDACIÓN de IMP-0018 y tercera iteración antes del cierre (2026-07-11)

**Verificación independiente del CTO contra IMP-0018 (commits `3fb4072`, `82caa0d`, `c5ac7c7`):** confirmé en código las 7 piezas (L1-A en `LoginScreen.tsx`, D1-A en `dashboard.service.ts` con test exacto, D3-B/D6 con "Próximos pagos" eliminado de la UI y absorbido en la tarjeta de Deuda, D5-A con `grep "📌"` = 0, D7-B con la invitación accionable, Movimientos recientes compactado a 4 filas con enlace de transición) y vi directamente ambas capturas de scroll completo (`despues-scroll-01-login.png`, `despues-scroll-02-dashboard.png`) — todo coincide con lo declarado.

**Verifiqué además, de forma independiente, la incidencia reportada por Arquitectura:** en `transactions.service.ts` confirmé que registrar un pago de deuda (`pago_deuda`) solo actualiza `current_balance`/`status`, nunca `nextDueDate` — por eso la captura muestra "Próximo: Tarjeta de crédito · $97.199 · vence 28 de abr" con fecha ya vencida. Es un defecto real y preexistente del dominio de Deudas, no introducido por FIN-018, que esta FIN hizo visible por primera vez.

**El CPSAO revisó las capturas y, antes de autorizar el cierre de la experiencia Inicio, pidió tres cosas — no autorizo el paso a la Experiencia de Salud todavía:**

1. **Reclasificar el hallazgo de `nextDueDate` como riesgo de experiencia de usuario** (no solo observación técnica del dominio Deudas): si Milla muestra "Próximo pago" con una fecha vencida, compromete la confianza en el resto de la información de la pantalla. Acepto la reclasificación. Instruyo a Arquitectura a corregir `nextDueDate` para que avance también con un pago regular (no solo con abono a capital/prepago), como parte de FIN-018 — es una corrección pequeña y bien acotada (mismo tipo de sentencia atómica ya usada en `transactions.service.ts` para `current_balance`), directamente causada por la propia decisión D3-B de esta FIN.
2. **Análisis narrativo adicional:** Inicio responde bien "¿cómo estoy?" pero debe evaluarse si también guía hacia "¿qué debería hacer ahora?". Instruyo a Arquitectura a evaluar esto en una actualización del ARQ, sin agregar funciones nuevas — es una revisión de si el recorrido ya existente guía naturalmente a la siguiente decisión.
3. **Revisión de Comprensión (RC):** el CPSAO propuso, y el Fundador ratificó como mecanismo permanente de Gobernanza (v3.8 §30), una validación externa breve y de alcance reducido, deliberadamente separada de la Alpha Cerrada — el Auditor la diseña y ejecuta sobre Inicio antes de que esta FIN pueda cerrar.

**FIN-018 no cierra con este DEC** — queda autorizada una tercera entrega de Arquitectura (corrección de `nextDueDate` + análisis narrativo) seguida de la primera Revisión de Comprensión del Auditor, antes de decidir el cierre definitivo y el paso a la Experiencia de Salud.

## 10. Adendo — tercera entrega verificada (commits `8c42edf`, `70625cb`)

**Pieza 8 (`nextDueDate`) verificada por el CTO.** Leí el `UPDATE` atómico en `transactions.service.ts`: usa `age(now(), next_due_date)` para calcular los meses transcurridos y salta a `GREATEST(1, meses+1)` meses desde la fecha original, conservando el día ancla; limpia a `NULL` si la deuda queda saldada. Confirmé el E2E `fin018-next-due-date.e2e-spec.ts` (3 casos: vencida→futura conservando ancla, futura→+1 mes exacto, saldada→NULL) y vi directamente la captura final: la tarjeta de la demo pasó de "vence 28 de abr" a "vence 28 de jul" tras un pago real, con todas las cifras vecinas (deuda total, pagado del ciclo, patrimonio, movimientos) actualizadas de forma coherente entre sí. **Aprobada.**

**Análisis narrativo verificado.** ARQ-0018 v1.3 §5.1 documenta, sin implementar, una propuesta mínima ("Tienes margen este ciclo — simula un abono a tu deuda →", reutilizando el simulador de FIN-012) y su alternativa de no añadir nada. Es una decisión de producto, no técnica — la traslado al CPSAO junto con D2 (que sigue pendiente de su criterio de narrativa desde `DEC-018` original) antes de instruir cualquier implementación adicional.

**Con esto, IMP-0018 queda validado por el CTO en su totalidad.** El siguiente paso es la primera Revisión de Comprensión (Gobernanza v3.8 §30) del Auditor sobre Inicio — el cierre de FIN-018 y el paso a la Experiencia de Salud quedan condicionados a sus resultados y a la decisión del CPSAO sobre la propuesta narrativa.

## 11. Adendo — RC-0001 (con corrección) y cuarta iteración autorizada por el CPSAO (2026-07-11)

**Corrección de RC-0001 exigida por el CTO:** el Hallazgo 2 (íconos de deuda inconsistentes, `🏦` vs `💳`) no se sostuvo al verificarlo — `grep` de `🏦` en `DashboardScreen.tsx` no arrojó resultados; el ícono real de la línea "Próximo" es `📅` (fecha), y `💳` se usa de forma consistente para el concepto de deuda en el título de la tarjeta y en Movimientos recientes. Se devolvió al Auditor para que corrija o retire el hallazgo en `RC-0001` v1.1. Los Hallazgos 1 ("ciclo" sin explicar) y 3 ("Abono a capital" no autoexplicativo) sí se confirmaron contra la captura real.

**El CPSAO decidió, consolidando los 4 puntos pendientes** (D2, puente narrativo, y los 2 hallazgos válidos de RC-0001), **autorizar una cuarta iteración acotada sobre Inicio**, antes de programar la Revisión de Comprensión con personas reales — no tiene sentido convocar participantes externos a descubrir problemas que el propio equipo ya identificó.

**Instrucciones para Arquitectura, ratificadas por el CPSAO:**

1. **D2 (gamificación):** evaluar la ubicación que mejor refuerce la narrativa completa del recorrido — decisión por el recorrido mental del usuario, no por costumbre o inercia de dónde estaba antes.
2. **Puente narrativo:** aprobado incorporar la línea condicional del simulador de abono. Texto breve, accionable y contextual — sin sentirse invasivo ni forzado.
3. **"Ciclo" (RC-0001 Hallazgo 1):** encontrar una forma de hacer evidente el concepto desde la propia interfaz, sin obligar al usuario a aprender vocabulario interno del producto (consistente con el Principio de Claridad Radical y §29).
4. **"Abono a capital" (RC-0001 Hallazgo 3):** priorizar explicar el beneficio antes que el término técnico; si el término se mantiene por precisión, debe ir acompañado de una explicación comprensible.

**Criterio rector de esta iteración (instrucción explícita del CPSAO), a aplicar sobre el recorrido completo, no observación por observación:** *"Si esta fuera la primera y única pantalla que alguien ve de Milla, ¿entendería qué está pasando y qué debería hacer después?"*

**Secuencia:** Arquitectura entrega esta cuarta iteración (ARQ actualizado + IMP) → CTO valida → **solo entonces** se programa la Revisión de Comprensión con personas reales (posiblemente aprovechando el reclutamiento ya en curso para la Alpha Cerrada, sin mezclar los dos programas, per Gobernanza v3.8 §30) → esa sesión ya no busca descubrir problemas evidentes, busca confirmar que el trabajo funciona fuera del equipo → con ese resultado, CTO y CPSAO deciden el cierre definitivo de FIN-018 y el paso a la Experiencia de Salud.

## 12. Adendo — cuarta iteración (IMP-0018 v1.2) validada por el CTO (2026-07-11)

Verificación independiente contra el repositorio (commits `8016bfd` código, `f748b09` docs):

1. **D2:** confirmado en `DashboardScreen.tsx` línea 314 — `ProgressLine` (gamificación) ahora se renderiza después de "Movimientos recientes" y su enlace de transición, como último elemento antes de los estados de error/tabs. Coincide con el criterio "cierre del recorrido, no interrupción hero→deuda".
2. **Puente narrativo:** confirmado — línea condicional `dashboard.data?.interpretation.cashflow?.level === 'verde' && summary.data?.upcoming?.[0]`, texto "💡 Tienes margen: adelanta un pago y ahorra intereses →", navega al detalle de la deuda del próximo pago. Visible en la captura final.
3. **"Ciclo":** confirmado por grep — la palabra no aparece en ningún texto renderizado de `DashboardScreen.tsx` (solo en comentarios de código); el hero usa "Te queda para gastar · hasta el 31 de jul" y la tarjeta de Deuda usa "pagado desde el 1 de jul". Verificado también visualmente en la captura.
4. **"Abono a capital":** confirmado en `debt-prepayment.service.ts` — nuevas transacciones usan `Adelanto a tu deuda (terminas antes / baja tu cuota)` y `Pagaste toda tu deuda`; confirmado en `DebtDetailScreen.tsx` que el término técnico se conserva en el detalle con el subtítulo "Adelanta plata a tu deuda: pagas menos intereses y terminas antes (o bajas tu cuota)". Nota de transparencia aceptada: las filas históricas de movimientos conservan el texto antiguo por ser datos ya escritos, no una plantilla — comportamiento correcto, no un defecto.

**IMP-0018 v1.2 queda validado por el CTO en su totalidad — las 4 correcciones de la cuarta iteración están genuinamente implementadas, no solo declaradas.** Corresponde ahora programar la sesión real de Revisión de Comprensión (Gobernanza v3.8 §30) con participantes humanos reales — esta es una acción que requiere reclutamiento fuera del entorno de desarrollo y queda a cargo del Fundador/CPSAO, coordinada con el Auditor para el diseño de la sesión. El cierre definitivo de FIN-018 y el paso a la Experiencia de Salud quedan condicionados al resultado de esa sesión.

## 13. Adendo — protocolo detallado de RC-0001 (2026-07-11)

El CPSAO especificó un protocolo detallado para la primera sesión real: proceso independiente del canal de reclutamiento de la Alpha (aunque puede compartir medios de contacto), registro y evidencia propios, reglas del moderador (solo observa y pregunta, nunca explica la pantalla durante el intento de comprensión), y métricas de **recorrido mental** además de comprensión — tiempo para identificar el dato más importante, primer elemento donde se detiene, dónde aparece la primera duda, primer intento de toque, si puede explicar con sus palabras su situación al terminar, y si puede nombrar espontáneamente la siguiente acción.

El CPSAO propuso que, si esta primera sesión funciona, se convierta en el estándar metodológico permanente para todas las experiencias futuras (Salud, Presupuesto, Deudas, Simulador, Copiloto). **Consulté al Fundador: por ahora se aplica este protocolo únicamente a `RC-0001` (Inicio)** — la decisión de codificarlo como método permanente en `GOBERNANZA.md` se toma después, con la evidencia real de esta primera ejecución, no antes. El Auditor diseña y ejecuta `RC-0001` bajo este protocolo detallado; el registro y las conclusiones son específicos de esta experiencia.

## 14. Adendo — suspensión del reclutamiento de RC-0001 y CIERRE de FIN-018 (2026-07-11)

El CPSAO reevaluó la secuencia: en vez de una sesión real de RC por experiencia, prefiere una **única RC integral** al final de toda la hoja de ruta UX (Inicio, Salud, Presupuesto, Deudas, Simulador, Copiloto ya iteradas), porque la comprensión real de un usuario depende del recorrido completo por la app, no de una pantalla aislada. El protocolo y el diseño de `RC-0001` (`RC-0001-Inicio.md` v1.3) quedan **preservados, no descartados** — se reutilizan cuando llegue esa validación integral. Se suspende únicamente el reclutamiento de participantes para una sesión aislada de Inicio.

**Consulté al Fundador sobre el cierre de FIN-018**, dado que este DEC condicionaba el cierre definitivo al resultado de esa sesión real. Decisión: **FIN-018 CIERRA AHORA**, con la evidencia ya validada por el CTO — las 8 piezas (7 de DEC-018 + pieza 8 de `nextDueDate`), las 4 iteraciones completas, y la revisión de comprensión de primer nivel (`RC-0001` walkthrough cognitivo) cuyos 2 hallazgos válidos (1: "ciclo"; 3: "Abono a capital") ya fueron corregidos en la cuarta iteración y verificados por el CTO. La sesión real con participantes humanos queda pendiente como parte de la futura **RC integral de fin de hoja de ruta**, no como condición de cierre de esta FIN individual.

**Con este adendo, `DEC-0018` autoriza el cierre formal de FIN-018** — habilita abrir la siguiente experiencia de la hoja de ruta (Salud) bajo la disciplina ya vigente de "un FIN a la vez".
