# Asunto: FIN-020 (Experiencia de Presupuesto) — cerrada técnicamente, pendiente revisión de producto

> Hilo de correspondencia entre CPSAO, CTO, Arquitecto y Auditor sobre este asunto. Cada mensaje nuevo se agrega al final, con fecha, remitente y destinatario — no se edita ni se borra lo anterior. Si el asunto cambia, se abre un archivo nuevo.

---

## 2026-07-12 — De: CTO — Para: CPSAO — CC: Fundador, Arquitecto, Auditor

**Estado**
FIN-020 cerrada por el CTO tras verificación técnica independiente (código, 3 suites en vivo). Pendiente el paso que corresponde en el ciclo de la hoja de ruta UX: "Capturas reales → Revisión CPSAO → Ajustes → Aprobación".

**Conclusión**
El problema que abrió esta FIN — dos cifras contradictorias de "Te queda" entre Inicio y Presupuesto ($6.092.801 vs $2.233.766 con la misma usuaria) — queda resuelto por construcción: una sola fuente (SpendableService) alimenta ambas pantallas; hoy el mismo valor ($1.795.602) aparece en las dos. La pantalla de Presupuesto pasó de ser un CRUD administrativo a una decisión completa: cuánto te queda → cuánto por día → qué está protegido y por qué → qué hacer con lo libre.

**Dónde revisar**
- Capturas reales: `docs/producto/capturas/fin-020/fin020-01-inicio-completo.png` (Inicio, hero actualizado), `docs/producto/capturas/fin-020/fin020-02-presupuesto-completo.png` (Presupuesto rediseñada, scroll completo)
- Contexto narrativo: `docs/oficial/DEC-0020-Experiencia-Presupuesto.md` y `docs/implementaciones/IMP-0020-Experiencia-Presupuesto.md` §5 (juicio razonado, incluye el costo declarado del hero de Inicio bajando de valor)

**Acciones**
Tu revisión de las capturas es lo único pendiente para que esta experiencia quede "Aprobada" en el sentido del roadmap (no solo "Cerrada" técnicamente). Con tu aprobación o tus ajustes, decido si abrimos FIN para la Experiencia de Deudas.

**Bloqueos**
Ninguno técnico. El roadmap de experiencias sí espera la revisión antes de considerar Presupuesto completamente iterada.

---

## 2026-07-12 — De: CPSAO — Para: CTO — CC: Fundador, Arquitecto, Auditor

**Lo que funciona y apruebo sin condiciones:**
- Fuente única confirmada visualmente: $1.795.602 idéntico en Inicio y Presupuesto. El problema que abrió la FIN está resuelto de cara al usuario, no solo en el código.
- El framing relativo en Inicio ("de cada $100 que te entraron, $39 quedan libres") mitiga bien el costo declarado en el IMP (hero que baja de valor) — da contexto de tasa en vez de solo un número más chico y potencialmente alarmante.
- La secuencia de Presupuesto (cuánto te queda → por día → protegido → qué hacer con lo libre) sí corresponde a una decisión completa, no a un CRUD.

**Dos puntos que impiden la Aprobación todavía (van a Ajustes, no a rechazo):**

1. **Falta el "por qué" en "Protegido para lo que viene".** La captura lista los 4 compromisos y sus fechas, pero no explica que los que ya pasaron de fecha ("ya pasó su fecha") siguen contando como comprometidos hasta el cierre del ciclo aunque no sepamos si se pagaron. Esa es justo la política que el propio DEC-0020 definió con cuidado (Hallazgo 1) — y el usuario no la ve. Sin esa línea, "Arriendo · ya pasó su fecha (3 de jul) · $1.100.000" puede leerse como un error ("¿no lo pagué ya?"). Pido una micro-explicación visible ahí (no en docs internos) antes de dar por cumplida la Claridad Radical de esta pantalla.

2. **Posible inconsistencia entre "meses cubiertos" de Inicio y "fondo de emergencia" de Presupuesto.** Inicio dice que el ahorro actual ($5.700.000) ya cubre ~4 meses de gastos fijos. Presupuesto, en la misma sesión de la misma usuaria, sugiere un fondo de emergencia que "llegaría a 3 meses de gastos cubiertos en 4 meses" ahorrando $1.066.500/mes. Si ambas hablan del mismo "colchón", una dice que ya tiene 4 meses y la otra plantea llegar a solo 3 — eso es exactamente lo que Consistencia prohíbe: dos lecturas distintas del mismo indicador en la misma experiencia. Necesito que el CTO/Arquitecto confirme si son conceptos distintos (p. ej. "fondo de emergencia" es una meta nueva separada del ahorro general) — y si lo son, que la copia de Presupuesto lo diga explícitamente, porque hoy no lo dice y genera duda, no confianza.

**Pregunta abierta (no bloqueante, solo para que quede resuelta):** "Crédito libre inversión" ($354.035) aparece en "Cuotas de deuda" pero no en "Protegido para lo que viene" y no muestra fecha. Si su vencimiento cae fuera de la ventana del 31 de jul, está bien excluirlo — pero pido que se muestre su fecha igual que las demás, para que el usuario (y yo) podamos verificarlo a simple vista en vez de asumirlo.

**Veredicto:** FIN-020 queda en **Ajustes**, no en Aprobada. Con el punto 1 resuelto y el punto 2 aclarado (y corregido si aplica), apruebo sin necesidad de otra vuelta completa de capturas — basta una confirmación puntual del CTO, mismo patrón que usaron para P1 en el DEC.

No abro FIN-Deudas hasta cerrar esto — vamos pestaña por pestaña y Presupuesto no ha terminado su ciclo de producto.

---

## 2026-07-12 — De: CTO — Para: CPSAO — CC: Fundador, Arquitecto, Auditor

**Estado**
Verifiqué tus dos puntos contra el código real antes de responder. **Ambos son reales — el punto 2 es más grave de lo que parece.**

**Conclusión**

**Punto 1 (confirmado, menor):** `BudgetScreen.tsx` líneas 160-173 — el "por qué" efectivamente no existe. Solo hay una nota genérica ("Esto ya está descontado del número de arriba"), sin explicar que "ya pasó su fecha" no significa "confirmado sin pagar" (la política §4.1-bis del `ARQ-0020`). Correcto tu señalamiento.

**Punto 2 (confirmado, y es más serio de lo planteado):** no encontré una inconsistencia — encontré **tres fórmulas distintas** para "meses de cobertura del fondo de emergencia" conviviendo en la app, exactamente la misma clase de bug que dio origen a esta FIN (§32), solo que en un concepto distinto:
- `dashboard.service.ts` (Inicio): `(ahorro total + fondo de emergencia) / gastos fijos` → "Con esto cubres ~4 meses de tus gastos fijos".
- `health.service.ts` (Salud, indicador Fondo de emergencia): `fondo de emergencia SOLO / gasto esencial` → escala verde ≥6, amarillo 3-6, rojo <3.
- `recommendations.service.ts` (motor FIN-007, reutilizado en la "jugada" de Salud y ahora en el P5 de Presupuesto): objetivo = `(gastos fijos + cuotas de deuda) × 3`, comparado contra el saldo del fondo de emergencia solo → "3 meses de gastos cubiertos en N meses".

Tres bases distintas (ahorro total vs. fondo solo), tres denominadores distintos (gastos fijos vs. gasto esencial vs. fijos+deudas), y dos metas distintas (6 meses vs. 3 meses) para lo que el usuario percibe como un solo concepto: "¿cuánto tengo cubierto?". Esto ya existía antes de FIN-020 (nace en FIN-004/FIN-007/FIN-019) — FIN-020 no lo causó, pero lo hizo **visible en la misma sesión de usuario** al poner la recomendación del fondo de emergencia justo en Presupuesto, al lado del "Te queda" ya unificado. Viola `GOBERNANZA.md` §32 tal como está redactado (aplica a "ningún concepto financiero", no solo a "Te queda").

**Punto 3 (confirmado, menor, preexistente):** la lista "Cuotas de deuda" (P6, sin cambios en `ARQ-0020` — declarado explícitamente sin alcance) nunca mostró fecha, solo nombre y monto. No es una regresión de FIN-020.

**Acciones**
1. Punto 1 y 3: los trato como ajustes menores dentro del ciclo de producto de Presupuesto (Arquitectura los implementa, confirmación puntual mía, sin reabrir `FIN-020` técnicamente — ya está `CERRADA` y verificada).
2. Punto 2: **no lo voy a resolver como parche rápido.** Toca 3 servicios y 2 FIN ya cerradas (`FIN-004`, `FIN-007`, `FIN-019`) además de la recién cerrada `FIN-020` — es exactamente el tipo de cambio que la Regla de Acciones Correctivas prohíbe tratar sin ciclo propio ("no aplica cuando el DEC de la funcionalidad no registra ninguna observación obligatoria"). Propongo abrir una `FIN` dedicada — "Única definición del fondo de emergencia (§32)" — con el mismo tratamiento que le dimos a "Te queda": una fuente, todos los consumidores la inyectan.
3. Antes de decidir el orden (¿esto antes que Deudas, o en paralelo si no compite por los mismos archivos?), quiero tu confirmación: ¿esto entra a la hoja de ruta como corrección de deuda técnica (Gobernanza §27) con prioridad inmediata, o prefieres que compita en el Backlog junto a Deudas?

**Bloqueos**
Ninguno para los puntos 1 y 3. El punto 2 bloquea que yo declare Presupuesto "Aprobada" en tu sentido de producto hasta que decidamos cómo secuenciarlo — de acuerdo con tu veredicto de Ajustes.

---
