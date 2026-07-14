# Correspondencia — FIN-027 · Evolución del modelo de ingresos personales

Hilo append-only. Convención EOC.

---

## 2026-07-13 — De: CTO — Para: Arquitecto — CC: CPSAO, Auditor, Fundador

**Asunto:** Directiva de apertura FIN-027 — diseñar el ARQ del modelo de ingresos
**Estado:** ARQ autorizado (fase de diseño en paralelo, excepción documentada a "un FIN a la vez").

**Objetivo (del Fundador).** Que Millo represente la realidad financiera de distintos
tipos de usuario, no solo "un salario". El usuario configura esto **una sola vez**
(onboarding o perfil financiero) y Millo **reutiliza** esa configuración para calcular
automáticamente **ingreso bruto → deducciones → ingreso neto disponible**, sin que el
usuario repita cálculos cada mes.

**Alcance mínimo a estudiar e incorporar:**
1. **Perfil laboral:** empleado, independiente, empresario, pensionado, estudiante, otro.
2. **Configuración de ingresos:** salario fijo, ingresos variables, comisiones,
   bonificaciones, honorarios, otros ingresos.
3. **Deducciones automáticas configurables:** salud, pensión, otras deducciones.

**Precisiones del Fundador que el ARQ debe modelar explícitamente (no asumir):**
- Un salario puede tener **deducciones por ley** y es **ingreso fijo** (monto estable).
- Escenario combinado real: una persona con **salario fijo (ingreso fijo)** *y*
  **salario variable (ingreso variable, porque su monto varía)** simultáneamente. El
  modelo debe permitir coexistencia de ambos, no obligar a elegir uno.
- **La base de la deducción es configurable:** en algunos casos salud/pensión se
  descuentan **sobre la totalidad** del ingreso y en otros de forma **parcial** (solo
  sobre una porción). El ARQ debe permitir declarar la **base de cotización** por
  deducción (total vs. parcial, y el monto/porcentaje parcial cuando aplique). Este es
  un requisito duro: sin él, el ingreso neto sería incorrecto para una parte real de los
  usuarios.

**Impacto a analizar (obligatorio en el ARQ):** cómo este modelo afecta y se integra con
**Salud Financiera, Motor Financiero, Presupuestos, Copiloto, Proyecciones y Reportes**.
El "ingreso neto disponible" que produzca este modelo debe ser **la única definición
oficial** de ese concepto (§32): ninguna otra pantalla puede recalcularlo con otra
fórmula. Diseñar por construcción para que todos los consumidores lo inyecten.

**Restricciones:**
- No implementar sin pasar por AUD y DEC (flujo ARQ→AUD→DEC).
- No tocar la infraestructura validada (Render/Neon/Expo/EAS Update).
- Pregunta de valor diferencial (§31) obligatoria en el ARQ.
- **Aviso:** la captura de ingresos toca el registro de movimientos; si el diseño llega
  a modificar el módulo Registrar/Transacciones, **detente y avísame** — hay una
  instrucción permanente del Fundador de hacer observaciones previas sobre ese módulo
  (ver `FIN-028`).

**MENSAJE PARA ARQUITECTO** — emitir `ARQ-0027` con lo anterior; una sola funcionalidad,
diseño detallado propio.

---

## 2026-07-13 — De: Arquitecto — Para: CTO — CC: Auditor, CPSAO, Fundador

**Estado**
`ARQ-0027` v1.0 emitido — `docs/arquitectura/ARQ-0027-Modelo-de-Ingresos.md`, commit `0b1b044` (rama de trabajo, §36.2). Registrar/Transacciones NO se toca.

**Conclusión**
Modelo de 3 piezas (perfil laboral · fuentes fijas y variables coexistentes · deducciones con **base de cotización configurable total/parcial**, el requisito duro) + `NetIncomeService` en módulo hoja como ÚNICA definición del ingreso neto disponible (§32, patrón SpendableService). Hallazgo de diseño no pedido pero necesario: el flag **`withheldAtSource`** — una deducción retenida en la fuente solo reduce el neto; una pagada por la usuaria (independiente con su PILA) es ADEMÁS compromiso del ciclo y fluye a teQueda por inyección; sin él, o se infla el "Te queda" del independiente o se doble-descuenta al empleado. Impacto en los 6 consumidores analizado (tabla P4); regresión garantizada: sin perfil configurado, cifras idénticas a hoy.

**Decisiones que dejo al DEC (no las tomo solo):** (1) ¿DTI/Score sobre neto o bruto? — recomiendo neto ("nunca mentir hacia arriba", efecto declarado: Score baja para quien registre deducciones); (2) P2: migración de los FixedItem de ingreso a fuentes (recomendada) vs coexistencia (la rechazo: §32 roto de nacimiento).

**Bloqueos:** ninguno.

MENSAJE PARA CTO

---

## 2026-07-13 — De: Arquitecto — Para: Auditor — CC: CTO, CPSAO, Fundador

**Corrección de destinatario (señalada por el Fundador — el flujo §36.2 es CTO → Arquitecto → AUDITOR → CTO):** mi mensaje anterior debió dirigirse a ti. El `ARQ-0027` v1.0 de este hilo queda a tu disposición para tu AUD; todo el contenido del mensaje anterior (SHA, hallazgos y puntos de verificación) aplica tal cual. El aviso al CTO queda cumplido por esta CC.

**Bloqueos:** ninguno. No implemento nada hasta el DEC.

MENSAJE PARA AUDITOR

---

---

## 2026-07-13 — De: CTO — Para: CPSAO — CC: Fundador, Arquitecto, Auditor

**Asunto:** Consulta de producto — DTI/Score sobre ingreso NETO o BRUTO (bloquea `DEC-0027`)
**Estado:** Consulta. `DEC-0027` en espera de esta definición (turno 2 de la secuencia; no bloquea a `IMP-0028` en curso).

El `ARQ-0027`/`AUD-0027` dejan a mi DEC una decisión que es **de producto**, no técnica —
por eso te la consulto antes de decidir. Verificado en código: hoy el DTI, el ahorro y el
Score se calculan sobre el **ingreso bruto** (`core-metrics.ts:36`, `incomeRef=max(fixedIncome,actualIncome)`).
Al introducir deducciones configurables (salud/pensión, base total/parcial), hay que
decidir la base del ratio de endeudamiento y del Score:

**Opción A — NETO** (recomendada por el Arquitecto: "nunca mentir hacia arriba").
- A favor: refleja la capacidad real de pago; el "Te queda" y el Score dicen la verdad de
  lo disponible.
- En contra: **efecto declarado — el Score BAJA para quien registre deducciones** (su DTI
  sube al reducir el denominador). Un usuario podría percibir que "empeoró" solo por
  configurar bien sus datos.

**Opción B — BRUTO** (mantiene el comportamiento actual).
- A favor: continuidad, no penaliza al que registra deducciones.
- En contra: sobreestima la capacidad de pago; rompería §32 si algunas pantallas usan neto
  y otras bruto (habría que documentar la dualidad como excepción explícita).

**Mi lectura como CTO:** A es más honesto y coherente con "el rojo no culpa / lenguaje
humano" (§29), pero el efecto en el Score es sensible para Confianza y es tu terreno.
Podría además mitigarse con copy (explicar por qué el Score refleja mejor la realidad).

**Decisión que necesito de ti:** ¿neto o bruto? Si neto, ¿quieres una nota de copy que
explique el cambio del Score al usuario? Con tu respuesta emito `DEC-0027`.

**MENSAJE PARA CPSAO** — se solicita definición de producto: DTI/Score sobre neto o bruto.

---

## 2026-07-13 — De: CPSAO — Para: CTO — CC: Fundador, Arquitecto, Auditor

**Decisión: NETO.** No es un empate de opciones — es la misma decisión que ya tomamos tres veces (fondo de emergencia, desembolso real de deuda, "te queda"): nunca mentir hacia arriba, aunque el número duela. Bruto aquí sería peor que las veces anteriores, porque introduciría una incoherencia nueva: "Te queda" ya vive de lo real (transacciones), y si Score/DTI se quedan en bruto mientras el resto del sistema converge a neto, tenemos exactamente el tipo de fractura entre pantallas que las últimas cuatro FIN se dedicaron a eliminar.

**Condición, no opcional:** sí quiero la nota de copy, y no como algo bonito sino como requisito del DEC. El riesgo real no es que el Score baje — es que configurar bien tus datos parezca un castigo, lo cual empujaría al usuario a NO declarar sus deducciones para no "verse peor". Eso sería perverso: premiar la opacidad. La nota debe decir, en la pantalla de Salud donde cae el indicador, algo como: "tu Score bajó porque ahora calculamos con tu ingreso real después de deducciones — es más preciso, no que hayas empeorado". Mismo recurso que ya usamos en el hero de Inicio (FIN-020) y en el fondo de emergencia (FIN-021) para el "costo de honestidad".

Con esto, adelante con `DEC-0027`.

---

## 2026-07-13 — De: CPSAO — Para: Fundador — CC: CTO, Arquitecto, Auditor

**Sobre los 3 frentes:** autorizados por ti, no requieren mi aprobación — pero ya que me escribes directo, mi lectura rápida de cada uno:

- **Frente 1 (ingresos):** ya en marcha como `FIN-027`, mi única condición era la de arriba (neto + copy obligatorio). Sin objeciones adicionales.
- **Frente 2 (editar/eliminar movimientos):** es una brecha real de uso diario, no una decisión de producto discutible — apruebo sin reservas. Solo pido que la trazabilidad (anulación lógica, no borrado físico) quede visible para la usuaria de alguna forma si algún día audita sus propios movimientos, no solo como requisito técnico interno.
- **Frente 3 (Telegram):** de acuerdo con "un solo motor conversacional" — es exactamente la disciplina de Consistencia que ya aplicamos en producto, ahora en el motor conversacional. Cuando llegue al ARQ el diseño de qué puede responder el bot, quiero revisar que respete Independencia y Claridad Radical igual que el resto de Millo (nada de recomendar productos por conveniencia, todo explicable) — lo reviso cuando llegue esa pieza, no bloquea el arranque del diseño.

MENSAJE PARA CTO Y FUNDADOR

---

## 2026-07-13 — De: CTO — Para: Arquitecto — CC: CPSAO, Auditor, Fundador

**Asunto:** DEC-0027 emitida — IMP-0027 habilitado
**Estado:** Decidida. `IMP-0027` autorizado (2º de la secuencia; `IMP-0028` cerrado).

Verifiqué la premisa (`core-metrics.ts:36` usa bruto — confirmado). `DEC-0027` emitida con
la decisión del CPSAO. 4 cambios obligatorios: **(1) nota de copy en Salud** (requisito, no
opcional: "tu Score bajó porque ahora calculamos con tu ingreso real después de
deducciones — es más preciso, no que hayas empeorado", patrón costo-de-honestidad
FIN-020/021); **(2) migración de los `FixedItem` de ingreso al modelo de fuentes**, NO
coexistencia (§32); **(3) `NetIncomeService` única definición del neto**, los 6 consumidores
lo inyectan; **(4) regresión: sin perfil, cifras idénticas a hoy** (test). `withheldAtSource`
aprobado. DTI/Score sobre NETO. Si el IMP roza el módulo Registrar, detente y avísame.

**MENSAJE PARA ARQUITECTO** — emitir `IMP-0027` con los 4 cambios obligatorios de `DEC-0027`; entregar con SHA para validación del CTO.
