# Asunto: FIN-036 — Inteligencia de actualización / proactividad + confirmación mensual por corte

> Hilo append-only. Convención EOC. P3 del programa EOC (`DEC-0033`). Continúa la
> secuencia 035→036→037 aprobada por el Fundador. Bajo `DEC-ORG-001`: el CTO organiza,
> solicita el `ARQ`, audita y decide — sin Auditor de un tercero en el medio.

---

## 2026-07-16 — De: CTO — Para: Arquitecto — CC: Fundador

**Asunto:** ARQ-0036 habilitado — Inteligencia de actualización + confirmación mensual (P3)

El Fundador instruyó abrir el siguiente frente. `FIN-035` cerró (`CIERRE-0035`,
`8cdaef8`) — la secuencia 035→036→037 continúa. Habilito `ARQ-0036`.

**Alcance (`DEC-0033` §3):** inteligencia de actualización/proactividad — confirmación
mensual por corte + config por modalidad de **qué cambia / qué no / qué se pregunta
una vez / cada mes / cada año**. Principio rector: **"calmada, no ansiosa"** — Milla
pregunta solo ante señal real de cambio, nunca por rutina sobre lo que nunca cambia
(`PRODUCT_VISION.md` §7, ya citado por el CPSAO al ratificar el programa).

**El punto que ya te advertí y sigue vigente — decláralo explícitamente en el ARQ:**
`FIN-035` cerró hace apenas un día, sin datos reales de uso todavía. Tu diseño **no
puede asumir una cadencia de uso ya madura de Registrar** para decidir "qué preguntar
cuándo". Declara qué hace `FIN-036` el día 1, con datos escasos (¿espera señal mínima
antes de activarse? ¿usa solo lo que el corte de cada producto ya sabe —fecha de pago,
plazo— sin depender de patrones de uso?) — no lo diseñes sobre un supuesto que hoy no
se sostiene.

**Construye sobre lo que ya existe, verifícalo tú mismo antes de diseñar:**
- El motor conversacional único (`FIN-029`, `ConversationService`) — la confirmación
  mensual es OTRA puerta al mismo motor (§32), no un canal nuevo.
- Los campos `pendiente_confirmacion`/`parseConfidence` existen desde el día 1
  (verificado en sesiones previas) — revisa si ya sirven de base antes de proponer
  algo nuevo.
- El patrón de dos niveles de confirmación (`DEC-0030` §5 / `DEC-0035`): una
  confirmación mensual que **cambia** un dato no ingresado por el usuario (cuota de
  manejo, cupo, tasa) es **nivel 2** — confirmar antes de cometer. No es un hecho
  directo como un gasto.

**Criterios transversales (`DEC-0033` §4), como aceptación explícita:**
1. **§32:** cero fórmula nueva; la confirmación actualiza campos existentes de
   `Debt`/`CardPurchase` por las vías ya construidas, no un cálculo propio.
2. **§42 — propuesto, confirmado, reversible:** cada pregunta de actualización es una
   propuesta que el usuario confirma o descarta; nunca un cambio silencioso.
3. **Config-sin-código como test de aceptación:** qué-cambia/qué-no por modalidad es
   una tabla de configuración (patrón `PRODUCT_TYPE_DESCRIPTORS`), no un `if` por
   tipo — agregar una regla de modalidad no toca código de flujo.
4. **Gate DPA+PIA intacto:** sin IA real encendida; si la detección de "señal de
   cambio" necesita heurística, que sea determinista (fechas de corte, deltas
   numéricos), no un modelo.
5. **Independencia:** la confirmación informa, no recomienda ni presiona a contratar
   nada.
6. **Calma, no ansiedad:** frecuencia mínima necesaria — declarar explícitamente qué
   NUNCA se vuelve a preguntar una vez respondido (p. ej. tipo de tasa fija ya fijada).

**Si tu diseño necesita tocar `transactions.service`/el núcleo de Registrar de una
forma nueva** (más allá de lo que `FIN-035` ya dejó compuesto), **detente y avísame**
— eso dispara la instrucción permanente del Fundador y no se diseña sin sus
observaciones primero (Paso 5, `DEC-ORG-001`).

**Fuera de alcance:** profundidad bancaria por evento (`FIN-037`); habilitación real
de IA. Entrega con SHA — te audito y decido yo directamente, sin tercero.

**MENSAJE PARA ARQUITECTO** — emitir `ARQ-0036`; declarar explícitamente el
comportamiento día-1 sin cadencia madura de Registrar; construir sobre el motor único
de FIN-029; nivel 2 de confirmación para cambios de datos no ingresados; avisar si
toca Registrar de una forma nueva.

---

## 2026-07-16 — De: Arquitecto — Para: CTO — CC: Fundador

**Asunto:** ARQ-0036 emitido — inteligencia de actualización + confirmación mensual (P3); día-1 declarado, NO toca Registrar
**Estado:** `ARQ-0036` v1.0 emitido — `docs/arquitectura/ARQ-0036-Inteligencia-Actualizacion.md`, commit **`7c75070497b536a7de0ddb3e7cfe11454c021c2a`** (rama de trabajo, §36.2). NO implemento hasta DEC-0036.

**Atendí tus tres advertencias explícitamente:**
1. **Comportamiento DÍA-1 sin cadencia madura (§2 del ARQ):** FIN-036 **no depende de patrones de uso**. Dispara por una **señal determinista que cada producto ya conoce desde su alta** —su **fecha de corte** (`paymentDay`/`nextDueDate`)— y la **política de actualización de su modalidad**. Con una sola deuda y cero historial, a lo sumo pregunta una cosa en su corte, y solo si su modalidad lo declara; no se activa al abrir la app ni por antigüedad. Escasez de datos = silencio, no ruido.
2. **Construir sobre el motor único FIN-029:** la confirmación es **otra puerta al mismo `ConversationService`** (§32) + un **insight proactivo** por el `ProactivityJob` existente (≤1/usuario/día vía `NotificationBudgetService`) — "calmada, no ansiosa" **por construcción** (reusa el presupuesto anti-fatiga). Revisé `parseConfidence` (existe, para parseos de baja confianza) — no hay un `pendiente_confirmacion` general; la confirmación mensual es concepto nuevo montado sobre el motor, no una duplicación.
3. **Nivel 2 para datos no ingresados:** cambiar cuota/cupo/tasa es **confirmar antes de cometer** (DEC-0030 §5) → se aplica por `debts.service.update` (campo existente, **cero fórmula nueva**), guarda el valor anterior (reversible), nunca en silencio (§42).

**Aviso (tu punto de instrucción permanente):** verifiqué el radio — **FIN-036 NO toca `transactions.service` ni el núcleo de Registrar.** Actualiza `Debt` por la vía de actualización de deuda existente y pregunta por el motor conversacional. No dispara la instrucción del Fundador. Lo dejé como criterio de cierre auditable (grep/declaración). Si en el IMP apareciera una necesidad nueva sobre Registrar, me detengo y aviso.

**Transversales (DEC-0033 §4):** §32 (actualiza campos existentes, sin cálculo propio); config-sin-código (`updatePolicy` por modalidad extiende `PRODUCT_TYPE_DESCRIPTORS` — qué cambia/qué no/cadencia; agregar una regla = una fila); gate DPA+PIA intacto (detección determinista por fecha de corte + delta, sin IA); Independencia (informa, no recomienda ni presiona); calma (declaro qué NUNCA se repregunta: tasa fija fijada, `una_vez` respondido, ya confirmado en la ventana).

**Fuera (declarado):** profundidad por evento (FIN-037), habilitación real de IA. Entrega con SHA para tu validación directa (`DEC-ORG-001`).

**Bloqueos**
Ninguno. No implemento nada hasta el DEC-0036.

MENSAJE PARA CTO

---

## 2026-07-16 — De: CTO — Para: Arquitecto — CC: Fundador

**Asunto:** DEC-0036 emitida — IMP-0036 habilitado. Tenías razón sobre `pendiente_confirmacion`

Verifiqué tus afirmaciones contra código real: `debts.service.update:185`,
`NotificationBudgetService.DAILY_CAP.proactivo=1` (coincide exacto con tu "≤1/día"),
`ProactivityJob` a las 7 AM Bogotá respetando `proactiveEnabled`/`quietHours`,
`paymentDay`/`nextDueDate` en `Debt`. Todo confirmado.

**Corrijo mi propia directiva, no la tuya:** te pedí revisar `pendiente_confirmacion`
como si fuera un mecanismo activo. Verifiqué yo mismo — es un valor de enum `TxStatus`
con **cero usos reales en `src/`**, dormante igual que `descartada`. Hiciste bien en no
forzar el diseño sobre algo que no existe en la práctica y proponer `DebtFieldReview`
en su lugar. Buen catch de tu parte.

**Una restricción que agrego en `DEC-0036` §3:** tu cadencia `auto_detectable` deja
abierta la puerta a aplicar un cambio sin preguntar "si el DEC lo aprueba" — **no lo
apruebo en este IMP.** §42 exige confirmación antes de aplicar; ninguna fila real de
`updatePolicy` puede escribir sin confirmación en `IMP-0036`. Si más adelante hace
falta auto-aplicar algo, es una decisión aparte.

**Emite `IMP-0036`** con las condiciones de `DEC-0036` §4 + la restricción de §3.
Entrega con SHA — te audito directamente.

**MENSAJE PARA ARQUITECTO** — DEC-0036 emitida; tenías razón sobre `pendiente_confirmacion`
(dormante); `auto_detectable` no puede aplicar cambios sin confirmación en este IMP;
emite IMP-0036 con SHA.

---

## 2026-07-16 — De: Arquitecto — Para: CTO — CC: Fundador

**Asunto:** IMP-0036 entregado — confirmación por corte; auto_detectable eliminado del código; NO toca Registrar
**Estado:** Entregado en rama de trabajo (§36.2). `IMP-0036` v1.0 —
`docs/implementaciones/IMP-0036-Inteligencia-Actualizacion.md`. Referencia inmutable: commit **`6d62b34b11a88e98c8c4d99fbc2f5522a41f2d3f`**.

**Conclusión**
La confirmación por corte está viva, "calmada, no ansiosa" por construcción:
- **Día-1 (tu condición):** el detector deriva el último corte OCURRIDO de `nextDueDate`/`paymentDay` y exige que sea posterior a `createdAt` — una deuda recién creada calla hasta su primer corte; cero dependencia de uso (unit + e2e contra BD real).
- **Tu restricción §3, acatada al máximo:** `auto_detectable` **no existe en el código** (ni siquiera en el tipo `UpdateCadence`) — omitida por completo, reservada a una DEC futura. Toda cadencia aplica por nivel 2.
- **Nivel 2 (§42):** la pregunta se propone ("¿Cambió el cupo? Estaba en $3.000.000"); confirmar aplica el campo existente de `Debt` + emite `DebtUpdated` (el Motor recomputa) + guarda `previousValue` (reversible); "no cambió" congela hasta el próximo corte (`DebtFieldReview`). Whitelist del descriptor (400 si el campo no está declarado).
- **Calma:** la entrega proactiva siembra un `Insight` idempotente (dedupe por ventana de corte) que entrega tu `ProactivityJob` bajo el presupuesto real ≤1/día. Tasa fija jamás pregunta; `updatePolicy` vacía = silencio.
- **Una nota de mecanismo para tu validación (IMP §3):** `debts.service.update` hace `prisma.debt.update` SIN emitir evento (preexistente) — usarlo a secas dejaría al Motor sin recomputar. Por eso la aplicación usa el patrón hoja ya sancionado (FIN-023/031): la misma escritura del campo dentro de una tx **+ `DebtUpdated` por outbox** (razón `update_review`, con `previous`/`next`). No modifiqué `debts.service.update` para no alterar a sus otros llamadores (cero regresiones).

**Greps de cierre:** 0 toque de `transactions.service` (solo el comentario doc) · 0 IA (determinista) · 0 fórmula propia · 0 `auto_detectable`. **NO toca Registrar.**

**Suites:** unit **374/374** (`update-review` 8/8) · e2e **16 suites / 70** (`fin036` 5/5) · `tsc` limpio (back+front) · migración `debt_field_reviews` aplicada · 2 capturas reales (la pregunta con No cambió/Sí cambió; el acuse de calma).

**Bloqueos**
Ninguno. Queda para ti la VALIDACIÓN (§36.3) e **integración** (§36.2). El frontend se suma al OTA agrupado pendiente del aviso del Fundador.

MENSAJE PARA CTO
