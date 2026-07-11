# DEC-0017 · Evolución UX — Login y Dashboard (Lote 01)

- **Documentos base:** `docs/arquitectura/ARQ-0017-UX-Login-Dashboard.md` (v1.1, commit `948bddb`) · `docs/auditoria/AUD-0017-UX-Login-Dashboard.md`
- **Módulo/Feature:** FIN-017 (única FIN activa, Gobernanza v3.5 §27 — Origen: Mejora derivada de Revisión de Producto)
- **Decide:** CTO de Milla
- **Fecha:** 2026-07-11

---

## 0. Verificación independiente previa a esta decisión

Antes de decidir, verifiqué directamente contra el repositorio real (no me apoyé únicamente en el informe del Auditor, por instrucción explícita del Fundador de hacerlo siempre):

- `git log --oneline -- docs/auditoria/AUD-0017-UX-Login-Dashboard.md` y `git show --stat 948bddb`: el commit citado por ARQ-0017 v1.1 existe y su contenido coincide con lo declarado.
- Leí `backend/src/modules/health/health.service.ts`: confirmé que `HealthService.score()` usa `monthStart(now)` (mes calendario UTC) y lee un snapshot ya persistido (`readMonth` → `MetricReading`), ajeno al día de corte del usuario.
- Leí `backend/src/modules/financial-engine/metrics/core-metrics.ts`: confirmé que `MetricKey.Dti = debtMonthly / ref`, donde `debtMonthly` es la suma de **cuotas programadas** de deudas activas (compromiso), no lo pagado.
- Grep de imports en `backend/src/modules/dashboard/dashboard.service.ts`: usa `financialPeriod()` (ciclo del usuario, FIN-016) y calcula `debtPayments` como suma de transacciones `pago_deuda` **reales** del ciclo. Confirmé que el archivo NO importa nada de `health/` ni `financial-engine/` — el Hallazgo 3 del Auditor (dependencia nueva no declarada) es correcto.
- Leí el §4.6 (composición integrada) y el §11 (Dependencias) de `ARQ-0017-UX-Login-Dashboard.md`: confirmé que el mockup objetivo efectivamente coloca "Tus cuotas pesan 9,9% de tu ingreso — nivel sano" bajo la tarjeta "Deuda total $11.207.000" — dos cifras de cadencia y definición distintas (DTI del Score: mes calendario + cuotas programadas; tarjeta de Deuda del Dashboard: ciclo del usuario + cuotas pagadas) presentadas como si fueran del mismo dato. El Hallazgo 1+2 del Auditor es real, no especulativo.
- Confirmé el Hallazgo 4: la Alt A recomendada del Login (Prioridad 1) enumera 3 micro-líneas (💳 deudas, 🩺 score, 🤖 copiloto); Presupuesto no aparece, pese a que el propio §2.1 diagnostica 4 pilares necesarios.

Conclusión de la verificación: **AUD-0017 es preciso, verificado contra código real, y sus hallazgos se sostienen de forma independiente.**

## 1. Resumen ejecutivo

ARQ-0017 v1.1 diagnostica correctamente el estado actual (Login sin propuesta de valor, Dashboard con tres elementos compitiendo, cifras sin interpretación) y presenta alternativas comparadas para las 4 prioridades más la decisión de gamificación (§4.5), cumpliendo el estándar del CPSAO. La auditoría (6 preguntas de comprensión incluidas) no encontró hallazgos bloqueantes en Prioridades 1, 2 y 4, ni en §4.5. Sí encontró un defecto estructural verificado en el propio ejemplo de diseño objetivo de la Prioridad 3 (alternativa recomendada 3-A): la interpretación server-side de "Deuda total" mezclaría, sin distinguirlas, dos cifras de periodo y definición distintos — exactamente el tipo de confusión que esta FIN busca eliminar.

Decido aprobar lo que no tiene hallazgos bloqueantes y devolver a Arquitectura, acotadamente, solo la interpretación de "Deuda total" de la Prioridad 3.

## 2. Arquitecturas revisadas

- `docs/arquitectura/ARQ-0017-UX-Login-Dashboard.md` (v1.1).

## 3. Auditorías revisadas

- `docs/auditoria/AUD-0017-UX-Login-Dashboard.md` — veredicto: **REQUIERE AJUSTES** (acotado a Prioridad 3).

## 4. Decisiones aprobadas

1. **Prioridad 1 (Login) — Alt A, propuesta de valor compacta**: aprobada, **con corrección obligatoria**: las 3 micro-líneas deben ampliarse a 4 (agregar Presupuesto), o Arquitectura debe justificar explícitamente por escrito en el ARQ por qué 3 de 4 pilares bastan para el objetivo de ≤5 segundos, antes de implementar. No autorizo la omisión silenciosa señalada en el Hallazgo 4.
2. **Prioridad 2 (Dashboard) — Alt A, hero "Te queda este ciclo"**: aprobada sin condiciones. Verificado que `estimatedCashflow` ya existe en `dashboard.service.ts` — "cero backend" es cierto.
3. **§4.5 (gamificación) — compactar a una línea**: aprobada sin condiciones. Preserva el mecanismo de hábito de FIN-008 sin competir por protagonismo.
4. **Prioridad 4 (lenguaje) — Alt B, término + traducción**: aprobada sin condiciones. El glosario propuesto es coherente con el resto del producto.
5. **Dependencia de Prioridad 2** (reordenamiento de tarjetas existentes, sin backend nuevo): confirmada como aprobada, consistente con §11 en esa parte.

## 5. Decisiones devueltas a Arquitectura

1. **Prioridad 3 (interpretación server-side de "Deuda total", alternativa 3-A)**: **NO autorizada para implementación en su forma actual.** Devuelvo a Arquitectura la resolución de la desalineación de periodo/numerador entre el DTI del Score (mes calendario, cuotas programadas) y las cifras del Dashboard (ciclo financiero FIN-016, cuotas pagadas), verificada contra el código real en `health.service.ts`, `core-metrics.ts` y `dashboard.service.ts`. Arquitectura debe elegir y documentar una de estas dos rutas (u otra equivalente que resuelva el mismo problema):
   - (a) Calcular la interpretación de "Deuda total" con una cifra propia del Dashboard (cuotas pagadas del ciclo / ingreso del ciclo), sin reutilizar el DTI del Score; o
   - (b) Reutilizar el DTI del Score deliberadamente, pero etiquetar explícitamente que es una lectura de mes calendario (coherente con la nota que FIN-016 ya exige en Ajustes), de modo que la diferencia sea explicable y no oculta.
   La interpretación de flujo y de ahorro (las otras dos secciones de la Prioridad 3, que no presentan esta mezcla de cadencias) **sí quedan aprobadas** para avanzar bajo 3-A; solo la interpretación de "Deuda total" queda pendiente.
2. **§11 Dependencias**: Arquitectura debe corregir la redacción para declarar con precisión que la Prioridad 3 (en cualquiera de sus rutas de resolución) introduce una dependencia en tiempo de ejecución de `dashboard.service.ts` hacia el valor computado por `HealthService`/`EngineService` (si se elige la ruta (b)), o ninguna dependencia nueva (si se elige la ruta (a)) — según cuál se adopte.

## 6. Observaciones aceptadas

- Hallazgo 3 (dependencia no declarada con precisión): aceptado, ver §5.2 de este DEC.
- Fortalezas señaladas por el Auditor (diagnóstico honesto verificado contra capturas reales, cumplimiento genuino del requisito de alternativas comparadas, glosario que prioriza coherencia sobre simplicidad aislada): confirmadas, sin acción requerida.

## 6.1 Adendo — dos criterios adicionales del CPSAO, ratificados por el Fundador (2026-07-11)

Tras revisar este `DEC-017`, el CPSAO no objetó el sentido de la decisión pero incorporó
dos observaciones de producto que el Fundador ratificó como principios permanentes
(Gobernanza v3.7 §29), aplicables a las correcciones pendientes de esta misma FIN:

1. **La interpretación nunca introduce una nueva pregunta.** Si la ruta que Arquitectura
   elija para resolver el Hallazgo 1+2 (§5.1 de este DEC) requiere explicarle al usuario
   la diferencia entre "mes calendario" y "ciclo financiero" para que la interpretación
   de "Deuda total" tenga sentido, esa ruta queda descartada — no se traslada la
   complejidad interna del producto al usuario. Se prefiere la ruta (a) de §5.1
   (calcular la interpretación con las mismas cifras que el Dashboard ya usa) sobre la
   ruta (b) (etiquetar el origen del dato), salvo que Arquitectura demuestre que la
   ruta (b) también puede redactarse sin exigir esa comprensión.
2. **Prioridad del lenguaje humano sobre el lenguaje financiero.** Al corregir el texto
   de la Prioridad 1 (Login, Hallazgo 4) y cualquier interpretación de la Prioridad 3,
   Arquitectura debe aplicar la prueba "¿una persona sin conocimientos financieros lo
   entendería en la primera lectura?" antes de considerar el texto definitivo.

Estos dos criterios no añaden una nueva vuelta de Auditoría — se verifican junto con las
correcciones puntuales ya solicitadas en §5, como parte de la misma confirmación del CTO
antes de habilitar `IMP-0017`.

## 7. Próximos pasos

1. Arquitectura corrige Prioridad 1 (Hallazgo 4) y Prioridad 3/Deuda total (Hallazgo 1+2) y ajusta §11.
2. Con esas dos correcciones, Arquitectura puede proceder directamente a implementación de las 4 prioridades + §4.5 según el Plan (§14 de ARQ-0017) — no se requiere una segunda vuelta de Auditoría completa, solo que el CTO confirme (sin nuevo DEC) que las dos correcciones puntuales resuelven los hallazgos antes de habilitar el paso a IMP-0017.
3. `BACKLOG.md` se actualiza reflejando: FIN-017 en estado "Decidido parcialmente — 3/4 prioridades y §4.5 autorizados; Prioridad 3 (Deuda total) y Prioridad 1 (glosario Login) devueltas a Arquitectura para corrección puntual."
