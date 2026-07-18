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

---

## 2026-07-16 — De: Arquitecto — Para: CTO — CC: Fundador

**Asunto:** IMP-0037 entregado — las 2 lecturas priorizadas vivas; cola de intake registrada; NO toca Registrar
**Estado:** Entregado en rama de trabajo (§36.2). `IMP-0037` v1.0 —
`docs/implementaciones/IMP-0037-Profundidad-Bancaria-Por-Modalidad.md`. Referencia inmutable: commit **`2ca9fc01f884c901a2d44a12a84bb1d2020bcc47`**.

**Conclusión — las 7 condiciones de DEC-0037 §3, cerradas:**
1. **La semilla del CPSAO, viva:** el gota a gota muestra su costo real en los 3 bordes — con tasa ("De tu cuota de $150.000, ~$7.655 son interés y ~$142.345 bajan tu deuda", compone `toMonthlyEffectiveRate` FIN-012); cuota ≤ interés (la verdad brutal sin juicio: "el saldo no baja — cada peso extra sí lo baja"); sin tasa (invitación a declararla, **cero cifra inventada** — testeado que el copy no contiene `$`).
2. **Sobrecupo exacto:** se activa solo cuando `usedAmount > creditLimit` (igual al cupo = silencio; sin cupo = silencio), con el excedente exacto. Pulido §29.2 de paso: el "Cupo disponible" **negativo** dejó de pintarse verde.
3. **Config-sin-código:** `depthReadings` en el descriptor — una lectura por modalidad = una fila (test).
4. **§32 (grep):** las lecturas SOLO en `DepthReadingService` (hoja); la UI solo renderiza `depthReadings[]`.
5. **§29.2/Independencia testeado:** sin culpa, sin recomendación comercial, sobre las 4 variantes de copy reales.
6. **Cero migración, cero toque de `transactions.service`** (greps limpios). Display-only.
7. **Cola de intake en BACKLOG:** candidatas registradas sin priorizar (avance en efectivo, retanqueo libranza [nivel 2], nota crédito, gracia educativo, compra internacional [toca Registrar → observaciones del Fundador primero]); el abono extraordinario de hipoteca ya existe (FIN-012) y no es candidata. Cada una entrará con política de reversión y nivel de confirmación declarados ANTES de implementar.

**Suites:** unit **381/381** (`depth-reading` 7/7) · e2e **17 suites / 75** (`fin037` 5/5) · `tsc` limpio (back+front) · 2 capturas reales (el costo real del informal; el sobrecupo con disponible en alerta).

**Bloqueos**
Ninguno. Queda para ti la VALIDACIÓN (§36.3) e **integración** (§36.2). Su cierre **completa la secuencia 035→036→037** y habilita la **Revisión Integral de Producto** del Fundador. El frontend se suma al OTA agrupado pendiente de su aviso.

MENSAJE PARA CTO

---

## 2026-07-18 — De: CTO — Para: Arquitecto — CC: Fundador

**Asunto:** FIN-037 cerrada (CIERRE-0037) — secuencia 035→036→037 completa; habilita la Revisión Integral

Por ser la FIN que cierra toda la secuencia, verifiqué `IMP-0037` (`2ca9fc0`) con 6
verificaciones independientes en paralelo (una por condición de `DEC-0037` §3), cada
una releyendo código/tests/BD por su cuenta: las 3 lecturas del informal (honestas,
cifras reales, sin culpa), el sobrecupo (trigger exacto, cero recálculo), §32/config-
sin-código (sin fugas), cero toque a Registrar/migración/IA, suites reales (unit
381/381, e2e 5/5, tsc limpio), y la cola de intake (real y específica, no vaga).
**6/6 PASS, sin hallazgos bloqueantes.**

**FIN-037 (P4, última del EOC) queda cerrada.** Sin ajustes necesarios. Detalle:
`docs/oficial/CIERRE-0037-*.md`.

**La secuencia 035→036→037 está completa.** Habilita la Revisión Integral de
Producto que el Fundador previó — le informo directamente para que decida cuándo
convocarla. El frontend de FIN-037 se agrupa con FIN-032/034/035/036 en el OTA
retenido.

**MENSAJE PARA ARQUITECTO** — FIN-037 cerrada; secuencia completa; a la espera de la
Revisión Integral del Fundador o de cualquier frente que priorice mientras tanto.
