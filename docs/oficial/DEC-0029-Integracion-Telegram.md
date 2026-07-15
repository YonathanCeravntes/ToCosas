# DEC-0029 · Integración con Telegram sobre un Motor Conversacional único

- **Versión:** 1.0
- **Fecha:** 2026-07-14
- **Autor:** CTO (Claude)
- **Estado:** Emitida — habilita `IMP-0029` (3º y último de la tanda; `IMP-0028` e `IMP-0027` cerrados)
- **Base:** `ARQ-0029` v1.0 (`c710e2d`) · `AUD-0029` (APROBADO CON OBSERVACIONES) · visto bueno del CPSAO con 4 condiciones (`docs/correspondencia/FIN-029-Integracion-Telegram.md`)

---

## 0. Verificación independiente previa (CTO)

Verifiqué contra el código, no sobre el reporte:
- **El motor único ya existe:** `conversation.service.ts` es agnóstico de canal
  (`ChannelSource = 'whatsapp' | 'telegram'`, `source` como parámetro). Se **formaliza**,
  no se inventa.
- **El dedupe por `update_id` ya existe y está activo:** `telegram.controller.ts:66-72`
  — `externalId = tg:${msg.updateId}`, `webhookEvent.findUnique` + `if (seen) continue`.
  Confirmado el hallazgo del Auditor: el IMP **verifica y prueba el existente, no
  construye un segundo**.
- **Servicio central de movimientos (FIN-028) disponible** (`IMP-0028` cerrado) — el motor
  lo invoca para crear/editar/anular; cero segunda lógica.

## 1. Resumen ejecutivo

Se aprueba formalizar el motor conversacional único (Telegram hoy, WhatsApp ya presente)
con adaptadores de canal, tools 1:1 con el dominio sobre vistas minimizadas, y una capa de
IA de **respaldo tras las reglas** (plantilla-primero, patrón FIN-005). El gate **DPA+PIA
permanece intacto**: el ARQ/IMP diseñan y prueban en modo plantillas/dev; no se enciende
`ANTHROPIC_API_KEY`/`LLM_API_KEY` con datos reales hasta cerrar el gate legal.

## 2. Decisiones aprobadas

- **P1 · Motor conversacional único** (formalizar `ConversationService` agnóstico +
  contrato adaptador↔motor explícito). Un solo motor para Telegram/WhatsApp/futuros
  canales — sin segunda lógica.
- **P2 · Tools 1:1 con el dominio sobre vistas minimizadas** (patrón `ContextAssembler`,
  FIN-005). La creación/edición/anulación de movimientos pasa por el servicio central de
  FIN-028.
- **P3 · Confirmación conversacional** reutilizando `pendiente_confirmacion` +
  `parseConfidence` (existen desde el día 1).
- **P4 · Dedupe existente** (`update_id`) verificado y con test — no se duplica.

## 3. Cambios obligatorios (§5) — las 4 condiciones del CPSAO + condiciones del Auditor

1. **Acuse explícito de todo movimiento registrado** (CPSAO 1): el bot confirma
   explícitamente cada movimiento creado/editado/anulado. **Prohibido cambiar estado en
   silencio.**
2. **Honestidad cuando no entiende** (CPSAO 2): si el bot no comprende, lo dice.
   **Prohibido el falso "ya lo anoté"** — nunca confirmar una acción que no ocurrió.
3. **Barrera de Independencia a futuro** (CPSAO 3): **cualquier tool que dé un consejo (no
   solo un dato) vuelve a revisión de Independencia del CPSAO** antes de habilitarse. En
   esta iteración, "simular" se limita a **mostrar escenarios, no a empujar decisiones**.
   Se documenta como puerta permanente para tools conversacionales futuras.
4. **Paywall honesto al agotar la cuota de IA** (CPSAO 4): cuando se agote la cuota de IA,
   el mensaje es honesto y claro, no un error ni un silencio.
5. **Test de regresión PII/genericidad por tool** (condición permanente FIN-005): cada tool
   expuesta al LLM serializa su vista con PII sembrada y verifica que ningún campo prohibido
   aparece. Sin este test, la tool no entra.
6. **Gate DPA+PIA intacto:** modo plantillas/dev; no encender IA con datos reales en
   producción hasta cerrar el gate (`PRODUCCION.md` §1).

## 4. Observaciones aceptadas

- Dependencia declarada del Arquitecto: si el servicio central de FIN-028 no estuviera, la
  iteración 1 saldría sin editar/anular conversacional. **Ya no aplica** — `IMP-0028`
  cerrado, las tres acciones (crear/editar/anular) están disponibles.
- La creación de movimientos por este canal toca el módulo Registrar/Transacciones vía el
  servicio central ya aprobado (FIN-028); si el IMP modificara ese módulo más allá de
  invocarlo, **detenerse y avisar al Fundador**.

## 5. Próximos pasos

`IMP-0029` habilitado (último de la tanda; `IMP-0028` e `IMP-0027` cerrados). El Arquitecto
entrega en rama de trabajo con SHA; el CTO valida (testing §36.3) e integra (§36.2). Cierra
la tanda de tres frentes abierta durante la Beta Técnica.
