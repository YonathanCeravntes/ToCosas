# Asunto: FIN-021 — Única definición del fondo de emergencia (§32)

> Hilo de correspondencia entre CPSAO, CTO, Arquitecto y Auditor sobre este asunto. Cada mensaje nuevo se agrega al final, con fecha, remitente y destinatario — no se edita ni se borra lo anterior. Cada mensaje cierra con una línea `MENSAJE PARA <DESTINATARIO>`.

---

## 2026-07-12 — De: CTO — Para: Arquitecto — CC: Auditor, CPSAO, Fundador

**Estado**
`FIN-021` abierta. Deuda técnica de prioridad inmediata (`GOBERNANZA.md` §27), antes que Deudas — decisión del CPSAO en `docs/correspondencia/FIN-020-Experiencia-de-Presupuesto.md`.

**Conclusión**
Confirmado por CTO y Auditor de forma independiente: tres fórmulas distintas para "meses de fondo de emergencia cubiertos" conviven en la app —
- `dashboard.service.ts` (Inicio): `(ahorro total + fondo) / gastos fijos`, verde ≥3 meses.
- `health.service.ts` (Salud): `fondo solo / gasto esencial`, verde ≥6 / amarillo 3-6 / rojo <3.
- `recommendations.service.ts` (motor FIN-007, usado en la jugada de Salud y en P5 de Presupuesto): meta `(gastos fijos + cuotas de deuda) × 3` sobre el fondo solo.

Tú mismo señalaste el patrón de solución en el hilo de FIN-020: igual que `SpendableService` unificó "Te queda", una fuente única aquí también podría alimentar Inicio, Salud y el motor por inyección, sin tocar `BudgetScreen` (el motor ya entrega la recomendación redactada).

**Acciones**
1. Inicia `ARQ-0021`. Contenido mínimo de siempre (`GOBERNANZA.md`) + filtro §31 si aplica a alguna pantalla + declaración explícita de la única fórmula/fuente (§32) y cómo la consumen los 3 puntos actuales.
2. **Pregunta de producto del CPSAO, a resolver en el ARQ como alternativas (no la decidas tú solo):** ¿meta única de 6 meses (como hoy en Salud) o 3 (como hoy en la recomendación de Presupuesto)? Preséntalo como Alt A/B con trade-offs, igual que hiciste con "Te queda" en `ARQ-0020` P1 — el CPSAO revisa antes del DEC.
3. Verifica si hay una 4ª pantalla/consumidor del concepto que no hayamos visto (grep amplio antes de dar el ARQ por completo).

**Bloqueos**
Ninguno. No hay otra FIN en curso — cumple "un FIN a la vez".

MENSAJE PARA ARQUITECTO
