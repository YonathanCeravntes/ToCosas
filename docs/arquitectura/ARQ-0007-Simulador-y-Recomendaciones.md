# ARQ-0007 · Simulador financiero + Motor de recomendaciones con impacto

- **Módulo/Feature:** FIN-007
- **Autor:** Agente de Arquitectura
- **Fecha:** 2026-07-05
- **Estado:** Propuesto — en espera de AUD-0007 y DEC-0007
- **Documentos base:** `ARQ-0001` · `DEC-0001` · `DEC-0003` · `DEC-0004` · `DEC-0005` (v2+adenda) · `DEC-0006` · `IMP-0006` (FIN-006 cerrado contra `994b085`)
- **Producto:** Millo

> Autorizado por la validación del CTO que cierra FIN-006. Este ARQ **resuelve el
> pendiente heredado** del límite agregado de notificaciones cross-canal (DEC-0006 §10.4
> → §4.5) y cumple la regla de vistas minimizadas para la tool nueva del LLM (§4.4).
> Principio rector intacto: **todo número nace del Motor; la IA solo interpreta.**

---

## 1. Objetivo
Responder "**¿qué pasa si…?**" con números reales antes de decidir (nueva deuda, abono
extra, recorte de gastos, cambio de ingreso, venta de activo, refinanciación, estrategia
de pago) mostrando el **impacto en Score, DTI, flujo y liquidez**; y convertir las
oportunidades detectadas en **recomendaciones cuantificadas y priorizadas** (qué hacer,
por qué, beneficio en pesos/puntos, qué pasa si no).

## 2. Problema que resuelve
1. Los motores de simulación existen desde el inicio (`simulateExtraPayment`,
   `compareStrategies`) pero solo cubren deuda y **no muestran impacto en el Score ni en
   los indicadores** — el usuario no puede evaluar decisiones de vida (comprar carro,
   cambiar de trabajo).
2. Las sugerencias actuales (`generateSuggestions`, FIN-legacy) son cualitativas: dicen
   "podrías abonar extra" sin cuantificar cuánto ahorra ni cómo mueve cada indicador —
   exactamente lo que ARQ-0001 pidió superar.
3. **Pendiente heredado obligatorio** (DEC-0006 §10.4): no existe un presupuesto global
   de notificaciones; un usuario puede recibir recordatorio + proactivo el mismo día sin
   coordinación, y este ciclo (recomendaciones) podría agravarlo.

## 3. Alcance

**Incluye:**
1. **Motor de simulaciones determinista** (`simulations/`) con 7 escenarios v1 — §4.1.
2. **Impacto unificado**: toda simulación devuelve `antes → después` de las métricas
   core + Score v1 (reutiliza `computeCoreMetrics`/`computeScore` como funciones puras) — §4.2.
3. **Motor de recomendaciones con impacto** (`recommendations/`): corre simulaciones
   sobre las oportunidades detectadas y prioriza por `impacto × urgencia × viabilidad` — §4.3.
4. **Tool LLM `run_simulation`** (entrada enum+números, salida = 6ª vista minimizada) +
   **plantillas** para las simulaciones comunes (sin LLM) — §4.4.
5. **Presupuesto global de notificaciones** (`NotificationLog` + `NotificationBudget`)
   que coordina recordatorios + proactividad (resuelve DEC-0006 §10.4) — §4.5.
6. Persistencia: `Simulation` (historial) y `Recommendation` (ciclo de vida) — §6.
7. Frontend: "✨ Recomendado para ti" en el Copiloto + pantalla/simulador visual simple
   en el detalle de deuda ampliado y en Salud (acciones con números).

**No incluye:**
- **Metas formales (`Goal`)** — vacío ya registrado en ARQ-0006 §17; ciclo propio.
- Gamificación (FIN-008), billing (FIN-009), pgvector/RAG (gate §4.6 de ARQ-0006 intacto).
- **Escritura sobre las finanzas del usuario**: ninguna simulación ni recomendación
  modifica datos reales (crea solo sus propios registros).
- Las recomendaciones **no notifican push/WA/TG** en v1 (solo in-app): decisión
  deliberada para no presionar el presupuesto de notificaciones recién instaurado.
- Cambios a gates heredados (DPA/PIA/producción: sin cambios).

## 4. Arquitectura propuesta

### 4.1 Escenarios de simulación v1 (todos deterministas)

| Tipo | Parámetros (numéricos/enum) | Reutiliza |
|---|---|---|
| `abono_extra` | debtId, extraMensual | `simulateExtraPayment` (existente) |
| `nueva_deuda` | monto, plazo, tasa+base, tipo | `AmortizationService.buildSchedule` |
| `reducir_gastos` | montoMensual (o categoría+%) | `computeCoreMetrics` |
| `cambio_ingreso` | nuevoIngresoMensual | `computeCoreMetrics` (regla `max()` DEC-0003) |
| `estrategia_deudas` | extraPresupuesto | `compareStrategies` (existente) |
| `vender_activo` | assetId, precio, aplicarADeuda? (debtId) | `computeNetWorth` + amortización |
| `refinanciar` | debtId, nuevaTasa+base, nuevoPlazo | `buildSchedule` ×2 (actual vs nuevo) |

### 4.2 Impacto unificado (el contrato de valor del ciclo)
`SimulationEngine.project(userId, scenario)`:
1. Lee el estado actual (mismas consultas de `EngineService.recompute`, sin escribir).
2. Aplica el **delta hipotético** en memoria (p. ej. +cuota de la deuda nueva, −gasto).
3. Recalcula `computeCoreMetrics` + `computeScore` sobre el estado hipotético.
4. Devuelve `{ before, after, delta }` para: score (+banda), dti, cashflow,
   savings_rate, liquidity_runway, emergency_fund_months, net_worth + los específicos
   del escenario (interesesAhorrados, nuevaCuota, fechaFin, orden de pago).
**Cero escritura en series** (las lecturas reales no se contaminan con hipótesis); se
persiste solo el registro `Simulation` (auditoría/historial/referencia del Copiloto).

### 4.3 Recomendaciones con impacto (evolución de `generateSuggestions`)
Job nightly (tras los generadores de FIN-006, mismos usuarios activos):

| Oportunidad detectada | Simulación que corre | Recomendación resultante |
|---|---|---|
| cashflow > 0 y deudas activas | `abono_extra` (worst-rate, extra=50% del excedente) | "Abona ${X} extra a tu deuda #N: ahorras ${Y} en intereses y terminas {Z} meses antes (+{S} pts de Score)" |
| DTI > 0.35 | `estrategia_deudas` | "Con avalancha pagas ${Y} menos de intereses que con tu ritmo actual" |
| Sin fondo de emergencia (<3m) y cashflow>0 | `reducir_gastos`→aporte | "Apartando ${X}/mes llegas a 3 meses de fondo en {N} meses (+{S} pts)" |
| Categoría dominante discrecional | `reducir_gastos` (−20%) | "Recortando 20% de {cat} liberas ${X}/mes (+{S} pts)" |

- **Prioridad** = `impacto` (ΔScore normalizado 0-1) × `urgencia` (nivel del indicador
  relacionado: rojo 1.0 / amarillo 0.6 / verde 0.3) × `viabilidad` (excedente disponible
  ÷ esfuerzo requerido, cap 1).
- Estructura fija de cada recomendación: **qué hacer · por qué · beneficio (números) ·
  qué pasa si no · impacto por indicador** (mandato ARQ-0001).
- `dedupeKey` mensual (`rec_<kind>:<YYYY-MM>`), estados new/seen/dismissed/done, máx.
  **3 activas** por usuario (las de mayor prioridad).
- **Genéricas por construcción** (DEC-0005 §14.2): las plantillas entran al test de
  marcas prohibidas existente.
- El módulo legacy `suggestions/` queda intacto pero deja de ser la fuente de la UI
  (deprecación formal en un ciclo de limpieza; se anota, no se borra).

### 4.4 Integración LLM (regla de GOBERNANZA)
- **Tool `run_simulation`**: entrada estrictamente tipada (enum de escenario + números;
  ids internos resueltos por referencia "deuda #N" → debtId **en servidor**, nunca
  expuestos). Salida = **`MinimizedSimulationView` (6ª vista)** con solo números/enums;
  entra al **test de PII (6 vistas)** y al ejecutor validado por marca runtime.
- **Plantilla-primero**: el router de FIN-005 gana intents `simular_abono` ("¿qué pasa si
  pago X más?") y `simular_deuda_nueva` — se resuelven **sin LLM** con el resultado
  renderizado por plantilla. El LLM queda para escenarios ambiguos (con consentimiento y
  gates intactos).
- El contexto inicial NO crece (las simulaciones son bajo demanda).

### 4.5 Presupuesto global de notificaciones (resuelve DEC-0006 §10.4)
- **`NotificationLog`**: `{id, userId, channel (push|whatsapp|telegram), kind
  (recordatorio|proactivo), sentAt}` — escrito por **ambos** despachadores.
- **`NotificationBudgetService`** (módulo notifications): `canSend(userId, kind, now)` →
  reglas: máx. **3 notificaciones/día** por usuario en total (todas las fuentes y
  canales); prioridad de reserva: recordatorios de cuota (hasta 2) > proactivos (hasta 1);
  quiet hours ya se respetan en cada despachador.
- `RemindersService.dispatchDue` y `ProactivityJob` **consultan y registran** en el
  presupuesto. Las recomendaciones no notifican (v1), así que no consumen.
- Retención del log: 90 días (job de retención existente).

## 5. Componentes involucrados
**Nuevos:** `simulations/` (engine puro + service + `POST /simulations` + historial),
`recommendations/` (motor + job nightly + `GET/PATCH /recommendations`),
`NotificationBudgetService` + `NotificationLog`, `MinimizedSimulationView` + tool +
plantillas de simulación, UI (sección Recomendado + formularios de escenario).
**Modificados:** `RemindersService`/`ProactivityJob` (presupuesto), router de plantillas,
`context-assembler` (6ª vista), specs de PII/genericidad (extendidos).
**Reutiliza:** `AmortizationService`, `portfolio.simulator`, `computeCoreMetrics`,
`computeScore`, `computeNetWorth`, insights (urgencia), memoria (viabilidad futura).

## 6. Base de datos
- `Simulation`: `{id, userId, type (enum), params Json, result Json, source (app|copilot),
  createdAt}` — retención 12 meses (job existente).
- `Recommendation`: `{id, userId, kind, title, body, whatIfNot, priorityScore Decimal,
  impact Json (ΔScore/Δdti/Δcashflow/…), status, dedupeKey, validUntil, createdAt}`
  con `@@unique([userId, dedupeKey])`.
- `NotificationLog` (§4.5). **Cero dependencias nuevas; sin pgvector.**

## 7. Backend
NestJS. `SimulationEngine` 100% puro y testeable (estado hipotético en memoria). Tests:
cada escenario con anclas numéricas (p. ej. nueva deuda de $20M/60m/18% → ΔDTI exacto y
ΔScore por pilares), prioridad (impacto×urgencia×viabilidad con casos ordenados),
presupuesto global (3/día, prioridad recordatorio>proactivo, ventana por día), tool
tipada (rechazo de params no numéricos), PII 6 vistas, genericidad de plantillas nuevas.

## 8. Frontend
- **Copiloto**: sección "✨ Recomendado para ti" (máx. 3 tarjetas con beneficio en pesos
  y ΔScore; tap → detalle con la estructura completa + CTA que navega a la acción real).
- **Salud**: bajo cada indicador en rojo/amarillo, botón "Simular cómo mejorarlo".
- **Deudas**: el simulador existente de abono extra pasa a mostrar también ΔScore.
- **Simulador general** (pantalla desde el Copiloto): elegir escenario → formulario
  numérico → resultado antes/después con colores.

## 9. IA involucrada
Sin cambios de política: la tool nueva cumple vistas minimizadas + test PII; las
simulaciones comunes se resuelven por plantilla (sin costo); el LLM solo interpreta bajo
el consentimiento/gates de FIN-005 (DPA/PIA/producción intactos). Ninguna recomendación
la genera el LLM: **todas nacen del motor determinista**.

## 10. Riesgos identificados
1. **Percepción de "consejo financiero"** → estructura educativa + genericidad testeada +
   disclaimers existentes; las recomendaciones citan números propios, nunca productos.
2. **Simulaciones engañosas por datos incompletos** → cada resultado declara los datos
   base usados ("con tu ingreso de referencia de $X…"); pilares `unavailable` visibles.
3. **Deriva del cálculo hipotético vs real** → mismo código puro (`computeCoreMetrics`/
   `computeScore`) para ambos: imposible divergir por duplicación.
4. **Presupuesto de notificaciones rompe recordatorios críticos** → prioridad de reserva
   explícita (cuotas primero) + tests.
5. **Sobrecarga de recomendaciones** → máx. 3 activas, dedupe mensual, dismiss.

## 11. Dependencias
FIN-003/004/005/006 cerrados ✅ (`bbf9654`/`c85117e`/`919f7c2`/`994b085`). Cero nuevas.

## 12. Impacto esperado
Cierra la promesa central de ARQ-0001: decidir **viendo el impacto antes** ("¿me conviene
este carro?" → "tu Score caería 85 pts y tu DTI pasaría a 41%") y recibir acciones con
beneficio cuantificado — el puente natural hacia gamificación (FIN-008) y Premium (FIN-009,
p. ej. simulaciones ilimitadas ya previstas en ARQ-0004 §4.4).

## 13. Criterios de aceptación
- Los 7 escenarios devuelven `before/after/delta` correctos (tests con anclas); `nueva_deuda`
  y `refinanciar` verificados end-to-end contra el estado real de un usuario sembrado.
- Ninguna simulación modifica métricas/series reales (verificación explícita en E2E).
- Recomendaciones nightly: usuario con cashflow>0 y deuda cara recibe la de abono extra
  con ahorro en pesos + ΔScore; prioridad ordena correctamente; máx. 3; dedupe mensual.
- Presupuesto global: 4º intento de notificación del día se bloquea; recordatorio
  desplaza a proactivo y no al revés; `NotificationLog` registra ambas fuentes.
- Tool `run_simulation` solo acepta entrada tipada y su salida pasa el **test de PII de
  6 vistas**; plantillas nuevas pasan el test de genericidad.
- "¿Qué pasa si pago 200 mil más al mes?" en el Copiloto → respuesta por **plantilla**
  con números (sin LLM, verificable en `AiInteractionLog`).
- Typecheck + suite verde; bundle Android OK; **IMP-0007 con SHA** + estado de gates heredados.

## 14. Plan de implementación (tras DEC-0007)
1. Migración: `Simulation`, `Recommendation`, `NotificationLog` (+enums).
2. `SimulationEngine` puro (7 escenarios) + tests con anclas.
3. `simulations/` service+controller+historial+retención.
4. `recommendations/` motor+prioridad+job nightly+endpoints + tests.
5. `NotificationBudgetService` + integración en Reminders/Proactivity + tests.
6. Tool `run_simulation` + 6ª vista + plantillas de simulación + specs PII/genericidad.
7. Frontend (Recomendado, simulador, ΔScore en abono extra, CTA en Salud).
8. E2E + bundle + commit + `IMP-0007` con SHA + BACKLOG.

## 15. Estimación de complejidad
**Alta** (el ciclo más grande desde FIN-005): 3 modelos, 2 módulos nuevos, integración
transversal. Mitigada: los motores numéricos ya existen y están testeados; los patrones
(jobs, dedupe, vistas, plantillas) están todos aprobados.

## 16. Cumplimiento de decisiones vinculantes (para AUD-0007)

| Mandato | Origen | Cumplimiento |
|---|---|---|
| **Límite agregado cross-canal (pendiente heredado)** | DEC-0006 §10.4/§9.1 | **§4.5 resuelto**: NotificationLog + presupuesto 3/día con prioridades + tests |
| Vistas minimizadas para toda tool LLM | GOBERNANZA (DEC-0005 v2 §10.2) | §4.4 (6ª vista + test PII extendido) |
| Recomendación genérica testeable | DEC-0005 §14.2 | §4.3/§7 (plantillas nuevas al test de marcas) |
| La IA interpreta, no calcula | DEC-0001 §4.2 | §4.2/§9 (motor puro; LLM sin generación de recomendaciones) |
| Sin pgvector/RAG (gate con criterio) | DEC-0001 §5.2 · ARQ-0006 §4.6 | §3 (excluido) |
| Consentimiento/DPA/PIA/producción | DEC-0005 §14 | §9 (sin cambios; plantillas no consumen IA) |
| Cero infra nueva / TZ Bogotá / referencia SHA | DEC-0002/0003/GOBERNANZA | §6/§7 (jobs con patrón aprobado; IMP con SHA) |
| Señal de monetización coherente | DEC-0001 §10.8 · ARQ-0004 | §12 (simulaciones ilimitadas como palanca Premium futura; sin billing aquí) |

## 17. Ratificaciones solicitadas al DEC (parámetros, no diseño)
1. Presupuesto global: **3 notificaciones/día** (2 recordatorios + 1 proactivo) — ¿valores?
2. Máx. **3 recomendaciones activas**; dedupe mensual; retención `Simulation` 12 meses / `NotificationLog` 90 días.
3. Deprecación formal del módulo legacy `suggestions/` (aquí solo se anota).
4. Las recomendaciones no notifican en v1 (solo in-app) — confirmar.

---
*Documento sujeto a gobernanza — ver [../GOBERNANZA.md](../GOBERNANZA.md). En espera de
AUD-0007 y DEC-0007. **No iniciar implementación de código.***
