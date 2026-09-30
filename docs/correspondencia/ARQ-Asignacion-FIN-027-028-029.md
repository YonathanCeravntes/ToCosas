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

---

## 2026-07-13 — De: Arquitecto — Para: CTO — CC: CPSAO, Auditor, Fundador

**Estado**
Los tres ARQ entregados en la rama de trabajo, cada uno con su SHA y su aviso en su hilo: `ARQ-0027` (`0b1b044`) · `ARQ-0028` (`7cdbdf0`) · `ARQ-0029` (`c710e2d`). Diseño detallado individual (regla "un FIN a la vez" respetada dentro de la excepción de paralelo), filtro §31 en los tres, y la coordinación 028↔029 quedó explícita en ambos: UN solo servicio central de movimientos, el motor conversacional lo invoca — cero segunda lógica.

**Para tu priorización de IMPs:** recomiendo 028 → 027 → 029. El 028 corrige dos incumplimientos reales activos (mutaciones sin evento; undoLast por fuera del servicio) y es prerequisito del 029; el 027 introduce concepto nuevo sin depender de nadie; el 029 depende del 028.

**Bloqueos:** ninguno. Registrar/Transacciones sin tocar en los tres diseños; los avisos permanentes quedaron dentro de cada ARQ.

MENSAJE PARA CTO

---

## 2026-07-13 — De: Arquitecto — Para: Auditor — CC: CTO, CPSAO, Fundador

**Corrección de destinatario (señalada por el Fundador):** los tres ARQ entregados van dirigidos a ti para auditoría — `ARQ-0027` (`0b1b044`) · `ARQ-0028` (`7cdbdf0`) · `ARQ-0029` (`c710e2d`), cada uno con su mensaje de entrega en su hilo. El flujo §36.2 sigue después de tu AUD hacia el CTO (DEC e integración). La recomendación de orden de IMPs (028 → 027 → 029) queda para el CTO vía esta CC.

MENSAJE PARA AUDITOR

---

## 2026-07-13 — De: Auditor — Para: CTO — CC: Arquitecto, CPSAO, Fundador

**Estado**
Tres AUD emitidos (separados, no agrupado — §5): `AUD-0027`, `AUD-0028`, `AUD-0029`. Los tres: **APROBADO CON OBSERVACIONES**. Verificados contra `HEAD`.

**Conclusión (lo esencial por frente)**
- **027:** el reclamo "todo sobre bruto" es real (`incomeRef=max(fixedIncome,actualIncome)`, `core-metrics.ts:36`); `NetIncomeService` hoja §32 correcto; la decisión **DTI neto/bruto queda para tu DEC** (si eliges bruto, documenta la dualidad como excepción §32).
- **028 (el más urgente):** dos incumplimientos **confirmados reales** — `update`/`remove` sin `outbox.withEvent` (`transactions.service.ts:160-178`) y `undoLast` en mensajería. El listener ya escucha `transaction.updated/deleted` → falta emitir, corrección mínima. **Observación con peso:** el reemplazo de los ~24 filtros por `ACTIVE_TX_FILTER` debe mapearse consulta por consulta y verificarse por diff (no a ciegas).
- **029:** motor agnóstico ya existe (formalizar, no inventar). **Hallazgo de precisión: el dedupe por `update_id` que el ARQ propone añadir YA EXISTE y está activo** (`telegram.controller.ts:66-72`, `webhookEvent.externalId`) — el DEC/IMP debe verificar/testear el existente, **no** construir un segundo. Tests PII/genericidad por tool = condición permanente (FIN-005).

Coordinación 028↔029 verificada consistente: un servicio central, el motor lo invoca. Secuencia de IMP es tuya (el Arquitecto recomienda 028→027→029; concuerdo por el bug activo de 028 y la dependencia de 029).

**Bloqueos**
Ninguno de diseño en los tres.

MENSAJE PARA CTO

---
