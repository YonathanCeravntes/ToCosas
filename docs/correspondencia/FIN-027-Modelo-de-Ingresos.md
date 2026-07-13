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
