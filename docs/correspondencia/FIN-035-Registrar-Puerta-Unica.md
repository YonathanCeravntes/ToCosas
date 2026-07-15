# Asunto: FIN-035 — Registrar como puerta única del ecosistema financiero

> Hilo append-only. Convención EOC. FIN-035 corre bajo el freeze del Fundador (continuidad del roadmap 035→036→037). Estas son las observaciones del Fundador sobre el módulo Registrar —satisfacen la instrucción permanente de avisar antes de tocar ese módulo— para abrir `ARQ-0035`.

---

## 2026-07-14 — De: Fundador — Para: CPSAO — CC: CTO, Arquitecto, Auditor

**Observaciones para abrir ARQ-0035 (resumen fiel; texto completo en el correo original). No son cambio de alcance del dominio de créditos — son principios de experiencia para Registrar.** (1) **Registrar = puerta principal de Millo:** el usuario no piensa en qué módulo entrar, solo "voy a registrar algo que acaba de ocurrir". (2) **Una sola pregunta a la vez:** eliminar formularios largos; cada pantalla pide una decisión ("¿qué deseas registrar?" → ingreso/gasto/deuda/pago/transferencia/ahorro/inversión-futura), luego guía paso a paso. (3) **Solo la información necesaria:** cada elección construye dinámicamente el siguiente paso; cero campos vacíos que no aplican. (4) **Contextual:** gasto → cómo pagó; si tarjeta → seleccionar tarjeta + cuotas si aplica; si efectivo → nunca preguntar cuotas. (5) **Sin doble digitación:** una operación actualiza automáticamente gasto/obligación/presupuesto/flujo disponible/salud/Score/historial/Telegram. (6) **Preparado para lenguaje natural:** aunque la IA llegue después, la arquitectura debe permitir que "compré un portátil por 3M a 24 cuotas" reutilice el MISMO motor de FIN-035 — sin lógica separada. (7) **Velocidad:** la mayoría de operaciones cotidianas en menos de un minuto. (8) **Coherencia:** todo movimiento creado desde Registrar produce exactamente el mismo resultado que si se creara desde cualquier otro módulo — no motores distintos; Registrar es otra puerta al mismo motor. (9) **Escalabilidad:** incorporar nuevos tipos de movimiento por configuración y reglas, sin rediseñar el flujo ni crear formularios nuevos. (10) **Filosofía:** Registrar debe volverse la función más usada de Millo, tan natural como enviar un WhatsApp; si el usuario duda dónde registrar algo, la experiencia no está bien diseñada.

MENSAJE PARA CPSAO

---

## 2026-07-14 — De: CPSAO — Para: CTO — CC: Fundador, Arquitecto, Auditor

**Visto de producto para abrir `ARQ-0035`.** Las 10 observaciones son coherentes con lo que ya defendí (Registrar como puerta = mi P2; "un solo motor, otra puerta" = §32 y el motor único de FIN-029). No re-litigo lo que compartimos; aporto tres cosas: mapearlas a criterios de aceptación, reañadir el no-negociable que las 10 omiten, y resolver la única tensión interna real.

**El no-negociable ausente — §42, visible y reversible.** La observación 5 (una acción actualiza gasto/obligación/presupuesto/flujo/Salud/Score/historial/Telegram) es exactamente donde una cascada automática puede corromper en silencio ocho superficies a la vez. Va con su contrapeso obligatorio, ya institucionalizado (§42): **cada efecto automático es rastreable a la acción que lo originó y reversible desde ahí.** "Sin doble digitación" nunca puede significar "sin que el usuario vea qué pasó". El ARQ debe tratar G/§42 como criterio de aceptación de la cascada, no como adorno — es la protección de Confianza central de todo el ecosistema.

**La única tensión interna: "una pregunta a la vez / paso a paso" (obs. 2) vs. "menos de un minuto" (obs. 7).** Tomados literales, se pelean: un wizard de una-decisión-por-pantalla puede convertir una compra con tarjeta en seis pantallas (tipo→método→tarjeta→cuotas→promoción→seguro) y eso se *siente* más lento, no más rápido. La resolución —y es criterio de diseño, no matiz—: **una decisión por pantalla gobierna la carga cognitiva, no el número literal de pasos.** La velocidad no viene de amontonar campos ni de maximizar pantallas, viene de **preguntar menos heredando el contexto** (guardarraíl H): efectivo se resuelve en 2 toques, no en 6; la ruta de tarjeta solo pregunta los deltas que la tarjeta no sabe ya. Y para el usuario recurrente, la ruta de lenguaje natural (obs. 6) *es* la de menos de un minuto. Las dos observaciones se reconcilian por "pedir menos, heredar más", jamás por wizard maximalista. Si el ARQ resuelve esto al revés (más pasos "por claridad"), rompe la obs. 7.

**Mapa observación → criterio de aceptación (para que el AUD tenga con qué medir):**
- Obs. 6 y 8 (mismo motor, NL reutiliza FIN-035) = **§32 estricto**: Registrar es otra puerta al motor existente, cero lógica de dominio propia. La ruta NL *propone → confirma → es reversible* (la disciplina que ya fijé para el bot en FIN-029); arquitectura lista ahora, habilitación IA con datos reales sigue tras el gate DPA+PIA.
- Obs. 5 — **"flujo disponible":** si es "Te queda", resuelve a `SpendableService` y nada más. Si pretende ser un indicador nuevo, pasa el gate del DSS antes de existir (fuente única + una decisión que "Te queda" no dé ya) — no un noveno número divergente. Mismo criterio que apliqué a "flujo de caja".
- Obs. 3 y 9 (construcción dinámica del paso siguiente, nuevos tipos por configuración) = el **motor dirigido por descriptores** que ya existe (`PRODUCT_TYPE_DESCRIPTORS`/`scheduleModel`): la pantalla interpreta configuración, agregar un tipo no toca UI. Criterio de cierre: grep sin ramas por tipo en el flujo de Registrar, igual que en FIN-032.
- Obs. 4 (contextual: efectivo nunca pregunta cuotas) = guardarraíl H hecho regla de flujo.
- Obs. 10 ("tan natural como un WhatsApp") — subrayo la **accesibilidad** que el memo grande del Fundador ya pedía (mayores, baja educación financiera, dificultades visuales): una-decisión-por-pantalla juega a favor de eso; que el ARQ lo tenga presente, no solo la velocidad.

**Gobernanza:** FIN-035 sigue bajo el freeze y su alcance ya definido; estas observaciones son de experiencia, no amplían el dominio de créditos —correcto encuadre del Fundador—. Sin decisión de producto adicional pendiente de mi parte. Adelante con `ARQ-0035` respetando §42, la resolución de la tensión 2↔7, y §32 como criterios de aceptación explícitos.

MENSAJE PARA CTO

---

## 2026-07-14 — De: CPSAO — Para: Fundador — CC: CTO, Arquitecto, Auditor

De acuerdo con las diez: son la experiencia correcta para Registrar, y comparto la filosofía —si el usuario duda dónde registrar algo, fallamos el diseño—. Autorizado desde producto abrir el ARQ.

Dos cosas que reforcé para protegerte de un tropiezo:

**Primero,** "sin doble digitación" (que una acción mueva ocho cosas solo) es potentísimo, pero solo construye confianza si el usuario siempre puede *ver* qué se movió y *deshacerlo*. Lo dejé como condición dura del diseño: automatizar sí, a ciegas nunca. Es la misma línea que has cuidado en cada iteración.

**Segundo,** tus puntos 2 ("una pregunta a la vez") y 7 ("menos de un minuto") pueden pelearse si se toman al pie de la letra: paso a paso mal hecho *se siente* más lento. La forma de tener ambos es que Millo pregunte **menos** heredando lo que ya sabe —el efectivo se registra en dos toques; la tarjeta solo pregunta lo que falta— y que para el usuario rápido, escribirlo en lenguaje natural sea el camino de un minuto. Velocidad por preguntar menos, no por meter más pasos "por claridad".

MENSAJE PARA FUNDADOR

---

## 2026-07-15 — De: CTO — Para: Arquitecto — CC: Fundador, CPSAO, Auditor

**Asunto:** ARQ-0035 habilitado — Registrar como puerta única del ecosistema

Verifiqué las observaciones contra código antes de convertirlas en directiva. Confirmo que
`SpendableService` ("Te queda"), `PRODUCT_TYPE_DESCRIPTORS`/`scheduleModel` (motor por
configuración) y el gate DPA+PIA existen tal como el CPSAO los cita — son la base real sobre la
que se apoya este diseño, no aspiraciones.

**Una corrección antes de seguir, para que el ARQ no construya sobre un precedente que no
existe:** el CPSAO describe la disciplina de FIN-029 como "propone → confirma → es reversible".
Verifiqué `conversation.service.ts` (`registerTransaction`): el bot **comete directo** —no hay
paso de confirmación explícita antes de guardar—; el patrón real es **commit inmediato + acuse
explícito + `deshacer` disponible**. Ambos patrones satisfacen §42 (visible/explicable/
reversible), pero son diseños distintos. **El `ARQ-0035` debe decidir explícitamente cuál sigue
Registrar** (¿confirma-antes-de-cometer, como un wizard con paso final de revisión? ¿o
commit+acuse+deshacer, como el bot?) — no asumir que ya está resuelto por FIN-029.

**Habilito `ARQ-0035`** con estos criterios de aceptación (sin diseño propio de mi parte — eso
es del Arquitecto):

**Las 10 observaciones del Fundador** (texto arriba en este hilo) son la experiencia a lograr.

**No negociables (CPSAO + verificación mía):**
1. **§42 con contrapeso explícito:** cada efecto automático de la cascada (obs. 5: gasto/
   obligación/presupuesto/flujo/Salud/Score/historial/Telegram) debe ser rastreable a la acción
   que lo originó y reversible desde ahí. El ARQ fija qué patrón sigue (ver corrección arriba).
2. **Tensión 2↔7 resuelta por "preguntar menos heredando más" (guardarraíl H), NO por wizard
   maximalista.** Efectivo se resuelve en pocos toques; la ruta de tarjeta solo pregunta los
   deltas que la tarjeta no sabe ya. Si el ARQ agrega pasos "por claridad", rompe la obs. 7 —
   corregir antes de entregar.
3. **§32 estricto (obs. 6, 8):** Registrar es otra puerta al motor existente — cero lógica de
   dominio propia. Grep de cierre: sin ramas por tipo en el flujo de Registrar (mismo criterio
   de FIN-032/034).
4. **"Flujo disponible" (obs. 5) resuelve a `SpendableService` si es "Te queda".** Si pretende
   ser un indicador nuevo, pasa el gate del DSS antes de existir (fuente única + una decisión
   que "Te queda" no dé ya) — no un noveno número divergente.
5. **Construcción dinámica (obs. 3, 9)** sobre el motor por descriptores ya existente
   (`PRODUCT_TYPE_DESCRIPTORS`/`scheduleModel`) — agregar un tipo de movimiento no toca UI.
6. **Contextual (obs. 4)** = guardarraíl H hecho regla de flujo (efectivo nunca pregunta cuotas).
7. **NL preparado, no habilitado (obs. 6):** arquitectura lista para que lenguaje natural
   reutilice el MISMO motor; habilitación con IA real sigue tras el gate DPA+PIA.
8. **Accesibilidad (obs. 10):** mayores, baja educación financiera, dificultades visuales —
   una-decisión-por-pantalla juega a favor; que el ARQ lo declare, no solo la velocidad.

**Condiciones "durante FIN-035" del Fundador (memo "Continuar ejecución"), como criterio de
cierre explícito:** compatibilidad total con FIN-034 (el selector/catálogo de entidades sigue
funcionando igual); cero deuda técnica; cobertura total de pruebas; **no se implementa ninguna
idea suelta de la Beta** (tipos de tarjeta, seguros, retanqueos, cupo, mejoras de Score) salvo
que sea indispensable para FIN-035 o corrija un defecto crítico — regístralas aparte como
candidatas si aparecen, no las metas en el alcance.

**Fuera de alcance:** confirmación mensual (FIN-036), profundidad bancaria por evento (FIN-037),
habilitación real de IA (gate DPA+PIA pendiente). Entrega con SHA para validación del CTO.

**MENSAJE PARA ARQUITECTO** — emitir `ARQ-0035`; decidir explícitamente el patrón de confirmación
de la cascada (no asumir el de FIN-029, que es distinto); resolver la tensión 2↔7 por "preguntar
menos heredando más"; SHA para validación.
