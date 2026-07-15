# Asunto: FIN-026 — Experiencia de Simulador

> Hilo de correspondencia entre CPSAO, CTO, Arquitecto y Auditor sobre este asunto. Cada mensaje nuevo se agrega al final, con fecha, remitente y destinatario — no se edita ni se borra lo anterior. Cada mensaje cierra con una línea `MENSAJE PARA <DESTINATARIO>`.

---

## 2026-07-13 — De: CTO — Para: Arquitecto — CC: Auditor, CPSAO, Fundador

**Estado**
`FIN-026` autorizada por el CPSAO en `docs/correspondencia/FIN-024-Mora.md`. Siguiente en la hoja de ruta UX tras Deudas (Inicio/Salud/Presupuesto/Deudas ya cerradas).

**Acciones**
Antes de `ARQ-0026`: documento de comprensión del problema, mismo patrón que las FIN anteriores — verificado contra código real. Contexto que ya conocemos y deberías reusar, no redescubrir:
1. El motor de simulación (`portfolio.simulator.ts`, `simulation-engine.ts`) ya existe y está auditado — lo han consumido Recomendaciones (FIN-007), la jugada de Salud (FIN-019), el orden de ataque de Deudas (FIN-022 `attackOrder`) y el fondo de emergencia (FIN-021). La pregunta central de esta FIN probablemente no es "construir el motor" sino "¿qué le falta a la PANTALLA del Simulador para que el usuario decida con él directamente, no solo lo vea invocado desde otras pantallas?" — misma disciplina "conectar, no inventar".
2. §32 desde ya: cualquier cifra que el Simulador muestre y que ya tenga fuente única en otra pantalla (Te queda, fondo de emergencia, desembolso real, orden de ataque) debe consumir esa misma fuente — no recalcularla.
3. Revisa si el Simulador de hoy ya cubre escenarios reales o si hay una brecha (recuerda el "gap kind→escenario" registrado en notas operativas previas — confírmalo contra código, no lo asumas de memoria).

**Bloqueos**
Ninguno. Cumple "un FIN a la vez" (FIN-024 cerrada).

MENSAJE PARA ARQUITECTO

---

## 2026-07-13 — De: Arquitecto — Para: CTO — CC: CPSAO, Auditor, Fundador

**Estado**
`COMPRENSION-FIN026-Simulador.md` entregado (`docs/producto/`, commiteado), verificado contra código real. Sin ARQ todavía.

**Conclusión**
Tu hipótesis se confirma: el motor está completo (8 escenarios auditados) y la FIN es de PANTALLA y PUERTAS. Lo verificado: la pantalla expone solo 5 escenarios (refinanciar y vender activo no tienen ninguna puerta de entrada en toda la app); el "gap kind→escenario" es peor de lo documentado — con la jugada de `abono_extra`, la pantalla cae en silencio al PRIMER chip y la usuaria aterriza en "¿y si tomo un crédito?", lo contrario de lo recomendado (`SimulatorScreen.tsx:58-60`); el resultado es una tabla técnica sin narrativa §29 ni siguiente paso; el historial persistido (20 últimas, con cuota FIN-009 ya conectada al paywall) no se muestra en ningún lado; y no hay estados vacíos. Inventario §32 en el documento — un punto visible: quien llega desde "verlo en el simulador" del bloque de Deudas ve OTRA cifra de estrategia (la pantalla pide extra manual; el bloque usa el contrato `extraBudget: 0`) — la divergencia estaba explicada en docs, no ante la usuaria.

**Acciones**
Cuatro decisiones previas al ARQ (nota de alcance): (1) confirmar el enfoque pantalla+puertas; (2) el gap del abono: ¿pieza de la FIN o ajuste inmediato? — está sangrando ya; (3) coherencia del escenario estrategia con el contrato de Deudas (abrir en 0 con el "piso/techo" explicado en pantalla); (4) ¿entran los 3 escenarios sin puerta o profundizamos los 5 existentes?

**Bloqueos**
Ninguno.

MENSAJE PARA CTO

---

## 2026-07-13 — De: CTO — Para: Arquitecto — CC: Auditor, CPSAO, Fundador

**Estado**
Verifiqué los dos hallazgos críticos contra código: reales. `SimulatorScreen.tsx:58-60` confirma `SCENARIOS.find(...) ?? SCENARIOS[0]` — como `abono_extra` no está en `SCENARIOS`, cualquier navegación con ese `scenario` cae silenciosamente en `SCENARIOS[0]` ("¿Y si tomo un crédito?"), el escenario opuesto al recomendado. `DebtsListScreen.tsx:191` confirma que navega a `estrategia_deudas` sin precargar `extraBudget`, mientras el bloque de Deudas calculó con `0` fijo (`DEC-0022` §5.3) — la divergencia es real de cara a la usuaria, no solo documental.

**Tus 4 puntos:**
1. **Confirmado.** "Conectar, no inventar" — motor completo, esto es diseño de pantalla y puertas.
2. **Decidido — entra como P1 del ARQ, máxima prioridad, no ajuste suelto fuera de gobernanza.** Es un bug de navegación real y activo (la usuaria puede simular lo contrario de lo recomendado hoy mismo), pero corregirlo bien exige agregar `abono_extra` como escenario propio con sus parámetros (la deuda, el extra sugerido) — eso ya es diseño, no un parche de una línea. Va dentro de `ARQ-0026`, con prioridad sobre las demás piezas.
3. **Aprobado.** Cuando se llegue desde Deudas, `estrategia_deudas` abre con `extraBudget` precargado en 0 y el contrato `DEC-0022` §5.3 explicado en pantalla ("este es tu piso; agrega un extra para ver el techo").
4. **Decidido — entran los 3 escenarios faltantes** (`abono_extra`, `refinanciar`, `vender_activo`). El motor ya los soporta y ya está auditado (FIN-007) — dejar puertas cerradas sobre un motor que ya pagamos y verificamos no tiene sentido, y es exactamente la brecha que esta FIN existe para cerrar.

**Acciones**
Inicia `ARQ-0026` con el alcance completo: P1 (agregar los 3 escenarios faltantes, `abono_extra` con máxima prioridad por el bug activo) + P2 (coherencia con el contrato de Deudas) + narrativa §29/historial visible/estados vacíos según tu propio diagnóstico. Recuerda §32: toda cifra con fuente única existente (Score/DTI, fondo de emergencia, teQueda/desembolso real) se inyecta, no se recalcula.

**Bloqueos**
Ninguno.

MENSAJE PARA ARQUITECTO

---

## 2026-07-13 — De: Arquitecto — Para: Auditor — CC: CTO, CPSAO, Fundador

**Estado**
`ARQ-0026` v1.0 emitido (`docs/arquitectura/ARQ-0026-Experiencia-Simulador.md`, commiteado) — para tu `AUD-0026`.

**Conclusión**
Seis piezas, cero backend: P1 los 3 escenarios sin puerta con selectores reales y precarga por params de navegación — el default del selector de deuda es `attackOrder[0]` del summary (la MISMA fuente de FIN-022: la jugada aterriza en la deuda que el motor recomienda atacar), y el fallback mudo muere (escenario desconocido → aviso visible); P2 estrategia desde Deudas abre con `extraBudget: 0` y la línea piso/techo — incluye corregir la validación actual que rechaza `0` (hoy la pantalla ni puede reproducir la cifra del bloque); P3 titular narrado §29 desde `specifics` existentes (rechacé tocar el motor; los hitos del fondo NO se narran desde frontend para no duplicar los literales de DEC-0021 §5.2 — semilla declarada); P4 puente de vuelta solo donde la acción real existe (abono→abonar de FIN-012, etc. — sin CTAs fabricados); P5 historial (últimas 5, re-ensayo por tap); P6 estados vacíos honestos por escenario.

**Puntos que pido verificar en tu AUD:** (1) el mapa COMPLETO de kinds→escenario tras P1 (que ningún kind del motor de recomendaciones quede sin puerta o con fallback); (2) que la precarga por params no permita inyectar valores fuera de las validaciones del backend (el DTO ya valida — confirmar que la pantalla no lo esquiva); (3) la frescura declarada del "antes" (fórmulas únicas sobre estado vivo vs persistido de Salud, ~25 s) — ¿algún caso donde la divergencia transitoria confunda de verdad?

**Bloqueos**
Ninguno. No implemento nada hasta el DEC.

MENSAJE PARA AUDITOR

---

## 2026-07-13 — De: Auditor — Para: CTO — CC: Arquitecto, CPSAO, Fundador

**Estado**
`AUD-0026` emitido. Veredicto: **APROBADO CON OBSERVACIONES**. Verificado contra `HEAD`.

**Conclusión (los 3 puntos del Arquitecto)**
1. **Gap de kinds real:** `abono_extra` falta en `SIM_BY_KIND` (Salud+Presupuesto) → fallback mudo a `SCENARIOS[0]`. P1 lo cierra **si toca ambos mapas y mata el `?? SCENARIOS[0]`** — condición para el IMP.
2. **Precarga no esquiva el backend** (DTO+servicio validan cada POST). **Precisión:** el backend ya acepta `extraBudget:0` (`:216` solo rechaza `<0`); quien rechaza 0 es el guard `v<=0` del frontend (`SimulatorScreen.tsx:73`) → **P2 es frontend-only; no tocar la validación del backend.**
3. **"Antes" en vivo:** correcto para el delta (leer el persistido rompería la línea base), pero el Score "antes" absoluto puede diverger ~25s del que muestra Salud. Mitigación: liderar el titular con el cambio (X→Y), no con el absoluto; declarar la ventana.

§32 bien: defaults inyectados (`attackOrder[0]`, copy §5.2), hitos del fondo no narrados desde frontend.

**Acciones (para el DEC)**
Fijar como obligatorio: ambos mapas + fin del fallback mudo (Obs. 1); P2 solo frontend (Obs. 2); titular liderado por el delta (Obs. 3). La Validación verificará el mapa de kinds por lectura de código (FIN de frontend, sin suite de pantalla).

**Bloqueos**
Nada de diseño bloquea el DEC.

MENSAJE PARA CTO

---

## 2026-07-13 — De: CTO — Para: Arquitecto — CC: Auditor, CPSAO, Fundador

Verifiqué los 3 puntos del AUD contra código — exactos (`SIM_BY_KIND` sin `abono_extra` en ambas pantallas; backend ya acepta `extraBudget:0`, el guard sobrerrestrictivo es del frontend). `DEC-0026` emitido: P1-P6 aprobados. **3 cambios obligatorios:** (1) toca AMBOS mapas (Salud y Presupuesto) + elimina el fallback mudo `?? SCENARIOS[0]`; (2) P2 es solo frontend — no toques la validación del backend, ya es correcta; (3) el titular lidera con el delta del Score ("pasaría de X a Y"), nunca con el absoluto. `IMP-0026` habilitado.

MENSAJE PARA ARQUITECTO

---

## 2026-07-13 — De: Arquitecto — Para: CTO — CC: Auditor, CPSAO, Fundador

**Estado**
FIN-026 implementada conforme a `DEC-0026` con los 3 cambios obligatorios. Referencia inmutable: commit `68588c8cdc754a0ae07fffd94613b4af97fa84b1`; `IMP-0026` v1.0 en `docs/implementaciones/`. **Cero backend** — el diff es solo frontend + capturas.

**Conclusión**
Los 8 escenarios usables; ambos `SIM_BY_KIND` completados y el fallback mudo reemplazado por aviso visible; el selector de abono abre con `attackOrder[0]` preseleccionado (fuente única FIN-022 — la jugada aterriza en la deuda que el motor recomienda atacar); estrategia desde Deudas llega con el 0 precargado, el helper piso/techo, y el resultado muestra el MISMO copy del bloque palabra por palabra (coherencia §32 capturada); titular siempre con el delta del Score, nunca el absoluto; puentes de vuelta solo donde hay acción real; historial visible con re-ensayo; vacíos honestos. Verificación: `tsc` limpio, suites 326/326 y 23/23 como regresión. Capturas antes/después en `docs/producto/capturas/fin-026/` — la de resultado es la evidencia central: el veredicto del Simulador y el del bloque de Deudas son la misma frase.

**Reservas para la validación (IMP §4):** el re-ensayo de una venta usa el valor ACTUAL del activo (no el del ensayo original — correcto y declarado); las recomendaciones de abono no traen `debtId` en su payload y el default del orden de ataque cubre el hueco (semilla registrada si el motor llegara a recomendar otra deuda); los vacíos de "sin deudas" son defensivos y verificables por código (capturado el de venta, el único alcanzable de verdad hoy).

**Acciones**
Queda en tus manos activar la validación del Auditor y, con su concepto, el cierre. Con FIN-026 cerrada, la hoja de ruta UX queda con una sola experiencia pendiente: el Copiloto.

**Bloqueos**
Ninguno.

MENSAJE PARA CTO

---

---

## 2026-07-13 — De: CTO — Para: Fundador — CC: CPSAO, Arquitecto, Auditor

**Asunto:** FIN-026 CERRADA — validación técnica del CTO
**Estado:** Cerrada (eje técnico). Firma de producto en dispositivo real a cargo del Fundador con el APK nuevo.

Por instrucción del Fundador, validé FIN-026 para cierre. Verificación independiente
contra el commit de referencia `68588c8` (cero backend, confirmado por `git diff --stat`).
Los **3 cambios obligatorios** de `DEC-0026`, confirmados en código real:

1. **Ambos mapas `SIM_BY_KIND` + fallback mudo eliminado.** `abono_extra` presente en
   Salud (`HealthScreen.tsx:218`) y Presupuesto (`BudgetScreen.tsx:210`). El fallback ya
   no es mudo: `unknownScenario` (`SimulatorScreen.tsx:139`) dispara un banner visible
   "⚠️ No encontré el escenario que buscabas" (`:246-252`) en vez de caer callado en
   `SCENARIOS[0]`.
2. **P2 frontend-only.** `extraBudget` con `allowZero:true` (`:87`) y validación
   `f.allowZero ? v<0 : v<=0` (`:215`) que acepta 0; `DebtsListScreen.tsx:194-196`
   precarga `extraBudget:0`. Sin `backend/` en el diff — no se tocó la validación del
   backend (ya correcta).
3. **Titular por delta.** `headline()` (`:418-422`) lidera con "Tu Score pasaría de X a
   Y" y omite la frase cuando el delta es 0 (§29.1).

`tsc --noEmit` reejecutado por el CTO: **exit 0**. Suites unit/e2e sin cambios (FIN
frontend-only, corridas como regresión) — validación por código+capturas, método que el
propio AUD anticipó (precedente FIN-017). Sexta experiencia UX cerrada.

**Nota:** el APK OTA-capaz recién compilado (build `21922b26`) ya incluye este código,
así que tu prueba en el teléfono valida también FIN-026 en uso real.

**MENSAJE PARA FUNDADOR** — FIN-026 cerrada; queda tu firma de producto al probar el APK.
