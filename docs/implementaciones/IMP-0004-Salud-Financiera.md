# IMP-0004 · Salud Financiera + Score Millo (primer hito acotado)

- **Módulo/Feature:** FIN-004
- **Documentos base:** `ARQ-0004-Salud-Financiera.md` · `AUD-0004-...` · `DEC-0004-Salud-Financiera.md`
- **Autor:** Agente Desarrollador
- **Fecha:** 2026-07-05
- **Referencia inmutable (regla GOBERNANZA):** commit **`c85117e7e89afaa9c761b31b24687a0be57ebcdd`** (rama `claude/finance-app-design-pr8qd5`)
- **Estado:** Entregado — a la espera de validación del CTO contra DEC-0004

---

## 1. Resumen de implementación
Se implementó la primera superficie visible del Motor (Capa 2): **Score Millo v1**
(0–1000, 4 pilares, explicable, actualización automática por eventos), los **3
indicadores** del mandato (DTI, fondo de emergencia, capacidad de ahorro), la **señal de
monetización** (plan free/premium con gate del histórico) y el **guard técnico de
producción**. Los **3 cambios obligatorios de DEC-0004 §10** están aplicados. Cero IA,
cero tablas nuevas (Score como series en `MetricReading`), cero dependencias nuevas.

## 2. Archivos modificados/creados
**Backend — nuevos** (`src/modules/health/`):
- `score.util.ts` (+ spec) — función pura del Score: pilares por tramos con anclas,
  `normTrend` (§10.1), pilar Ahorro parcial (§10.2), renormalización explícita, bandas,
  `SCORE_VERSION`.
- `health.service.ts` — compone score/pilares/delta por pilar/indicadores/disclaimer
  desde las lecturas del Motor; histórico con gate premium + telemetría de intención.
- `health.controller.ts` — `GET /health/score` · `GET /health/score/history`.
- `health-production.guard.ts` (+ spec) — gate técnico (§10.3).
- `health.module.ts`.

**Backend — modificados:**
- `prisma/schema.prisma` — enum `Plan` + `UserSettings.plan` (default `free`).
- Migración `20260705020000_fin004_user_plan`.
- `financial-engine/engine.service.ts` — integración aditiva: `recomputeScore` al final
  de `recompute` (upsert de `score`, `score.version`, `score.<pilar>`).
- `financial-engine/jobs/trends.job.ts` — tras calcular tendencias, refresca el score.
- `engine.service.spec.ts` — mock actualizado (lectura de tendencia + aserciones de score).
- `app.module.ts` — registro de `HealthModule`. `.env.example`/`.env` — `HEALTH_SCORE_PRODUCTION_ENABLED="false"`.

**Frontend:** `src/screens/HealthScreen.tsx` (nueva pestaña **Salud**: tarjeta de Score
con banda/delta/desglose, 3 tarjetas de indicador expandibles con explicación y acciones,
sección de histórico con lock/CTA Millo+, disclaimer), `api/types.ts`, `api/endpoints.ts`,
`navigation/types.ts`, `navigation/MainTabs.tsx`.

## 3. Funcionalidades implementadas
- **Score Millo v1**: Liquidez 28% · Endeudamiento 28% · Ahorro 25% · Patrimonio 19%;
  bandas Crítico/Frágil/Estable/Saludable/Élite; se recalcula con cada evento de dominio
  (mismo debounce del Motor) y tras el TrendsJob nocturno.
- **Explicabilidad**: contribución por pilar (peso efectivo + puntos), pilares
  `unavailable`/`partial` explícitos con renormalización visible, **delta mensual
  descompuesto por pilar**, `scoreVersion` persistido como lectura `score.version`.
- **3 indicadores** con nivel de color, "cómo se calculó" con los números del usuario,
  rangos y 1–2 acciones ejecutables (plantillas deterministas, cero IA).
- **Monetización**: `plan free/premium`; `GET /health/score/history` → 403
  `PREMIUM_REQUIRED` en free (con log de intención de pago); UI con lock + CTA "Millo+ ·
  próximamente". Score actual e indicadores siempre free.
- **Gate de producción**: guard 503 si `NODE_ENV=production` y flag ≠ `true`.
- **Disclaimer** educativo fijo en la pestaña y en la respuesta del API.

## 4. Cambios obligatorios DEC-0004 §10 — cumplimiento
1. **`norm(tendencia)`** ✅ — `normTrend = clamp(pendiente ÷ max(esencial,1), −1, +1)`;
   anclas ±40 lineales en `wealthPillar`; tests cubren +1/−1/0.5/clamp/esencial=0.
2. **Pilar Ahorro parcial** ✅ — una sola sub-métrica → se usa solo esa con
   `status: 'partial'`; `unavailable` solo si faltan ambas; tests de ambos casos borde.
3. **Guard técnico de producción** ✅ — `HealthProductionGuard` +
   `HEALTH_SCORE_PRODUCTION_ENABLED` (default `false`) en `.env.example`; spec con los 4
   escenarios (prod sin flag→503, prod flag false→503, prod flag true→pasa, dev→pasa).

## 5. Pruebas realizadas
- **Unitarias: 171/171 verdes** (22 suites; 16 nuevas): anclas de los 4 pilares
  (incl. interpolaciones), `normTrend` (DEC §10.1), patrimonio nw>0/nw≤0/sin tendencia,
  composición ponderada exacta (caso 782 verificado a mano), renormalización con pilar
  ausente (suma de pesos efectivos = 1), Ahorro parcial/unavailable (DEC §10.2), bandas,
  guard de producción (DEC §10.3).
- **Typecheck**: backend y frontend exit 0.
- **End-to-end (API real)**: perfil sembrado → pipeline automático → `GET /health/score`
  devolvió **score 802 "saludable"** con pilares 84.4/92.7/92.2/40 (ponderación verificada
  manualmente) e indicadores DTI 7.3% 🟢 · fondo 4.8m 🟡 · ahorro 64% 🟢; histórico con
  `free` → **403 PREMIUM_REQUIRED**; con `premium` (activado por BD) → histórico devuelto.
- **Frontend**: bundle Android completo sin errores (6.46 MB).

**Cómo reproducir la validación:**
```bash
git checkout c85117e7e89afaa9c761b31b24687a0be57ebcdd
cd backend && npx tsc --noEmit && npx jest   # exit 0 · 171/171
cd ../frontend && npx tsc --noEmit           # exit 0
```

## 6. Incidencias encontradas
- El spec existente del Motor quedó desactualizado por la integración aditiva del Score
  (mock sin `metricReading.findFirst`); se actualizó el mock y las aserciones (separando
  lecturas core de lecturas `score.*`).
- EPERM de Prisma en Windows (patrón conocido): resuelto deteniendo los procesos node del
  backend antes de `generate`.

## 7. Limitaciones
- **`scoreVersion` como lectura de serie** (`score.version`), no como columna por fila:
  `MetricReading` no tiene columna extra y añadirla estaba fuera del plan autorizado; la
  versión queda correlacionable por período. Si el CTO prefiere columna, es una migración
  menor para un ciclo futuro.
- **Pilar Patrimonio sin magnitud relativa** — mejora diferida por DEC-0004 §6/§8 a una
  recalibración futura de `scoreVersion`.
- **Activación de premium manual** (SQL/admin): no hay billing ni endpoint de upgrade
  (fuera de alcance por DEC). La telemetría de intención es un log estructurado.
- **Histórico con un solo punto** hasta que pasen meses reales de uso (delta por pilar
  aparece desde el segundo mes).
- Validación legal formal **pendiente** (DEC-0001 §10.7): el guard técnico bloquea
  producción; desarrollo/staging operativos.

## 8. Resultado final
**FIN-004 entregado y verificado** contra `c85117e7e89afaa9c761b31b24687a0be57ebcdd`,
cumpliendo el plan de DEC-0004 §11 y los 3 cambios obligatorios §10. Millo ya responde
"¿cómo estoy financieramente?" en segundos, con explicación y acciones — y produce la
primera señal medible de disposición a pagar. Pendiente de validación del CTO.

---
*Informe de implementación — proceso de gobernanza `docs/GOBERNANZA.md`.*
