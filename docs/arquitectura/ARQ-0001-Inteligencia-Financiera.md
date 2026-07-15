# ARQ-0001 · Inteligencia Financiera (arquitectura de 3 capas)

- **Módulo/Feature:** FIN-001 (umbrella)
- **Autor:** Agente de Arquitectura
- **Fecha:** 2026-07-04
- **Estado:** Propuesto — en espera de auditoría (AUD) y decisión oficial (DEC)
- **Producto:** Millo (nombre por confirmar: Millo vs Milla)

> Documento paraguas. Cada capa/módulo tendrá su propio ARQ hijo (FIN-002…FIN-009)
> antes de implementarse. Este ARQ fija la visión, los principios y el marco común.

---

## 1. Objetivo
Evolucionar Millo de una app de **registro y consulta** a una **plataforma de
inteligencia financiera personal**: un sistema que comprende la situación del usuario,
la analiza continuamente, detecta riesgos y oportunidades, explica, anticipa, recomienda,
enseña y acompaña — con sensación de “analista financiero personal 24/7”.

## 2. Problema que resuelve
Hoy la lógica financiera está **dispersa en funciones puras** (amortización, portafolio,
sugerencias, presupuesto, dashboard) invocadas por pantallas concretas. No existe:
un cerebro central, series de tiempo, memoria financiera, eventos de dominio, ni una IA
que interprete el estado del usuario. Además el modelo de datos **solo tiene pasivos**
(deudas), sin activos ni saldos de cuentas, lo que impide calcular patrimonio, liquidez
real y fondo de emergencia.

## 3. Alcance
**Incluye** (a desarrollarse por fases, cada una con su ARQ/DEC):
- Capa 1: Motor Financiero (servicio interno event-driven, sin UI).
- Capa 2: Salud Financiera (Score Millo + indicadores + dashboard ejecutivo).
- Capa 3: Copiloto Financiero (interpreta el Motor; memoria, proactividad, educación, simulador, recomendaciones).
- Fundaciones de datos: cuentas/activos, snapshots, series de tiempo, bus de eventos.
- Gamificación y monetización (Free/Premium).

**No incluye (por ahora):** agregación bancaria automática (Plaid/Belvo) — se contempla
como evolución futura; el diferencial actual es la ingesta conversacional (WhatsApp/Telegram).

## 4. Arquitectura propuesta
Tres capas desacopladas, con **determinismo primero, IA después** y orientación a eventos:

```
CAPA 3 · COPILOTO (interpreta, conversa, enseña, simula, proactivo)   ← LLM
CAPA 2 · SALUD FINANCIERA (Score Millo + indicadores, dashboard)      ← visual
CAPA 1 · MOTOR FINANCIERO (event-driven, sin UI, calcula todo)        ← cerebro
        ▲ datos: transacciones, deudas, fijos, cuentas/activos, metas,
          ingresos (app + WhatsApp + Telegram + sync offline)
```

**Principios:** (1) todo número nace en el Motor (auditable, barato); la IA interpreta,
no calcula. (2) Cada cambio dispara recálculo incremental e insights. (3) Memoria
propiedad de Millo, no del modelo. (4) Explicabilidad radical (todo indicador y todo
cambio de Score se descompone). (5) Privacidad por diseño (mínimo contexto a la IA).

**Flujo event-driven:** `TransactionCreated / DebtChanged / FixedItemChanged /
BalanceUpdated` → Motor recalcula métricas afectadas → persiste `Snapshot` /
`MetricReading` / `ScoreHistory` → emite `RiskDetected / AnomalyDetected / ScoreChanged /
GoalAtRisk` → los consumen Salud, Copiloto y Notificaciones (push/WA/TG).

### 4.1 Capa 1 — Motor Financiero (módulos)
Cada módulo: Objetivo · Entradas → Salidas · Evento · Frecuencia.

| Módulo | Objetivo | Entradas → Salidas | Evento / Frecuencia |
|---|---|---|---|
| Cash Flow | Flujo real y proyectado | tx, fijos, cuotas → flujo, tendencia | CashflowUpdated · on-event+nightly |
| Liquidez | Colchón en meses | saldos, gasto esencial → runway | on-event |
| Patrimonio | Activos−Pasivos | cuentas, activos, deudas → net worth + histórico | NetWorthUpdated · nightly |
| Activos/Pasivos | Inventario/valoración | cuentas, activos, deudas → balance | on-change |
| Endeudamiento | Carga de deuda | cuotas, ingreso, saldos → DTI, debt/assets | on-event |
| Presupuesto | Cumplimiento vs plan | budget, tx → % cumplido, desvíos | mensual+on-event |
| Ahorro | Tasa y consistencia | flujo → savings rate, serie | mensual |
| Metas | Progreso vs objetivo | metas, aportes → % avance, ETA | on-event |
| Progreso | Evolución integral | históricos → deltas, hitos | nightly |
| Tendencias | Dirección (↑/↓) | series → pendientes, medias móviles | nightly |
| Hábitos | Rutinas/recurrencias | tx histórico → patrones | semanal |
| Patrones | Suscripciones/recurrencias | tx → recurring items | semanal |
| Anomalías | Gasto/ingreso inusual | tx + baseline → outliers (z-score/IQR) | on-event |
| Riesgos | Vulnerabilidades | métricas → riesgos con severidad | on-event |
| Alertas | Riesgo→aviso | riesgos, vencimientos → alertas priorizadas | on-event |
| Predicciones | Escenario base | series → forecast flujo/saldo (N meses) | nightly |
| Simulaciones | “¿Qué pasa si…?” | escenario + estado → impacto | on-demand |
| Priorización | Ordenar acciones | recomendaciones → ranking impacto×urgencia×viabilidad | on-event |
| Recomendaciones | Qué hacer y por qué | riesgos/oportunidades → acciones con ΔScore/Δintereses | on-event |
| KPIs | Batería de indicadores | todo → indicadores normalizados | on-event+nightly |
| Memoria financiera | Perfil permanente | eventos → rasgos/hábitos/preferencias | continuo |
| Contexto IA | Empaqueta contexto mínimo | snapshot+memoria+insights → contexto compacto | on-demand |

**Módulos adicionales propuestos:** Estacionalidad, Salud de deudas, Coach de
comportamiento (impulsividad/sesgos), Escenarios de vida (empleo/vehículo/hijo).

**Escalabilidad:** cálculos puros y sin estado, particionables por `userId`; recálculo
incremental por evento; snapshots en Redis; jobs pesados en BullMQ; series en tablas
particionadas por tiempo.

### 4.2 Capa 2 — Salud Financiera

**Score Millo** — índice propio 0–1000 (escala distinta al score crediticio a propósito).
7 pilares normalizados 0–100 y ponderados:

| Pilar | Peso |
|---|---|
| Liquidez | 18% |
| Endeudamiento | 18% |
| Ahorro + fondo de emergencia | 16% |
| Cumplimiento (presupuesto+metas) | 14% |
| Estabilidad de ingresos | 12% |
| Patrimonio + crecimiento | 12% |
| Hábitos/comportamiento | 10% |

`Score = round(10 × Σ(peso_i × pilar_i))`. Bandas: 0–399 Crítico 🔴 · 400–599 Frágil 🟠 ·
600–749 Estable 🟡 · 750–899 Saludable 🟢 · 900–1000 Élite 🟢. Cada cambio se descompone
por pilar (“−18 endeudamiento, −7 liquidez”). Automático + histórico.

**Indicadores** (definición · fórmula · rango 🟢🟡🔴 · acción):

| Indicador | Fórmula | Rangos | Acción |
|---|---|---|---|
| Liquidez (runway) | saldos_líquidos ÷ gasto_esencial | >6m🟢 · 3–6🟡 · <3🔴 | subir colchón |
| Endeudamiento (DTI) | cuotas ÷ ingreso | <20%🟢 · 20–35%🟡 · >35%🔴 | refinanciar/priorizar |
| Capacidad de ahorro | (ingreso−gasto−cuotas) ÷ ingreso | >20%🟢 · 10–20%🟡 · <10%🔴 | automatizar ahorro |
| Fondo de emergencia | ahorro_disponible ÷ gasto_esencial | ≥6m🟢 · 3–6🟡 · <3🔴 | meta de fondo |
| Riesgo financiero | compuesto (liquidez↓,DTI↑,volatilidad↑,sin fondo) | 0–33🟢·34–66🟡·>66🔴 | mitigación |
| Estabilidad ingresos | 1 − CV(ingresos_N) | >0.8🟢·0.6–0.8🟡·<0.6🔴 | diversificar |
| Cumplimiento presupuestal | 1 − (sobregasto ÷ presupuestado) | >90%🟢·75–90%🟡·<75%🔴 | ajustar |
| Cumplimiento de metas | avg(avance ÷ plan) | >90%🟢·70–90%🟡·<70%🔴 | replanear |
| Patrimonio | activos − pasivos | tendencia +/0/− | construir activos |
| Crecimiento patrimonial | (NW_t−NW_{t−n}) ÷ |NW_{t−n}| | >0🟢·~0🟡·<0🔴 | revisar pasivos |
| Dependencia del crédito | gasto_con_crédito ÷ gasto_total | <10%🟢·10–30%🟡·>30%🔴 | reducir rotativo |
| Consumo impulsivo | discrecional_no_recurrente ÷ total + picos | bajo🟢·medio🟡·alto🔴 | reglas de gasto |
| Diversificación ingresos | 1 − HHI(fuentes) | >0.5🟢·0.3–0.5🟡·<0.3🔴 | fuentes extra |
| Calidad del flujo | meses_positivos/N + colchón | alto🟢·medio🟡·bajo🔴 | estabilizar |
| Salud de deudas | compuesto (tasa,DTI,mora,avance) | 🟢🟡🔴 | plan por deuda |

**UX:** dashboard de pocos segundos (Score grande + banda + tendencia; 5–7 tarjetas
prioritarias con color y una frase). Cada tarjeta es interactiva → **al tocarla abre el
Copiloto** con explicación sembrada (plantilla determinista; IA solo enriquece si el
usuario sigue preguntando).

### 4.3 Capa 3 — Copiloto Financiero
Orquestador que **interpreta** el Motor y conversa (no es chatbot):
1. **Context Assembler** arma contexto compacto (snapshot + memoria + insights).
2. **Router**: si hay plantilla determinista → responde sin IA.
3. Si requiere razonar → **LLM (Haiku por defecto)** con **tool-use** al Motor (números
   exactos / simulaciones); escala a modelo mayor solo en planeación compleja.
4. Persiste conversación + actualiza memoria.

- **Memoria financiera** (propiedad de Millo): hechos/rasgos/hábitos/fechas/objetivos con
  embeddings (pgvector). Nunca depende solo del contexto del modelo.
- **Proactividad:** eventos del Motor generan mensajes que el Copiloto inicia por push/WA/TG.
- **Educación:** cada explicación enseña con el ejemplo real del usuario.
- **Simulador conversacional:** vehículo, recorte de gastos, más ahorro, cambio de empleo,
  priorizar/refinanciar deuda, vender activo → impacto en Score, flujo, patrimonio, payoff.
- **Motor de recomendaciones:** evoluciona `generateSuggestions`; cada acción con impacto
  proyectado (ΔScore, Δintereses, Δflujo) y prioridad = impacto × urgencia × viabilidad;
  explica qué/por qué/beneficio/qué pasa si no/impacto por indicador.

## 5. Componentes involucrados
**Reutiliza (existentes):** `AmortizationService`, `simulatePortfolio`/`compareStrategies`,
`generateSuggestions`, `BudgetService`, `TransactionsService.monthlyDashboard`, reminders
(push/WA/TG), scheduler, Redis/BullMQ, ingesta WA/TG + sync offline.
**Nuevos:** módulos `financial-engine/*`, `health/`, `copilot/`, `simulations/`,
`recommendations/`, `gamification/`, `accounts/`, `financial-memory/`.

## 6. Base de datos
**Entidades nuevas:** `Account`, `Asset` (patrimonio), `FinancialSnapshot`,
`MetricReading` (serie), `ScoreHistory`, `Insight` (riesgo/oportunidad/anomalía/logro),
`FinancialMemoryFact` (+embedding), `Goal`/`GoalContribution`, `RecurringPattern`,
`Anomaly`, `Recommendation`, `Simulation`, `Conversation`/`Message`, `Achievement`/
`Streak`/`UserLevel`/`Challenge`, `EducationalTopic` (+embedding), `AiInteractionLog`.
Series en tablas particionadas por tiempo; `pgvector` para memoria y corpus educativo.

## 7. Backend
NestJS. Bus de dominio (arranca con `EventEmitter2`; escala a outbox + BullMQ/Redis, ya
presente). Jobs nocturnos (snapshots, score, tendencias, anomalías, predicciones,
briefing proactivo, rachas/metas). Motor 100% puro y testeable; el LLM entra recién en
Capa 3 y siempre sobre datos del Motor.

## 8. Frontend
Expo/React Native. Nueva pestaña **Salud Financiera** (Score + indicadores interactivos).
La pestaña **Consejos** evoluciona a **Copiloto Financiero** (chat + proactividad +
simulador). Nuevas pantallas: Cuentas/Activos, Metas, Gamificación. Se mantiene
offline-first + sync.

## 9. IA involucrada
Proveedor **Anthropic** (Claude Haiku por defecto; escalado a modelo mayor en planeación).
Uso vía **tool-use** hacia el Motor. **Reducción de costo:** respuestas por plantilla para
lo estándar; caché de narrativas por `hash(estado)`; *prompt caching*; contexto compacto;
briefings precomputados. **RAG híbrido:** ensamblado estructurado (primario) + pgvector
sobre memoria financiera y corpus educativo (secundario). Grounding determinista para
evitar alucinaciones.

## 10. Riesgos identificados
1. Alcance/complejidad → mitigar con entregas por fases verificables.
2. Costo IA → determinismo + caché + modelo escalonado.
3. Responsabilidad/“asesoría” regulada (CO) → grounding + disclaimers + encuadre educativo.
4. Calidad de datos (entrada manual incompleta) → estimaciones + pedir saldos de cuentas.
5. Fatiga de notificaciones → límites y preferencias.
6. Privacidad de datos financieros + gobernanza de datos enviados a la IA.

## 11. Dependencias
- **FIN-002 (Fundaciones de datos)** es prerequisito de todo (sin cuentas/activos no hay
  patrimonio/liquidez/fondo de emergencia reales).
- Capa 2 depende de Capa 1; Capa 3 depende de Capas 1 y 2.
- pgvector en PostgreSQL; Redis/BullMQ (ya disponibles).

## 12. Impacto esperado
Reposicionar Millo como “analista financiero personal 24/7”: mayor retención (proactividad
+ gamificación), diferenciación en LATAM (ingesta conversacional donde falla la agregación),
base para monetización Premium y ventaja de costo/confianza (IA sobre motor determinista).

## 13. Criterios de aceptación (del umbrella)
- Existe un Motor central que **origina todos los cálculos** y persiste series.
- El modelo soporta **patrimonio** (activos + pasivos + cuentas).
- El **Score Millo** se calcula, versiona y **se explica** (descomposición por pilar).
- Cada indicador es **interactivo** y abre el Copiloto con explicación.
- El Copiloto **interpreta** el Motor (no recalcula), usa **memoria propia** y es **proactivo**.
- La IA opera con **contexto mínimo** y estrategia de **reducción de costo** medible.
- Cada fase entrega con typecheck + tests verdes y su documento IMP.

## 14. Plan de implementación (roadmap por fases)

| Fase | Feature | Contenido | Depende | Complejidad |
|---|---|---|---|---|
| 0 | FIN-002 | Cuentas/Activos, bus de eventos, store de snapshots/series | — | Alta |
| 1 | FIN-003 | Motor MVP: consolidar cálculos + patrimonio/liquidez/ahorro + KPIs + series | 0 | Alta |
| 2 | FIN-004 | Salud + Score Millo: indicadores, score, dashboard, color, tap→Copiloto | 1 | Media-Alta |
| 3 | FIN-005 | Copiloto v2: context assembler + orquestador LLM + tool-use + plantillas | 1,2 | Alta |
| 4 | FIN-006 | Memoria + proactividad + RAG (insights, briefings, avisos) | 1,3 | Alta |
| 5 | FIN-007 | Simulador conversacional + recomendaciones con impacto | 1,3 | Media-Alta |
| 6 | FIN-008 | Gamificación (rachas, logros, niveles, retos) | 2 | Media |
| 7 | FIN-009 | Monetización Free/Premium + hardening (observabilidad IA, seguridad, escala) | todas | Media |

**Prioridad:** Motor y fundaciones primero (todo depende de ellos); luego lo visible
(Salud/Score); luego el Copiloto.

## 15. Decisiones requeridas del CTO antes del DEC
1. Nombre: ¿Millo o Milla?
2. ¿Se acepta ingreso manual de saldos/activos (base de patrimonio/liquidez)?
3. ¿Se confirma Anthropic (Haiku por defecto) para el Copiloto?
4. Alcance del primer hito: ¿Fase 0→2 (Motor + Salud/Score) antes del Copiloto?
5. Encuadre legal: ¿“información/educación” con disclaimers (recomendado) vs. asesoría formal?

---
*Documento sujeto al proceso de gobernanza — ver [../GOBERNANZA.md](../GOBERNANZA.md).
En espera de AUD y DEC. No iniciar implementación.*
