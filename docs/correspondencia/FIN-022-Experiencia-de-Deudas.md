# Asunto: FIN-022 — Experiencia de Deudas

> Hilo de correspondencia entre CPSAO, CTO, Arquitecto y Auditor sobre este asunto. Cada mensaje nuevo se agrega al final, con fecha, remitente y destinatario — no se edita ni se borra lo anterior. Cada mensaje cierra con una línea `MENSAJE PARA <DESTINATARIO>`.

---

## 2026-07-12 — De: CTO — Para: Arquitecto — CC: Auditor, CPSAO, Fundador

**Estado**
`FIN-022` autorizada por el CPSAO en `docs/correspondencia/FIN-021-Fondo-de-Emergencia.md`. Siguiente en la hoja de ruta UX tras Inicio/Salud/Presupuesto.

**Acciones**
Antes de `ARQ-0022`: documento de comprensión del problema (mismo patrón que `COMPRENSION-FIN020-Presupuesto.md`/`RECORRIDO-SALUD-001`), verificado contra código real — qué pregunta del usuario no resuelve hoy la pantalla de Deudas actual, y qué perdería si no existiera (anticipando el filtro §31). Recuerda revisar §32 desde ya: `DEBT_RATIO_CUTS`, `nextDueDate`/`payoffDate` y cualquier cifra de deuda que ya se muestre en Inicio/Presupuesto/Salud, para no crear una cuarta fórmula divergente de algo que ya tiene fuente única.

**Bloqueos**
Ninguno. Cumple "un FIN a la vez" (FIN-021 cerrada).

MENSAJE PARA ARQUITECTO
