# IMP-0006 · Memoria financiera + Proactividad (sin RAG/embeddings)

- **Módulo/Feature:** FIN-006
- **Documentos base:** `ARQ-0006-Memoria-y-Proactividad.md` · `AUD-0006-...` · `DEC-0006-Memoria-y-Proactividad.md`
- **Autor:** Agente Desarrollador
- **Fecha:** 2026-07-05
- **Referencia inmutable (regla GOBERNANZA):** commit **`994b085cdd2451eba433b44e711eb3a9018893b7`** (rama `claude/finance-app-design-pr8qd5`)
- **Estado:** Entregado — a la espera de validación del CTO contra DEC-0006

---

## 1. Resumen de implementación
Millo pasa de reactivo a **proactivo**: modelo `Insight` con ciclo de vida (y la
**migración con purga explícita** de las `anomaly.*` heredadas), **7 generadores
deterministas** (incluido el simétrico de baja de banda), **memoria financiera
estructurada sin embeddings** (recurrencias + fechas clave con ciclo stale),
**ProactivityJob anti-fatiga** (1/día, quiet hours, toggle) por push/WhatsApp/Telegram,
y la **5ª vista minimizada** (`get_memory_and_insights`) para el Copiloto bajo la regla
de GOBERNANZA. Los **4 cambios obligatorios de DEC-0006 §10** están aplicados.

## 2. Archivos modificados/creados
**Backend — nuevos:**
- `src/modules/insights/` — `insights.service.ts` (createIfNew idempotente por
  `dedupeKey`, list, seen/dismiss, preferencias), `insights.controller.ts`
  (`GET/PATCH /insights`, `GET/PATCH /insights/preferences`), `proactivity.job.ts`
  (+ spec), `insights.module.ts`.
- `src/modules/memory/` — `recurrence.util.ts` (+ spec, detección pura ±15%/±3d/3m),
  `memory.service.ts` (recurrencias gasto/ingreso, fechas clave, ciclo stale 60d),
  `memory.job.ts` (domingos 3:30 AM Bogotá), `memory.module.ts`.
- `src/modules/financial-engine/insights.generator.ts` (+ spec) — 7 generadores.
- Migración `20260705040000_fin006_insights_memoria` — modelos + enums +
  `proactiveEnabled` + **migración de datos `anomaly.*` con `DELETE` explícito**.

**Backend — modificados:** `prisma/schema.prisma` (`Insight`, `FinancialMemoryFact`,
4 enums, `UserSettings.proactiveEnabled`), `trends.job.ts` (corte de escritura de
anomalías → `Insight`; generadores para todos los activos, tendencias/anomalías siguen
tras cold-start), `financial-engine.module.ts` (+generador, exporta `SnapshotJob`),
`copilot/minimized-views.ts` (+`MinimizedMemoryView` + resumen `memory` en el contexto),
`copilot/context-assembler.ts` (+`buildMemoryView`), `anthropic.client.ts` (4ª tool),
`copilot.service.ts` (ejecutor + grupo `memory`), `app.module.ts`.

**Frontend:** `CopilotScreen.tsx` (sección 🔔 Novedades: tarjetas por severidad, tap →
arrancador de conversación, dismiss), `SettingsScreen.tsx` (toggle avisos proactivos),
`api/types.ts`, `api/endpoints.ts`.

## 3. Cumplimiento de cambios obligatorios (DEC-0006 §10)
1. ✅ **Purga explícita**: la migración hace `INSERT … SELECT` idempotente
   (`ON CONFLICT DO NOTHING`) y luego `DELETE FROM metric_readings WHERE metric_key
   LIKE 'anomaly.%'`. **Lógica verificada en vivo** con una anomalía sintética:
   migrada=1, restantes=0.
2. ✅ **Generador simétrico**: Score baja de banda → `riesgo/warning`
   (`riesgo_banda:<mes>`), con test dedicado.
3. ✅ **Clave de idempotencia clarificada**: `dedupeKey` documentada en el modelo —
   mensual (`riesgo_dti:2026-07`) vs por entidad (`logro_deuda_saldada:<debtId>`);
   test verifica que deuda saldada usa el `debtId`.
4. ✅ **Nota del límite cross-canal**: comentario destacado en `proactivity.job.ts`
   (⚠️ RIESGO PENDIENTE CONOCIDO) + esta mención: **FIN-007/FIN-008 heredan el pendiente
   de un presupuesto global de notificaciones por usuario/día** (hoy un usuario puede
   recibir hasta 2: recordatorio de cuota + aviso proactivo).

## 4. Pruebas realizadas
- **Unitarias: 220/220 verdes** (28 suites; 17 nuevas): recurrencias (banda de monto,
  dispersión de días, día circular, mínimo 3 meses), generadores (sobregiro critical,
  DTI solo al cruzar, banda sube→logro / **baja→riesgo**, cambio de tendencia, sin
  condiciones→nada, deuda saldada por `debtId`), proactividad (mayor severidad gana,
  `proactiveEnabled=false`, tope 1/día, quiet hours incl. cruce de medianoche),
  **PII sobre las 5 vistas** (insight sembrado con PII en título/cuerpo/payload → solo
  cruzan números; hechos templados con categoría anónima).
- **Typecheck:** backend y frontend exit 0. **Bundle Android:** sin errores (6.49 MB).
- **End-to-end real:** usuario sembrado con sobregiro + deuda (día 10) + fijo con PII en
  el nombre → jobs ejecutados de verdad (contexto Nest efímero, luego eliminado):
  insight `riesgo_sobregiro` creado y **entregado por push** (`deliveredChannels:
  {push}`); memoria: 14 hechos, todos templados **sin PII** ("gasto fijo #2", no
  "Arriendo secreto de Yonathan"); **idempotencia comprobada** re-ejecutando (sin
  duplicados; tope 1/día impidió re-entrega); `GET /insights` devuelve el insight.

**Cómo reproducir la validación:**
```bash
git checkout 994b085cdd2451eba433b44e711eb3a9018893b7
cd backend && npx tsc --noEmit && npx jest   # exit 0 · 220/220
cd ../frontend && npx tsc --noEmit           # exit 0
```

## 5. Incidencias encontradas
- Primer borrador de `TrendsJob` dejaba TODOS los generadores tras el cold-start global;
  el E2E lo detectó (el sobregiro de un usuario nuevo no generaba insight). Corregido:
  tendencias/anomalías siguen tras cold-start (DEC-0003 §10.2); los generadores de
  aritmética del mes corren para todos los activos ("donde aplique", ARQ §4.3).
- Spec del cliente Anthropic esperaba 3 tools; actualizado a 4 (tool de memoria).

## 6. Limitaciones
- La numeración anónima de categorías de usuario en memoria y en el ContextAssembler es
  determinista por `createdAt` pero se calcula por conjunto consultado; en casos de
  borrado de categorías podría desplazarse entre corridas (aceptable v1, documentado).
- `MemoryJob` es semanal: los hechos tardan hasta 7 días en aparecer para usuarios
  nuevos (los E2E lo ejecutan manualmente).
- El deep-link de la notificación (`data.deepLink='copilot'`) queda listo en el payload;
  la navegación al abrir la push se cablea cuando haya dev-build (Expo Go no lo permite).
- Estado heredado sin cambios (DEC-0005 §14): DPA ⏳ · PIA ⏳ · producción 🔒.

## 7. Resultado final
**FIN-006 entregado y verificado** contra `994b085cdd2451eba433b44e711eb3a9018893b7`,
cumpliendo el plan de DEC-0006 §11 y los 4 cambios obligatorios §10. Millo ahora
recuerda (memoria estructurada) y avisa (proactividad con límites) — y el Copiloto
gana contexto longitudinal sin abrir ninguna vía nueva de datos al LLM. Pendiente de
validación del CTO.

---
*Informe de implementación — proceso de gobernanza `docs/GOBERNANZA.md`.*
