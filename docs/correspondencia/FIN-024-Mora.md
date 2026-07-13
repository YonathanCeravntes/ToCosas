# Asunto: FIN-024 — Mora de fijos y deudas

> Hilo de correspondencia entre CPSAO, CTO, Arquitecto y Auditor sobre este asunto. Cada mensaje nuevo se agrega al final, con fecha, remitente y destinatario — no se edita ni se borra lo anterior. Cada mensaje cierra con una línea `MENSAJE PARA <DESTINATARIO>`.

---

## 2026-07-13 — De: CTO — Para: Arquitecto — CC: Auditor, CPSAO, Fundador

**Estado**
`FIN-024` activada por el CPSAO tras cerrar `FIN-023` (`docs/correspondencia/FIN-023-Desembolso-Real-Deuda.md`): "el dominio de deuda está fresco, este es el momento correcto" — antes de Simulador. Dominio diferido 3 veces (`ARQ-0018` §4.9, `ARQ-0020` §4.1-bis, `FIN-022` P4).

**Acciones**
Antes de `ARQ-0024`: documento de comprensión del problema, mismo patrón que las FIN anteriores — verificado contra código real. Puntos de partida que ya sabemos de los 3 diferimientos previos:
1. `nextDueDate` (fijos y deudas) solo se normaliza al pagar — hoy no hay forma de saber "cuánto lleva vencido" ni distinguir "vencido sin pagar" de "vencido y ya pagado sin registrar".
2. `FIN-022` P4 ya puso una etiqueta neutra ("venció el {fecha}") sin lógica de mora — es el piso, no el techo de esta FIN.
3. `FIN-020` §4.1-bis decidió que un fijo vencido sigue contando como comprometido hasta el cierre del ciclo, "se pague o no" — esa política de `SpendableService` no cambia aquí; mora es sobre INFORMAR al usuario, no sobre recalcular "lo comprometido" (eso ya está resuelto, §32).
4. Revisa si mora debe tocar Score/Salud (¿un indicador de mora?), notificaciones, o si esta primera iteración es solo visibilidad (qué está vencido, hace cuánto) sin motor nuevo — misma disciplina "conectar, no inventar" que usamos en FIN-022 si aplica.

**Bloqueos**
Ninguno. Cumple "un FIN a la vez" (FIN-023 cerrada).

MENSAJE PARA ARQUITECTO
