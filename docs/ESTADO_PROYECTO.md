# ESTADO_PROYECTO — Milla

- **Actualizado:** 2026-07-13 (FIN-023 cerrada) · por: CTO
- **Naturaleza:** snapshot mutable — se sobrescribe en cada actualización, no es append-only. Su historial vive en `BACKLOG.md`/`ARQ`/`DEC`, no aquí.
- **Lectura obligatoria (Nivel 1):** este documento + `GOBERNANZA.md` + `BACKLOG.md` — suficiente para que cualquier IA nueva quede orientada sin depender del historial de un chat. Detalle de una `FIN` específica: Nivel 2 (documentos de esa `FIN`, bajo demanda).

---

## Gobernanza vigente
v3.12 (`docs/GOBERNANZA.md`) — última sección: §34, commit obligatorio de toda documentación oficial en el mismo acto.

## FIN activa
Ninguna. `FIN-023` cerrada — pendiente que el CTO/CPSAO decidan si sigue `FIN-024` (mora) o la Experiencia de Simulador.

## Últimas FIN cerradas
- FIN-023 — Desembolso real de deuda + cuota de manejo (§32) — **Cerrado.** `DEC-0023` (P4/P5 incluidos, 4 cambios obligatorios §5), `VALIDACION-0023` APROBADO, verificación independiente del CTO en checkout aislado contra `c7b9804`: código + suites reejecutadas en vivo — unit 318/318, e2e 20/20, tsc limpio. Cuarta fuente única por construcción (`DebtOutlayModule`, módulo hoja)
- FIN-022 — Experiencia de Deudas — **Cerrado.** `DEC-0022` (P2 con 4 cambios obligatorios §5), `VALIDACION-0022` APROBADO, verificación independiente del CTO en checkout aislado contra `0f75a5c`: código + suites reejecutadas en vivo — unit 313/313, e2e 15/15, tsc limpio. Orden de ataque unificado por construcción (`attackOrder()`)
- FIN-021 — Única definición del fondo de emergencia (§32) — Cerrado técnico + producto (`DEC-0021`, `VALIDACION-0021` APROBADO)
- FIN-020 — Experiencia de Presupuesto — Cerrado técnico + producto (`DEC-0020` +adendo §8, `VALIDACION-0020` APROBADO)
- FIN-019 — Experiencia de Salud — Cerrado (`DEC-0019` §8, `VALIDACIÓN-0019` APROBADO)

## Hoja de ruta de experiencias UX (posición actual)
Inicio ✅ · Salud ✅ · Presupuesto ✅ (`FIN-020`, `FIN-021` fondo de emergencia §32) · Deudas ✅ (`FIN-022`, `FIN-023` desembolso real + cuota de manejo §32) · `FIN-024` (mora) en cola antes de Simulador ⏳ · Copiloto ⏳ (nota registrada: `context-assembler.ts` deberá consumir `SpendableService`, §32).
RC integral (sesión con participantes reales): pendiente, programada al cierre de las 6 experiencias (`docs/producto/rc/RC-0001-Inicio.md` preserva el diseño metodológico).

## Principios permanentes recientes a tener en cuenta
- §31 — Todo `ARQ` de experiencia UX cierra respondiendo "¿qué perdería el usuario si esta experiencia no existiera?".
- §32 — Ningún concepto financiero puede tener más de una fórmula/fuente de verdad entre pantallas.
- §33 — EOC v1.0: encabezado De/Para/CC/Asunto/Fecha + Estado/Conclusión/Acciones/Bloqueos obligatorio en toda comunicación entre roles.
- §34 — Toda documentación oficial se commitea a git en el mismo acto en que se crea o modifica — nunca queda pendiente más allá de la sesión de trabajo. El CTO verifica `git status` limpio de docs oficiales en cada cierre de FIN.

## Agentes de IA oficiales
CTO, Arquitecto, Auditor, CPSAO — oficiales (`AI_REGISTRY.md` AI-0001/0002... ver registro). **CMIO — evaluado, pendiente Prompt Maestro** (AI-0003, paso 3 de §22 en curso por el CPSAO).

## Fase II — Conversión de Inteligencia Estratégica (CPSAO, 2026-07-12)
Paralela a la hoja de ruta UX, sin alterarla. **Línea A** (desarrollo normal): sin cambios, ver "FIN activa" arriba. **Línea B** (institucionalización de decisiones estratégicas del CPSAO, derivadas de investigación del CMIO — el CMIO no es artefacto oficial ni pasa por el CTO, solo el CPSAO filtra su output en directrices): Lote 1 recibido — 11 decisiones (`DEC-STR-001` a `DEC-STR-011`; nomenclatura provisional del CPSAO, aún no reservada en la regla de Numeración de `GOBERNANZA.md` — observación pendiente de resolver con el CPSAO para no colisionar con `DEC-XXXX` del ciclo FIN). En análisis de impacto por Arquitectura (formato: impacto/documentos afectados/dependencias/momento recomendado/esfuerzo, máx. 2 páginas) → seguirá Auditoría (contradicciones/riesgos/conflictos, sin rediseñar) → consolidación del CTO → decisión del CPSAO. Restricciones explícitas: no abre `FIN` nueva, no modifica el roadmap, no modifica `FIN-020`, no implementa.

## Reorganización documental en curso
`docs/oficial/PROPUESTA-2026-07-12-Reorganizacion-Documental.md` — aprobada por el CPSAO para ejecución inmediata (prioridad operativa, antes de oficializar formalmente en Gobernanza). Migración en curso: este documento (paso 1) y el formato corto de `BACKLOG.md` desde FIN-020 (paso 2) ya están activos. Pendientes: `§Cierre` en DEC (paso 3, ya aplicado en `DEC-0020` §7 de forma parcial), columna "arranque en frío" en `AI_REGISTRY.md` (paso 4), reclasificación de los 10 documentos raíz (paso 5), ratificación formal en Gobernanza (paso 6).

## Programa Alpha (paralelo a las FIN, `docs/producto/alpha/`)
Planificación completa: `ALPHA-001`…`ALPHA-008` aprobadas. En **fase de ejecución** (no de planificación) — seguimiento en `ALPHA_EXECUTION_BOARD.md` (11 actividades: candidatos, Consejo Fundador, revisión legal de consentimiento, PIA, seguridad base, etc.). Próxima acción recomendada por el CTO (2026-07-06): identificar candidatos reales e iniciar el PIA.

## Riesgos abiertos / gates de producción pendientes
- **Gates legales/negocio** (tabla completa en `BACKLOG.md`): DPA con Anthropic, PIA (Ley 1581), revisión legal final, política de tiendas para IAP — todos `⏳ Pendiente`, responsables Fundador/CTO.
- **`wealthPillar()` binario** (`score.util.ts`): riesgo diferido desde `DEC-0004`, mitigado en pantalla desde `DEC-0019` (ruta b, sin semáforo por pilar) — no resuelto a nivel de cálculo, sigue como mejora futura.
- **Limitación de sandbox — SUPERADA (2026-07-12):** el precedente desde FIN-012 ("no se puede ejecutar Postgres embebido real") ya no aplica en este entorno — Docker con Postgres real está disponible y operativo; el CTO ejecutó la suite e2e completa (9/9) contra él durante la validación de FIN-020. Corregir el precedente si se cita en FIN futuras.
- **Documentación oficial sin commitear — RESUELTO (2026-07-12):** el hallazgo del CTO (`GOBERNANZA.md` sin commitear desde 2026-07-05, ~30 documentos oficiales sin trackear) fue regularizado en 7 commits temáticos (`fd63e51`…`85bff76`) tras la autorización del Fundador. Nueva regla permanente `GOBERNANZA.md` §34 (v3.12) evita que se repita: toda documentación oficial se commitea en el mismo acto de su creación/modificación.
- **Fórmulas divergentes de "meses de fondo de emergencia" — RESUELTO (2026-07-12):** `FIN-021` cerrada. Única fuente (`EmergencyFundMonths` del Motor + `emergency-fund.constants.ts` para los hitos) consumida por construcción por Inicio, Salud y Recomendaciones. Detalle en `docs/correspondencia/FIN-021-Fondo-de-Emergencia.md`.
- **"Lo comprometido" subestimado para usuarios con seguros/cargos aparte — RESUELTO (2026-07-13):** `FIN-023` cerrada. Fuente única (`DebtOutlayModule` + `payment-breakdown.util.ts`) consumida por construcción por 6 puntos (teQueda, Motor, Presupuesto, Copiloto, mensajería, summary de Deudas). Cuota de manejo como dato del usuario, sin default, `endorsed` rechazado server-side. Detalle en `docs/correspondencia/FIN-023-Desembolso-Real-Deuda.md`.
- **`FIN-024` registrada — mora de fijos y deudas, diferida por 3ª vez con condición del CPSAO:** no puede quedar en el limbo una cuarta vez; posicionada antes de Simulador.

## Decisiones del Fundador pendientes de ejecutar
Ninguna.

## Bloqueos abiertos
Ninguno.

## Próxima acción esperada
1. **CTO/CPSAO:** decidir si sigue `FIN-024` (mora) o la Experiencia de Simulador.
2. En paralelo, Línea B: Arquitectura entregando el análisis de impacto del Lote 1 de Decisiones Estratégicas del CPSAO (`DEC-STR-001…011`).

## Piloto en validación — mecanismo de continuidad documental (CPSAO, 2026-07-12)

El próximo cambio real de chat del Arquitecto es la **primera prueba piloto completa** del sistema de arranque en frío (`PROCEDIMIENTO-ARRANQUE-EN-FRIO.md` + `ESTADO_PROYECTO.md`). La oficialización en `GOBERNANZA.md` (paso 6 de la migración) **no procede por tiempo transcurrido ni número de FIN** — depende de esta evaluación. Cuando ocurra ese cambio de chat, el CTO debe responder, con evidencia concreta (no impresión):

1. ¿El nuevo Arquitecto logró incorporarse sin depender del historial del chat anterior?
2. ¿La documentación fue suficiente para reconstruir el contexto?
3. ¿Qué información adicional fue necesario buscar fuera de la documentación?
4. ¿Qué documentos generaron dudas o redundancias?
5. ¿Qué ajustes deben realizarse antes de convertir el mecanismo en estándar permanente?

Con esas respuestas, CTO y CPSAO presentan la propuesta final al Fundador. **Este punto no se resuelve hasta que el cambio de chat del Arquitecto ocurra realmente** — no es una tarea a ejecutar ahora.
