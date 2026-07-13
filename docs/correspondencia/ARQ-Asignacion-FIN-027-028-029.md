# Correspondencia — Asignación al Arquitecto: FIN-027, FIN-028, FIN-029

Hilo append-only. Convención EOC. Punto de entrada único del Arquitecto para los tres
frentes abiertos en paralelo; el detalle de cada uno vive en su propio hilo de FIN.

---

## 2026-07-13 — De: CTO — Para: Arquitecto — CC: CPSAO, Auditor, Fundador

**Asunto:** Emisión formal — tres ARQ autorizados (027 / 028 / 029)
**Estado:** Autorizado. Diseño (ARQ) en paralelo por excepción documentada a "un FIN a la vez".

Arquitecto: por instrucción del Fundador (2026-07-13) quedan abiertos tres frentes. Te
**emito formalmente** las tres directivas. Cada una tiene su directiva detallada en su
hilo — este mensaje es el enrutamiento y las reglas comunes.

**Los tres encargos (por prioridad):**
1. **`ARQ-0027` — Modelo de ingresos personales** · Prioridad **Alta**.
   Directiva completa: `docs/correspondencia/FIN-027-Modelo-de-Ingresos.md`.
   Núcleo: perfil laboral + ingresos fijos/variables/comisiones/honorarios + deducciones
   con **base configurable total vs. parcial**; salario fijo y variable coexistentes;
   ingreso neto disponible como única definición §32; impacto en Salud/Motor/Presupuestos/
   Copiloto/Proyecciones/Reportes.
2. **`ARQ-0028` — Gestión integral de movimientos** · Prioridad **Alta**.
   Directiva completa + las 10 decisiones del Fundador:
   `docs/correspondencia/FIN-028-Gestion-de-Movimientos.md`.
   Núcleo: anulación lógica (nunca borrado físico); editar/anular **sin lógica financiera
   propia** (el Motor recalcula vía bus de eventos FIN-002); **servicio central único** de
   movimientos reutilizable por UI/Telegram/WhatsApp; modelo listo para auditoría/IA futura.
3. **`ARQ-0029` — Integración Telegram / Motor Conversacional único** · Prioridad **Media**.
   Directiva completa: `docs/correspondencia/FIN-029-Integracion-Telegram.md`.
   Núcleo: **un solo** motor conversacional agnóstico de canal (Telegram hoy, WhatsApp
   después); desacople Motor Financiero ↔ Conversacional; tools por vistas minimizadas
   (patrón FIN-005); datos reales de IA bloqueados por gate DPA+PIA.

**Reglas comunes (no perder el flujo):**
- Flujo oficial `CTO → Arquitecto → Auditor → CTO → GitHub` (§36.2). Entregas tus `ARQ`
  en rama de trabajo; **el CTO es el único que integra** a la rama oficial tras validar.
- **La excepción es solo de diseño:** puedes trabajar los tres `ARQ` en paralelo, pero el
  **IMP es estrictamente secuencial** — un solo IMP a la vez, y ninguno adelanta lo que el
  CTO priorice. No diseñes el detalle de más de una funcionalidad dentro de un mismo
  documento (regla "un FIN a la vez").
- Cada `ARQ` cierra con la **pregunta de valor diferencial (§31)** y su contenido mínimo
  (regla vigente).
- **Coordinación 028 ↔ 029:** el servicio central de movimientos de `ARQ-0028` es el mismo
  que invoca el motor conversacional de `ARQ-0029`. No diseñen dos. Alinéalos.
- **Aviso Registrar:** el Fundador ya entregó sus observaciones para `FIN-028`; si
  `ARQ-0027` o `ARQ-0029` terminan tocando el módulo Registrar/Transacciones más allá de
  lo previsto, **detente y avísame** antes de continuar.
- Entrega cada `ARQ` con su **SHA de commit** de referencia (regla del IMP/ARQ).

Ordena tu trabajo por prioridad (027 y 028 Alta, 029 Media) y avísame al entregar cada
uno para pasarlo al Auditor.

**MENSAJE PARA ARQUITECTO** — emitir `ARQ-0027`, `ARQ-0028` y `ARQ-0029` conforme a sus
directivas; entregar a validación del CTO antes de cualquier integración.
