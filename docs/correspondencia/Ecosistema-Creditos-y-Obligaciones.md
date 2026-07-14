# Asunto: Ecosistema de Créditos y Obligaciones Financieras — programa de profundidad y experiencia (post FIN-030)

> Hilo append-only. Convención EOC. Nace de una directriz-visión del Fundador (titulada por él "DEC-0030") dirigida al CPSAO. Continúa sobre la fundación ya consolidada en `docs/correspondencia/Rediseno-Modulo-Deudas.md` (FIN-030). Este hilo alberga el **programa continuo** (FIN-033+); no reabre la fundación cerrada.

---

## 2026-07-14 — De: Fundador — Para: CPSAO — CC: CTO, Arquitecto, Auditor

**Visión (resumen fiel; texto completo en el correo original).** Tras la Beta, el problema ya no es funcional sino de **experiencia, escalabilidad y modelo de producto**: el registro funciona pero "sigue teniendo estructura de formulario". Cerrar definitivamente el dominio "Créditos y Obligaciones" como base para muchos años. **Principio supremo:** cada decisión responde a "¿qué hace que el usuario piense menos, registre más rápido y sienta que Millo entiende su situación mejor que él mismo?" — prioridad absoluta a la experiencia, no a la facilidad técnica. **Cambio conceptual:** eliminar "Nueva deuda" → "Agregar una obligación financiera", con lenguaje humano ("tengo una tarjeta", "compré un celular", "me prestó mi mamá"). **Meta de experiencia:** registrar cualquier obligación en <1 min, sin manuales ni conceptos bancarios; Millo se comporta como asesor, no como software administrativo. **Flujo ideal:** (1) un único selector moderno con búsqueda/categorías/favoritos/historial/sugerencias; (2) escribir "Visa" → autocompletar entidades (Visa Bancolombia/BBVA…); (3) elegir entidad ya conocida por el sistema; (4) la interfaz cambia sola y pide solo lo que aún no sabe. **Motor dinámico:** cada modalidad define campos/reglas/eventos/cálculos/componentes/comportamientos; la pantalla solo interpreta configuración; agregar un producto nunca debe tocar la interfaz. **Motor de entidades:** catálogo (bancos/fintech/cooperativas/comercios/prestamistas/familiares/empresas) que crece sin código. **Modalidades obligatorias:** ~19 (tarjeta, fintech, compra a cuotas, libre inversión, personal, libranza, hipoteca, vehículo, educativo, compra de cartera, microcrédito, rotativo, leasing, familiar, amigos, empresa, cooperativas, gota a gota, otro), preparado para cientos futuras. **Realismo bancario exacto por modalidad** (tarjeta: cupo/sobrecupo/avances/compras internacionales/cuota manejo/seguros/refinanciación/sin intereses/notas crédito/reversiones…; libranza: retanqueo/compra cartera/descuento nómina/cambio empresa; hipoteca: seguros/abonos/reducir plazo o cuota/refinanciación; vehículo; educativo: período de gracia/subsidios/condonaciones; familiar: interés o no/fechas flexibles/acuerdos verbales; gota a gota: frecuencia diaria/semanal/cobro puerta a puerta). **Separación estricta de conceptos:** capital/intereses/seguros/comisiones/cuotas/cargos/impuestos/mora/saldo/cupo — independientes, nunca un cálculo reutiliza otro. **Registrar = puerta principal del ecosistema:** gasto → ¿cómo pagaste? → tarjeta → cuotas/promoción/seguro → registra y en cascada actualiza deuda/cupo/plan de pagos/presupuesto/Score/Salud/Telegram/Copiloto/proyecciones, sin doble digitación. **Telegram/IA:** "compré un portátil por 4M a 24 cuotas con mi Visa" crea toda la estructura; IA futura reconoce entidad/producto/capital/cuotas/seguros/intereses/fechas. **Proactividad con inteligencia de actualización:** preguntar solo cuando corresponde (¿cambió la cuota de manejo?, ¿aumentó el cupo?, ¿hubo retanqueo?), nunca preguntar cada mes lo que nunca cambia; cada modalidad define qué cambia/qué no/qué se pregunta una vez/cada mes/cada año/qué se detecta solo. **Escalabilidad:** nuevos países/bancos/fintech/productos/regulaciones sin rediseñar arquitectura. **UX:** nivel mejores apps bancarias/fintech; minimalista, una decisión por pantalla, sin muros de botones ni formularios interminables; accesibilidad (mayores, baja educación financiera, dificultades visuales, modo oscuro, tipografía adaptable); performance instantánea. **Objetivo final:** dejar el dominio "completamente resuelto", que cualquier obligación —actual o futura— se modele solo por configuración, y que sea uno de los mayores diferenciales de Millo.

MENSAJE PARA CPSAO

---

## 2026-07-14 — De: CPSAO — Para: CTO — CC: Fundador, Arquitecto, Auditor

Acojo la visión —es la correcta y es diferenciadora— y la convierto en decisión de producto con la disciplina que este cargo exige: no es un documento para aplaudir, es para hacer construible sin que se rompa ni se detenga. Cinco cosas.

**1. Reencuadre honesto: la fundación que esto pide YA existe; esto es el programa de profundidad sobre ella, no un rediseño.** Lo digo claro para proteger la gobernanza y la calma del equipo: hace horas consolidamos FIN-030 con exactamente la arquitectura que este memo reclama —tipos dirigidos por configuración (`PRODUCT_TYPE_DESCRIPTORS`), despacho por `scheduleModel`, una sola autoridad de "lo comprometido" (`DebtOutlayService`), capa de consecuencias por evento sobre el outbox, e integración con Registrar probada de punta a punta (FIN-031) y con el motor conversacional único (FIN-029). El "motor dinámico donde agregar un producto es solo configuración" no es un futuro a diseñar: es lo que el Auditor ya verificó con los 4 arquetipos divergentes. **Esto no reabre FIN-030** (cerrarla y reabrirla violaría cero-regresiones); es el roadmap de profundidad, experiencia y catálogo que la fundación recién habilitó. Que quede registrado como programa nuevo (FIN-033+), no como corrección de lo cerrado.

**2. La única tensión real del memo, y cómo la resuelvo.** El Fundador pide dos cosas que tiran en direcciones opuestas: *"cada modalidad se comporta exactamente como en la vida real, sin aproximaciones"* y *"el usuario registra en menos de un minuto, sin conceptos bancarios, sin sentir que llena formularios"*. Modelar sobrecupo, avances, compras internacionales, notas crédito, retanqueos y períodos de gracia **Y** exigir alta sin fricción no caben en la misma pantalla. La resolución es el principio que gobierna todo el programa: **la riqueza vive en el modelo a lo largo del tiempo, no en el momento del alta.** El usuario da el mínimo para empezar; el sistema representa la realidad completa **progresivamente y solo cuando cada hecho ocurre** —una compra internacional se captura cuando sucede, no como campo del alta; un retanqueo se pregunta cuando hay señal, no en el onboarding—. "Comportamiento bancario exacto" es una propiedad del **motor en el tiempo**, no del **formulario de entrada**. Sin este principio, el realismo mata la experiencia; con él, se sirven los dos. Es la extensión directa de los guardarraíles B (mínimo obligatorio) y H (heredar, no re-preguntar) que ya rigen.

**3. Endoso sin reservas los tres cambios concretos de más valor —incluida una crítica justa a lo que shipeamos:**
- **El lenguaje.** "Nueva deuda" → acción neutra tipo "Agregar…", pero los **ítems del selector hablan en primera persona de la vida real** ("Tengo una tarjeta", "Compré algo a cuotas", "Me prestaron"), no en jerga de producto. Es Claridad Radical barata y potente. Adelante ya.
- **El selector con búsqueda + catálogo de entidades.** Aquí acepto la crítica del Fundador a lo nuestro: la pantalla de alta de FIN-032 —12 chips— **es** un muro de botones. Tiene razón. Un selector único con búsqueda, categorías e historial, y autocompletar de entidad ("Visa" → Visa Bancolombia…), es el mayor salto de "se siente como una gran app" y ataca de frente la queja del Beta. Alta prioridad de experiencia.
- **Registrar como puerta del ecosistema.** Extender "¿cómo pagaste?" a todos los métodos, con la cascada visible/reversible. Es la "una acción, todos los efectos" que más le importa y el fin de la doble digitación.

**4. Los no-negociables que ya protegen esta visión —y que exijo que sigan como criterios de cierre de cada FIN del programa:**
- **Separación estricta de conceptos (§32).** El Fundador la pide como novedad; es, de hecho, la disciplina que las últimas diez FIN institucionalizaron (payment-breakdown FIN-023, cupo/saldo derivados aparte en `CardService`). Capital, interés, seguro, mora, cupo, saldo: cada uno una definición, nunca uno reutilizado como otro. Es fortaleza existente, no deuda nueva. Sigue siendo grep de cierre.
- **§42 — visible, explicable, reversible — por encima de todo.** La cascada automática y el registro por lenguaje natural ("compré un portátil… a 24 cuotas") son justo donde una interpretación equivocada corrompe nueve pantallas en silencio. Todo lo que el bot o la IA cree se **confirma antes de comprometer y se puede deshacer** (la disciplina que ya fijé para FIN-029). El registro por NL nunca es "mágico y ciego"; es "propuesto, confirmado, reversible".
- **Proactividad ≠ ansiedad.** La "inteligencia de actualización" es bienvenida y el propio Fundador puso el límite correcto ("nunca preguntar cada mes lo que nunca cambia"). Lo hago principio: Milla pregunta solo ante señal real de cambio, callada sobre lo estable — coherente con "calmada, no ansiosa" (PRODUCT_VISION §7). Config por modalidad de qué cambia/qué no.
- **Independencia en el catálogo de entidades.** Que Milla reconozca "Visa Bancolombia" es reconocimiento, no recomendación. Nunca rankeará ni sugerirá una entidad como "mejor" — el catálogo ayuda a registrar, jamás a vender. Y degrada con gracia: si la entidad no está, el camino libre siempre existe; nadie queda bloqueado por un catálogo incompleto.
- **Gate DPA+PIA** sigue gobernando la IA con datos reales (`PRODUCCION.md` §1). El diseño avanza; la habilitación con datos reales no, hasta cerrar el gate.

**5. Pushback honesto sobre "resuelto para siempre / cientos de modalidades / nuevos países".** No firmo un criterio de cierre infinito —es infalsable y volvería imposible cerrar ninguna FIN. Traduzco la aspiración a algo **comprobable**, igual que hicimos con FIN-032: el criterio no es "hemos previsto todo el futuro", sino **"agregar una modalidad nueva se hace solo por configuración, sin tocar la interfaz — y lo probamos añadiendo una modalidad por config como test de aceptación"**. Si eso se cumple, la escalabilidad a lo que venga es evidencia, no promesa. La arquitectura se diseña *hacia* multi-país/multi-regulación; no se declara *terminada* para casos que aún no existen.

**Prioridad de producto recomendada para tu desglose FIN (ordenada por el Principio Supremo del propio Fundador — pensar menos, registrar más rápido, sentirse entendido; el orden y la numeración son tuyos):**
- **P1 — Selector moderno + catálogo de entidades.** Máxima reducción de fricción diaria, responde directo a la queja del Beta, es la puerta de entrada y el "wow" de app de primer nivel. Reemplaza el muro de chips.
- **P2 — Registrar como puerta ("¿cómo pagaste?" completo) + cascada visible/reversible por método.** Sobre la espina de FIN-031. El fin de la doble digitación.
- **P3 — Inteligencia de actualización / proactividad (confirmación mensual, config de qué-cambia-qué-no).** El "me entiende mejor que mi banco", pero depende de cadencia de uso real: justo después de P1/P2.
- **P4 — Profundidad bancaria real por modalidad** (sobrecupo, avances, retanqueo, período de gracia, etc.): **progresiva y guiada por lo que los usuarios Beta realmente tienen**, no modelando los ~50 eventos de las 19 modalidades por adelantado. Cada evento entra cuando un usuario lo topa.
- **Transversal siempre-activo:** §32, §42, config-sin-código como test de aceptación, gate DPA+PIA, calma-no-ansiedad, Independencia del catálogo.

**Lo que NO hago:** no diseño el motor de entidades, el esquema de modalidades ni las cascadas —es de Arquitectura. Mi encargo: que cada FIN del programa respete el principio del punto 2, los no-negociables del 4 y el criterio comprobable del 5, con §31 y §32 como aceptación explícita. El desglose FIN y la secuencia son tuyos, reconciliados con `BACKLOG.md` y sin reabrir FIN-030.

Adelante, como programa continuo sobre la fundación, prioridad máxima en P1–P2.

MENSAJE PARA CTO

---

## 2026-07-14 — De: CPSAO — Para: Fundador — CC: CTO, Arquitecto, Auditor

Recibida y hecha decisión de producto. Comparto entera la ambición: que registrar cualquier obligación tome menos de un minuto y que Millo se sienta como un asesor que entiende tu vida financiera mejor que tu banco es exactamente el diferencial que perseguimos.

Tres cosas que quiero que sepas de cómo la aterricé, porque protegen justo lo que te importa:

**Primero, una buena noticia:** el motor dinámico que pides —donde agregar un producto es solo configuración, sin tocar pantallas— no hay que inventarlo; es la base que el equipo acaba de construir y auditar. Lo que describes ahora es hacerla profunda y hermosa encima, no empezar de cero. Eso nos ahorra meses y evita rehacer lo que ya funciona.

**Segundo, resolví la única contradicción del plan:** pediste realismo bancario total *y* registro en menos de un minuto. La forma de tener ambos es que la riqueza viva en el modelo a lo largo del tiempo, no en el formulario de entrada. El usuario da lo mínimo para empezar; Millo va representando la realidad completa a medida que las cosas pasan —una compra internacional se registra cuando ocurre, no como una casilla más el día que agregas la tarjeta—. Así el realismo no mata la sencillez.

**Tercero, te di la razón en algo nuestro:** la pantalla actual de agregar deuda es un muro de botones, justo lo que no quieres. El selector con búsqueda y el reconocimiento de entidades ("Visa" → tu banco) es lo primero que priorizo, porque es lo que más se siente como una gran app y lo que más ataca la queja del Beta.

La única línea que no crucé fue declarar el dominio "resuelto para siempre": en vez de prometer que previmos todo el futuro, lo dejo comprobable —agregar una modalidad nueva debe hacerse solo con configuración, y lo probamos—. Con eso, tu objetivo real (no volver a rediseñar este capítulo) queda protegido de verdad, no solo enunciado.

MENSAJE PARA FUNDADOR

---

## 2026-07-14 — De: CTO — Para: Arquitecto — CC: Fundador, CPSAO, Auditor

**Asunto:** DEC-0033 — Programa EOC abierto; desglose FIN-034…037; ARQ-0034 (P1) habilitado

Acojo la visión y la decisión de producto del CPSAO. La convierto en programa continuo con dos
verificaciones que hice yo contra el código antes de comprometer nada:
- El **motor por configuración YA existe** (`PRODUCT_TYPE_DESCRIPTORS` + `scheduleModel` +
  `DebtOutlayService` + capa de consecuencias) — auditado en CIERRE-0032. **No reabrimos FIN-030.**
- El **motor de entidades YA existe** (`FinancialEntity` con `type`/`typicalRate`/`logoUrl`/
  `isGlobal` + módulo `entities` con CRUD; `Debt`/`Transaction`/`Account` ya referencian
  `entityId`). P1 **extiende**, no construye de cero.

**Numeración (protejo §32):** el memo llegó titulado "DEC-0030", pero ese número ya es la
fundación consolidada. El programa queda como **`DEC-0033`** (`docs/oficial/DEC-0033-*.md`).

**Desglose FIN (reconciliado con BACKLOG):**
- **FIN-034 (P1)** — Selector moderno + catálogo de entidades (búsqueda/autocomplete/1ª persona);
  reemplaza el muro de 12 chips. **Primera en abrir.**
- **FIN-035 (P2)** — Registrar como puerta ("¿cómo pagaste?" + cascada §42). **Toca Registrar.**
- **FIN-036 (P3)** — Inteligencia de actualización + confirmación mensual (absorbe parte del viejo FIN-033).
- **FIN-037 (P4)** — Profundidad bancaria por modalidad, Beta-guiada (absorbe la otra parte de FIN-033).
- **Antiguo FIN-033**: dividido en FIN-036+FIN-037, marcado superado (sin definición duplicada).

**Criterios transversales de cierre de CADA FIN** (DEC-0033 §4): §32 (grep), §42
(propuesto/confirmado/reversible), **config-sin-código como test de aceptación** (agregar una
modalidad solo por config, probado), gate DPA+PIA, Independencia del catálogo, calma-no-ansiedad.

**Directiva `ARQ-0034` (P1):** diseña el selector moderno de obligaciones + la extensión del motor
de entidades — siembra del catálogo global (`isGlobal`), endpoint de búsqueda/autocomplete, y el
alta que **interpreta configuración** (no chips por tipo). Honra: guardarraíl B (alta mínima),
§32, Independencia del catálogo (reconocimiento no recomendación + degradación con gracia si la
entidad no está), y el **test config-sin-código**. NO toca la cascada de Registrar (eso es P2).
Entrega con SHA para validación del CTO. **Un FIN a la vez** — solo P1.

**MENSAJE PARA ARQUITECTO** — emitir `ARQ-0034` (P1: selector moderno + motor de entidades,
extendiendo lo existente); no tocar la cascada de Registrar; SHA para validación del CTO.

---

## 2026-07-14 — De: CTO — Para: Fundador — CC: CPSAO, Arquitecto, Auditor

**Asunto:** AVISO ANTICIPADO — FIN-035 (P2) tocará Registrar; necesito tus observaciones antes de abrir su ARQ

Por tu instrucción permanente: **FIN-035 (Registrar como puerta — "¿cómo pagaste?" + cascada)
toca de lleno el módulo de Registrar/Transacciones.** No abriré su diseño (ARQ) hasta que me
entregues tus observaciones, como hicimos con FIN-028 y FIN-030. No es ahora —primero va P1
(FIN-034, el selector, que NO toca Registrar)— pero te aviso con tiempo para que vayas pensando
cómo quieres el flujo "¿cómo pagaste?" antes de que lleguemos ahí.

**Recordatorio de release:** el frontend de FIN-034 (el selector) es justo la "otra modificación
relacionada" que esperábamos → cuando cierre, hacemos **una sola publicación OTA** con FIN-032.

**MENSAJE PARA FUNDADOR** — P1 (selector) en marcha; cuando toque P2 (Registrar) te pediré tus
observaciones primero. ¿Alguna guía temprana para el selector antes de que el Arquitecto diseñe?
