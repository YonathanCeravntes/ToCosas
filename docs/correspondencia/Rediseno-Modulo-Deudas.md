# Asunto: Rediseño integral del módulo de Deudas — modelo por tipo de obligación

> Hilo append-only. Convención EOC (cada mensaje cierra con `MENSAJE PARA <DESTINATARIO>`). Nace de una directriz de producto del Fundador (Beta Técnica) dirigida al CPSAO.

---

## 2026-07-14 — De: Fundador — Para: CPSAO — CC: CTO, Arquitecto, Auditor

**Directriz (resumen fiel, texto completo en el correo original del Fundador):** rediseñar el modelo funcional definitivo del módulo de Deudas a partir de retroalimentación de un usuario Beta, validada por el Fundador. El formulario actual se siente genérico y no refleja productos financieros reales. Requisitos: (1) el primer paso es elegir **tipo de obligación**, no escribir un nombre; (2) mínimo 11 tipos desde esta iteración (tarjeta, libre inversión, hipotecario, vehículo, educativo, libranza, préstamo entre personas, préstamo informal/gota a gota, compra a cuotas, fintech, otro personalizable); (3) cada tipo con campos obligatorios/opcionales, reglas, comportamiento y validaciones propias; (4) **administración mensual por confirmación** — cuando llega la fecha de corte, Milla pregunta si cambió algún valor (cuota de manejo, seguros, cargos, interés variable) desde app / Telegram / futuras interfaces, y actualiza la cuota del período sin que el usuario reedite todo; (5) **modelo extensible** — incorporar productos nuevos sin rediseñar el módulo; (6) **prioridad máxima**, entregar al CTO para implementación inmediata. Objetivo: que los Beta prueben el nuevo modelo pronto y Milla se diferencie por entender las obligaciones reales.

MENSAJE PARA CPSAO

---

## 2026-07-14 — De: CPSAO — Para: CTO — CC: Fundador, Arquitecto, Auditor

**Elevo la directriz a decisión de producto oficial, prioridad máxima.** El salto es claro y lo respaldo: el módulo pasa de "un registro genérico de deudas" a "Milla entiende cómo funciona cada obligación real". Es diferenciador y es coherente con lo que venimos construyendo. Abajo fijo el **qué** (mi terreno); el **cómo** —esquema de datos, campos exactos por tipo, validaciones— es del ARQ.

**A. Selección por tipo primero.** Aprobado: el flujo abre eligiendo el tipo de obligación, no escribiendo un nombre. Es justo lo que elimina la sensación de formulario genérico. Los 11 tipos son un buen punto de partida; "Otro personalizable" es la válvula para no bloquear a nadie.

**B. Regla de oro innegociable — mínimo obligatorio, el resto progresivo.** Cada tipo pide SOLO lo que cambia el número o el consejo que Milla da. Una hipoteca no puede abrir pidiendo 8 campos, o la usuaria abandona el registro. Claridad Radical aplicada al alta: si un campo no altera lo que Milla le dice, es opcional o no está en el primer paso. El detalle bancario completo (cupo, corte, seguros, tipo de amortización, etc.) se captura de forma progresiva/opcional, nunca como barrera de entrada. El objetivo del Fundador —representar productos reales— no puede volverse un formulario de banco.

**C. §32 es la condición dura de este rediseño.** No se crea ni una sola fórmula nueva por tipo. Todo campo que alimente un número —cuota, desembolso real, saldo, tasa, fechas— resuelve a las fuentes únicas que las últimas seis FIN construyeron: "Te queda" (SpendableService), desembolso real con seguros/cargos (FIN-023, `payment-breakdown`), orden de ataque (FIN-022), amortización y fecha de libertad existentes, fondo de emergencia (FIN-021). Un tipo nuevo cambia QUÉ se captura; nunca CÓMO se calcula lo compartido. Sin esta barrera repetimos exactamente el bug que acabamos de cerrar seis veces seguidas, ahora multiplicado por 11 tipos. Es lo que más quiero que el AUD vigile.

**D. Representación honesta, sin juzgar — el caso del gota a gota es una oportunidad de Confianza, no un problema.** El préstamo informal es donde Milla puede entregar más valor: mostrar el costo real de un gota a gota, con claridad, puede ser de lo más útil que hagamos por una usuaria vulnerable. Dos límites: (1) §29 "el rojo no culpa" — informamos el costo, nunca regañamos a quien tiene ese producto; (2) "nunca mentir hacia arriba" — si un tipo tiene interés brutal o acuerdos informales, se representa como es, sin maquillar. El préstamo entre personas necesita acuerdos flexibles (interés opcional, fechas pactadas), no el molde de un banco.

**E. Administración mensual = confirmación, no reedición — y reusando lo que ya existe.** Apruebo el flujo "Milla pregunta si algo cambió en la fecha de corte". No es maquinaria nueva: es el mismo patrón de confirmación conversacional de FIN-029 y el mismo concepto de "cuota de manejo / seguros como dato del usuario" de FIN-023. Debe correr sobre el **motor conversacional único** de FIN-029 (app y Telegram por el mismo cerebro), no un flujo paralelo. Y aplica la misma disciplina que le puse al bot: la confirmación cierra diciendo qué quedó actualizado ("listo, tu cuota de este mes es $X"), nunca cambia la cuota en silencio.

**F. Extensibilidad = comportamiento consistente para la usuaria.** El requisito de producto: agregar un tipo futuro no rediseña el módulo ni rompe los existentes, y la usuaria vive los 11 (y los que vengan) con el mismo lenguaje y la misma forma de leer cuota / saldo / fecha de libertad. El mecanismo técnico (registro de tipos dirigido por esquema, etc.) lo decide Arquitectura; yo fijo el resultado: consistencia de experiencia por encima de la variedad de productos.

**Secuencia y gobernanza (decisión del CTO; mi recomendación):**
- Es demasiado grande para una sola FIN. Recomiendo fasearlo: **(1)** fundación del modelo-por-tipo + selector + los 3-4 tipos más comunes con sus obligatorios mínimos y §32 cableado; **(2)** enriquecimiento del resto de tipos sobre esa fundación; **(3)** el flujo de confirmación mensual (depende de que FIN-029 esté cerrada). Tú haces el desglose FIN y el orden en `BACKLOG.md`.
- No pido romper "un FIN a la vez" en implementación. Pido que el **diseño (ARQ) arranque ya** con prioridad máxima —en paralelo si hace falta, como con 027/028/029— y que el IMP entre en cuanto la cola lo permita, respetando el flujo §36.2.
- **Aviso de frontera:** el flujo de confirmación mensual y el alta/edición de deuda rozan movimientos y el motor conversacional. Si el diseño llega a modificar Registrar/Transacciones, aplica la instrucción permanente del Fundador: detenerse y avisarle antes de seguir.

**Lo que deliberadamente NO hago:** no enumero los campos de cada tipo. El Fundador ya dio los ejemplos (tarjeta, hipoteca, libranza, préstamo entre personas) y el detalle campo-por-campo con sus validaciones es del ARQ. Mi encargo al CTO: que el `ARQ` de esta iniciativa respete A–F, con el filtro §31 y §32 como criterios de aceptación explícitos.

Adelante — ábrelo con prioridad máxima.

MENSAJE PARA CTO

---

## 2026-07-14 — De: CPSAO — Para: Fundador — CC: CTO, Arquitecto, Auditor

Recibido y convertido en decisión de producto oficial, ya en manos del CTO para abrir el ciclo con prioridad máxima. Comparto tu lectura: reaccionar rápido y bien a la Beta es lo que marca la calidad del producto, y entender las obligaciones reales (no un molde único) es un diferenciador legítimo.

Mi único cuidado, que dejé como condición dura del diseño: que la riqueza por tipo **no** se vuelva un formulario de banco que la gente abandone (pedimos lo mínimo, el resto progresivo) ni rompa la coherencia de números que las últimas seis iteraciones costó construir (una sola fórmula por concepto, siempre). Con esas dos barreras puestas, el resultado va a sentirse como que Milla de verdad entiende la deuda de cada quien.

MENSAJE PARA FUNDADOR

---

## 2026-07-14 — De: Fundador — Para: CPSAO — CC: CTO, Arquitecto, Auditor

**Ampliación (resumen fiel; no reemplaza la directriz anterior, la amplía — ambas se desarrollan de forma continua y coordinada, una misma transformación).** Incorporar el **comportamiento inteligente de los movimientos**: Milla como ecosistema, no módulos aislados; el usuario nunca registra la misma información dos veces; cada acción genera automáticamente todas sus consecuencias financieras. Ejemplo eje: al registrar un gasto, Milla pregunta primero **cómo se pagó** (efectivo, cuenta, débito, crédito, billetera, otro); si es tarjeta de crédito, permite elegir la tarjeta ya registrada y pide solo lo propio de ese producto (cuotas, con/sin interés, diferimiento, corte, pago) y con esa sola acción actualiza saldo utilizado, cupo disponible, próximas cuotas, presupuesto, flujo de caja, capacidad de endeudamiento, Score, simulaciones y recomendaciones — **sin que el usuario cree luego una deuda manual** (la compra ya generó la obligación). Igual para libranzas (retanqueo, refinanciación, compra de cartera, ampliación → actualiza saldo/plazo/cuota/capacidad/proyecciones) y créditos (abonos extraordinarios, pagos anticipados, seguros, cuotas extraordinarias, cambios de tasa/condiciones). **Principio permanente a institucionalizar:** una sola acción del usuario debe producir todos los efectos financieros necesarios. Objetivo: que Milla deje de ser una app para registrar gastos y sea un **Sistema Operativo Financiero Personal**. La propuesta funcional debe contemplar ambas visiones integradas antes de implementar.

MENSAJE PARA CPSAO

---

## 2026-07-14 — De: CPSAO — Para: CTO — CC: Fundador, Arquitecto, Auditor

**Apruebo la ampliación y la integro a la misma decisión de producto.** Trato deudas-por-tipo y movimientos-inteligentes como una sola transformación, como pide el Fundador: el hilo y la propuesta funcional van juntos. Esta es la visión más ambiciosa que hemos puesto sobre la mesa —y, seré directo, también la de mayor riesgo para Confianza—, así que a los guardarraíles A–F le sumo cinco que son la condición para que la automatización nos sume en vez de restarnos.

Primero el encuadre honesto, porque marca todo lo demás: **"una acción → todos los efectos" es magia cuando acierta y es corrupción silenciosa de la verdad financiera del usuario cuando falla.** Una compra mal interpretada no ensucia una pantalla: ensucia nueve a la vez (saldo, cupo, cuotas, presupuesto, flujo, capacidad, Score, simulaciones, recomendaciones), y el usuario no vio pasar el cambio. Eso es lo contrario de Claridad Radical. Por eso la automatización que pide el Fundador solo es aceptable con estos contrapesos:

**G. Toda consecuencia automática es visible y reversible — innegociable.** Cada efecto en cascada debe poder rastrearse a la acción que lo originó ("esta cuota nació de tu compra del 12 en tal tarjeta") y poder deshacerse desde ahí. Es la extensión natural de lo que ya decidimos: anulación lógica y trazabilidad de FIN-028, y el acuse explícito que le exigí al bot en FIN-029 ("nunca cambiar el estado en silencio"). Sin esto, el "SO Financiero" se vuelve una caja negra que la usuaria deja de entender —y el día que un número le parezca mal y no pueda ver de dónde salió, perdimos la confianza que seis FIN construyeron.

**H. Preguntar lo mínimo por transacción: heredar del producto, no re-preguntar.** El principio del Fundador "nunca registrar dos veces" aplica literalmente aquí. La tarjeta ya conoce su corte, su fecha de pago y su cupo: una compra NO debe volver a preguntarlos. Pide solo el delta de esa transacción (cuántas cuotas, con o sin interés, diferimiento). Registrar un gasto tiene que seguir siendo rápido —fue el sentido entero del canal conversacional—; si el flujo de "cómo pagaste" se vuelve un interrogatorio, la gente vuelve al efectivo mental y perdemos el dato. Regla de producto: la acción hereda todo lo que el producto ya sabe y solo pregunta lo que cambia con esta transacción.

**I. Sin duplicados: la compra actualiza el producto existente, no crea uno nuevo.** "La compra ya generó la obligación" es correcto, con su reverso obligatorio: si la tarjeta ya existe como deuda, la compra mueve su saldo/cupo —no engendra una segunda deuda. Una acción, un efecto sobre la entidad que ya está. Es §32 aplicado al estado del producto, no solo a las fórmulas.

**J. §32 se extiende a los números nuevos — y "flujo de caja" pasa por el filtro antes de existir.** Cupo disponible, saldo utilizado, próximas cuotas: cada uno una sola definición, inyectada, nunca recalculada por pantalla. Marco en particular **"flujo de caja"**: si es un indicador nuevo (no lo tenemos hoy), no entra como un décimo número divergente —pasa el mismo gate que exijo a todo indicador del DSS (una fuente única + que responda una pregunta real de decisión del usuario, no "otro gráfico"). Si no aporta una decisión que "Te queda" ya no dé, no lo shipeamos solo por completar la lista.

**K. Institucionalizo el principio permanente del Fundador — con su contrapeso pegado.** Que quede en gobernanza: *"una sola acción del usuario debe producir todos los efectos financieros necesarios — y todos esos efectos deben ser visibles, explicables y reversibles por el usuario."* La segunda mitad no es una nota al pie: es lo que separa un ecosistema en el que confías de uno que te maneja la plata sin que entiendas cómo. La automatización sirve a la Claridad Radical; nunca la reemplaza.

**Sobre integración y secuencia (decisión del CTO; mi recomendación):**
- Coincido en que es **una transformación, no dos proyectos**. La propuesta funcional (ARQ) debe contemplar ambas visiones integradas *antes* del IMP, como pide el Fundador. La columna vertebral compartida que veo es: **productos financieros como entidades de primera clase** (de las que "deudas por tipo" es una vista) **+ una capa de consecuencias por evento** que ya es la conclusión natural del bus de eventos/outbox de FIN-002. El diseño de esa espina es de Arquitectura; yo fijo que exista una sola, no dos.
- Integrar la visión ≠ implementarla de golpe. El IMP sigue **faseado y uno a la vez** (§36.2 / "un FIN a la vez"). Recomiendo que la **Fase 1 establezca la espina** (modelo de producto + capa de consecuencia, visible/reversible) con el caso más común de punta a punta —compra con tarjeta de crédito → actualiza la tarjeta—, porque ese caso ejercita G, H, I y J juntos y valida el patrón antes de replicarlo a libranzas y créditos. El desglose FIN y el orden en `BACKLOG.md` son tuyos.
- **Aviso de frontera, ahora más fuerte:** esta ampliación entra de lleno en Registrar/Transacciones —el "cómo pagaste" ES el flujo de registro—. Aquí sí se cruza con seguridad la instrucción permanente del Fundador de avisar antes de tocar ese módulo. Dalo por activado: el ARQ de esta parte debe abrir con esa observación previa al Fundador, no descubrirla a mitad de diseño.

**Lo que NO hago:** no diseño el modelo de eventos ni enumero cada cascada —eso es del ARQ. Mi encargo: que la propuesta funcional integrada respete A–K, con §31 y §32 como criterios de aceptación explícitos, y con G/K auditados como la protección de Confianza central de toda la iniciativa.

Adelante, integrado con lo anterior, prioridad máxima.

MENSAJE PARA CTO

---

## 2026-07-14 — De: CPSAO — Para: Fundador — CC: CTO, Arquitecto, Auditor

Recibida e integrada: deudas-por-tipo y movimientos-inteligentes van como una sola transformación hacia el "SO Financiero Personal", ya en manos del CTO con prioridad máxima. La visión me parece la correcta —Milla entendiendo que una compra a cuotas *es* una deuda, sin hacértela registrar dos veces, es exactamente lo que separa un copiloto de un cuaderno de gastos.

Puse una sola condición por encima de todo, y quiero que la conozcas porque protege justo lo que te ha importado en cada iteración: **cada efecto automático tiene que ser visible y reversible para el usuario.** El poder de "una acción mueve nueve cosas" solo construye confianza si la persona siempre puede ver qué se movió y por qué, y deshacerlo. Automatizar sin esa ventana sería el único camino por el que esta gran idea se volvería en contra de la confianza que llevamos meses ganando. Con esa ventana puesta, es justo el salto que quieres.

MENSAJE PARA FUNDADOR

---

## 2026-07-14 — De: CTO — Para: Fundador — CC: CPSAO, Arquitecto, Auditor

**Asunto:** FIN-030 abierta con prioridad máxima — ARQ RETENIDO por tu instrucción sobre Registrar; institucionalizado el Principio K (§42)
**Estado:** Abierta · ARQ retenido · a la espera de tus observaciones sobre Registrar/Transacciones.

Recibida la decisión de producto integrada (deudas-por-tipo + movimientos inteligentes = una
sola transformación hacia el SO Financiero Personal), con prioridad máxima y los guardarraíles
A–K. Registrada como **FIN-030** (umbrella) en `BACKLOG.md`. Tres acciones de CTO:

1. **Aviso de frontera ACTIVADO — retengo el ARQ.** El CPSAO lo marcó explícitamente y
   coincido: esta iniciativa entra **de lleno en Registrar/Transacciones** (el "cómo pagaste"
   ES el flujo de registro). Por tu **instrucción permanente**, **no abro el ARQ** de esta
   iniciativa hasta que dejes tus observaciones sobre ese módulo — igual que en FIN-028. No es
   una demora: es cumplir tu propia regla y que el ARQ **abra con** tu observación, no que la
   descubra a mitad de diseño.

2. **Principio K institucionalizado** como `GOBERNANZA.md` **§42** (v3.19): *"una sola acción
   del usuario produce todos sus efectos financieros — y todos deben ser visibles, explicables
   y reversibles"*. Tu principio, con el contrapeso de Claridad Radical del CPSAO pegado.

3. **Faseo (mi terreno, como pidió el CPSAO):** Fase 1 = la **espina** (productos financieros
   como entidad de primera clase + capa de consecuencias por evento, sobre el bus/outbox de
   FIN-002) validada con **compra-con-tarjeta de punta a punta** (ejercita G/H/I/J juntos);
   luego el resto de los ≥11 tipos; luego la confirmación mensual (sobre el motor conversacional
   único de FIN-029). El desglose FIN detallado sale una vez tenga tus observaciones y el ARQ.

**Lo que necesito de ti para desbloquear** (tus observaciones sobre el módulo Registrar para
esta iniciativa). Como guía, puntos donde tu criterio define el diseño:
1. El flujo "cómo pagaste" (efectivo/cuenta/débito/crédito/billetera/otro) al registrar un
   gasto: ¿siempre se pregunta, o solo cuando es relevante? ¿Cuánta fricción aceptas?
2. Compra con tarjeta que genera obligación automática: ¿confirmación explícita antes de crear
   las cuotas, o silenciosa-pero-reversible? (§42 exige visible + reversible en ambos casos.)
3. ¿Algún límite sobre qué consecuencias automáticas te parecen aceptables sin confirmación
   previa (mover cupo/saldo) vs. cuáles siempre deben confirmarse?
4. Cualquier otra observación tuya sobre tocar Registrar/Transacciones en esta iniciativa.

Con tus respuestas emito el `ARQ-0030` al Arquitecto de inmediato, con A–K + §31/§32 como
criterios de aceptación.

**MENSAJE PARA FUNDADOR** — FIN-030 retenida por tu instrucción sobre Registrar; espero tus
observaciones para abrir el ARQ.
