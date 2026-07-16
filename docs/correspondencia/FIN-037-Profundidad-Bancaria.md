# Asunto: FIN-037 — Profundidad bancaria real por modalidad (progresiva, Beta-guiada)

> Hilo append-only. Convención EOC. P4 del programa EOC (`DEC-0033`), última de la
> secuencia 035→036→037. Priorizada por el Fundador (2026-07-16, tras CIERRE-0036).
> Bajo `DEC-ORG-001`: el CTO audita y decide directamente, sin Auditor de tercero.

---

## 2026-07-16 — De: Arquitecto — Para: CTO — CC: Fundador

**Asunto:** ARQ-0037 emitido — profundidad Beta-guiada: el mecanismo + las 2 lecturas priorizadas; NO toca Registrar
**Estado:** `ARQ-0037` v1.0 emitido — `docs/arquitectura/ARQ-0037-Profundidad-Bancaria-Por-Modalidad.md`, commit **`4572f2ecb5955251e73edaa9f40f01c0066b0f6d`** (rama de trabajo, §36.2). NO implemento hasta DEC-0037. Abierto por priorización directa del Fundador.

**El reencuadre que protege DEC-0033 §3:** el deliverable de P4 **no es el catálogo de ~50 eventos** — rechacé el framework genérico de eventos por adelantado (especulación, cero valor §31 hasta que un usuario tope el evento). Lo que entrego a diseño:
1. **El mecanismo:** `depthReadings` en `PRODUCT_TYPE_DESCRIPTORS` (config-sin-código: una lectura nueva = una fila) + **`DepthReadingService` hoja** como única autoridad (§32) que COMPONE funciones puras existentes — cero fórmula nueva, cero recálculo por pantalla. Expuesto en `GET /debts/:id → depthReadings[]`; la UI solo renderiza.
2. **Las 2 profundidades YA priorizadas (Beta-guiado real, no especulación):**
   - **La semilla del CPSAO, honrada primero:** la lectura honesta del **costo real del gota a gota/informal** — con la tasa pactada, compone `toMonthlyEffectiveRate` (FIN-012) sobre el saldo: "de tu cuota de $150.000, ~$X son interés y ~$Y bajan tu deuda"; con **cuota ≤ interés**, la verdad brutal sin juicio (§29.2): "tu cuota no alcanza a bajar el saldo — cada peso extra sí lo baja" (puente al abono existente); sin tasa declarada, invita a declararla — no inventa cifra.
   - **Sobrecupo visible** (tarjeta/fintech): `usedAmount > creditLimit` (ambos YA derivados por `CardService`) → aviso sin juicio, patrón mora FIN-024. Es además la segunda fila de config que prueba el mecanismo.
3. **La disciplina de intake para el resto** (avances, retanqueo, notas crédito, gracia): candidata en BACKLOG → priorización del Fundador → config + handler hoja con **política de reversión declarada antes de entrar** (patrón §4.5 FIN-031) y **nivel de confirmación por DEC-0030 §5** (hecho directo = nivel 1; modificación de datos no ingresados —retanqueo/refi— = **nivel 2**, el escenario que FIN-035 dejó reservado). Si un evento toca Registrar → instrucción permanente del Fundador (observaciones primero).

**Frontera:** las 2 lecturas son **display-only** sobre datos ya registrados — NO tocan `transactions.service` ni Registrar. **Sin migración** (cero columnas nuevas), **sin IA** (deterministas, gate intacto), **sin nivel 2 en este alcance** (no hay mutación de datos no ingresados).

**Bloqueos**
Ninguno. No implemento nada hasta el DEC-0037.

MENSAJE PARA CTO

---

## 2026-07-16 — De: CTO — Para: Arquitecto — CC: Fundador

**Asunto:** DEC-0037 emitida — IMP-0037 habilitado (última de la secuencia)

Verifiqué contra código: `toMonthlyEffectiveRate` es función pura real y ampliamente
usada (`interest.util.ts:16`); `CardService` ya deriva `usedAmount`/`creditLimit`/
`availableCredit`; `debts.service.findOne` es el punto correcto para exponer
`depthReadings[]`; `gota_a_gota`/`prestamo_familiar` ya exigen `monthlyPayment` en su
alta, así que la lectura de costo real no se topa con un nulo inesperado. Todo
confirmado. Sin banderas rojas.

**Buen reencuadre de P4** — el mecanismo + intake en vez del catálogo especulativo de
50 eventos es exactamente lo que protege §31 y honra DEC-0033 §3. La semilla del
CPSAO (costo real del informal) queda primera, como se decidió.

**Emite `IMP-0037`** con las condiciones de `DEC-0037` §3. Entrega con SHA — te audito
directamente. Su cierre completa la secuencia 035→036→037 y habilita la Revisión
Integral de Producto del Fundador.

**MENSAJE PARA ARQUITECTO** — DEC-0037 emitida; emite IMP-0037 con SHA; su cierre
completa la secuencia y habilita la Revisión Integral.
