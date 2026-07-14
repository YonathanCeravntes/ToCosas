# Correspondencia — FIN-028 · Gestión completa del ciclo de vida de movimientos

Hilo append-only. Convención EOC.

---

## 2026-07-13 — De: CTO — Para: Fundador — CC: CPSAO, Arquitecto, Auditor

**Asunto:** FIN-028 abierta pero con ARQ RETENIDO — se activa tu instrucción permanente sobre el módulo Registrar
**Estado:** Abierta · ARQ retenido por el CTO · a la espera de las observaciones del Fundador.

**Contexto.** Autorizaste (memo 2026-07-13) diseñar la gestión completa del ciclo de vida
de los movimientos: **editar, eliminar, confirmar eliminación, mantener trazabilidad, y
recálculo automático** de dashboards, presupuestos, indicadores y Salud Financiera tras
cualquier modificación, preservando la consistencia de toda la información derivada.

**Por qué lo retengo (no es una demora, es cumplir tu propia regla).** Esta FIN toca de
lleno el **módulo Registrar/Transacciones**. Tienes una **instrucción permanente**
registrada (`ESTADO_PROYECTO.md`, recordatorio vigente): *"cuando venga el módulo de
registros que vayan a analizar y mejorarlo, me avisas con anticipación, necesito hacer
observaciones."* Por eso **no emito la directiva al Arquitecto** (no arranca `ARQ-0028`)
hasta que dejes tus observaciones.

**Lo que necesito de ti para desbloquear.** Tus observaciones sobre cómo quieres que se
comporte la edición/eliminación de movimientos. Como guía, algunos puntos donde tu
criterio define el diseño:
1. **Eliminar:** ¿borrado real o "anulado" (soft-delete con traza)? Impacta auditoría e
   historial.
2. **Editar:** ¿se permite cambiar monto/fecha/categoría de cualquier movimiento, o hay
   límites (p. ej. movimientos de un ciclo ya cerrado, o generados por deuda/ingreso
   automático)?
3. **Trazabilidad:** ¿quieres registro de "editado el/eliminado el" visible para el
   usuario, o basta con mantener la consistencia silenciosamente?
4. **Confirmación:** ¿confirmación explícita antes de eliminar (para evitar borrados
   accidentales)?
5. Cualquier otra observación tuya sobre el módulo Registrar en general (es tu ventana
   para hacerlo antes de que Arquitectura lo diseñe).

Con tus respuestas emito `ARQ-0028` al Arquitecto de inmediato.

**MENSAJE PARA FUNDADOR** — FIN-028 retenida por tu propia instrucción sobre Registrar;
espero tus observaciones para arrancar el ARQ.

---

## 2026-07-13 — De: Fundador — Para: CTO — CC: Arquitecto, Auditor, CPSAO

**Asunto:** Respuesta oficial — FIN-028 Gestión Integral de Movimientos
**Estado:** Observaciones entregadas — 10 decisiones. Autoriza continuar con ARQ-0028.

El Fundador entregó sus observaciones sobre el módulo Registrar (satisface la instrucción
permanente). Decisiones oficiales (numeradas por el Fundador como DEC-028-0xx — son sus
requisitos vinculantes; la DEC oficial de gobernanza sigue siendo `DEC-0028`, posterior a
`AUD-0028`):

1. **DEC-028-001 · Eliminación lógica.** Nada de borrado físico. Movimiento eliminado →
   estado **Anulado**, permanece en BD (integridad histórica, auditoría futura,
   recuperación ante error, futuras funcionalidades). Los anulados **no participan** en
   presupuestos, indicadores, Salud, dashboards ni Motor Financiero.
2. **DEC-028-002 · Edición permitida.** El usuario puede modificar cualquier movimiento
   registrado por él. Campos editables: fecha, valor, categoría, subcategoría, cuenta,
   descripción, etiquetas, observaciones. Tras cualquier cambio, recálculo automático de
   lo derivado.
3. **DEC-028-003 · Confirmación previa.** Toda eliminación exige confirmación explícita
   ("¿Deseas eliminar este movimiento? Cancelar / Eliminar"). Cero borrados accidentales.
4. **DEC-028-004 · Historial de cambios.** Hoy **no** se muestra historial al usuario,
   pero el **modelo de datos debe quedar preparado** para soportarlo en el futuro sin
   rediseñar la BD (auditoría futura, transparente al usuario por ahora).
5. **DEC-028-005 · Recálculo automático.** Toda modificación/anulación actualiza
   automáticamente dashboards, presupuestos, metas, Salud, Motor, proyecciones,
   recomendaciones, indicadores y cualquier cálculo dependiente. Sin sincronización manual.
6. **DEC-028-006 · Arquitectura.** Editar/eliminar **no contienen lógica financiera
   propia**: solo modifican el movimiento; el **Motor Financiero** determina qué
   recalcular. Se mantiene la única fuente de verdad (§32).
7. **DEC-028-007 · UX.** Edición rápida, sin formularios complejos: Movimiento → Editar →
   Modificar → Guardar → actualización inmediata.
8. **DEC-028-008 · Preparación para IA.** Toda modificación **genera eventos** que el
   Copiloto podrá usar en el futuro ("corrigió el valor", "cambió la categoría", "anuló un
   gasto"). Hoy no se usan; la arquitectura queda lista para aprendizaje futuro.
9. **DEC-028-009 · Preparación para Telegram/WhatsApp.** La misma arquitectura permite
   editar/anular desde canales conversacionales ("borra el gasto del almuerzo", "cambia el
   mercado de 180.000 por 165.000"). **Un solo servicio central de movimientos** — sin
   segunda lógica. (Liga directa con FIN-029.)
10. **DEC-028-010 · Principio rector.** Registrar un movimiento **nunca** debe sentirse
    irreversible; corregir debe ser tan sencillo como registrar. La app se adapta al
    usuario.

**MENSAJE PARA CTO** — dudas funcionales resueltas; continuar con ARQ-0028 y AUD.

---

## 2026-07-13 — De: CTO — Para: Arquitecto — CC: Auditor, CPSAO, Fundador

**Asunto:** Directiva de apertura ARQ-0028 — retención levantada
**Estado:** ARQ autorizado. Diseño en paralelo (excepción documentada a "un FIN a la vez").

Recibidas las observaciones del Fundador sobre el módulo Registrar → **retención
levantada**, emites `ARQ-0028`. Las 10 decisiones de arriba son **requisitos vinculantes**;
el ARQ debe honrarlas todas. Traducción a lineamientos de diseño:

- **Anulación lógica, no física** (001): añade un estado `anulado` (o `voidedAt`) al
  modelo de movimiento; jamás `DELETE`. Todas las lecturas de dominio deben **excluir**
  anulados por construcción (una sola cláusula de filtro compartida, no repetida por
  pantalla — mismo espíritu §32).
- **Sin lógica financiera en editar/anular** (006): la mutación solo cambia el registro y
  **emite el evento** correspondiente; quien recalcula es el Motor vía el **bus de eventos
  ya existente** (patrón FIN-002). El recálculo (005) sale del listener del Motor, no de la
  mutación — así se cubre "todo lo derivado" sin acoplar.
- **Servicio central único de movimientos** (009): la edición/anulación vive en **un**
  servicio de dominio que será el mismo punto de entrada para UI, Telegram y WhatsApp
  (coordina con `ARQ-0029`: el motor conversacional invoca este servicio, no reimplementa).
- **Modelo preparado para auditoría** (004) y **eventos para IA** (008): diseña el evento
  de cambio con la forma suficiente para reconstruir un historial futuro (qué cambió,
  valor anterior/nuevo, autor, timestamp) aunque hoy no se persista un log visible ni se
  consuma por el Copiloto. No rediseñar BD después.
- **UX rápida** (007) y **confirmación previa** (003): flujo mínimo Editar→Guardar;
  diálogo de confirmación solo en anulación.

**Restricciones:** flujo ARQ→AUD→DEC; no implementar sin DEC; no tocar infraestructura
validada (Render/Neon/Expo/EAS Update); pregunta de valor diferencial (§31) en el ARQ;
declarar explícitamente el impacto de la anulación retroactiva sobre cifras históricas
(igual que se hizo con la mora en FIN-024).

**MENSAJE PARA ARQUITECTO** — emitir `ARQ-0028`; una sola funcionalidad, diseño detallado
propio, honrando las 10 decisiones del Fundador.

---

## 2026-07-13 — De: Arquitecto — Para: CTO — CC: Auditor, CPSAO, Fundador

**Estado**
`ARQ-0028` v1.0 emitido — `docs/arquitectura/ARQ-0028-Gestion-de-Movimientos.md`, commit `7cdbdf0` (rama de trabajo, §36.2). Las 10 DEC-028 honradas pieza por pieza.

**Conclusión**
Dos incumplimientos REALES encontrados al verificar (no teóricos): (1) `update` y `remove` de movimientos NO emiten eventos de dominio hoy (`transactions.service.ts:160-178`, escriben directo sin outbox) — el Motor no recalcula tras una corrección hasta el job nocturno, DEC-028-005/006 rotas de raíz; (2) el `undoLast` de mensajería escribe por fuera del servicio central. El diseño: estado `anulada` + `voidedAt` (el enum TxStatus ya existe — Alt B de reutilizar `deletedAt` rechazada: mata la recuperación futura), mutaciones envueltas en el outbox con evento RICO (changedFields + before/after estructurados, sin texto libre — la forma que 004/008 exigen sin rediseñar BD), filtro compartido `ACTIVE_TX_FILTER` (los ~25 `deletedAt: null` repetidos mueren), y una regla de UX para movimientos ligados a deuda: campos neutros editables, monto/fecha se anulan-y-recrean (editar el monto de un pago de deuda sin recomputar dejaría el saldo mentiroso — meter esa reversión en la mutación violaría la 006).

**Declarado como pediste:** la anulación retroactiva mueve cifras históricas (mismo tratamiento honesto que la mora de FIN-024).

**Bloqueos:** ninguno.

MENSAJE PARA CTO

---

## 2026-07-13 — De: Arquitecto — Para: Auditor — CC: CTO, CPSAO, Fundador

**Corrección de destinatario (señalada por el Fundador — el flujo §36.2 es CTO → Arquitecto → AUDITOR → CTO):** mi mensaje anterior debió dirigirse a ti. El `ARQ-0028` v1.0 de este hilo queda a tu disposición para tu AUD; todo el contenido del mensaje anterior (SHA, hallazgos y puntos de verificación) aplica tal cual. El aviso al CTO queda cumplido por esta CC.

**Bloqueos:** ninguno. No implemento nada hasta el DEC.

MENSAJE PARA AUDITOR

---

---

## 2026-07-13 — De: CTO — Para: Arquitecto — CC: Auditor, CPSAO, Fundador

**Asunto:** DEC-0028 emitida — IMP-0028 habilitado (con corrección de diseño)
**Estado:** Decidida. `IMP-0028` autorizado, primero de la secuencia 028→027→029.

Verifiqué el diseño contra el código (no sobre tu reporte). El bug del evento faltante es
real y confirmado (`update`/`remove` sin outbox; los tipos `transaction.updated/deleted` y
el listener del Motor ya existen — solo falta emitir). **Corrección de diseño obligatoria
en `DEC-0028` §5.1:** no se añade `anulada` ni `voidedAt`. La anulación **ya existe** como
`deletedAt` (tu `remove()` ya hace soft-delete en `:175`, y 97 filtros ya excluyen los
anulados). Sumar un estado nuevo crearía un tercer concepto de anulación junto a
`deletedAt` y al dormante `descartada` — §32 lo prohíbe. La etiqueta "Anulado" se deriva
de `deletedAt != null`.

Lo demás aprobado: outbox en `update`/`remove` (recálculo por el listener, cero lógica en
la mutación), evento rico (`changedFields`+before/after) para auditoría/IA sin rediseñar
BD, servicio central único (reencaminar `undoLast`), guardarraíl de movimientos ligados a
deuda (anular-y-recrear el monto/fecha, no editar en sitio). **`ACTIVE_TX_FILTER` solo
sobre consultas de `Transaction`, verificado por diff — no toques los 97 a ciegas.**

**MENSAJE PARA ARQUITECTO** — emitir `IMP-0028` con los 4 cambios obligatorios de
`DEC-0028`; entregar con SHA para validación del CTO antes de integrar.

---

## 2026-07-13 — De: Arquitecto — Para: CTO — CC: Auditor, CPSAO, Fundador

**Estado**
`IMP-0028` entregado en rama de trabajo (§36.2) — commit `65104e1d38b3ba84efdd9fa6f4db7db54deb7824`; `IMP-0028` v1.0 en `docs/implementaciones/`. A la espera de tu validación e integración.

**Conclusión**
Los 4 cambios obligatorios acatados: (1) anular = `deletedAt`, sin `anulada`/`voidedAt` — tenías razón, tu corrección hizo el diseño más pequeño y evitó el tercer concepto de anulación; (2) `ACTIVE_TX_FILTER` solo en las consultas de `Transaction` del servicio, los ~97 de otros modelos intactos; (3) impacto retroactivo declarado; (4) infraestructura y gate DPA+PIA sin tocar. El bug real cerrado: `update`/`remove` emiten eventos por outbox y el Motor recalcula (e2e lo prueba: editar un gasto mueve el flujo persistido sin intervención). Anular un pago de deuda revierte el saldo atómicamente; `undoLast` de mensajería reencaminado al servicio central. Suites: unit 331/331, e2e 27/27, tsc limpio, cero migraciones.

**Reserva que pido evaluar explícitamente (IMP §4):** al anular un pago de deuda, el reverso restaura saldo y estado pero **NO reconstruye `next_due_date`** (no inventamos la fecha previa; el próximo pago la re-ancla). Es la limitación de mayor peso — si el Auditor la considera insuficiente para iteración 1, es una pieza adicional acotada, no un rediseño. Segundo dato: la UX vive en las filas del Inicio porque no existe una pantalla de lista completa de movimientos en el frontend (el DEC asumía una).

**Bloqueos**
Ninguno. Listo para tu checkout de validación; no abro IMP-0027 hasta que cierres este (un IMP a la vez).

MENSAJE PARA CTO

---

---

## 2026-07-13 — De: CTO — Para: Fundador — CC: CPSAO, Arquitecto, Auditor

**Asunto:** FIN-028 CERRADA (validación técnica del CTO)
**Estado:** Cerrada (eje técnico). IMP-0028 validado e integrado.

Validación independiente en checkout sobre `65104e1` (ancestro de HEAD) — verifiqué el
código y reejecuté las suites yo mismo, no sobre el reporte:

- **Los 4 cambios obligatorios de `DEC-0028`, confirmados:** (1) **sin `anulada`/`voidedAt`**
  (grep limpio; la anulación es `deletedAt`, único mecanismo — mi corrección acatada);
  (2) `ACTIVE_TX_FILTER = {deletedAt:null}` aplicado **solo** a consultas de `Transaction`
  (el diff no tocó otros modelos; los 97 filtros restantes intactos); (3) impacto
  retroactivo declarado; (4) infra y gate DPA+PIA sin tocar.
- **Bug cerrado:** `update`/`remove` ahora emiten `TransactionUpdated`/`TransactionDeleted`
  vía outbox (payload rico `changedFields`+before/after para auditoría/IA, sin rediseñar
  BD); `undoLast` de mensajería **reencaminado** al servicio central (`remove()`);
  anular un pago de deuda **revierte el saldo atómicamente** + `DebtUpdated`; guardarraíl
  P6 (`DEBT_LOCKED_FIELDS`) bloquea editar monto/fecha/tipo/deuda en sitio → 400.
- **Suites reejecutadas por el CTO:** `tsc --noEmit` exit 0; unit **331/331** (43 suites);
  e2e **27/27** (8 suites), incl. `fin028-movimientos` (4/4: editar recalcula el Motor;
  anular excluye pero conserva en BD; anular pago de deuda revierte saldo; guardarraíl 400)
  y sin regresión en FIN-020/021/022/023/024/012.

**Dos limitaciones declaradas por el Arquitecto — mi dictamen:**
1. **Anular un pago de deuda no reconstruye `next_due_date`** (el próximo pago la re-ancla
   vía FIN-018). Aceptada para iteración 1 (honesta, acotada; misma línea que el impacto
   retroactivo de la mora en FIN-024). **La registro como seguimiento** para que no quede
   en el limbo — si al usarla se siente confusa, es una pieza adicional acotada, no un
   rediseño.
2. **La UX de editar/anular vive en las filas de Inicio** (no existe una pantalla de lista
   completa de movimientos en el frontend; el DEC la asumía). Aceptable para iteración 1;
   la firma de producto en dispositivo real la das tú al probar la app.

Con esto, FIN-028 queda cerrada en el eje técnico. Sigue la secuencia: **FIN-027 (DEC,
turno 2)** — pero tiene una decisión de producto pendiente (DTI/Score sobre neto o bruto).

**MENSAJE PARA FUNDADOR** — FIN-028 cerrada; queda tu firma de producto al usar editar/anular en la app.

---

## 2026-07-13 — De: CTO — Para: CPSAO — CC: Fundador, Arquitecto, Auditor

**Asunto:** Condición del CPSAO registrada — trazabilidad visible de anulación (iteración futura de FIN-028)
**Estado:** Registrada como seguimiento. No reabre FIN-028 (cerrada).

El CPSAO, al revisar el Frente 2, pidió que la trazabilidad (anulación lógica, no borrado
físico) quede **visible para la usuaria** si algún día audita sus propios movimientos, no
solo como requisito técnico interno. `DEC-028-004` del Fundador ya dejó el modelo preparado
para historial de auditoría sin rediseñar BD, pero decidió no mostrarlo al usuario en esta
iteración. Registro la petición del CPSAO como **seguimiento de producto** para una futura
iteración de FIN-028 (mostrar los anulados/editados al usuario) — junto a la limitación ya
anotada del `next_due_date`. No bloquea nada hoy.

**MENSAJE PARA CPSAO** — condición registrada como seguimiento; FIN-028 iteración 1 se
mantiene cerrada con la trazabilidad interna ya construida.
