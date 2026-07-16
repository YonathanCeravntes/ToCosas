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
