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

---

## 2026-07-12 — De: Arquitecto — Para: CTO — CC: Auditor, CPSAO, Fundador

**Estado**
`ARQ-0021` v1.0 emitido (`docs/arquitectura/ARQ-0021-Fondo-de-Emergencia.md`, commit `77ddffd`). Los 3 encargos cubiertos.

**Conclusión**

1. *Diseño (§32 por construcción):* la app YA tiene una definición canónica — `EmergencyFundMonths` del Motor (fondo marcado / gasto esencial), auditada en FIN-003/004, persistida y consumida por 6 de los 9 puntos del inventario. Recomiendo adoptarla como LA oficial (P1 Alt A) en vez de inventar una nueva: los únicos divergentes reales son Inicio (fórmula propia) y la meta de la recomendación. Para Inicio propongo leer la MISMA lectura persistida que Salud (P2 Alt A — igualdad por construcción, mismo argumento que `SpendableService`); hitos y cortes quedan en constantes exportadas de un único módulo (patrón `DEBT_RATIO_CUTS`).

2. *Pregunta de producto (P3, decide el CPSAO):* presentada como Alt A (6 en todo) / Alt B (3 en todo) / **Alt C recomendada: una escala con dos hitos nombrados — "colchón inicial" (3) y "fondo completo" (6)**. La escala ya existe en la app (logros `fondo_3m`/`fondo_6m`, cortes de Salud amarillo≥3/verde≥6): Alt C le pone nombre en vez de elegir un bando, la recomendación apunta al próximo hito del usuario nombrándolo, y nada de FIN-004 se re-audita. Trade-offs completos en el ARQ §4.

3. *4º consumidor (grep amplio):* aparecieron cinco más de los tres del hallazgo — Score (pilar), Simulador, Gamificación (logros 3m/6m), Insights (celebración al cruzar 6) y el glosario del Copiloto ("meta típica 6 meses"). Todos consumen la canónica; el inventario completo de 9 está en el ARQ §2. El frontend no calcula nada — la unificación es 100% backend + copys.

**Nota para el Auditor:** tu matiz intra-servicio del hilo FIN-020 (líneas 106 vs 109 de `recommendations.service.ts` con bases distintas) no coincide con lo que leo en `614ef81c` — ambas evalúan `fixedExpense + Σ cuotas`. Pido re-verificación o el ejemplo concreto en tu AUD; el resto del hallazgo (meta 3 vs 6, fórmula propia de Inicio) está confirmado y sustenta la FIN.

**Acciones**
CTO: verificación del ARQ y pase a Auditoría. El plan (§14) contempla la revisión CPSAO de P3 ANTES del DEC, como él pidió. Riesgo a cuantificar en AUD: la cadencia de recálculo del Motor (frescura de Inicio bajo P2 Alt A).

**Bloqueos**
Ninguno. No implemento nada hasta el DEC.

MENSAJE PARA CTO

---

## 2026-07-12 — De: Arquitecto — Para: Auditor — CC: CTO, CPSAO, Fundador

**Corrección de destinatario (señalada por el Fundador):** mi mensaje anterior debió dirigirse a ti — el ciclo es ARQ → AUD → DEC, y quien audita el ARQ eres tú, no el CTO. `ARQ-0021` v1.0 (`docs/arquitectura/ARQ-0021-Fondo-de-Emergencia.md`, commit `77ddffd`) queda a tu disposición para `AUD-021`. Todo el contenido del mensaje anterior aplica tal cual; en particular la re-verificación pedida del matiz intra-servicio (líneas 106 vs 109 de `recommendations.service.ts`) y la cadencia de recálculo del Motor (riesgo de frescura de P2 Alt A).

**Bloqueos:** ninguno. No implemento nada hasta el DEC.

MENSAJE PARA AUDITOR

---

## 2026-07-12 — De: Auditor — Para: CTO — CC: Arquitecto, CPSAO, Fundador

**Estado**
`AUD-0021` emitido (`docs/auditoria/AUD-0021-Fondo-de-Emergencia.md`). Veredicto: **APROBADO CON OBSERVACIONES**. Verificado contra `125c5c6`.

**Conclusión**
Diseño correcto: §32 por construcción adoptando la canónica ya auditada (radio de daño mínimo, FIN-004 intacta). Inventario de 9 confirmado; grep amplio no halló un 4º cálculo independiente oculto. **Concedo y retiro mi matiz intra-servicio de FIN-020** — la línea 108 de `recommendations.service.ts` define `essential` idéntico al disparo (106); mi grep omitió esa línea. El hallazgo principal (3 fórmulas entre servicios) se mantiene. **Frescura de P2 Alt A cuantificada** (encargo del Arquitecto): OutboxDispatcher 10 s + drain 15 s ⇒ ~25 s peor caso, aceptable — el nocturno es solo backstop.

**Acciones (para el DEC)**
1. Aceptar explícitamente el límite de frescura ~25 s (P2 Alt A).
2. El IMP debe hacer que Recomendaciones consuma la fuente/constantes oficiales, no solo alinear la meta (cerrar divergencia por recálculo).
3. Vigilar percepción de pérdida en Inicio (número menor al pasar a fondo marcado; mitigación de copy ya en el ARQ).
4. P3 (meta única) es decisión de producto del CPSAO antes del DEC — Alt C es la de menor radio de daño, pero no me compete.

**Bloqueos**
Nada arquitectónico. Única condición de avance: revisión CPSAO de P3, por diseño.

MENSAJE PARA CTO

---

## 2026-07-12 — De: CTO — Para: CPSAO — CC: Arquitecto, Auditor, Fundador

**Estado**
`ARQ-0021` y `AUD-0021` verificados por mí contra código real (commits `77ddffd`/`125c5c6`) — inventario de 9 consumidores, fórmula canónica, y los ~25s de frescura, todos exactos. Sin hallazgos propios que añadir. Falta tu decisión de P3 para emitir el `DEC`.

**Tu decisión pendiente — meta única del fondo de emergencia:**
- **Alt A:** 6 meses en todo.
- **Alt B:** 3 meses en todo.
- **Alt C (recomendada por Arquitecto y Auditor):** dos hitos nombrados — "colchón inicial" (3) y "fondo completo" (6), usando la escala que ya existe en la app (logros `fondo_3m`/`fondo_6m`). Convierte la contradicción actual ("~4 vs 3") en narrativa: "ya tienes tu colchón inicial — te falta esto para el fondo completo".

**Acciones**
Tu respuesta aquí mismo habilita el `DEC-0021`.

**Bloqueos**
Ninguno técnico. Solo tu decisión de P3.

MENSAJE PARA CPSAO

---

## 2026-07-12 — De: CPSAO — Para: CTO — CC: Arquitecto, Auditor, Fundador

**Decisión P3: Alt C.** Dos hitos nombrados (colchón inicial 3 / fondo completo 6), misma fórmula canónica, misma escala de logros ya existente. Convierte la contradicción en progreso — Claridad Radical mejor servida por un hito nombrado que por un número seco, y no reabre Consistencia porque sigue siendo una sola fórmula, solo con dos lecturas narrativas del mismo dato.

Habilita `DEC-0021`.

MENSAJE PARA CTO

---

## 2026-07-12 — De: CTO — Para: Arquitecto — CC: Auditor, CPSAO, Fundador

`DEC-0021` emitido (`docs/oficial/DEC-0021-Fondo-de-Emergencia.md`). P1/P2/P3(Alt C)/P4 aprobados. **1 cambio obligatorio:** `recommendations.service.ts` debe consumir la fuente/constantes oficiales, no solo alinear la meta a 3/6 (DEC §5.1). `IMP-0021` habilitado — procede según el Plan `ARQ-0021` §14.

MENSAJE PARA ARQUITECTO

---

## 2026-07-12 — De: Arquitecto — Para: Auditor — CC: CTO, CPSAO, Fundador

**Estado**
FIN-021 implementada conforme a `DEC-0021`, incluido el cambio obligatorio §5.1. Referencia inmutable: commit `6ee4d9d9e4403474fd65c0b69b93088db21d5f31`; `IMP-0021` v1.0 en `docs/implementaciones/`.

**Conclusión**
Una sola fuente por construcción: la fórmula existe únicamente en `core-metrics` (grep en IMP §2), los hitos en `emergency-fund.constants.ts` (colchón inicial 3 / fondo completo 6, cero literales en copys), y Recomendaciones ya no recalcula — lee las métricas persistidas del Motor, igual que Inicio y Salud (§5.1 cumplido: "no puede divergir nunca", no "coincide hoy"). Suites: unitaria 310/310, e2e 12/12 — incluida la igualdad Inicio == lectura del Motor == Salud contra BD real. Capturas de las 3 pantallas co-visibles en `docs/producto/capturas/fin-021/`: la usuaria demo ve "~1,3 meses / colchón inicial son 3" en Inicio, "1.3 meses" en Salud, y la MISMA jugada nombrando el hito en Salud y Presupuesto — la contradicción que abrió la FIN ya no es reproducible.

**Dos efectos declarados para tu validación (no sorpresas del diff):** (1) la recomendación de fondo ahora también se genera entre 3 y 6 meses (consecuencia directa de Alt C — antes se apagaba en 3); (2) la línea de ahorro de Inicio baja de "~4 meses" a la cobertura real del fondo (costo de honestidad ya aceptado en DEC §6). Reservas completas en IMP §4.

**Acciones**
Validación en checkout aislado sobre el commit de referencia (comandos en IMP §5); con tu concepto, cierre del CTO.

**Bloqueos**
Ninguno.

MENSAJE PARA AUDITOR

---

## 2026-07-12 — De: Arquitecto — Para: CTO — CC: Auditor, CPSAO, Fundador

**Corrección de destinatario (señalada por el Fundador):** la entrega posterior al DEC va dirigida a ti, que coordinas la validación — no directo al Auditor. Mi mensaje anterior vale íntegro como contenido de entrega: `IMP-0021` v1.0, commit `6ee4d9d9e4403474fd65c0b69b93088db21d5f31`, suites 310/310 y 12/12, capturas de las 3 pantallas, §5.1 cumplido y dos efectos declarados (IMP §4). Queda en tus manos activar la validación del Auditor y, con su concepto, el cierre.

**Bloqueos:** ninguno.

MENSAJE PARA CTO

---

## 2026-07-12 — De: CTO — Para: Auditor — CC: Arquitecto, CPSAO, Fundador

`IMP-0021` entregado (commit `6ee4d9d9e4403474fd65c0b69b93088db21d5f31`). Activa `VALIDACIÓN-0021`: correspondencia DEC→IMP→Código→Evidencia en las 4 capas, checkout aislado, suites en vivo — mismo estándar que `VALIDACION-0020`. Verifica en particular el cambio obligatorio `DEC-0021` §5.1 (Recomendaciones consumiendo la fuente oficial, no solo la meta).

MENSAJE PARA AUDITOR

---
