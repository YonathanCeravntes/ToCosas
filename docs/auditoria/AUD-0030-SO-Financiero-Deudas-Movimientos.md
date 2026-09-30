# AUD-0030 · (Umbrella) SO Financiero Personal — Deudas por tipo + Movimientos inteligentes

- **Documento auditado:** `docs/arquitectura/ARQ-0030-SO-Financiero-Deudas-Movimientos.md` v1.0 (umbrella, commit `2a18a76`)
- **Insumos:** `docs/correspondencia/Rediseno-Modulo-Deudas.md` (directriz + guardarraíles A–K + 5 decisiones del Fundador) · `GOBERNANZA.md` v3.19 §31/§32/§42 · código verificado contra `HEAD`
- **Realiza:** Auditor de Milla
- **Fecha:** 2026-07-14

---

## 1. Resumen Ejecutivo

`ARQ-0030` es un **umbrella** bien disciplinado: define la espina (productos financieros
como entidad de primera clase + capa de consecuencias por evento) y solo diseña la Fase 1
(compra-con-tarjeta) a nivel implementable, difiriendo el detalle de los ≥11 tipos y cada
cascada a los ARQ derivados — respeta la regla "un FIN a la vez". La estrategia central
(Alt A: capa sobre lo existente; §42 por construcción vía listeners) es correcta y
verificable contra código. Verifiqué los tres puntos que el Arquitecto pidió; **dos se
sostienen y el tercero (reversibilidad) tiene un borde real que Fase 1 debe cerrar.** Sin
hallazgos bloqueantes del umbrella.

## 2. Disciplina de umbrella — CUMPLE

El documento define alcance/espina/relación y **no** contiene el diseño técnico detallado
de más de una funcionalidad: solo la Fase 1 (la espina) se diseña implementable; los
campos por tipo y cada cascada se difieren a los ARQ derivados (§3, §14). Es el mismo
patrón que `ARQ-0001`. §4.6 mapea A–K a mecanismos concretos; "flujo de caja" (J) queda
**diferido al DEC** con el gate del DSS, no decidido por el Arquitecto. Correcto.

## 3. Los tres puntos que el Arquitecto pidió verificar

### Punto 1 — Alt A (capa sobre lo existente) no obliga a reescribir Debt/Account ni rehace §32 → **CONFIRMADO**

`Debt` (`schema.prisma:370`), `AmortizationEntry` (`:447`) y `DebtInsurance` (`:424`)
existen y son ricos; 8 FIN los consumen. Alt A añade un registro de `ProductType` dirigido
por esquema + la extensión de cupo de tarjeta + columnas de causalidad, **sin tocar** esos
modelos — las fuentes únicas (SpendableService, payment-breakdown, attackOrder) siguen
leyendo los mismos `Debt`/`Account`, §32 intacto. Alt B (rescribir bajo un supertipo
polimórfico) está correctamente rechazada por máximo radio de daño. **Precisión menor:** el
enum `DebtType` real tiene **9** valores (no "8" como dice el §4.1); +`libranza`/
`compra_a_cuotas`/`fintech` = 12 (≥11, cumple). El mapeo de los 11 tipos del Fundador al
enum es detalle de ARQ derivado.

### Punto 2 — Trazabilidad+reversión por causalidad, ¿suficiente para §42 en los 9 efectos? → **sí para los derivados; NO limpia para los persistidos tras acciones posteriores**

Separo los 9 efectos por naturaleza:
- **Derivados (presupuesto, flujo, capacidad, Score, simulaciones, recomendaciones):** se
  recomputan desde el estado / métricas persistidas del Motor. Anular la acción origen →
  el Motor recomputa (~25 s) → **se auto-sanan**. Reversibilidad limpia por construcción. ✓
- **Mutaciones persistidas (saldo, cupo, cuotas generadas):** requieren reversión
  explícita por los listeners (restar el monto, quitar las cuotas). Aquí está el borde:
  **si la compra ya generó cuotas y alguna tiene un pago registrado, anular la compra NO es
  limpio** — no se pueden borrar cuotas con pagos asociados sin dejar el saldo/historial
  mentiroso. La garantía "reversible por construcción" (§42/G) se sostiene **solo antes de
  que una acción posterior toque las entidades de la cascada**.

**Recomendación (para el ARQ de Fase 1, no bloquea el umbrella):** Fase 1 debe declarar la
**política de reversión con dependientes** — p. ej. (a) bloquear la anulación de una compra
cuyas cuotas ya tienen pagos y ofrecer una ruta de corrección explícita, o (b) una
reversión compensatoria documentada. Sin esa política, §42 promete una reversibilidad que
el caso con pagos posteriores no puede cumplir. Es exactamente el borde que el Arquitecto
pidió que verificara.

### Punto 3 — Radio de daño sobre Registrar: ¿la espina lo EXTIENDE por composición sin tocar su núcleo? → **la cascada sí es composición; el flujo de entrada se extiende (autorizado)**

- **La capa de consecuencias ES composición real:** el alta de transacción **ya emite**
  `DomainEventType.TransactionCreated` por outbox (`transactions.service.ts:123`), así que
  añadir listeners no modifica la mutación — misma disciplina que el Motor ya usa
  (FIN-021/023). El núcleo de la mutación no se toca. ✓
- **Matiz honesto:** el flujo "¿cómo pagaste?" (§4.3) **sí modifica el flujo de entrada**
  de Registrar (pregunta el método, abre el flujo de tarjeta). No es "no tocar Registrar" —
  es extenderlo, y está **autorizado explícitamente por el Fundador** (decisiones
  vinculantes, hilo). El ARQ abre con la observación de frontera (§0) como se exigió. La
  frase "no toca su núcleo" es cierta para la capa de consecuencias; para el flujo de
  entrada es "lo extiende con autorización", no "no lo toca".

## 4. §32 y §42 como criterios de aceptación (lo que el CPSAO pidió vigilar por encima de todo)

- **§32 (guardarraíl C, condición dura):** el umbrella prohíbe fórmula nueva por tipo; los
  números nuevos (cupo, saldo, próximas cuotas) van en servicios hoja inyectados (patrón
  `SpendableService`/`DebtOutlayService`), y "Te queda"/desembolso real siguen siendo
  FIN-020/023. El criterio de grep (§4.6-C) es el correcto. **La Validación de cada FIN
  derivada debe ejecutar ese grep** — es donde el bug multiplicado por 11 tipos podría
  entrar. El umbrella lo deja bien encuadrado.
- **§42/G (Confianza, la protección central):** el patrón de listeners con
  `sourceEventId`/`sourceTransactionId` + reversión por anulación del origen + acuse
  explícito (FIN-029) es el diseño correcto para hacer §42 verdadero por construcción, no
  aspiracional. La única grieta es la reversión con dependientes (Punto 2) — a cerrar en
  Fase 1. El modelo de confirmación en dos niveles (directo sin confirmar pero
  visible/reversible; modificación de datos no ingresados → confirmación) codifica bien la
  decisión 3 del Fundador.

## 5. Filtro §31

Sustantiva — "una sola acción del usuario produce toda su verdad financiera, visible y
reversible; la diferencia entre registrar y comprender". Es la espina que conecta las FIN
previas; ninguna la absorbe. Cumple.

## 6. Observaciones (no bloqueantes del umbrella)

1. **Reversión con dependientes (Punto 2):** Fase 1 debe declarar la política para anular
   una compra cuyas cuotas ya tienen pagos — es el borde donde §42 no es limpio.
2. **"No toca Registrar" (Punto 3):** precisar que el flujo de entrada SÍ se extiende
   (autorizado); solo la capa de consecuencias es pura composición.
3. **`DebtType` = 9, no 8** (§4.1): precisión menor de conteo.
4. **"Flujo de caja" (J):** bien diferido al DEC con el gate del DSS; el DEC debe
   resolverlo antes de que ninguna FIN derivada lo shipee.
5. **Cada FIN derivada carga el grep §32 y el test de reversibilidad** como criterio de
   cierre — el umbrella lo encuadra; la disciplina se ejerce FIN por FIN.

## 7. Veredicto

**APROBADO CON OBSERVACIONES.**

Umbrella disciplinado (define la espina, no el detalle de >1 FIN), con la estrategia
correcta de mínimo radio de daño (Alt A: capa sobre `Debt`/`Account` existentes —
verificado que existen y no se reescriben, §32 intacto) y §42 por construcción vía
listeners causales sobre el outbox que el alta ya emite (verificado). Los tres puntos
pedidos: Alt A se sostiene; la composición sobre Registrar es real (el flujo de entrada se
extiende con autorización del Fundador); y la reversibilidad §42 es limpia para los efectos
derivados pero **no** para las mutaciones persistidas una vez que una acción posterior las
toca — Fase 1 debe declarar esa política, es el borde a cerrar. §32 (guardarraíl C) y §42/G
quedan bien encuadrados como criterios auditables FIN por FIN, que es donde el bug
multiplicado por 11 tipos debe vigilarse. Ninguna observación exige rehacer el umbrella; la
más sustantiva (política de reversión con dependientes) es un requisito del ARQ de Fase 1,
no del umbrella.
