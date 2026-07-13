# Asunto: FIN-024 — Mora de fijos y deudas

> Hilo de correspondencia entre CPSAO, CTO, Arquitecto y Auditor sobre este asunto. Cada mensaje nuevo se agrega al final, con fecha, remitente y destinatario — no se edita ni se borra lo anterior. Cada mensaje cierra con una línea `MENSAJE PARA <DESTINATARIO>`.

---

## 2026-07-13 — De: CTO — Para: Arquitecto — CC: Auditor, CPSAO, Fundador

**Estado**
`FIN-024` activada por el CPSAO tras cerrar `FIN-023` (`docs/correspondencia/FIN-023-Desembolso-Real-Deuda.md`): "el dominio de deuda está fresco, este es el momento correcto" — antes de Simulador. Dominio diferido 3 veces (`ARQ-0018` §4.9, `ARQ-0020` §4.1-bis, `FIN-022` P4).

**Acciones**
Antes de `ARQ-0024`: documento de comprensión del problema, mismo patrón que las FIN anteriores — verificado contra código real. Puntos de partida que ya sabemos de los 3 diferimientos previos:
1. `nextDueDate` (fijos y deudas) solo se normaliza al pagar — hoy no hay forma de saber "cuánto lleva vencido" ni distinguir "vencido sin pagar" de "vencido y ya pagado sin registrar".
2. `FIN-022` P4 ya puso una etiqueta neutra ("venció el {fecha}") sin lógica de mora — es el piso, no el techo de esta FIN.
3. `FIN-020` §4.1-bis decidió que un fijo vencido sigue contando como comprometido hasta el cierre del ciclo, "se pague o no" — esa política de `SpendableService` no cambia aquí; mora es sobre INFORMAR al usuario, no sobre recalcular "lo comprometido" (eso ya está resuelto, §32).
4. Revisa si mora debe tocar Score/Salud (¿un indicador de mora?), notificaciones, o si esta primera iteración es solo visibilidad (qué está vencido, hace cuánto) sin motor nuevo — misma disciplina "conectar, no inventar" que usamos en FIN-022 si aplica.

**Bloqueos**
Ninguno. Cumple "un FIN a la vez" (FIN-023 cerrada).

MENSAJE PARA ARQUITECTO

---

## 2026-07-13 — De: Arquitecto — Para: CTO — CC: CPSAO, Auditor, Fundador

**Estado**
`COMPRENSION-FIN024-Mora.md` entregado (`docs/producto/`, commiteado), verificado contra código real. Sin ARQ todavía.

**Conclusión**
Dos cosas estructuran el dominio. **(1) La asimetría:** en deudas la mora ES observable (`nextDueDate` avanza al pagar — FIN-018; fecha en el pasado = cuota sin registrar), en fijos NO (sin `fixedItemId` solo se puede afirmar "ya pasó su fecha"). **(2) Un hallazgo fundacional nuevo:** el cron diario de recordatorios (`reminders.service.ts:158-172`, código de FIN-002 anterior a FIN-018) **avanza `debt.nextDueDate` un mes al llegar el vencimiento, se haya pagado o no** — dos escritores con semánticas opuestas sobre la misma fecha (la clase de conflicto §32), y con el cron activo la mora sería estructuralmente indetectable: la fecha nunca queda en el pasado y el "venció el {fecha}" de FIN-022 P4 casi nunca aparecería. Cualquier diseño de mora empieza por dejar UN solo escritor (FIN-018 como semántica ganadora).

**Acciones**
Cuatro decisiones previas al ARQ, planteadas en la nota de alcance: (1) confirmar la condición previa (un solo escritor de `nextDueDate`) como P1; (2) alcance de fijos: ¿entra la conciliación (`fixedItemId`) o iteración 1 solo deudas + etiqueta neutra en fijos?; (3) Score/Salud: propongo NO tocar (sin cortes auditados de mora — mismo criterio DEC-019 P1), registrar semilla; (4) aviso post-vencimiento: ¿extensión pequeña de recordatorios ("venció ayer", mismo canal y presupuesto 2/día) o iteración 1 solo en pantalla?

**Bloqueos**
Ninguno.

MENSAJE PARA CTO

---

## 2026-07-13 — De: CTO — Para: Arquitecto — CC: Auditor, CPSAO, Fundador

**Estado**
Verifiqué el hallazgo fundacional contra código: real. `reminders.service.ts:158-172` no comprueba pago alguno — solo `remaining <= 0` — antes de escribir `debt.nextDueDate = addOneMonth(...)`. Confirmado: dos escritores con semánticas opuestas sobre el mismo campo, mismo tipo de conflicto que §32 pero sobre una fecha, no un monto.

**Tus 4 puntos:**
1. **Confirmado — P1 del ARQ.** FIN-018 es la semántica ganadora; el recordatorio deja de escribir en `debt.nextDueDate`. Es la corrección más urgente de esta FIN: sin ella, la mora no es una feature incompleta, es indetectable.
2. **Decidido — iteración 1 = solo deudas.** Fijos se quedan con "ya pasó su fecha" (ya en producción desde FIN-020). La conciliación (`fixedItemId`) sigue como mejora futura registrada, no entra aquí — abrirla ahora mezclaría dos proyectos (mora + conciliación) en una FIN que ya carga una corrección de escritor.
3. **Confirmado.** Sin cortes auditados, no se toca Score/Salud — mismo criterio de `DEC-0019` P1. Regístralo como semilla en el ARQ.
4. **Escalo al CPSAO** (mensaje aparte) — es una decisión de tono/producto (proactividad vs. solo pantalla), no técnica.

**Acciones**
Inicia `ARQ-0024` con: P1 (escritor único) + P2 (visibilidad/conciliación solo deudas, CTA doble) + P3 (sin Score/Salud, semilla registrada). P4 queda pendiente de la respuesta del CPSAO — si aprueba la notificación, inclúyela como pieza adicional del mismo ARQ; si no llega a tiempo, el ARQ puede presentarla como alternativa sin decidirla, igual que hiciste con la meta del fondo de emergencia en FIN-021.

**Bloqueos**
Ninguno para iniciar. P4 depende del CPSAO.

MENSAJE PARA ARQUITECTO

---

## 2026-07-13 — De: CTO — Para: CPSAO — CC: Arquitecto, Auditor, Fundador

**Estado**
`COMPRENSION-FIN024-Mora.md` evaluado. Encontramos un bug fundacional real (no de esta FIN, preexistente desde FIN-002): el cron de recordatorios avanzaba la fecha de vencimiento de una deuda se pagara o no, silenciando la mora estructuralmente. Ya instruí su corrección como P1 del ARQ.

**Tu decisión — aviso post-vencimiento:**
¿Un recordatorio "venció ayer/hace N días" (reutilizando el canal y el presupuesto de 2/día que ya existen), o la primera iteración se queda solo en pantalla (el usuario lo ve al abrir la app, sin notificación proactiva)?

Contexto para tu decisión: `PRODUCT_VISION.md` §7 fija a Milla como "calmada, no ansiosa — no genera urgencia artificial". Un aviso de mora es información real (no urgencia fabricada), pero es el tipo de mensaje que más fácil se siente como regaño si el copy no cuida el tono ("el rojo no culpa", §29.2, ya aplicado en FIN-020).

**Acciones**
Tu respuesta en este hilo habilita el alcance final antes del `DEC-0024`.

**Bloqueos**
Ninguno técnico.

MENSAJE PARA CPSAO

---

## 2026-07-13 — De: CPSAO — Para: CTO — CC: Arquitecto, Auditor, Fundador

**P4: solo pantalla en esta iteración, sin notificación proactiva todavía.** No es información fabricada, pero mora es justo el tipo de mensaje donde el tono se puede leer como regaño si no lo hemos probado antes en un canal que interrumpe (push/WhatsApp) — pantalla es pasiva, la usuaria decide cuándo mirarlo; notificación empuja. Prefiero validar primero cómo se siente "venció el {fecha}" (ya en producción desde FIN-022 P4) antes de gastar presupuesto de notificación (2/día, compartido con otros avisos) en algo que si el copy falla, sí se siente a regaño y ahí sí pega directo a Confianza.

**No lo dejo en el limbo:** en cuanto esta FIN cierre y tengamos un ciclo de uso real, quiero que quede agendado el fast-follow de la notificación — con copy revisado bajo §29.2 ("el rojo no culpa") — no como "mejora futura" genérica sino con punto en el roadmap, mismo trato que le exigí a mora tres veces.

Adelante con `ARQ-0024` (P1+P2+P3, P4 fuera de alcance por ahora).

MENSAJE PARA CTO

---

## 2026-07-13 — De: CTO — Para: Arquitecto — CC: Auditor, CPSAO, Fundador

CPSAO confirmó: P4 fuera de alcance de `FIN-024` (pantalla pasiva primero). Registrado como fast-follow explícito en `FIN-025` — no lo incluyas en el `ARQ-0024`. Continúa con P1+P2+P3 tal como quedó instruido.

MENSAJE PARA ARQUITECTO

---

## 2026-07-13 — De: Arquitecto — Para: Auditor — CC: CTO, CPSAO, Fundador

**Estado**
`ARQ-0024` v1.0 emitido (`docs/arquitectura/ARQ-0024-Mora.md`, commiteado) — para tu `AUD-0024`. Alcance conforme al hilo: P1+P2+P3; P4 fuera (decisión CPSAO, fast-follow agendado).

**Conclusión**
P1 (Alt A recomendada): el recordatorio de deuda deja de escribir en `debt.nextDueDate` Y pasa a evaluar su disparo contra la fecha REAL de la deuda (el join ya la carga) — un solo dato de vencimiento en todo el sistema, que además corrige de paso el bug latente inverso (nada sincroniza el recordatorio cuando un pago adelanta la fecha: hoy puede avisar de una cuota ya cubierta). Alternativa B (sincronizar dos copias) rechazada por reintroducir la dualidad. P2 (Alt A): util puro `overdueDays` con fechas puras UTC (la lección del ajuste de FIN-022), expuesto en list/summary; UI = etiqueta con dato en la tarjeta + bloque de conciliación en el detalle con CTA doble, copy que afirma solo lo observable ("no está registrada", jamás "no pagaste"). Declarados: sin interés de mora estimado (no inventamos números), el recordatorio impago calla tras vencer (lo cubre P4), y el riesgo de mora retroactiva grande al corregir P1 (el copy de conciliación es la mitigación).

**Puntos que pido verificar en tu AUD:** (1) que ningún OTRO punto del sistema escriba o lea `reminder.dueDate` de deuda como autoritativo (mi grep vio solo `ensureDebtReminder` y el dispatch, confírmalo); (2) el comportamiento de `shouldFireToday` con fecha vencida bajo Alt A (offsets 3/1/0 → no re-dispara: es el esperado, pero valida que no haya loop ni spam con `lastSentAt`); (3) la frontera P2: que exponer `overdueDays` en el summary no toque el contrato que consume Inicio de forma que rompa algo cerrado.

**Bloqueos**
Ninguno. No implemento nada hasta el DEC.

MENSAJE PARA AUDITOR

---

## 2026-07-13 — De: Arquitecto — Para: Auditor — CC: CTO, CPSAO, Fundador

**Nota de alineación (se cruzó con mi emisión):** la instrucción del CTO de no incluir la notificación en el ARQ llegó mientras redactaba la v1.0, que la mencionaba como subsección "fuera de alcance". `ARQ-0024` **v1.1** (commit `HEAD`) la retira por completo: la notificación post-vencimiento vive solo en `FIN-025` y aquí queda únicamente como referencia en Alcance/Riesgos. Nada más cambió — audita sobre v1.1. Los 3 puntos de verificación que te pedí siguen vigentes.

**Bloqueos:** ninguno.

MENSAJE PARA AUDITOR

---

## 2026-07-13 — De: Auditor — Para: CTO — CC: Arquitecto, CPSAO, Fundador

**Estado**
`AUD-0024` emitido (sobre `ARQ-0024` v1.1). Veredicto: **APROBADO CON OBSERVACIONES**. Verificado contra `HEAD`.

**Conclusión**
Los 3 puntos del Arquitecto se sostienen: **(1)** nadie fuera de `reminders` lee `reminder.dueDate` como autoritativo → Alt A segura; **(2)** `shouldFireToday` no re-dispara con fecha vencida (`daysUntil` negativo ∉ [3,1,0]) — silencio declarado, sin spam; **(3)** `overdueDays` es aditivo (Inicio no lo consume). Doble escritor confirmado real (`reminders.service.ts:170` avanza `nextDueDate` sin comprobar pago, contra FIN-018). P1 es el fix §32 correcto sobre una fecha; frontera respetada (SpendableService/Score/Salud intactos).

**Acciones (para el DEC/IMP)**
1. **Observación clave para el IMP:** eliminar **ambas** escrituras (`debt.nextDueDate` :170 **y** `reminder.dueDate` :164) para recordatorios con `debtId` — si solo se quita la primera, `reminder.dueDate` reintroduce la dualidad.
2. IMP: confirmar que el cron carga `debt.nextDueDate` (Alt A evalúa contra ella) y acotar el cambio a `debtId != null` (no tocar recordatorios manuales).
3. RC: mirar el impacto retroactivo de la primera aparición de mora (números grandes) — es la verdad, mitigada por el copy de conciliación.

**Bloqueos**
Nada de diseño bloquea el DEC.

MENSAJE PARA CTO

---

## 2026-07-13 — De: CTO — Para: Arquitecto — CC: Auditor, CPSAO, Fundador

Verifiqué la semántica FIN-018 (`debt-prepayment.service.ts:110`) y confirmé por grep que ningún módulo lee `reminder.dueDate` como autoritativo — exactos. `DEC-0024` emitido: P1/P2/P3 aprobados. **Cambio obligatorio principal:** elimina **ambas** escrituras de fecha (`debt.nextDueDate` y `reminder.dueDate`) para recordatorios con `debtId`, no solo la primera — si dejas la segunda viva, la dualidad renace por la puerta de atrás. `IMP-0024` habilitado.

MENSAJE PARA ARQUITECTO

---
