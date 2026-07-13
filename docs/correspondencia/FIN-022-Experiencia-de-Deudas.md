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
