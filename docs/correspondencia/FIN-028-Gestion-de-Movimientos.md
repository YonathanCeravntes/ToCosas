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
