# PRODUCT_VISION.md — Constitución del Producto Milla

- **Versión:** 1.2 — **OFICIAL**
- **Fecha:** 2026-07-06
- **Autor:** CTO — v1.1 redactada siguiendo la estructura de 12 secciones propuesta por
  el CPSAO; v1.2 incorpora los 7 ajustes solicitados por el CPSAO tras revisar v1.1.
- **Estado:** **Vigente.** Ratificada expresamente por el Fundador el 2026-07-06, previa
  evaluación conceptual del CPSAO y evaluación técnica/documental del CTO. Es la
  Constitución del Producto Milla — referencia estratégica principal del proyecto, con
  prioridad sobre cualquier propuesta funcional futura (Gobernanza v3.0, Parte II §16).
  Las secciones marcadas internamente como "propuesta abierta" quedan vigentes como
  punto de partida oficial, no como decisiones cerradas para siempre — pueden
  evolucionar en versiones futuras, solo mediante el mismo proceso (evaluación del
  CTO + aprobación expresa del Fundador).
- **Historial de cambios:**
  - v1.0 (2026-07-06) — scaffold inicial del CTO, sin estructura de 12 secciones.
  - v1.1 (2026-07-06) — reescrito siguiendo la estructura propuesta por el CPSAO;
    contenido derivado de decisiones ya documentadas donde existe respaldo; puntos sin
    respaldo marcados como propuesta abierta.
  - v1.2 (2026-07-06) — ajustes solicitados por el CPSAO tras revisar v1.1: (1) alcance
    geográfico abierto a expansión internacional futura, (2) sección "Personalidad de
    Milla", (3) Visión reescrita en tono aspiracional, (4) "¿Por qué existe Milla?"
    como apartado explícito desde perspectiva humana, (5) sección "La obsesión de
    Milla", (6) promesa al usuario convertida en promesa verificable/medible, (7)
    cierre con "Manifiesto de Milla". Ninguno de estos ajustes modifica la gobernanza
    ni las decisiones técnicas ya ratificadas (`DEC-0004`, `DEC-0008`, `DEC-0009`).
  - **v1.2 — OFICIALIZADA el 2026-07-06** por decisión expresa del Fundador, tras
    recomendación del CPSAO y evaluación del CTO. Pasa de borrador a documento
    fundacional vigente.
- **Referencias cruzadas:** `ARQ-0001`, `DEC-0004`, `DEC-0008`, `DEC-0009`,
  `docs/producto/PRODUCT_DECISIONS.md`, `docs/producto/COMPETITIVE_ANALYSIS.md`,
  `docs/producto/MONETIZATION.md`, `docs/GOBERNANZA.md` (Parte II §10-16).

---

## Nota de evaluación del CTO

Los 7 ajustes del CPSAO son de identidad y tono, no de gobernanza ni de rumbo técnico
— se aceptan sin objeción. Se mantiene la misma disciplina de v1.1: todo lo que no
tiene respaldo en un documento oficial previo (`DEC`/`ARQ`) queda marcado como
propuesta abierta, incluida la nueva sección de alcance internacional, que es una
posibilidad declarada, no una decisión de expansión tomada — Milla sigue operando y
diseñándose hoy exclusivamente para Colombia (moneda, regulación, canales de pago
IAP, WhatsApp/Telegram locales). El documento completo permanece en borrador,
pendiente de ratificación del Fundador.

---

## 1. ¿Por qué existe Milla?

Milla existe porque tomar decisiones con dinero da miedo cuando no se entiende la
propia situación. No es un problema de falta de disciplina ni de falta de una app de
gastos: es la ausencia de una fuente de verdad propia, honesta y sin letra pequeña,
sobre lo que de verdad está pasando con la deuda, el presupuesto y el patrimonio de
una persona. Milla existe para que esa claridad exista antes de decidir, no después
de arrepentirse.

*(Base: consistente con `ARQ-0001` y con la decisión de un Score explicable en
`PRODUCT_DECISIONS.md`. Redacción propia del CTO — pendiente de ratificación del
Fundador.)*

## 2. Nuestra Misión

*Propuesta abierta, sin decisión fundacional previa.* Ayudar a que cada persona
entienda su situación financiera real y pueda tomar, con esa claridad, mejores
decisiones sobre su deuda, su presupuesto y su patrimonio — todos los días, no solo
una vez al mes al revisar un extracto. Hoy esa persona vive en Colombia; el diseño de
Milla no cierra la puerta a que mañana viva en cualquier otro país con retos
financieros similares (ver sección 5).

## 3. Nuestra Visión

*Propuesta abierta — reescrita en v1.2 en tono aspiracional, por solicitud del CPSAO.*
Un mundo donde nadie tome una decisión financiera importante a ciegas. Donde la
claridad sobre el propio dinero no sea un privilegio de quien puede pagar un asesor,
sino algo que cualquier persona lleva en el bolsillo. Milla aspira a ser la razón por
la que, dentro de cinco años, "no sabía en qué se me iba la plata" sea una frase del
pasado para millones de personas — empezando por Colombia, sin quedarse ahí.

## 4. Problema que resolvemos

Antes de Milla: las personas dispersan su información financiera entre apps
bancarias, mensajes de texto, memoria y hojas de cálculo improvisadas; no tienen forma
de simular el efecto real de un abono a capital o un cambio de ingreso antes de
tomarlo; y las herramientas existentes premian el registro pasivo de gastos sin
traducirlo en una lectura accionable de salud financiera.

Con Milla: la persona tiene un solo lugar que consolida deuda, presupuesto y
patrimonio, con un Score explicable (no una caja negra, ratificado en `DEC-0004`) y un
simulador que muestra el efecto real de una decisión antes de tomarla (`FIN-007`,
`FIN-012`).

## 5. Usuario objetivo

*Propuesta abierta, a refinar por el CPSAO con evidencia real (`USER_RESEARCH.md`).*
Hoy: personas en Colombia con ingreso formal o variable, con al menos una deuda activa
(tarjeta, libranza, crédito de consumo), que ya intentan controlar sus finanzas con
algún método manual pero no tienen claridad ni proyección — no personas sin ningún
ingreso ni personas con patrimonio complejo que ya usan un asesor financiero
profesional (fuera del alcance actual).

Alcance geográfico: **Colombia es el mercado inicial, no el límite del producto.** Por
solicitud del CPSAO, se deja explícito que Milla no está diseñado con supuestos que
impidan una expansión internacional futura (multi-moneda, multi-regulación) — esa
expansión no está decidida ni planificada hoy, y cualquier paso en esa dirección
requiere su propia evaluación de negocio, legal y técnica antes de convertirse en
Blueprint o `FIN`.

## 6. Qué NO es Milla

- No es un neobanco ni una entidad captadora de dinero — decisión explícita ya tomada
  para la proyección de ahorro (`PRODUCT_DECISIONS.md`, 2026-07-06): Milla nunca capta
  ni ofrece rendimiento real, solo proyecta.
- No es un asesor financiero automatizado que decide por el usuario — el Copiloto
  acompaña, no sustituye la decisión (ver Principios, sección 8).
- No es una app de gamificación que premia el uso por el uso — la gamificación
  refuerza comportamiento financiero real, "sin infantilizar" (ratificado en
  `DEC-0008`).
- No es un producto que vende o comparte el Score o los datos financieros del usuario
  con terceros — guardarraíl legal permanente (`DEC-0009` §4.5.6).

## 7. Personalidad de Milla

*Propuesta abierta — sección nueva por solicitud del CPSAO.* Cómo se comporta Milla
frente al usuario, no qué funciones tiene:

- **Honesta antes que amable.** Si el número es malo, Milla lo dice claro — sin
  alarmismo, pero sin suavizarlo hasta volverlo inútil.
- **Calmada, no ansiosa.** Milla no genera urgencia artificial ni notificaciones de
  culpa; informa y deja que la persona decida con calma.
- **Adulta, no paternalista.** Le habla al usuario como a un adulto capaz de manejar su
  dinero, nunca como a alguien que necesita ser vigilado o premiado como a un niño
  (consistente con "sin infantilizar", `DEC-0008`).
- **Explicable siempre.** Ninguna cifra ni recomendación aparece sin que el usuario
  pueda entender de dónde sale (consistente con el Score no-caja-negra, `DEC-0004`).

## 8. Principios del producto

Los siguientes ya están ratificados en documentación oficial existente y se elevan
aquí como principios permanentes del producto:

- El usuario es dueño de su información; el Score y los indicadores nunca se comparten
  con terceros (`DEC-0009` §4.5.6).
- El plan free fideliza con valor real — nunca se gatea el Score actual, los
  indicadores ni el registro básico (`DEC-0004`, `DEC-0009`).
- La IA acompaña, no sustituye la decisión del usuario — el Copiloto opera con
  minimización de datos por diseño y vistas minimizadas obligatorias para toda tool de
  LLM (`docs/GOBERNANZA.md`, regla permanente).
- Sobriedad de tono — se recompensa comportamiento financiero real sin infantilizar
  (`ARQ-0001`, ratificado en `DEC-0008`).
- Ninguna funcionalidad se implementa solo porque sea técnicamente posible; debe
  demostrar valor real antes de convertirse en `FIN` (`docs/GOBERNANZA.md`, Parte II
  §16).

## 9. La obsesión de Milla

*Propuesta abierta — sección nueva por solicitud del CPSAO.* El principio que guía
toda decisión estratégica cuando hay duda: **claridad antes que cobertura.** Ante la
tentación de agregar una función más, un dato más, una pantalla más, la pregunta que
decide no es "¿podemos construirlo?" sino "¿esto hace que el usuario entienda mejor su
situación financiera y decida con más confianza?". Si la respuesta no es un sí claro,
la función espera en el Laboratorio (sección 12), sin importar cuán fácil sea de
construir.

## 10. Diferenciadores estratégicos

*Propuesta abierta — a validar contra evidencia real en `COMPETITIVE_ANALYSIS.md`
(hoy vacío).* Hipótesis de partida, no verificada: mientras la mayoría de apps
financieras en Colombia se centran en agregar y categorizar transacciones, Milla se
diferencia por dar una lectura explicable de salud financiera (Score no-caja-negra) y
por dejar simular decisiones reales antes de tomarlas, en vez de solo reportar lo que
ya pasó.

## 11. Promesa al usuario

*Propuesta abierta, pendiente de ratificación del Fundador — convertida en v1.2 en
promesa verificable, por solicitud del CPSAO.* "En menos de un minuto, Milla te dice
en qué estás parado financieramente hoy, y qué cambiaría si tomas tu próxima
decisión." Es verificable porque se puede medir: tiempo hasta ver el Score/dashboard
desde que se abre la app, y si el simulador de una decisión (abono, refinanciación,
cambio de ingreso) entrega un resultado antes de que el usuario actúe en la vida real.
Estos dos indicadores son candidatos naturales para `docs/producto/METRICS.md` una vez
haya datos reales — hoy no hay medición en producción, por lo que la promesa se
declara pero no se reporta todavía como cumplida.

## 12. Principios de evolución

- Toda nueva funcionalidad debe poder responder afirmativamente los criterios de la
  sección 13 antes de convertirse en `FIN`.
- La innovación nunca justifica aumentar la complejidad sin aportar valor verificable
  (ya vigente como regla permanente de Gobernanza, Parte II §16).
- El crecimiento del producto se guía por necesidades reales del usuario, verificadas
  en `USER_RESEARCH.md` — no por intuición ni por lo que hacen los competidores sin
  evidencia (`COMPETITIVE_ANALYSIS.md`, nota de verificación de hechos).

## 13. Criterios para aceptar nuevas funcionalidades

Antes de que una idea del Laboratorio de Producto (`lab/LAB.md`) se convierta en
Blueprint y luego en `FIN`, el CPSAO y el CTO deben poder responder afirmativamente:

1. ¿Resuelve un problema real del usuario (con evidencia, no solo intuición)?
2. ¿Refuerza la propuesta de valor central (claridad + simulación honesta)?
3. ¿Se alinea con la visión, la personalidad y la obsesión de este documento?
4. ¿Aporta una ventaja competitiva verificada, no asumida?
5. ¿Es coherente con lo que Milla explícitamente no es (sección 6)?

Si alguna respuesta es negativa, la idea permanece en el Laboratorio hasta nueva
evaluación — no bloquea el resto del Backlog, ni el CPSAO puede insertarla
directamente saltándose al CTO (Gobernanza v3.0, Parte II §14, protección del embudo).

## 14. Vigencia del documento

Este documento es vivo. Solo se modifica mediante aprobación expresa del Fundador,
previa evaluación del CTO. Todo cambio se registra en el "Historial de cambios" de la
cabecera, con versión, fecha y motivo — conforme a la regla de Versionado documental
de la Gobernanza v3.0 (Parte III §18).

---

## Responsabilidades

- **CPSAO:** define, revisa y propone la evolución de este documento.
- **CTO:** custodia el documento, verifica su coherencia con la Gobernanza, y evalúa que
  toda propuesta futura (Blueprint, `FIN`) sea consistente con su contenido antes de
  autorizar el paso siguiente. El CTO no decide unilateralmente el propósito
  estratégico — lo evalúa y lo eleva al Fundador para ratificación.

---

## Manifiesto de Milla

*Propuesta abierta — cierre solicitado por el CPSAO como referencia cultural para
cualquier persona o IA que participe en el proyecto.*

> Creemos que nadie debería tomar una decisión de dinero a ciegas.
> Creemos que la claridad se explica, nunca se impone ni se esconde en una caja negra.
> Hablamos claro incluso cuando el número no es el que el usuario quería escuchar.
> Acompañamos la decisión; nunca la tomamos por nadie.
> No construimos una función más solo porque podemos — solo si ayuda a decidir mejor.
> Milla no es un banco, no es un asesor que reemplaza al usuario, no es una app que
> premia el uso por el uso.
> Milla es la claridad que alguien necesitaba antes de decidir.
