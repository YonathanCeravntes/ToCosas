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

---

## 2026-07-14 — De: Fundador — Para: CTO — CC: CPSAO, Arquitecto, Auditor

**Asunto:** Observaciones del Fundador — Desbloqueo de ARQ-0030 (FIN-030)
**Estado:** Observaciones entregadas. Autoriza abrir `ARQ-0030` de inmediato.

Decisiones vinculantes del Fundador (satisface la instrucción permanente sobre Registrar):
1. **Flujo "¿Cómo pagaste?" inteligente, sin fricción innecesaria** — pregunta SOLO lo que
   cambia el comportamiento financiero: efectivo → nada; cuenta bancaria → seleccionar cuenta;
   tarjeta débito → seleccionar cuenta asociada; tarjeta de crédito → abrir el flujo específico
   de la tarjeta; billetera → seleccionar billetera. Llenar un gasto no puede tomar más que
   escribirlo.
2. **Compra con tarjeta de crédito: SIN segunda confirmación.** Seleccionar la tarjeta y
   completar los datos de la compra **ES** la confirmación. A partir de ahí, automático:
   actualizar cupo, saldo, generar la obligación, recalcular cuotas, presupuesto, Score, flujo
   — **todo visible y trazable**.
3. **Consecuencias automáticas en dos grupos:**
   - **SIN confirmación** (consecuencia natural de la acción): mover cupo, actualizar saldo,
     recalcular cuotas, presupuesto, Score, proyecciones. No interrumpen la experiencia.
   - **CON confirmación** (cuando se modifica información que el usuario NO ingresó
     explícitamente): refinanciaciones, cambios de plazo, consolidaciones, modificaciones de
     condiciones, sustitución de productos.
4. **Filosofía de Registrar:** deja de ser un formulario; se vuelve el **punto de entrada del
   ecosistema** — el usuario registra un hecho, Millo comprende automáticamente sus
   implicaciones. "Registrar es el corazón operativo del producto."
5. **Principio adicional FIN-030:** *"El usuario registra un hecho financiero; Millo registra
   todas sus consecuencias."* Minimizar el trabajo manual sin sacrificar transparencia; cada
   efecto automático permanece **visible, explicable y reversible** (§42).

**MENSAJE PARA CTO** — autorizado abrir `ARQ-0030` de inmediato.

---

## 2026-07-14 — De: CTO — Para: Arquitecto — CC: CPSAO, Auditor, Fundador

**Asunto:** ARQ-0030 autorizado — retención levantada (rediseño de Deudas + movimientos inteligentes, umbrella)
**Estado:** ARQ autorizado, prioridad MÁXIMA. Diseño puede iniciar ya.

El Fundador entregó sus observaciones sobre Registrar → **retención levantada**. Emites
`ARQ-0030` (umbrella). **Criterios de aceptación duros:** guardarraíles **A–K** (CPSAO,
arriba), **§31** (valor diferencial), **§32** (una sola definición por concepto — condición
central: ni una fórmula nueva por tipo; cupo/saldo/cuotas/desembolso resuelven a fuentes
únicas ya construidas — SpendableService, payment-breakdown FIN-023, attackOrder FIN-022,
fondo FIN-021), y **§42** (una acción → todos los efectos, todos visibles/explicables/
reversibles).

**Lineamientos de diseño (traducción de las 5 decisiones del Fundador):**
- **Flujo "¿Cómo pagaste?" por método**, preguntando solo el delta (guardarraíl H, heredar-no-
  re-preguntar): efectivo→nada · cuenta→cuenta · débito→cuenta asociada · crédito→flujo de la
  tarjeta · billetera→billetera. La baja fricción es criterio de aceptación, no un "nice to have".
- **La compra con tarjeta ES la confirmación** (sin segundo paso): cascada automática
  (cupo/saldo/obligación/cuotas/presupuesto/Score/flujo) **trazable a la acción y reversible**
  (§42/G). **Sin duplicados** (I): la compra actualiza la tarjeta existente, no crea una 2ª deuda.
- **Modelo de confirmación en dos niveles** (decisión 3, encódalo en el diseño): consecuencia
  directa del hecho → sin confirmación; modificación de datos NO ingresados por el usuario
  (refi, plazo, consolidación, condiciones, sustitución de producto) → confirmación explícita.
- **Deuda-por-tipo:** ≥11 tipos, selección por tipo primero, **mínimo obligatorio + resto
  progresivo** (guardarraíl B — nunca un formulario de banco); representación honesta sin
  juzgar (D, incluye gota a gota); modelo **extensible** por esquema (F).
- **Registrar como punto de entrada del ecosistema** — entra de lleno en Registrar/
  Transacciones (autorizado por el Fundador); coordina con el servicio central de movimientos
  de FIN-028 y el motor conversacional único de FIN-029 (app + Telegram por el mismo cerebro).
- **Espina única:** productos financieros como **entidad de primera clase** + **capa de
  consecuencias por evento** (sobre el bus/outbox de FIN-002). Una sola espina, no dos.

**Faseo (mi decisión, §36.2 / un FIN a la vez para IMP):** el umbrella `ARQ-0030` define la
espina y el modelo; el detalle campo-por-campo de cada tipo y cada cascada NO se diseña todo
en un solo documento. **Fase 1** (primer FIN concreto que derive de este umbrella): espina
(producto-entidad + capa de consecuencia visible/reversible) validada con **compra-con-tarjeta
de punta a punta** — ejercita G/H/I/J juntos. Entrega el umbrella con su SHA; con él hago el
desglose FIN en `BACKLOG.md` y el orden de IMP.

**"Flujo de caja" (J):** si es indicador nuevo, pasa el gate del DSS (fuente única + responde
una pregunta real de decisión que "Te queda" no dé ya) antes de existir.

**MENSAJE PARA ARQUITECTO** — emitir `ARQ-0030` (umbrella) con A–K + §31/§32/§42 como criterios
de aceptación explícitos; entregar con SHA para validación del CTO antes de cualquier IMP.

## 2026-07-14 — De: Arquitecto — Para: Auditor — CC: CTO, CPSAO, Fundador

**Estado**
`ARQ-0030` (umbrella) v1.0 emitido — `docs/arquitectura/ARQ-0030-SO-Financiero-Deudas-Movimientos.md`, commit `2a18a76` (rama de trabajo, §36.2). Abre — como exigieron el Fundador/CPSAO/CTO — con la observación de frontera sobre Registrar (§0).

**Conclusión**
Documento UMBRELLA, disciplinado con "un FIN a la vez": define la ESPINA y el alcance, NO el detalle campo-por-campo de los 11 tipos ni cada cascada (eso va en los ARQ derivados). La espina son dos piezas: (1) **productos financieros como entidad de primera clase** dirigida por esquema —Alt A: una CAPA sobre los `Debt`/`Account` existentes, no una reescritura, para no romper las 8 FIN que ya los consumen ni el §32; los ≥11 tipos se completan añadiendo `libranza`/`compra_a_cuotas`/`fintech` al enum que ya tiene 8; (2) **capa de consecuencias por evento** sobre el outbox de FIN-002 —Alt A: las consecuencias son LISTENERS de un evento rico con causalidad (`sourceEventId`/`sourceTransactionId`), no un orquestador imperativo que metería 9 lógicas en la mutación. Eso hace el §42 (visible/explicable/reversible) verdadero POR CONSTRUCCIÓN: anular la acción origen revierte la cascada por los mismos listeners (patrón anular-pago de FIN-028) + acuse explícito (FIN-029). A–K mapeados a mecanismos concretos en §4.6. Fase 1 (lo único que el umbrella diseña implementable) = compra-con-tarjeta de punta a punta, que ejercita G/H/I/J juntos.

**Dos cosas que dejo explícitas para tu AUD y para el DEC:** (1) **"flujo de caja" (J)** — hoy no existe; lo planteo como pregunta al DEC, no como decisión mía: solo debe shipearse si pasa el gate del DSS (fuente única + una decisión que "Te queda" no dé ya); mi lectura preliminar es que solo se justifica si aporta la dimensión proyectiva de saldos futuros. (2) **G/§42 es la protección de Confianza central** — pido que la auditoría la vigile por encima de todo: es lo que separa el "SO Financiero" de una caja negra que mueve la plata sin que la usuaria vea de dónde salió cada número.

**Puntos que pido verificar en tu AUD:** (1) que la Alt A (capa sobre lo existente) realmente no obliga a reescribir Debt/Account ni rehace §32; (2) que la trazabilidad+reversión por causalidad de eventos es suficiente para §42 en la cascada completa (9 efectos), o si algún efecto no es reversible limpiamente; (3) el radio de daño sobre Registrar — que la espina lo EXTIENDE por composición y no toca su núcleo.

**Bloqueos**
Ninguno. No implemento nada hasta el DEC; el desglose FIN fino lo hace el CTO en BACKLOG a partir de este umbrella.

MENSAJE PARA AUDITOR

---

## 2026-07-14 — De: Auditor — Para: CTO — CC: Arquitecto, CPSAO, Fundador

**Estado**
`AUD-0030` emitido (umbrella). Veredicto: **APROBADO CON OBSERVACIONES**. Verificado contra `HEAD`.

**Conclusión**
Umbrella disciplinado (define espina, solo Fase 1 implementable — cumple "un FIN a la vez"). Los 3 puntos del Arquitecto: **(1)** Alt A viable — `Debt`/`AmortizationEntry`/`DebtInsurance` existen, no se reescriben, §32 intacto (precisión: `DebtType`=9, no 8; +3=12≥11). **(2)** §42: reversión limpia para los 6 efectos derivados (auto-sanan por recompute), **NO** limpia para saldo/cupo/cuotas una vez que una acción posterior las toca — anular una compra con cuotas ya pagadas no es limpio. **(3)** Registrar: la cascada es composición real (el alta ya emite `TransactionCreated` por outbox), pero el flujo "¿cómo pagaste?" SÍ extiende la entrada (autorizado).

**Acciones (para el DEC / ARQ de Fase 1)**
1. **Fase 1 debe declarar la política de reversión con dependientes** (anular compra cuyas cuotas ya tienen pagos): bloquear + ruta de corrección, o reversión compensatoria. Es el borde donde §42 no es limpio — la protección de Confianza central que el CPSAO pidió vigilar.
2. Resolver "flujo de caja" (J) con el gate del DSS antes de que ninguna FIN derivada lo shipee.
3. Cada FIN derivada debe cargar el grep §32 y el test de reversibilidad como criterio de cierre — es donde el bug ×11 tipos podría entrar.

**Bloqueos**
Ninguno del umbrella. La política de reversión es requisito del ARQ de Fase 1, no del umbrella.

MENSAJE PARA CTO

---

---

## 2026-07-14 — De: CTO — Para: Arquitecto — CC: CPSAO, Auditor, Fundador

**Asunto:** DEC-0030 (umbrella) emitida — desglose FIN + directiva de ARQ-0031 (Fase 1)
**Estado:** Umbrella decidida. `ARQ-0031` (Fase 1) autorizado, prioridad máxima.

Verifiqué contra código (no sobre el reporte): `DebtType`=9 valores → +3 = 12≥11 por extensión
(Alt A confirmada, sin reescribir `Debt`/`Account`); la creación de transacción ya emite
`TransactionCreated` por outbox (`:120-123`) → la cascada compone, no reescribe Registrar.
`DEC-0030` aprueba la espina (Alt A + capa de consecuencias por listeners con causalidad,
§42 por construcción). Detalle: `docs/oficial/DEC-0030-SO-Financiero-Deudas-Movimientos.md`.

**Desglose FIN (mi terreno):** `FIN-030` umbrella (cerrado a nivel umbrella) · **`FIN-031` =
Fase 1** (espina + compra-con-tarjeta e2e) · `FIN-032` = resto de tipos (roadmap) · `FIN-033`
= confirmación mensual sobre el motor de FIN-029 (roadmap).

**Emite `ARQ-0031` (Fase 1)** honrando los cambios obligatorios de `DEC-0030` §3:
1. **Declara la política de reversión con dependientes** (anular compra con cuotas ya pagadas
   no revierte limpio) — bloquear+ruta de corrección, o reversión compensatoria. Es el borde
   §42 y la condición de cierre de FIN-031; el CPSAO pidió vigilarlo por encima de todo.
2. **"Flujo de caja":** no lo incluyas en Fase 1 salvo que pase el gate del DSS (fuente única +
   una decisión proyectiva que "Te queda" no dé). Si dudas, déjalo fuera de Fase 1.
3. **Criterios de cierre:** grep §32 (ningún número recalculado por pantalla) + test de
   reversibilidad de la cascada (crear compra → 7 efectos; anular → se revierten).
4. Sin duplicados (I): la compra actualiza la tarjeta existente. Confirmación en dos niveles
   (directa→sin confirmar; modificación no ingresada→confirmar). Baja fricción (H) como criterio.
5. Alcance de Fase 1 acotado: la espina + UN caso e2e (compra con tarjeta). No los 11 tipos.

**MENSAJE PARA ARQUITECTO** — emitir `ARQ-0031` (Fase 1) con la política de reversión declarada;
entregar con SHA para validación del CTO.

## 2026-07-14 — De: Arquitecto — Para: Auditor — CC: CTO, CPSAO, Fundador

**Estado**
`ARQ-0031` (Fase 1) v1.0 emitido — `docs/arquitectura/ARQ-0031-Fase1-Espina-Compra-Tarjeta.md`, commit `HEAD` (rama de trabajo, §36.2). Alcance acotado: la espina + UN caso e2e (compra con tarjeta), NO los 11 tipos.

**Conclusión**
La condición de cierre —la política de reversión con dependientes (DEC-0030 §3.1)— está declarada como REGLA (§4.5), no como alternativa suelta: **sin cuotas pagadas → anulación limpia** (anular la transacción origen revierte la cascada por los mismos listeners); **con ≥1 cuota pagada → bloquear la anulación directa + ruta de corrección** (Alt A recomendada). Rechacé la reversión compensatoria (Alt B): un contra-asiento fantasma es reversible pero NO explicable — §42 exige ambas, y falsear el historial de una compra que ya movió plata real viola "nunca mentir hacia arriba". Es exactamente la protección de Confianza que el CPSAO pidió vigilar. El resto de la espina: cupo/saldo/cuotas DERIVADOS en un `CardService` hoja (§32, cero columna que se desincronice); la compra emite `CardPurchaseRegistered` con `sourceTransactionId` (causalidad G) y los consumidores existentes (Motor, teQueda) reaccionan sin fórmula nueva; sin duplicados (la compra actualiza la tarjeta, no crea 2ª deuda). **"Flujo de caja" queda FUERA de Fase 1** — no pasa el gate del DSS: "Te queda" ya responde su pregunta; solo se justificaría con la dimensión proyectiva de saldos futuros, que es otra FIN.

**Puntos que pido verificar en tu AUD:** (1) que la política de reversión 4.5 cubre el borde §42 sin dejar un caso donde la cascada quede inconsistente; (2) que derivar saldo/cupo (no almacenarlos) es realmente §32-limpio y no introduce un problema de rendimiento; (3) que el modelo `CardPurchase`/`CardInstallment` no colisiona con la amortización única del `Debt` (son planos por compra, no el schedule del crédito).

**Bloqueos**
Ninguno. No implemento nada hasta el DEC-0031.

MENSAJE PARA AUDITOR

---

## 2026-07-14 — De: Auditor — Para: CTO — CC: Arquitecto, CPSAO, Fundador

**Estado**
`AUD-0031` emitido. Veredicto: **APROBADO CON OBSERVACIONES**. Verificado contra `HEAD`.

**Conclusión — tus 3 puntos (Arquitecto):**
1. **Reversión §4.5:** cubre el borde §42 sin dejar cascada inconsistente. Alt A correcta; rechazo de Alt B bien razonado (reversible **y** explicable — un contra-asiento fantasma falsea el historial). Condición de cierre resuelta.
2. **Derivar saldo/cupo:** §32-limpio (una fuente, cero columna que se desincronice); costo negligible, cache diferido bien declarado.
3. **`CardInstallment` vs amortización del `Debt`:** no colisionan como *schedules* (planos por compra vs schedule del crédito) — **pero** aquí está la observación con peso: para una tarjeta, "lo comprometido" debe resolver a las `CardInstallment`, y hoy `SpendableService`/`DebtOutlayService` lo computan desde `Debt.monthlyPayment` (`debt-outlay.service.ts:40`), no desde un modelo de tarjeta.

**Observación con peso (GAP §32):** las cuotas de tarjeta **no** fluyen solas a teQueda/desembolso. El IMP debe **extender `DebtOutlayService`** (autoridad única de "lo comprometido") para incluir `CardInstallment` — en **una** ruta, por inyección — nunca una 2ª ruta en `CardService` ni el `Debt.monthlyPayment` de la tarjeta como segundo origen. Corregir el §4.4/§8 del ARQ ("cero fórmula nueva/ya entra" es impreciso). El grep §32 de cierre debe cubrirlo — es donde el bug ×tipos entraría en Fase 1.

**Bloqueos**
Ninguno de diseño. El GAP es una corrección de encuadre + condición del grep de cierre, no un rediseño.

MENSAJE PARA CTO

---

---

## 2026-07-14 — De: CTO — Para: Arquitecto — CC: CPSAO, Auditor, Fundador

**Asunto:** DEC-0031 emitida — IMP-0031 habilitado (Fase 1)
**Estado:** Decidida. `IMP-0031` autorizado (primer IMP de la iniciativa FIN-030).

Verifiqué el GAP §32 contra código: `DebtOutlayService.outlaysByUser` (`:40`) es la autoridad
única de "lo comprometido" (la inyectan teQueda, presupuesto, Copiloto, Motor) y hoy computa
desde `Debt.monthlyPayment` — las cuotas de tarjeta NO entran solas. El Auditor tiene razón.

**Emite `IMP-0031` con los 4 cambios obligatorios de `DEC-0031` §3:**
1. **Extiende `DebtOutlayService` para incluir `CardInstallment`** — UNA ruta, por inyección.
   **Prohibido** una 2ª ruta en `CardService` o el `Debt.monthlyPayment` de la tarjeta como
   segundo origen. Corrige el §4.4/§8 del ARQ. Con la extensión, todos los consumidores
   (teQueda/presupuesto/Copiloto/Motor) incluyen las cuotas de tarjeta por construcción.
2. **Grep §32 de cierre** cubre ese punto (una sola fuente de "lo comprometido" de la tarjeta).
3. **Test de reversibilidad:** crear compra → efectos; anular sin cuotas pagadas → revierte;
   anular con cuota pagada → bloqueado + ruta de corrección (política §4.5 aprobada).
4. Alcance acotado: espina + compra-con-tarjeta. No los 11 tipos.

Política de reversión §4.5 (Alt A) aprobada tal cual — rechazo de Alt B bien razonado.
"Flujo de caja" fuera de Fase 1, correcto. Entrega con SHA.

**MENSAJE PARA ARQUITECTO** — emitir `IMP-0031` con `DebtOutlayService` extendido (una autoridad);
entregar con SHA para validación del CTO.

---

## 2026-07-14 — De: Arquitecto — Para: CTO — CC: Auditor, CPSAO, Fundador

**Asunto:** IMP-0031 entregado — espina + compra-con-tarjeta (§32 por la única autoridad)
**Estado:** Entregado en rama de trabajo (§36.2). `IMP-0031` v1.0 —
`docs/implementaciones/IMP-0031-Fase1-Espina-Compra-Tarjeta.md`. Referencia inmutable: commit **`8473ed5e351d5456126ce32ada698ae3025444f5`**.

**Conclusión**
Los 4 cambios obligatorios de DEC-0031 §3, cerrados:
1. **§32 — una autoridad:** extendí `DebtOutlayService.outlaysByUser` para que el compromiso mensual de una tarjeta sea la **próxima `CardInstallment`** de cada compra viva — UNA ruta, por inyección. Ni 2ª ruta en `CardService`, ni el `Debt.monthlyPayment` de la tarjeta como segundo origen. teQueda / presupuesto / Copiloto / Motor lo heredan por construcción. Corregido el encuadre "ya entra" del ARQ: hoy NO entraba, ahora sí, por la fuente única.
2. **Grep §32 de cierre:** el compromiso de tarjeta sale SOLO de `debt-outlay.service.ts`; `usedAmount`/`availableCredit` (cupo/saldo derivados) SOLO de `card.service.ts`. Cero recálculo por pantalla.
3. **Reversibilidad (§4.5):** e2e prueba la cascada — crear compra mueve saldo/cupo (derivados) sin crear 2ª deuda; anular sin cuotas pagadas revierte; anular con ≥1 cuota pagada → **409** con la ruta de corrección (nunca falsear el historial). Alt B (contra-asiento fantasma) rechazada.
4. **Alcance acotado:** la espina + compra-con-tarjeta. Los 11 tipos = FIN-032; "flujo de caja" fuera de Fase 1.

**Decisión de modelo (para tu validación):** una compra a crédito NO crea gasto en efectivo (la caja sale por las cuotas) → `sourceTransactionId` nullable + `ON DELETE SET NULL`, con `CardPurchase` como origen trazable de 1ª clase. La tarjeta nace con saldo 0 y sin amortización de contrato; el detalle de una tarjeta oculta la UI de amortización (con saldo 0 mostraría "$0" y mentiría — §42 "explicable").

**Suites:** unit **357/357** · e2e **12 suites / 49** (`fin031` 5/5) · `tsc` limpio (back+front) · grep §32 limpio · 2 migraciones aplicadas (`migrate deploy`) · 3 capturas reales (`docs/producto/capturas/fin-031/`).

**Bloqueos**
Ninguno. Queda para ti la VALIDACIÓN (§36.3) e **integración** a la rama oficial (§36.2) — soy Arquitecto, entrego en rama de trabajo, no integro.

MENSAJE PARA CTO

---

## 2026-07-14 — De: CTO — Para: Fundador — CC: CPSAO, Arquitecto, Auditor

**Asunto:** FIN-031 CERRADA (validación técnica del CTO) — primer IMP de la iniciativa FIN-030
**Estado:** Cerrada (eje técnico). IMP-0031 validado e integrado.

Validación independiente en checkout sobre `8473ed5` — código verificado y suites reejecutadas
por el CTO. Los 4 cambios obligatorios de `DEC-0031`, confirmados:
1. **§32 — una autoridad:** `DebtOutlayService.outlaysByUser` (`:54-60`) computa el compromiso
   mensual de una tarjeta = suma de la próxima cuota no pagada de cada compra viva, en **UNA
   ruta** (sin compras → cae a `monthlyPayment`, regresión). Grep limpio: ninguna 2ª ruta;
   `card.service` solo deriva cupo/saldo (concepto distinto), lo declara explícito. teQueda/
   presupuesto/Copiloto/Motor lo heredan por inyección.
2. **Reversibilidad (§4.5):** e2e prueba la cascada — compra mueve saldo/cupo sin crear 2ª
   deuda (I); anular sin cuotas pagadas revierte (§42); **anular con ≥1 cuota pagada → 409**
   con ruta de corrección (nunca falsear el historial; Alt B rechazada). La protección de
   Confianza central del CPSAO, verificada.
3. **Cupo/saldo derivados** en `CardService` hoja (§32); "flujo de caja" fuera de Fase 1.
4. **Alcance acotado:** espina + compra-con-tarjeta. Los 11 tipos = FIN-032.

**Suites por el CTO:** `tsc` back+front 0; unit **357/357** (46 suites); e2e **49/49** (12
suites, incl. `fin031-tarjeta` 5/5 y regresión de TODOS los consumidores de la autoridad —
fin020/022/023/024/028). Grep §32 limpio.

Primer IMP de la iniciativa FIN-030 cerrado. **Despliegue:** backend+migraciones → Render
auto-deploy; frontend → OTA por la vía segura (§40/§41). Sigue "un FIN a la vez": FIN-032
(resto de tipos) cuando lo priorices.

**MENSAJE PARA FUNDADOR** — FIN-031 cerrada; la espina del SO Financiero vive, con la compra
con tarjeta de punta a punta. Firma de producto en dispositivo real al probar el OTA.
