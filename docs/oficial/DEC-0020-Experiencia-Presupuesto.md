# DEC-0020 · Experiencia de Presupuesto

- **Documentos base:** `docs/arquitectura/ARQ-0020-Experiencia-Presupuesto.md` (v1.0, commit `c420af0`) · `docs/auditoria/AUD-0020-Experiencia-Presupuesto.md`
- **Módulo/Feature:** FIN-020 (única FIN activa, Gobernanza v3.5 §27 — Origen: Mejora de revisión de producto, `COMPRENSION-FIN020-Presupuesto.md`)
- **Decide:** CTO de Milla
- **Fecha:** 2026-07-12

---

## 0. Verificación independiente previa a esta decisión

- Confirmé en `backend/prisma/schema.prisma` que `Transaction` no tiene ningún campo `fixedItemId` (ni equivalente) que lo vincule a un `FixedItem` — no existe matching transacción↔fijo. Hallazgo 1 del Auditor confirmado real, no hipotético.
- Confirmé en `dashboard.service.ts:170-184` que `interpretCashflow` usa el corte fijo `cashflow < incomeTotal * 0.1` sin ningún ajuste condicionado a la fórmula de origen del `cashflow` — el mismo umbral se aplicaría sin cambios al nuevo valor de Alt A (estructuralmente menor). Hallazgo 2 confirmado real.
- Confirmé por grep que hoy solo existen dos fórmulas de "Te queda" en el backend (`budget.service.ts`, `dashboard.service.ts`) — ninguna tercera. El diseño de fuente única (P2) es correcto a nivel de arquitectura.

Conclusión: **AUD-020 es preciso. Los dos hallazgos elevados a observación crítica se sostienen de forma independiente.**

## 1. Resumen ejecutivo

`ARQ-0020` resuelve con solidez el problema real que originó `FIN-020` (dos "Te queda" contradictorios) mediante una fuente única (`SpendableService`), consistente con `GOBERNANZA.md` §32. La respuesta al filtro §31 es sustantiva. El Auditor no encontró hallazgos en P2, P3, P4, P5, P6. Sí encontró, y verifiqué de forma independiente, dos vacíos que afectan la exactitud numérica — la razón de ser de esta FIN:

1. La fórmula de P1 puede subestimar compromisos pendientes (fijos vencidos sin transacción vinculada, por ausencia de matching en el esquema) — riesgo directo de que "Te queda" quede sobreestimado, contradiciendo el argumento central de la propia Alt A ("nunca miente hacia arriba").
2. El umbral de `interpretCashflow` en Inicio no está recalibrado para el nuevo valor, estructuralmente menor — riesgo de que usuarios pasen a "amarillo" solo por el cambio de definición, no por cambio de comportamiento.

## 2. Arquitecturas revisadas
`docs/arquitectura/ARQ-0020-Experiencia-Presupuesto.md` (v1.0).

## 3. Auditorías revisadas
`docs/auditoria/AUD-0020-Experiencia-Presupuesto.md` — veredicto: **REQUIERE AJUSTES** (acotado a P1 y su efecto en Inicio).

## 4. Decisiones aprobadas

1. **P2 — Fuente única (`SpendableService`):** aprobada sin condiciones.
2. **P3, P4, P5, P6:** aprobadas sin condiciones.
3. **Respuesta al filtro §31:** aprobada — sustantiva, no genérica.

## 5. Decisión devuelta a Arquitectura

**P1 — NO autorizada en su forma actual.** Antes de implementar, Arquitectura debe:

1. **Declarar explícitamente una política para fijos vencidos sin transacción vinculada** (Hallazgo 1) — por ejemplo, mantenerlos como "comprometidos" hasta el cierre del ciclo independientemente de la fecha, u otra regla documentada y justificada contra el mismo criterio que motivó preferir Alt A sobre Alt C (nunca mentir hacia arriba). La política debe quedar en el propio `ARQ-0020` (no solo en el AUD), como señala la Oportunidad del Auditor en su §5.
2. **Recalibrar o rejustificar documentadamente el umbral de `interpretCashflow`** (Hallazgo 2) contra el nuevo valor de Alt A, antes de aplicarlo al hero de Inicio — una de dos rutas: (a) recalibrar el corte con datos reales bajo la nueva definición, documentando el nuevo porcentaje; o (b) justificar explícitamente por qué el 10% actual sigue siendo válido pese al cambio de base.

No requiere nueva vuelta completa de Auditoría — solo confirmación puntual del CTO sobre ambos puntos antes de habilitar `IMP-0020`, mismo patrón que `DEC-0019` §5/§8.

## 6. Observaciones aceptadas

- Las observaciones menores del Auditor (§7 de `AUD-0020`: aproximación del "✓pagado" en P4, cifra ilustrativa del diagrama §4.7) quedan aceptadas sin acción bloqueante — deben respetarse en las capturas reales de cierre.
- La oportunidad de un campo de matching liviano (marcar un fijo como "pagado este ciclo") queda registrada para el Backlog como mejora futura, fuera del alcance de esta FIN.

## 7. Próximos pasos

1. Arquitectura corrige P1 (política de fijos vencidos + recalibración/justificación de `interpretCashflow`) — confirmación puntual del CTO antes de `IMP-0020`.
2. Con esa corrección, Arquitectura implementa según el Plan de `ARQ-0020`.
3. `BACKLOG.md` se actualiza: FIN-020 "Decidido — P2-P6 autorizadas; P1 devuelta a Arquitectura".

## 8. Adendo — corrección de P1 confirmada (ARQ-0020 v1.1, commit `c51030c`)

Verificación independiente contra el commit real (HEAD, `git show --stat`: solo `ARQ-0020`, `NOTAS-OPERATIVAS-ARQUITECTO.md`, `BACKLOG.md` y los scripts de captura — cero código de producto tocado, correctamente acotado a diseño):

- **Hallazgo 1 (fijos sin transacción vinculada):** Arquitectura adoptó la política (ii) — todo fijo activo cuenta como comprometido hasta el cierre del ciclo, se pague o no (§4.1-bis del ARQ). Confirmé que `Transaction` sigue sin `fixedItemId` en `backend/prisma/schema.prisma` (premisa vigente, sin cambio) y que la política se justifica contra el mismo criterio que motivó preferir Alt A sobre Alt C ("nunca mentir hacia arriba"): el único sesgo posible apunta hacia abajo, nunca hacia arriba. La etiqueta "✓pagado" (aproximación no verificable, aceptada como observación menor en §6) queda corregida a "ya pasó su fecha" — resuelve de paso esa observación sin que se lo pidiera. Condición 1 de §5 satisfecha.
- **Hallazgo 2 (umbral de `interpretCashflow`):** Arquitectura tomó la ruta (b) — rejustifica el 10% como heurística de holgura relativa independiente de la composición de la base, documentando que bajo Alt A el umbral se activará antes (dirección correcta para una definición conservadora), con compromiso explícito en `ARQ-0020` §13 de recalibrar con datos reales tras la RC integral. Acepto el razonamiento: recalibrar hoy sin datos de uso bajo la definición nueva sería inventar un número, no justificarlo. Los textos de los tres niveles quedan recalibrados para no implicar sobregasto donde solo hay compromisos pendientes — coherente con §29.2 (sin culpar). Condición 2 de §5 satisfecha.

**P1 queda confirmada en su totalidad.** Arquitectura puede proceder a implementar P1-P6 según el Plan de `ARQ-0020` §14 y emitir `IMP-0020` con SHA y juicio razonado.

**Volcado de conocimiento (instrucción del CPSAO), verificado aparte de esta decisión:** confirmé la existencia real y sustantiva de `frontend/scripts/captura/` (README + 2 scripts) y `docs/NOTAS-OPERATIVAS-ARQUITECTO.md` en el mismo commit — ambos declarados correctamente como conocimiento operativo subordinado a la documentación oficial (Paso 3 del procedimiento de arranque en frío), sin alterar ninguna decisión de gobernanza.
