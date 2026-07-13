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
