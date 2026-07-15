# AUD-0020 · Experiencia de Presupuesto

- **Documento auditado:** `docs/arquitectura/ARQ-0020-Experiencia-Presupuesto.md` v1.0 (commit `c420af0`)
- **Insumos:** `docs/producto/COMPRENSION-FIN020-Presupuesto.md` (commit `5b5c3b1`) · `GOBERNANZA.md` §31, §32
- **Realiza:** Auditor de Milla
- **Fecha:** 2026-07-12

---

## 1. Resumen Ejecutivo

`ARQ-0020` responde con solidez a un problema real y bien documentado (dos "Te queda"
contradictorios, verificado en `budget.service.ts:106` y `dashboard.service.ts:100`) y
propone una arquitectura correcta a nivel de principio: una sola fuente de verdad
(`SpendableService`) inyectada por ambos consumidores, exactamente lo que exige §32.
La definición Alt A ("tuyo de verdad", conservadora) está bien argumentada contra el
error documentado de optimismo del usuario. No encontré hallazgos en P2 (fuente
única), P3, P4 (más allá de una aproximación ya declarada), P6, ni en la respuesta al
filtro §31 (sustantiva, no genérica).

Sí encontré dos hallazgos que afectan la exactitud numérica que es la razón de ser de
esta FIN — uno en la fórmula misma de P1 (compromisos pendientes no vinculados a
transacciones reales pueden desaparecer del cálculo) y otro en el efecto declarado
sobre Inicio (los umbrales de `interpretCashflow` no fueron recalibrados para el nuevo
valor, sistemáticamente más bajo). Ambos son verificables en el código real, no
hipotéticos.

## 2. Hallazgos

### Hallazgo 1 (elevado a observación crítica) — Vacío en la fórmula de "compromisos pendientes" de P1

La fórmula de Alt A resta "compromisos PENDIENTES del resto del ciclo: fijos con
`dayOfMonth` por venir + cuotas con `nextDueDate` dentro del ciclo" — es decir, un
fijo con fecha ya pasada deja de contarse como "pendiente". Verifiqué en
`backend/prisma/schema.prisma` que `Transaction` **no tiene ningún campo que lo
vincule a un `FixedItem`** (no existe `fixedItemId` ni equivalente) — no hay forma de
saber si un fijo cuya fecha ya pasó fue efectivamente registrado como transacción real
o si simplemente nunca se registró (frecuente en un tracker por WhatsApp: el arriendo
sale por débito automático y el usuario nunca lo escribe).

**Consecuencia concreta:** un fijo vencido y no registrado no aparece en "gastos y
pagos reales" (nunca se creó la transacción) NI en "compromisos pendientes" (su fecha
ya pasó) — desaparece de ambos términos de la resta, y "Te queda" queda
**sobreestimado** exactamente en ese monto. Esto contradice de forma directa el
argumento central que el propio ARQ usa para preferir Alt A sobre Alt C: "nunca miente
hacia arriba" (§4, P1). El ARQ declara una limitación de matching transacción↔fijo
solo para el checkmark visual de P4 ("✓pagado aproximado") — no reconoce que la misma
falta de matching afecta también la cifra numérica de P1, que es el número que sostiene
toda la promesa de la FIN.

**No es un defecto de implementación:** es una decisión de diseño no tomada. Antes de
implementarse, `ARQ-0020` debe declarar explícitamente una política para fijos
vencidos sin transacción vinculada — por ejemplo (sin prescribir la solución):
mantenerlos como "comprometidos" hasta el cierre del ciclo independientemente de la
fecha (aceptando una posible resta doble ocasional como sesgo seguro, coherente con
"nunca miente hacia arriba"), o cualquier otra regla que Arquitectura documente y
justifique contra el mismo criterio §32.2 que ya aplicó al elegir Alt A sobre Alt C.

### Hallazgo 2 (elevado a observación crítica) — Umbrales de `interpretCashflow` no recalibrados para el nuevo valor

Verifiqué `dashboard.service.ts:170-184`: `interpretCashflow(cashflow, incomeTotal)`
usa un corte fijo — `amarillo` si `cashflow < incomeTotal * 0.1`, `verde` en el resto —
calibrado contra el valor **actual** de `estimatedCashflow` (`incomeTotal - expenseTotal
- debtPayments`), que es exactamente la fórmula que el propio `ARQ-0020` cataloga como
**Alt C** en su tabla de P1 ("Flujos reales (Inicio actual)"). El ARQ mismo declara
que el hero de Inicio, tras el cambio, mostrará un valor **sistemáticamente menor**
(resta compromisos pendientes que Alt C no restaba) — y despacha la interpretación con
una sola frase: "su interpretación (FIN-017) se recalcula sobre el nuevo valor sin
cambiar de forma" (§4, P2).

**El problema:** aplicar el mismo corte del 10% a un número estructuralmente más bajo
empujará más usuarios hacia "amarillo"/"rojo" — no porque su comportamiento haya
empeorado, sino únicamente porque cambió la definición del numerador. Es el mismo tipo
de riesgo que motivó la regla permanente §29.1 (FIN-017/DEC-0017 §5.1: nunca mezclar
una cifra con un umbral calibrado para una cifra distinta) y que motiva el propio §32
de esta FIN — aquí no hay dos fórmulas mostrando el mismo número (§32 a nivel de cifra
queda resuelto), pero sí hay un umbral de *juicio* (verde/amarillo/rojo) que sigue
calibrado para la fórmula vieja, aplicado silenciosamente sobre la fórmula nueva.

**Recomendación:** Arquitectura debe, antes de implementar, o (a) recalibrar el corte
de `interpretCashflow` con datos reales bajo la nueva definición (Alt A) y documentar
el nuevo porcentaje, o (b) justificar explícitamente por qué el mismo 10% sigue siendo
válido pese al cambio de base — no dejarlo implícito.

## 3. Riesgos

- Los riesgos declarados en §10 del ARQ (percepción "perdí plata" en el hero de
  Inicio; aproximación del "✓pagado"; margen negativo) son reales y están bien
  mitigados en el propio documento.
- Riesgo adicional no declarado: si el Hallazgo 1 no se resuelve, la conservadoria de
  Alt A —su única ventaja declarada sobre Alt C— puede fallar silenciosamente en el
  escenario más común de un tracker manual (fijo vencido no registrado), lo cual sería
  peor que Alt C en ese caso específico (Alt C al menos es consistentemente optimista;
  Alt A rota se vuelve impredecible).

## 4. Fortalezas

- La comparación de alternativas de P1 es honesta: no oculta que Alt B ("proyección de
  cierre") sería peligrosa como segundo "Te queda" y la prohíbe explícitamente,
  anticipando exactamente el tipo de error que dio origen a §32.
- P2 (servicio único) descarta correctamente la alternativa de función compartida con
  el argumento correcto: datos cargados dos veces pueden divergir por filtros
  distintos, aunque la fórmula sea idéntica — es la causa raíz real del bug original,
  no solo su síntoma.
- El efecto en Inicio se declara como parte inseparable del alcance, no como
  scope creep oculto — coherente con la disciplina de alcance de FIN-016/017/018.
- P5 reutiliza el patrón de "jugada" y su fallback ya auditado en FIN-019 (mismo
  motor, mismo mecanismo de respaldo) — cero lógica nueva de riesgo.
- La respuesta al filtro §31 es sustantiva y específica al valor diferencial temporal
  (prospectivo/diario) frente a Inicio (presente) y Salud (causal/mensual) — cumple el
  criterio de aceptación de la sección 31 sin genericidad.
- El criterio de aceptación #1 (test de igualdad entre endpoints + grep anti-segunda-
  fórmula) es exactamente la verificación que §32 exige del Auditor — bien anticipado.

## 5. Oportunidades

- Documentar en el propio `ARQ-0020` (no solo en el AUD) la política de fijos vencidos
  sin transacción, para que quede trazable en el mismo documento que definió Alt A.
- Considerar, a futuro, un campo de matching liviano (p. ej. marcar manualmente un
  fijo como "pagado este ciclo") en vez de inferencia por fecha — mejora que excede el
  alcance de esta FIN pero vale registrar para el backlog.

## 6. Observaciones críticas

Los Hallazgos 1 y 2 (arriba). Ambos afectan directamente la exactitud numérica que es
la justificación central de esta FIN — no son cosméticos.

## 7. Observaciones menores

- La aproximación del "✓pagado" en P4 (declarada) es aceptable como limitación de v1,
  siempre que el texto sea neutro ("ya pasó su fecha") como el propio ARQ propone en
  §10 — no debe leerse como confirmación de pago real.
- El diagrama de composición (§4.7) muestra "$4.6xx.xxx" como ejemplo ilustrativo sin
  relación declarada con las cifras reales de la usuaria demo citadas en §2 — no es un
  problema, pero conviene que las capturas reales (criterio §13.6) usen la cifra real
  para evitar cualquier apariencia de número inventado.

## 8. Revisión de experiencia de usuario (Gobernanza §28-29, §32)

1. **¿Interpretación incorrecta?** Riesgo directo por el Hallazgo 2: un usuario podría
   leer "amarillo" en Inicio inmediatamente después del cambio sin que su
   comportamiento real haya empeorado, solo por el cambio de definición — exactamente
   el tipo de interpretación incorrecta que la sección 28 busca prevenir.
2. **¿Terminología confusa?** No: "Tuyo de verdad", "Protegido para lo que viene",
   "por día" son términos llanos y consistentes con el resto de Milla.
3. **¿Carga cognitiva excesiva?** No: la composición en §4.7 respeta una idea por
   bloque (número → por día → protegido → destino), sin interacción requerida para lo
   esencial (cumple el criterio de las 3 preguntas sin interacción, precedente de
   FIN-017/019).
4. **¿Jerarquía visual correcta?** Sí, según el mockup de §4.7 — número dominante,
   detalle cronológico subordinado, destino como cierre accionable.
5. **¿Coherencia con el resto del producto?** Es exactamente el punto que §32 obliga a
   verificar: la cifra queda unificada por diseño (P2), pero el *juicio* sobre esa
   cifra (Hallazgo 2) no está verificado como coherente con el nuevo valor — pendiente.
6. **Test emocional — ¿calificado u orientado?** El diseño general orienta bien
   (número → por qué → qué hacer), pero si el Hallazgo 2 no se resuelve, un usuario
   podría sentirse calificado negativamente ("amarillo") por un cambio de fórmula que
   no controla, no por su comportamiento — rompería el principio en el peor momento
   posible (justo al lanzar la FIN que promete ser más honesta).

**§32 (aplicación obligatoria de esta sección al Auditor):** verifiqué por grep que
hoy no existe una tercera fórmula de "Te queda" en el código (`budget.service.ts` y
`dashboard.service.ts` son las únicas dos, ambas serán reemplazadas por el consumo del
servicio único). El diseño de P2 cumple la letra de §32 para la *cifra*. El Hallazgo 2
identifica que §32 no solo protege la cifra: el espíritu de la sección (consistencia de
confianza numérica) se extiende al juicio derivado de ella, y ahí queda un cabo suelto.

## 9. Recomendaciones

1. Resolver el Hallazgo 1: declarar explícitamente en `ARQ-0020` la política para
   fijos vencidos sin transacción vinculada, con el mismo rigor argumental usado para
   elegir Alt A.
2. Resolver el Hallazgo 2: recalibrar o rejustificar documentadamente el umbral de
   `interpretCashflow` contra el nuevo valor de Alt A antes de aplicarlo al hero de
   Inicio.
3. Ninguna otra pieza (P2, P3, P4, P5, P6) requiere cambios — pueden autorizarse tal
   como están.

## 10. Priorización

- **Bloqueante para implementación de P1 y su efecto en Inicio (P2):** Hallazgos 1 y 2.
- **No bloqueante:** el resto de piezas (P3, P4, P5, P6) y las observaciones menores.

## 11. Veredicto

**REQUIERE AJUSTES** (acotado a P1 — la fórmula de compromisos pendientes y la
recalibración de `interpretCashflow` en su efecto sobre Inicio). El resto del diseño
(fuente única, reparto diario, protegido visible, puente a la jugada, conservación del
CRUD, respuesta al filtro §31) está listo para `DEC-020` sin condiciones.
