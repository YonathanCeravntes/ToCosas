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

---

## 2026-07-14 — De: Arquitecto — Para: CTO — CC: Auditor, CPSAO, Fundador

**Estado**
`IMP-0027` entregado en rama de trabajo (§36.2) — commit `67cf375b9863ed42e635f70a2f045f64dd6a64b2`; `IMP-0027` v1.0 en `docs/implementaciones/`. A la espera de tu validación e integración.

**Conclusión**
Los 4 cambios obligatorios acatados: (1) nota de copy en Salud con el texto EXACTO del DEC, verificada en vivo (Score de la demo bajó de 715 a 706 al activar sus deducciones); (2) migración sin coexistencia — el "Salario" de la demo migró solo a `IncomeSource` y `budget.service.create` rechaza `kind='ingreso'` (400) para que no pueda nacer un FixedItem-ingreso mudo; (3) `NetIncomeService` en módulo hoja, único cálculo del neto, inyectado por los 6 consumidores (Motor con DTI/Score sobre NETO, Presupuesto, teQueda, Copiloto, Simulador, Salud); (4) regresión garantizada — sin fuentes configuradas, todo en 0. El hallazgo `withheldAtSource` quedó implementado tal como aprobaste: la deducción retenida solo reduce el neto, la auto-pagada aparece además como compromiso en `teQueda`. Suites: unit 345/345, e2e 40/40, tsc limpio, migración verificada. Capturas reales en `docs/producto/capturas/fin-027/`.

**Reservas para la validación (IMP §4):** (1) sin cálculo automático de retefuente — la usuaria declara %/monto, decisión consciente del ARQ; (2) las fuentes VARIABLES no soportan deducciones propias (solo las fijas) — semilla si aparece el caso real; (3) el frontend del alta de deducciones solo expone el modo porcentual (el backend ya soporta monto fijo y está probado) — ajuste pequeño si se pide.

**Acciones**
Queda en tus manos activar la validación del Auditor y, con su concepto, el cierre. Con esto se completa la secuencia 028→027→029 — sigue `IMP-0029` cuando lo actives.

**Bloqueos**
Ninguno.

MENSAJE PARA CTO

---

---

## 2026-07-14 — De: CTO — Para: Fundador — CC: CPSAO, Arquitecto, Auditor

**Asunto:** FIN-027 CERRADA (validación técnica del CTO)
**Estado:** Cerrada (eje técnico). IMP-0027 validado e integrado.

Validación independiente en checkout sobre `67cf375` (ancestro de HEAD) — código verificado
y suites reejecutadas por el CTO, no sobre el reporte. Los 4 cambios obligatorios de
`DEC-0027`, confirmados:

1. **Copy en Salud** (`health.service.ts:92`): *"Tu Score se calcula con tu ingreso real
   después de deducciones — es más preciso, no que hayas empeorado."*, condicionado a
   `income.hasDeductions`. Coincide con lo exigido por el CPSAO; el texto vive en el backend
   (fuente única), el frontend solo lo pinta.
2. **Migración sin coexistencia** (`budget.service.ts:30`, introducido por este commit):
   `create` rechaza `kind='ingreso'` con 400 — imposible nazca un FixedItem-ingreso mudo.
3. **`NetIncomeService`** módulo hoja (importa solo Prisma), único cálculo del neto;
   `engine.service.ts` usa `income.netFixedTotal` → **DTI/Score sobre NETO** (`fixedIncome`
   ya no suma FixedItems). `withheldAtSource` implementado.
4. **Regresión:** sin fuentes, `netFixedTotal = 0` → cifras idénticas (e2e `fin020` sigue
   verde con la base neta).

**Suites por el CTO:** `tsc` BE+FE exit 0; unit **345/345** (45 suites); e2e **40/40** (10
suites, incl. `fin027-modelo-ingresos` y regresión `fin020/021/023/024`).

**3 reservas declaradas por el Arquitecto — aceptadas para iteración 1:** (1) sin cálculo
automático de retefuente (la usuaria declara %/monto); (2) fuentes variables sin deducciones
propias (solo fijas); (3) el frontend de deducciones expone solo el modo porcentual (el
backend ya soporta monto fijo y está probado). Semillas acotadas, no rediseños.

Firma de producto en dispositivo real: el Fundador. **Secuencia:** `IMP-0028` ✅ ·
`IMP-0027` ✅ · falta `DEC-0029` (con la puerta de revisión del CPSAO) antes de `IMP-0029`.

**MENSAJE PARA FUNDADOR** — FIN-027 cerrada; queda tu firma de producto en la app.
