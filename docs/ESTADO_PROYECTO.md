# ESTADO_PROYECTO — Milla

- **Actualizado:** 2026-07-13 (Fase 0 finalizada, §36; Memorando de Sincronización de Contexto institucionalizado, §37) · por: CTO
- **Naturaleza:** snapshot mutable — se sobrescribe en cada actualización, no es append-only. Su historial vive en `BACKLOG.md`/`ARQ`/`DEC`, no aquí.
- **Lectura obligatoria (Nivel 1):** este documento + `GOBERNANZA.md` + `BACKLOG.md` — suficiente para que cualquier IA nueva quede orientada sin depender del historial de un chat. Detalle de una `FIN` específica: Nivel 2 (documentos de esa `FIN`, bajo demanda).

---

## Gobernanza vigente
v3.18 (`docs/GOBERNANZA.md`) — última sección: §41 continuidad Beta (toda FIN cerrada llega al dispositivo Beta vía OTA por la vía segura de §40; los usuarios de prueba usan siempre la última versión aprobada; ciclo `Arquitecto→Auditor→CTO→Integración→GitHub→OTA→Beta`). Antes: §40 gate obligatorio de despliegue OTA, §38 gestión de defectos, §39 formato regional.

## Beta técnica (estado de despliegue)
OTA vigente en `preview`: `f166ac42` — lleva **FIN-027** (perfil de ingresos), **FIN-028** (editar/anular movimientos), **BT-001** (formato regional) y el fix **BT-003** (URL de producción). Backend en Render actualizado (auto-deploy). Próximo OTA (tras cerrar `IMP-0029`) se publica por `npm run ota:publish` (§40/§41). — el CTO emite una comunicación oficial ante cambios de etapa estructurales para fijar una línea base única entre roles; disparadores acotados (infra/gobernanza/producción/producto/arquitectura/equipo), cierre con confirmación de lectura de los roles afectados (evidencia, no aprobación), reservado a lo estructural. Precedente inmediato: §36, marco de gobernanza post-Fase 0 (modelo híbrido de documentación en GitHub; flujo oficial `Fundador→CPSAO→CTO→Arquitecto→Auditor→CTO→GitHub` con el CTO como único integrador; testing obligatorio antes de integrar; no escalar infraestructura por anticipación; GitHub como registro histórico oficial; CTO custodio de la calidad técnica).

## FIN activa
**Ninguna en IMP.** `FIN-026` (Experiencia de Simulador) **CERRADA** por el CTO el 2026-07-13 (validación técnica contra `68588c8`, 3 cambios obligatorios confirmados en código, `tsc` exit 0; firma de producto en dispositivo real a cargo del Fundador con el APK nuevo). Hoja de ruta UX: 6/6 experiencias cerradas salvo la de **Copiloto** (pendiente, bloqueada por gate DPA+PIA). En diseño (ARQ paralelo): FIN-027, FIN-029; retenida: FIN-028 (ver abajo).

## Frentes abiertos (ARQ/AUD en paralelo — excepción documentada; IMP secuencial 028→027→029)
Autorizados por el Fundador (memo 2026-07-13). ARQ y AUD de los tres **completos**. El IMP es estrictamente secuencial.
- **FIN-028 — Gestión de movimientos (editar/anular).** ✅ ARQ-0028 · ✅ AUD-0028 · ✅ DEC-0028 · ✅ **IMP-0028 (`65104e1`) CERRADA por el CTO.** Validación independiente: `tsc` exit 0, unit 331/331, e2e 27/27 (incl. `fin028-movimientos`). Anulación = `deletedAt` (sin estado nuevo, §32); `update`/`remove` emiten eventos vía outbox → Motor recalcula; `undoLast` reencaminado; reverso atómico de pago de deuda + guardarraíl. 2 limitaciones aceptadas iteración 1 (next_due_date no reconstruido al anular pago de deuda — seguimiento; UX en filas de Inicio). Firma de producto: el Fundador en la app.
- **FIN-027 — Modelo de ingresos personales.** ✅ ARQ-0027 · ✅ AUD-0027 · ✅ DEC-0027 · ✅ **IMP-0027 (`67cf375`) CERRADA por el CTO.** Validación independiente: `tsc` BE+FE 0, unit 345/345, e2e 40/40. DTI/Score sobre NETO (`NetIncomeService` hoja), copy en Salud, migración sin coexistencia, `withheldAtSource`, regresión sin perfil = idéntico. Firma de producto: el Fundador en la app.
- **FIN-029 — Telegram / Motor Conversacional único.** ✅ ARQ-0029 · ✅ AUD-0029 · ✅ DEC-0029 · ✅ **IMP-0029 (`9bb83c0`) CERRADA por el CTO.** 6 condiciones con test (acuse QUÉ+DÓNDE; no fingir anotado; simular muestra sin empujar; paywall honesto; genericidad; motor invoca servicio central). Gate DPA+PIA cerrado por construcción (conversación determinista). Suites: tsc 0, unit 355/355, e2e 43/43. Backend-only → Beta por auto-deploy Render (sin OTA). 3 reservas (capa IA no-runtime, etc.) dependen de abrir el gate. **Cierra la tanda de la Beta Técnica.**

## Infraestructura (Fase 0 — FINALIZADA)
**Fase 0 oficialmente finalizada (memo del Fundador, 2026-07-13).** Backend NestJS en producción en Render (runtime Node) + Neon PostgreSQL conectada; 17 migraciones Prisma aplicadas; `/v1/health` y `/v1/ready` verificadas 200 OK desde afuera (`https://milla-backend.onrender.com`). App móvil (Expo/Android) apuntando al backend real (`eas.json` perfil `preview`); APK en compilación en EAS. `render.yaml` corregido a la configuración real (Node, no Docker). Componentes oficialmente incorporados: GitHub, Render, Neon, Cloudflare (preparado), Prisma, despliegue automático, infraestructura documentada. Detalle: `docs/INFRAESTRUCTURA.md`. Escalado a planes pagos NO autorizado (solo por necesidad técnica demostrada, §36.4).

## Sincronización Git (§35)
Rama oficial de trabajo `claude/finance-app-design-pr8qd5`, sincronizada 1:1 entre local y `origin` desde 2026-07-13 (`git status` sin ahead/behind). Historial anterior divergente (7 commits del día 1, gobernanza abandonada) preservado íntegro en `origin/legacy/origin-2026-07-13` — rama de solo archivo, no participa del desarrollo. Política completa: `GOBERNANZA.md` §35.

## Últimas FIN cerradas
- FIN-024 — Mora de deudas (iteración 1, fijos fuera de alcance) — **Cerrado técnico + producto.** `DEC-0024` (3 cambios obligatorios §5), `VALIDACION-0024` APROBADO, verificación independiente del CTO en checkout aislado contra `faebc2a`: unit 326/326, e2e 23/23, tsc limpio. Bug fundacional corregido (escritor único de `nextDueDate`); quinta fuente única por construcción. CPSAO declaró Aprobada en producto (tono §29.2 confirmado). P4 (aviso proactivo) excluido — fast-follow `FIN-025`
- FIN-023 — Desembolso real de deuda + cuota de manejo (§32) — **Cerrado técnico + producto.** `DEC-0023` (P4/P5 incluidos), `VALIDACION-0023` APROBADO, verificación independiente del CTO en checkout aislado contra `c7b9804`: unit 318/318, e2e 20/20, tsc limpio. Cuarta fuente única por construcción (`DebtOutlayModule`). CPSAO declaró Aprobada en producto (aritmética cruzada confirmada)
- FIN-022 — Experiencia de Deudas — **Cerrado.** `DEC-0022` (P2 con 4 cambios obligatorios §5), `VALIDACION-0022` APROBADO, verificación independiente del CTO en checkout aislado contra `0f75a5c`: código + suites reejecutadas en vivo — unit 313/313, e2e 15/15, tsc limpio. Orden de ataque unificado por construcción (`attackOrder()`)
- FIN-021 — Única definición del fondo de emergencia (§32) — Cerrado técnico + producto (`DEC-0021`, `VALIDACION-0021` APROBADO)

## Hoja de ruta de experiencias UX (posición actual)
Inicio ✅ · Salud ✅ · Presupuesto ✅ (`FIN-020`, `FIN-021` fondo de emergencia §32) · Deudas ✅ (`FIN-022`, `FIN-023` desembolso real + cuota de manejo §32, `FIN-024` mora) · **Simulador 🔄 (FIN-026, autorizada, no iniciada)** · Copiloto ⏳ (nota registrada: `context-assembler.ts` deberá consumir `SpendableService`, §32; recordar aviso anticipado al Fundador si se toca Registrar). `FIN-025` (aviso proactivo de mora) fast-follow registrado, sin fecha fija.
RC integral (sesión con participantes reales): pendiente, programada al cierre de las 6 experiencias (`docs/producto/rc/RC-0001-Inicio.md` preserva el diseño metodológico).

**Aviso anticipado obligatorio — módulo de Registrar/Transacciones (instrucción directa del Fundador, 2026-07-13):** antes de que cualquier FIN toque el módulo de Registrar (alta de transacciones), el CTO debe avisarle con anticipación — quiere hacer observaciones antes de que avance. No está en la hoja de ruta de las 6 experiencias UX hoy (era parte del "Lote 03 de capturas" sin gobernanza, nunca pedido) — si aparece como candidata a FIN futura (p. ej. tras Copiloto), este aviso es un paso obligatorio previo a abrir su comprensión/ARQ.

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
- **Mora de deudas — RESUELTO (2026-07-13):** `FIN-024` cerrada. Bug fundacional de doble escritor de `nextDueDate` corregido; estado de mora visible y accionable en deudas. `FIN-025` (aviso proactivo) queda como fast-follow registrado, sin fecha fija — depende de observar el uso real de la etiqueta pasiva primero.

## Decisiones del Fundador pendientes de ejecutar
Ninguna.

## Bloqueos abiertos
Ninguno.

## Próxima acción esperada
1. **Arquitectura:** entregar el documento de comprensión del problema de `FIN-026` (Simulador), antes de `ARQ-0026`.
2. En paralelo, Línea B: Arquitectura entregando el análisis de impacto del Lote 1 de Decisiones Estratégicas del CPSAO (`DEC-STR-001…011`).

## Piloto en validación — mecanismo de continuidad documental (CPSAO, 2026-07-12)

El próximo cambio real de chat del Arquitecto es la **primera prueba piloto completa** del sistema de arranque en frío (`PROCEDIMIENTO-ARRANQUE-EN-FRIO.md` + `ESTADO_PROYECTO.md`). La oficialización en `GOBERNANZA.md` (paso 6 de la migración) **no procede por tiempo transcurrido ni número de FIN** — depende de esta evaluación. Cuando ocurra ese cambio de chat, el CTO debe responder, con evidencia concreta (no impresión):

1. ¿El nuevo Arquitecto logró incorporarse sin depender del historial del chat anterior?
2. ¿La documentación fue suficiente para reconstruir el contexto?
3. ¿Qué información adicional fue necesario buscar fuera de la documentación?
4. ¿Qué documentos generaron dudas o redundancias?
5. ¿Qué ajustes deben realizarse antes de convertir el mecanismo en estándar permanente?

Con esas respuestas, CTO y CPSAO presentan la propuesta final al Fundador. **Este punto no se resuelve hasta que el cambio de chat del Arquitecto ocurra realmente** — no es una tarea a ejecutar ahora.
