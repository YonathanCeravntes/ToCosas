# DEC-0035 · Registrar como puerta única del ecosistema (P2 del EOC)

- **Versión:** 1.0
- **Fecha:** 2026-07-15
- **Autor:** CTO (Claude)
- **Estado:** Emitida — habilita `IMP-0035`. **Primera FIN auditada bajo `DEC-ORG-001`**
  (`GOBERNANZA.md` §43): el CTO audita y decide en el mismo acto, sin `AUD` de un
  tercero. `ARQ-0035` fue entregado (commit `168af9d`) dirigido a "Auditor" bajo la
  convención anterior — legítimo, llegó antes de que la nueva estructura le fuera
  comunicada; no se repite el ciclo por eso.
- **Base:** `ARQ-0035` v1.0 (`168af9d`) · las 10 observaciones del Fundador + criterios
  del CPSAO/CTO (`docs/correspondencia/FIN-035-Registrar-Puerta-Unica.md`) ·
  `CIERRE-0032`/`CIERRE-0034` · `DEC-0030` §5 (dos niveles de confirmación) · `GOBERNANZA.md` §32/§42

---

## 0. Auditoría del CTO (verificación independiente contra código real)

Verifiqué las afirmaciones técnicas del ARQ, no las asumí:

- ✅ **`transactions.service.create` emite `TransactionCreated` por outbox** —
  confirmado (`:119-127`, el ARQ decía ":120-127", coincide dentro de margen de
  edición reciente).
- ✅ **`conversation.service.registerTransaction` comete directo + acuse + `deshacer`**
  — confirmado (ya lo había verificado yo mismo al emitir la directiva de `ARQ-0035`;
  el Arquitecto llegó a la misma conclusión de forma independiente).
- ✅ **FIN-028: "anular" = `deletedAt` único mecanismo, emite `TransactionDeleted` →
  el Motor recalcula** — confirmado (`transactions.service.ts:225-254`).
- ✅ **`EngineListener` recomputa por dirty-set con drenaje debounced** — confirmado
  (`engine.listener.ts`, patrón ya auditado en BT-007).
- ✅ **FIN-031 declaró y construyó su política de reversión de compras con cuotas
  pagadas** — confirmado (`card.service.ts:109`, "Política de reversión con
  dependientes (§4.5)").

**⚠️ Corrección material (no bloqueante, pero obligatoria para el IMP):** el ARQ §2
afirma que "cada efecto de la cascada... es rastreable a la transacción origen
(`sourceTransactionId`, ya existente)". Verifiqué el campo en `schema.prisma:431`:
**existe, pero es específico de `CardPurchase`, y su propio comentario dice
textualmente "queda para un futuro asiento de liquidación; en Fase 1 es null"** — no
es una causalidad general para gasto/obligación/presupuesto/Salud/Score/historial, y
hoy no se usa (siempre `null`). **El mecanismo real de trazabilidad/reversión —que el
propio ARQ describe correctamente en su §3.3 y que sí verifiqué en código— es:**
`TransactionDeleted` → `EngineListener` recomputa por dirty-set (para métricas
derivadas) + la política de reversión propia de `CardPurchase` (para estado de
tarjeta). El diseño (commit+acuse+deshacer) es correcto y §42 se cumple igual — la
cita de `sourceTransactionId` en §2 es una imprecisión de redacción sobre un campo
reservado, no un defecto de diseño. **El IMP no debe intentar cablear nada a través
de `sourceTransactionId`** (está `null`/reservado); debe apoyarse en el mecanismo real
ya verificado: reusar `transactions.remove` (el mismo que usa `undoLast` del bot) para
"deshacer", y dejar que el Motor recompute por el listener existente.

## 1. Resumen ejecutivo

Se aprueba `ARQ-0035`: Registrar se convierte en la puerta única del ecosistema,
componiendo sobre `transactions.service`/outbox existentes — cero lógica de dominio
propia. Decisión central acertada: **nivel 1 (hecho directo) = commit + acuse +
deshacer** (mismo patrón del bot, obs. 8); **nivel 2 (modifica datos no ingresados) =
confirmar antes de cometer** (modelo de dos niveles de `DEC-0030` §5). Rechaza
correctamente el wizard universal de confirmación (rompería la obs. 7 y divergiría del
bot).

## 2. Decisiones aprobadas

- **Patrón de confirmación de dos niveles**, con la corrección de §0 incorporada al
  mecanismo de reversión (recompute por evento, no `sourceTransactionId`).
- **Tensión 2↔7 resuelta por "preguntar menos heredando más"** (guardarraíl H):
  efectivo en pocos toques sin preguntar cuotas nunca (obs. 4); tarjeta solo pide los
  deltas vía el path de FIN-031.
- **§32 estricto:** Registrar arma el flujo y llama a `transactions.service`/al path
  de tarjeta; sin ramas por tipo; "flujo disponible" = `SpendableService`.
- **NL preparado, no habilitado:** mismo motor y patrón que el bot; IA real sigue tras
  el gate DPA+PIA.
- **Accesibilidad** declarada como criterio, no solo velocidad.

## 3. Condiciones de cierre (incorporan la corrección de §0)

1. **Grep §32 de cierre:** sin ramas por tipo en el flujo de Registrar; "flujo
   disponible" resuelve a `SpendableService`.
2. **Test de cascada §42:** gasto-con-crédito → efectos presentes (obligación,
   presupuesto, "Te queda") → `deshacer` (reusando `transactions.remove`, el mismo
   camino de `undoLast`) → **todos** los efectos revertidos vía el recompute real del
   Motor (dirty-set), no vía `sourceTransactionId`.
3. **Test de coherencia (obs. 8):** una transacción creada desde Registrar produce el
   mismo resultado que desde el bot (mismo `create`, mismo outbox).
4. **Test de pasos por ruta:** efectivo en pocos toques sin preguntar cuotas; tarjeta
   solo los deltas.
5. **Compatibilidad total con FIN-034** (selector/catálogo de entidades sigue
   funcionando igual), cero deuda técnica, cobertura total de pruebas.
6. **Ninguna idea suelta de la Beta** (tipos de tarjeta, seguros, retanqueos, cupo,
   Score) entra en el alcance — se registran aparte como candidatas si aparecen.

## 4. Observaciones aceptadas

Confirmación mensual (FIN-036), profundidad por evento (FIN-037) y habilitación real
de IA (gate DPA+PIA) quedan fuera, tal como declaró el ARQ.

## 5. Próximos pasos

`IMP-0035` habilitado con las condiciones de §3. Entrega con SHA para validación del
CTO — bajo el flujo de `DEC-ORG-001`: sin `AUD` de un tercero, valido yo directamente
contra código y pruebas reales antes del cierre.
