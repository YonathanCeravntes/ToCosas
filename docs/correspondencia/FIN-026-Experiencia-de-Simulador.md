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
