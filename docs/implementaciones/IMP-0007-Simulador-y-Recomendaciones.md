# IMP-0007 · Simulador financiero + Motor de recomendaciones con impacto

- **Módulo/Feature:** FIN-007
- **Documentos base:** `ARQ-0007-...md` · `AUD-0007-...md` · `DEC-0007-Simulador-y-Recomendaciones.md`
- **Autor:** Agente Desarrollador
- **Fecha:** 2026-07-05
- **Referencia inmutable (regla GOBERNANZA):** commit **`a56f11e164e6381ec6a7e1e2219d011877e3870f`** (rama `claude/finance-app-design-pr8qd5`)
- **Estado:** Entregado — a la espera de validación del CTO contra DEC-0007

---

## 1. Resumen de implementación
Millo ya responde "**¿qué pasa si…?**" con números reales: `SimulationEngine` puro con 7
escenarios que reutiliza los motores existentes y recalcula **con las mismas funciones
del Motor real** (`computeCoreMetrics`/`computeScore`) sin escribir jamás en las series;
**recomendaciones cuantificadas** (qué hacer/por qué/beneficio/qué pasa si no) con
prioridad `impacto×urgencia×viabilidad`, cupo de 3 con **desplazamiento por prioridad
estricta**; y el **presupuesto global de notificaciones** (2 recordatorios + 1
proactivo/día, reparto fijo) que **resuelve el pendiente heredado de DEC-0006 §10.4**.
Los **3 cambios obligatorios de DEC-0007 §10** están aplicados.

## 2. Archivos modificados/creados
**Backend — nuevos:**
- `simulations/` — `simulation-engine.ts` (+spec, 7 escenarios puros), `simulations.service.ts`
  (carga estado real, valida params, persiste historial, `resolveDebtRef` "deuda #N"→id en
  servidor), `simulations.controller.ts` (`POST/GET /simulations`), `simulations.module.ts`.
- `recommendations/` — `recommendations.constants.ts` (**lista curada** §10.1: Entretenimiento/
  Comida/Ropa; personalizadas excluidas), `recommendations.service.ts` (+spec; 4 generadores,
  prioridad, **desplazamiento** §10.2, dedupe mensual), `recommendations.controller.ts`
  (`GET/PATCH /recommendations`), `recommendations.job.ts` (2:45 AM Bogotá), módulo.
- `notifications/notification-budget.service.ts` (+spec) — **reparto fijo 2+1 sin
  reasignación** (§10.3); cuenta EVENTOS (distinct sentAt), el log audita canales.
- Migración `20260705050000_fin007_simulador_recomendaciones` (`Simulation`,
  `Recommendation`, `NotificationLog` + 5 enums).

**Backend — modificados:** `reminders.service.ts` y `proactivity.job.ts` (consultan y
registran el presupuesto; nota del pendiente reemplazada por referencia a la solución),
`copilot/minimized-views.ts` (+`MinimizedSimulationView`), `context-assembler.ts`
(mapper `toMinimizedSimulationView` con **catálogo cerrado de strings**: fechas ISO,
estrategias, bandas), `anthropic.client.ts` (5ª tool `run_simulation` con schema tipado;
ejecutor ahora recibe input), `copilot.service.ts` (plantillas de simulación + ejecutor +
resolución de refs en servidor), `templates.ts` (`parseAmount`, `parseSimulationIntent`,
`renderSimulationResult`), `app.module.ts`, `notifications.module.ts`.

**Frontend:** `SimulatorScreen.tsx` (4 escenarios con formulario y resultado
antes→después con colores), `CopilotScreen.tsx` (sección "✨ Recomendado para ti" con
whatIfNot y "✓ Lo hice"), `HealthScreen.tsx` (CTA "Simular cómo mejorarlo" en indicadores
rojo/amarillo), `DebtDetailScreen.tsx` (ΔScore en el simulador de abono), navegación y API.

## 3. Cumplimiento de cambios obligatorios (DEC-0007 §10)
1. ✅ **Lista curada** `DISCRETIONARY_GLOBAL_CATEGORIES` sobre nombres globales sembrados
   (verificados contra `default-categories.ts`); el generador consulta con
   `category: { isGlobal: true, name: { in: … } }` → personalizadas excluidas por
   construcción. Test verifica pertenencia a las sembradas y exclusión de esenciales.
2. ✅ **Desplazamiento**: prioridad estrictamente mayor → `dismissed`/`superseded` a la
   más débil; igual/menor → no se crea este ciclo. **Ambos casos con test.**
3. ✅ **Reparto fijo sin reasignación**: caps independientes por kind (2/1); test
   explícito de que 0 recordatorios NO amplían el cupo proactivo y viceversa.

## 4. Pruebas realizadas
- **Unitarias: 240/240 verdes** (31 suites; 20 nuevas): 7 escenarios con anclas
  (nueva_deuda: cuota ~497k y ΔDTI exacto; abono: DTI intacto y flujo −extra;
  cambio_ingreso con regla max(); estrategia recomienda avalancha; vender_activo con
  ΔNW = −2M verificado a mano; refinanciar baja cuota), **inmutabilidad del estado de
  entrada**, desplazamiento (2 casos), lista curada, genericidad de recomendaciones
  (marcas prohibidas), presupuesto (caps, no-reasignación, día anterior), 6ª vista
  (strings fuera de catálogo filtrados, PII bloqueada), parser de montos/intenciones.
- **Typecheck:** backend y frontend exit 0. **Bundle Android:** sin errores (6.52 MB).
- **End-to-end real:**
  - `POST /simulations nueva_deuda` (carro $30M/60m/18%): Score 461→426, DTI 7.3%→19.7%,
    cuota $740.202 — y **las series reales quedaron intactas** (conteo idéntico en BD).
  - Copiloto: *"¿qué pasa si pago 200 mil más al mes?"* → respuesta **por plantilla** con
    números reales (ahorra $970.831, termina 9 meses antes) y **0 entradas `chat`** en
    `AiInteractionLog` (sin LLM).
  - Job de recomendaciones (script efímero, eliminado): el usuario sembrado recibió las
    3 esperadas (fondo de emergencia, abono extra a la tarjeta 32%, recorte 20% de
    **Entretenimiento** — categoría curada), respetando el tope de 3 activas.

**Cómo reproducir la validación:**
```bash
git checkout a56f11e164e6381ec6a7e1e2219d011877e3870f
cd backend && npx tsc --noEmit && npx jest   # exit 0 · 240/240
cd ../frontend && npx tsc --noEmit           # exit 0
```

## 5. Incidencias encontradas
- El presupuesto contaba filas (canal) en vez de eventos: un aviso multi-canal habría
  consumido doble cupo. Detectado en revisión propia antes de commitear; corregido a
  conteo de eventos (distinct `sentAt`) con el log auditando canales.
- Specs del cliente Anthropic actualizados (5 tools; ejecutor con input).

## 6. Limitaciones
- `priorityScore` puede ser 0 cuando el ΔScore del mes es pequeño (impacto normalizado
  sobre 100 pts); el orden relativo se mantiene y el cupo/desplazamiento operan igual.
  Calibración fina de la fórmula = mejora futura de parámetros, no de diseño.
- `vender_activo` mantiene la cuota si la deuda no queda en 0 (abono a capital reduce
  plazo, no cuota) — documentado en el código.
- Retención de `Simulation` (12m) y `NotificationLog` (90d): políticas ratificadas;
  la purga programada se añadirá al job de retención en el próximo ciclo de mantenimiento
  (volumen actual irrelevante; anotado como pendiente menor).
- Módulo legacy `suggestions/` intacto (deprecación formal anotada, DEC-0007 §4.6).
- Gates heredados sin cambios (DEC-0005 §14): DPA ⏳ · PIA ⏳ · producción 🔒.

## 7. Resultado final
**FIN-007 entregado y verificado** contra `a56f11e164e6381ec6a7e1e2219d011877e3870f`,
cumpliendo el plan de DEC-0007 §11 y los 3 cambios obligatorios §10. La promesa central
de ARQ-0001 — *ver el impacto antes de decidir* — está operativa de punta a punta, y el
pendiente de notificaciones de DEC-0006 quedó resuelto con diseño concreto y testeado.
Pendiente de validación del CTO.

---
*Informe de implementación — proceso de gobernanza `docs/GOBERNANZA.md`.*
