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
