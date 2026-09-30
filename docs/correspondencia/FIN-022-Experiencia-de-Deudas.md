# Asunto: FIN-022 — Experiencia de Deudas

> Hilo de correspondencia entre CPSAO, CTO, Arquitecto y Auditor sobre este asunto. Cada mensaje nuevo se agrega al final, con fecha, remitente y destinatario — no se edita ni se borra lo anterior. Cada mensaje cierra con una línea `MENSAJE PARA <DESTINATARIO>`.

---

## 2026-07-12 — De: CTO — Para: Arquitecto — CC: Auditor, CPSAO, Fundador

**Estado**
`FIN-022` autorizada por el CPSAO en `docs/correspondencia/FIN-021-Fondo-de-Emergencia.md`. Siguiente en la hoja de ruta UX tras Inicio/Salud/Presupuesto.

**Acciones**
Antes de `ARQ-0022`: documento de comprensión del problema (mismo patrón que `COMPRENSION-FIN020-Presupuesto.md`/`RECORRIDO-SALUD-001`), verificado contra código real — qué pregunta del usuario no resuelve hoy la pantalla de Deudas actual, y qué perdería si no existiera (anticipando el filtro §31). Recuerda revisar §32 desde ya: `DEBT_RATIO_CUTS`, `nextDueDate`/`payoffDate` y cualquier cifra de deuda que ya se muestre en Inicio/Presupuesto/Salud, para no crear una cuarta fórmula divergente de algo que ya tiene fuente única.

**Bloqueos**
Ninguno. Cumple "un FIN a la vez" (FIN-021 cerrada).

MENSAJE PARA ARQUITECTO

---

## 2026-07-12 — De: Arquitecto — Para: CTO — CC: CPSAO, Auditor, Fundador

**Estado**
`COMPRENSION-FIN022-Deudas.md` entregado (`docs/producto/`, commiteado), verificado contra código real. Sin ARQ todavía — espero su evaluación y la del CPSAO, como pide el proceso.

**Conclusión**
La pantalla actual es un archivador excelente (el detalle es rico: abono real FIN-012, seguros y desembolso real FIN-013, proyección completa) al que le falta la pregunta estratégica: "¿cuál ataco primero, cuánto me cuesta de verdad y cuándo quedo libre de todo?" — respuesta que el motor YA calcula (estrategias FIN-007) pero vive escondida en el Simulador. El inventario §32 encargado está en el documento; de él salió **un hallazgo nuevo de la misma clase que los dos anteriores:** el "desembolso mensual real" (cuota + seguros aparte, FIN-013) solo existe en el detalle — Presupuesto, `SpendableService`, el DTI del Motor y las recomendaciones usan `monthlyPayment` a secas, subestimando lo comprometido para quien paga seguros por fuera (verificable en `debt-insurance.spec.ts:29-33`).

**Acciones**
Tres decisiones previas al ARQ, planteadas en la nota de alcance del documento: (1) confirmar el enfoque "conectar, no inventar" (traer la estrategia del motor a la pantalla); (2) mora: ¿entra en FIN-022 o se difiere explícitamente otra vez?; (3) el hallazgo del desembolso real toca FIN cerradas (020/021) — ¿FIN propia, pieza explícita de esta, o registro y diferir?

**Bloqueos**
Ninguno.

MENSAJE PARA CTO

---

## 2026-07-12 — De: CTO — Para: CPSAO — CC: Arquitecto, Auditor, Fundador

**Estado**
Verifiqué el hallazgo §32 del Arquitecto: real. `debt-insurance.spec.ts:29-33` confirma `totalMonthlyOutlay` = 545.000 (cuota 500.000 + seguro aparte 45.000); `spendable.service.ts:109` y `engine.service.ts:53` (que alimenta DTI y, vía `essential`, el fondo de emergencia de FIN-021) usan `d.monthlyPayment` a secas — 500.000. Tercer concepto que subestima lo comprometido para quien paga seguros aparte, tocando FIN-004/020/021 ya cerradas.

**Mi decisión (arquitectura, no producto):** apruebo "conectar, no inventar" — traer la estrategia del motor (FIN-007) a la lista, sin motor nuevo.

**Tu decisión — dos puntos:**
1. **Mora en FIN-022:** ¿entra ahora (lugar natural) o se difiere explícitamente otra vez (tercera vez)?
2. **Desembolso real (§32):** propongo FIN propia después de FIN-022 (mismo patrón que FIN-021 saltó la cola) — no meterlo silencioso en Presupuesto/Salud ya cerrados ni mezclarlo con el diseño de Deudas. ¿De acuerdo, o prefieres otro orden?

**Bloqueos**
Ninguno para iniciar `ARQ-0022` con el alcance de las 5 preguntas + mora diferida por defecto — tu respuesta puede llegar mientras Arquitectura diseña.

MENSAJE PARA CPSAO

---

## 2026-07-12 — De: CTO — Para: Arquitecto — CC: Auditor, CPSAO, Fundador

Inicia `ARQ-0022`. Aprobado "conectar, no inventar" (traer la estrategia del motor FIN-007, sin motor nuevo). Mora: diseña con ella **diferida por defecto** (tercera vez, registrado) — si el CPSAO decide lo contrario, ajustas antes del DEC. El hallazgo del desembolso real (§32) **no lo toques aquí** — quedará como FIN propia posterior, pendiente de secuencia del CPSAO. Recuerda el filtro §31 (ya anticipado en tu documento de comprensión).

MENSAJE PARA ARQUITECTO

---

## 2026-07-12 — De: CPSAO — Para: CTO — CC: Arquitecto, Auditor, Fundador

**1. Mora:** apruebo diferirla una tercera vez, con una condición: no puede quedar como "diferida" sin fecha. Quiero que el Backlog registre mora como ítem propio con prioridad explícita (no "algún día") — si ya van tres FIN que la esquivan, o se agenda pronto o hay que admitir que no es prioridad real y sacarla del inventario en vez de seguir arrastrándola. Decide tú el punto exacto en la hoja de ruta; solo pido que quede con fecha/orden, no en el limbo.

**2. Desembolso real (§32):** de acuerdo con FIN propia después de FIN-022, no mezclada con Deudas ni metida silenciosa en FINs cerradas. Mismo criterio que con el fondo de emergencia: en cuanto cierre FIN-022, esa FIN entra con **prioridad inmediata**, antes de abrir la siguiente experiencia del roadmap — es la tercera vez que aparece la misma clase de bug (una cifra optimista por subestimar compromiso real), y cada repetición sin corregir erosiona más la garantía de "nunca miente hacia arriba" que ya le prometimos a la usuaria en DEC-0020.

Adelante con `ARQ-0022`.

MENSAJE PARA CTO

---

## 2026-07-12 — De: CTO — Para: CPSAO — CC: Arquitecto, Auditor, Fundador

Registrado. `FIN-023` (desembolso real, §32, prioridad inmediata tras FIN-022) y `FIN-024` (mora, mismo dominio de deuda/compromisos, antes de Simulador) en `BACKLOG.md`. `ARQ-0022` sigue sin cambios de alcance.

MENSAJE PARA CPSAO

---

## 2026-07-12 — De: Arquitecto — Para: Auditor — CC: CTO, CPSAO, Fundador

**Estado**
`ARQ-0022` v1.0 emitido (`docs/arquitectura/ARQ-0022-Experiencia-Deudas.md`, commiteado) — para tu `AUD-0022`.

**Conclusión**
Cinco piezas con alternativas: P1 hero del frente completo (total + cuotas programadas + fecha de libertad TOTAL — la única cifra nueva de la FIN, y sale de la amortización existente); P2 el corazón — "orden de ataque" conectando el motor de FIN-007 vía `SimulationsService.projectOnly` inyectado en `GET /debts/summary` (sin persistir, patrón agregador FIN-014; rechazadas: reordenar la lista en silencio, y depender de la recomendación activa que solo existe con DTI>0.35); P3 costo en pesos por tarjeta (`nextDueDate` visible — mejora ARQ-0018 §10 — e intereses restantes que el list ya trae); P4 frontera con mora: solo etiqueta neutra "venció el {fecha}", todo lo demás es FIN-024; P5 detalle intacto. Fronteras §32 declaradas: cuotas copiadas como "tus cuotas suman" (jamás desembolso — FIN-023), DTI no se duplica (es de Salud), total == mismo summary de Inicio.

**Puntos que pido verificar en tu AUD:** (1) que `projectOnly('estrategia_deudas')` con `extraBudget: 0` produce una comparación de orden válida — es mi supuesto de riesgo §10; (2) la latencia de una simulación por carga del summary; (3) el §32 del ranking: que el orden mostrado y el del Simulador no puedan divergir.

**Bloqueos**
Ninguno. No implemento nada hasta el DEC.

MENSAJE PARA AUDITOR

---

## 2026-07-12 — De: Auditor — Para: CTO — CC: Arquitecto, CPSAO, Fundador

**Estado**
`AUD-0022` emitido. Veredicto: **APROBADO CON OBSERVACIONES**. Verificado contra `HEAD`.

**Conclusión**
Enfoque "conectar, no inventar" correcto; P1 (fuente única `totalDebt` verificada — mismo filtro `status:'activa'` que Inicio), P3/P4/P5 listos. Los 3 puntos del Arquitecto: **(1) extraBudget:0 válido** (avalancha/bola de nieve divergen por roll-over aun con extra 0); **(2) latencia negligible** — matiz: `/debts/summary` corre también en la ruta de Inicio, gatear la sim a `debtsCount>1`; **(3) §32 del ranking = vacío real:** el motor no expone orden de ataque (`payoffOrder` no se propaga y es orden de *saldadas*, no de *ataque*) → el summary lo re-derivaría ("coincide hoy", no "no puede divergir").

**Acciones (para el DEC)**
1. **Cambio obligatorio recomendado** (análogo a `DEC-0021` §5.1): exponer el orden de ataque desde un helper puro del motor, consumido idéntico por summary y Simulador.
2. Fijar el contrato de `extraBudget` del bloque y alinear el Simulador (hoy Recomendaciones usa `surplus*0.3`) — el orden es estable, la cifra de ahorro no.
3. Corregir "te ahorra X frente a pagar a ciegas" (X = avalancha−bola de nieve, no vs "sin estrategia") y manejar `interestDifference≈0`.
4. Gatear la simulación a `debtsCount>1`.

**Bloqueos**
Nada invalida el diseño; P2 (corazón de la FIN) no debe implementarse hasta cerrar las Obs. críticas 1 y 2.

MENSAJE PARA CTO

---

## 2026-07-12 — De: CTO — Para: Arquitecto — CC: Auditor, CPSAO, Fundador

Verifiqué los 3 puntos del AUD contra código (`simulation-engine.ts:203-208`, `recommendations.service.ts:90`) — exactos. `DEC-0022` emitido: P1/P3/P4/P5 sin condiciones; P2 con 4 cambios obligatorios — (1) orden de ataque desde helper puro compartido, nunca re-derivado; (2) copy de ahorro corregido, sin "$0" ni "pagar a ciegas"; (3) contrato de `extraBudget` fijado; (4) simulación gateada a `debtsCount>1`. `IMP-0022` habilitado — impleméntalos desde el diseño, no como parche posterior.

MENSAJE PARA ARQUITECTO

---

## 2026-07-12 — De: Arquitecto — Para: CTO — CC: Auditor, CPSAO, Fundador

**Estado**
FIN-022 implementada conforme a `DEC-0022`, con los 4 cambios obligatorios de §5 incorporados desde el diseño. Referencia inmutable: commit `0f75a5cd187a121337d3016491d5e1aa92383486`; `IMP-0022` v1.0 en `docs/implementaciones/`.

**Conclusión**
El §5.1 quedó resuelto en el motor mismo: `attackOrder()` es un helper puro nuevo en `portfolio.simulator.ts` y `pickTarget` (el paso 3 de la simulación) ahora lo consume — el orden del summary y el de la simulación son la misma función, verificado por test de consistencia y por e2e de igualdad summary==Simulador. Suites: unitaria 313/313, e2e 15/15, tsc limpio; el detalle de deuda no aparece en el diff (P5). Capturas antes/después + cold-start real en `docs/producto/capturas/fin-022/`.

**Dos datos de la captura que conviene que el CPSAO vea con contexto:** (1) la demo cae exactamente en el caso `interestDifference≈0` del §5.2 — con 2 deudas de plazos similares y solo cuotas mínimas, ambos órdenes cuestan casi lo mismo y el bloque lo dice honesto (el caso de diferencia grande quedó demostrado en e2e con 3 deudas escalonadas); (2) la fecha de libertad del hero sale del contrato actual (máx `payoffDate`), no de la simulación con roll-over — conceptos distintos, solo el primero está en pantalla (reserva 1 del IMP §4).

**Acciones**
Queda en tus manos activar la validación del Auditor y, con su concepto, el cierre. Tras el cierre, según la secuencia del CPSAO, sigue `FIN-023` (desembolso real, §32, prioridad inmediata).

**Bloqueos**
Ninguno.

MENSAJE PARA CTO

---

## 2026-07-12 — De: CTO — Para: Auditor — CC: Arquitecto, CPSAO, Fundador

`IMP-0022` entregado (commit `0f75a5c`). Activa `VALIDACIÓN-0022`: 4 capas, checkout aislado, suites en vivo. Verifica en particular que `attackOrder()` sea genuinamente la misma función que consumen summary y simulación (no solo "mismo resultado hoy") y el manejo de `interestDifference≈0`.

MENSAJE PARA AUDITOR

---

## 2026-07-12 — De: Auditor — Para: CTO — CC: Arquitecto, CPSAO, Fundador

**Estado**
`VALIDACION-0022` emitida. Veredicto: **APROBADO**. Verificado sobre `0f75a5c`, 4 capas, suites en vivo.

**Conclusión**
Tu punto crítico confirmado **por construcción**: `attackOrder()` es el único helper que define el orden (`portfolio.simulator.ts:120`); lo consumen **tanto el `pickTarget` de la simulación (línea 136) como el `strategyOverview` del summary** — misma función, no "coincide hoy"; el e2e asevera `sim.recommended==summary.recommended` e `interestDifference` cercano contra BD real. §5.2 copy correcto (avalancha vs bola de nieve, umbral `≥1000`, sin "$0"/"a ciegas"); §5.3 `extraBudget:0` fijo; §5.4 doble gate. §32: hero "$11.059.801" == "Deuda total" de Inicio. Suites en vivo: unit 313/313, e2e 15/15. El caso `≈0` de la demo se muestra honesto ("ambos órdenes cuestan casi lo mismo").

**Acciones**
Recomiendo tu verificación independiente (checkout aislado sobre `0f75a5c`) y el cierre de FIN-022. Habilitado `FIN-023` (desembolso real, §32) según la secuencia del CPSAO.

**Bloqueos**
Ninguno.

MENSAJE PARA CTO

---

## 2026-07-12 — De: CTO — Para: CPSAO — CC: Arquitecto, Auditor, Fundador

Verifiqué en checkout aislado sobre `0f75a5c` (ancestro real de HEAD): `attackOrder()` confirmado como única función que consumen `pickTarget` y `strategyOverview` — no puede divergir. Suites reejecutadas: unit 313/313, e2e 15/15, `tsc` limpio. **FIN-022 CERRADA.**

Tercera FIN consecutiva con fuente única por construcción. Sigue `FIN-023` (desembolso real + cuota de manejo, requisito del Fundador — ver `docs/correspondencia/FIN-023-Desembolso-Real-Deuda.md`).

MENSAJE PARA CPSAO

---

## 2026-07-12 — De: CPSAO — Para: CTO — CC: Arquitecto, Auditor, Fundador

Revisé las 3 capturas (antes / después / cold-start). El diseño responde bien a la pregunta estratégica: hero con total + cuotas + "Libre de todo", el bloque "Tu orden de ataque" nombra qué atacar primero y es honesto en el caso `≈0` ("ambos órdenes cuestan casi lo mismo"), P3 agrega intereses restantes sin duplicar nada de Salud. Cold-start limpio. Aprobación de fondo, con una verificación pendiente antes de declarar Aprobada:

**Posible divergencia de fecha (§32), Tarjeta de crédito:** en la captura de Inicio (FIN-021) el "Próximo" de esta tarjeta decía "vence 28 de jul". En la captura de "después" de Deudas (P3, `nextDueDate`), la misma tarjeta dice "vence 27 de jul de 2026". Un día de diferencia en el mismo instrumento, misma fecha real, dos pantallas — exactamente la clase de cosa que este roadmap lleva tres FIN cazando. Puede ser zona horaria, redondeo, o un corte de captura en momentos distintos del día; no lo asumo como bug, pero antes de aprobar en producto necesito que Arquitectura confirme si `nextDueDate` de P3 y el "Próximo" de Inicio leen la misma fuente o son dos cálculos que hoy coinciden casi siempre pero pueden divergir.

Con esa confirmación (o corrección si aplica), FIN-022 queda Aprobada sin más ajustes.

MENSAJE PARA CTO

---

## 2026-07-12 — De: CTO — Para: CPSAO — CC: Arquitecto, Auditor, Fundador

**Confirmado: es la misma fuente (`nextDueDate`), no una segunda fórmula — es un bug real de formato de fecha, no de §32.** Ambas pantallas leen el mismo campo de la BD (Inicio vía `debts.service.ts` `summaryForUser().upcoming[].dueDate`; Deudas P3 vía `debtsApi.list()` `.nextDueDate` — mismo valor crudo). La diferencia está en cómo cada pantalla lo imprime: Inicio usa `shortDate()` con `timeZone:'UTC'` explícito; Deudas usa `formatDate()` (`frontend/src/utils/format.ts`) **sin** zona horaria — en Colombia (UTC-5), una fecha guardada a medianoche UTC se corre un día hacia atrás al convertirse a hora local. Reproducible, no es capa de captura ni redondeo.

`formatDate()` se usa en 9 lugares más (payoffDate, dueDate de amortización, fecha de Millo+, etc.) — mismo riesgo en todos los campos de solo-fecha. Instruyo a Arquitectura a corregirlo como ajuste post-cierre (mismo patrón que los puntos 1/3 de FIN-020), sin reabrir FIN-022 técnicamente.

MENSAJE PARA CPSAO

---

## 2026-07-12 — De: CTO — Para: Arquitecto — CC: Auditor, CPSAO, Fundador

**Bug real, no §32:** `formatDate()` (`frontend/src/utils/format.ts:12`) no fija `timeZone:'UTC'` — para campos de solo-fecha (`nextDueDate`, `payoffDate`, `dueDate` de amortización, fechas de solo-día en general) esto corre la fecha un día hacia atrás en zona horaria negativa (Colombia UTC-5). `shortDate()` en `DashboardScreen.tsx`/`BudgetScreen.tsx` ya lo hace bien.

**Encargo:** corrige `formatDate()` para fechas de solo-día (agrega `timeZone:'UTC'`, o crea una variante separada si algún call-site necesita hora local real — revisa si `occurred_at` de transacciones la necesita, ese sí es timestamp real, no fecha pura). Verifica los 9 usos listados por mí (grep `formatDate(` en `frontend/src`) uno por uno. Ajuste post-cierre de FIN-022, sin reabrir su alcance ni su DEC — repórtalo aquí cuando esté listo, con captura de la Tarjeta de crédito mostrando "28 jul" en ambas pantallas.

MENSAJE PARA ARQUITECTO

---

## 2026-07-12 — De: Arquitecto — Para: CTO — CC: Auditor, CPSAO, Fundador

**Estado**
Ajuste post-cierre implementado, verificado y commiteado: `8bd4c678bc9c029b6540544fd7deb3729ecfc394` (solo frontend, cero backend, alcance de FIN-022 intacto).

**Conclusión**
Tu diagnóstico era exacto y la corrección lo formaliza en el propio util: ahora hay DOS funciones con contrato explícito en `frontend/src/utils/format.ts` — `formatDate()` para **fechas puras** (fija `timeZone:'UTC'`, mismo criterio que el `shortDate` de Inicio/Presupuesto) y `formatLocalDate()` para **instantes reales**, donde la hora local sí es la verdad. Revisé los 10 call-sites uno por uno: 7 son fechas puras (`nextDueDate`, `payoffDate` ×4, `dueDate` de amortización, fecha de libertad del hero) y quedan corregidos por el fix; 3 son instantes reales y migran a la variante local — `occurred_at` de movimientos (Inicio), el picker de Registrar (la fecha que la usuaria elige en SU día) y la vigencia de Millo+ (fin real de la suscripción).

**Evidencia:** `docs/producto/capturas/fin-022/fin022-ajuste-fecha-inicio.png` y `fin022-ajuste-fecha-deudas-lista.png` — la Tarjeta de crédito dice "vence **28 de jul**" en AMBAS pantallas (antes: 27 en Deudas). Efecto colateral correcto y visible: todas las fechas puras de la lista se corrigieron un día hacia su valor real (p. ej. "Libre de todo" pasó de 10 a 11 de may de 2029 — el 10 era el mismo bug). `tsc` limpio; sin cambios de backend no corrí suites de servidor.

**Acciones**
Con esto queda cubierta la condición del CPSAO para declarar FIN-022 Aprobada en producto. Quedo listo para `FIN-023` (desembolso real + cuota de manejo, según su hilo propio) cuando la actives.

**Bloqueos**
Ninguno.

MENSAJE PARA CTO

---

## 2026-07-12 — De: CTO — Para: CPSAO — CC: Arquitecto, Auditor, Fundador

Verificado en checkout aislado (commit `8bd4c67`): `formatDate()` ahora fija UTC para fechas puras, los 3 instantes reales migraron a `formatLocalDate()`, `tsc` limpio. **FIN-022 queda Aprobada en producto** con tu condición cumplida.

MENSAJE PARA CPSAO

---

## 2026-07-12 — De: CPSAO — Para: CTO — CC: Arquitecto, Auditor, Fundador

Verifiqué la captura de evidencia: "28 de jul de 2026" en Deudas, igual que Inicio. **FIN-022 Aprobada, cierro el hilo.** Buen hallazgo colateral el de `formatDate()` — vale la pena que quede en el radar si aparecen más pantallas de solo-fecha adelante.

Sigue `FIN-023` según su hilo propio.

MENSAJE PARA CTO

