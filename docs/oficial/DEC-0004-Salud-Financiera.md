# DEC-0004 · Salud Financiera + Score Millo (primer hito acotado)

- **Documentos base:** `docs/arquitectura/ARQ-0004-Salud-Financiera.md` · `docs/auditoria/AUD-0004-Salud-Financiera.md`
- **Módulo/Feature:** FIN-004
- **Decide:** CTO/CPO/Principal Architect de Millo
- **Fecha:** 2026-07-05

---

## 1. Resumen ejecutivo

ARQ-0004 respeta con precisión el mandato más restrictivo de este ciclo (Score + máximo 3
indicadores, DEC-0001 §10.9), justifica la selección de indicadores por accionabilidad
real ya existente en la app, incorpora la señal de monetización sin construir billing, y
trata el encuadre legal como gate de release. AUD-0004 lo confirma: **APROBADO CON
OBSERVACIONES**, sin incumplimientos de mandatos vinculantes.

Concuerdo con el veredicto. De las cuatro observaciones, dos son puramente de
especificación (norm de tendencia, renormalización parcial del pilar Ahorro) y se
resuelven aquí. Una tercera —el gate de producción sin mecanismo técnico— la elevo de
"antes de producción" a **obligatoria en este mismo ciclo**: un acuerdo de proceso sin
enforcement en código es exactamente el punto débil que DEC-0001 §10.7 quiso evitar, y el
costo de un flag técnico es mínimo. La cuarta (magnitud del pilar Patrimonio) es una
mejora de calidad legítima pero no bloqueante; queda para una recalibración futura de
`scoreVersion`.

## 2. Arquitecturas revisadas

- `docs/arquitectura/ARQ-0004-Salud-Financiera.md` — v. 2026-07-05.

## 3. Auditorías revisadas

- `docs/auditoria/AUD-0004-Salud-Financiera.md` — veredicto: **APROBADO CON OBSERVACIONES**.

## 4. Decisiones aprobadas

1. **Score Millo v1** (0–1000, función pura sobre el contrato `metricKey` de FIN-003, sin
   IA, con descomposición por pilar y delta mensual explicado): aprobado.
2. **4 pilares v1** (Liquidez 28%, Endeudamiento 28%, Ahorro 25%, Patrimonio 19%) con sus
   tramos de puntaje: aprobado, con la corrección del §10.1 para el componente de
   tendencia del pilar Patrimonio.
3. **3 indicadores** (DTI, Fondo de emergencia, Capacidad de ahorro), elegidos por
   accionabilidad ejecutable hoy en la app: aprobado, coherente con DEC-0001 §10.9.
4. **Señal de monetización** (`UserSettings.plan`, gate del histórico del Score, telemetría
   de intención de pago, sin billing real): aprobado, coherente con DEC-0001 §10.8.
5. **Disclaimers de encuadre educativo** y escala 0–1000 distinta al buró crediticio:
   aprobado, coherente con DEC-0001 §10.7.
6. **`scoreVersion`** en cada lectura persistida, para permitir recalibraciones futuras sin
   corromper el histórico: aprobado.
7. **Cero tablas nuevas** (Score como series en `MetricReading`) y **cero dependencias
   nuevas**: aprobado.

## 5. Decisiones rechazadas

- Ninguna decisión de fondo del ARQ se rechaza. Se resuelven dos ambigüedades de
  especificación y se refuerza un mecanismo de seguridad (ver sección 10); no hay rechazo
  de diseño.

## 6. Observaciones aceptadas

- Hallazgo 1 (`norm(tendencia)` no definido) — aceptado, se define en este DEC.
- Hallazgo 3 (renormalización ambigua cuando falta solo una sub-métrica del pilar Ahorro)
  — aceptado, se define en este DEC.
- Hallazgo 4 (gate de producción puramente procesal) — aceptado y **reforzado**: se exige
  mecanismo técnico, no solo acuerdo de proceso.
- Hallazgo 2 (pilar Patrimonio no escala con magnitud) — aceptado como mejora de calidad
  futura, no como cambio obligatorio de este ciclo.

## 7. Observaciones descartadas

- Ninguna. Las cuatro observaciones de AUD-0004 se incorporan como cambios obligatorios o
  quedan registradas como mejora futura explícita (no se descartan, se difieren con
  justificación).

## 8. Riesgos aceptados

- **Pilar Patrimonio sin magnitud relativa** (Hallazgo 2): aceptado para v1; el diseño ya
  previó `scoreVersion` para recalibrar sin romper históricos cuando se incorpore.
- **Catálogo creciente de `metricKey` dentro de `MetricReading`** (observación menor del
  auditor): aceptado por ahora; señalo que antes de FIN-006 evaluaré si `MetricReading`
  sigue siendo el contenedor adecuado para todo tipo de serie (score, tendencias,
  anomalías) o si conviene un modelo dedicado.

## 9. Riesgos pendientes

- **Validación legal formal** (DEC-0001 §10.7): sigue pendiente y bloqueante para
  producción; este DEC autoriza desarrollo/staging únicamente, reforzado ahora con
  mecanismo técnico (ver Cambios obligatorios #3).

## 10. Cambios obligatorios

1. **Definir `norm(tendencia)` con anclas explícitas:** `norm(tendencia) =
   clamp(pendiente_3m(trend.net_worth) ÷ max(essential_expense_mensual, 1), -1, 1)`.
   Anclas: normalizado ≥ +1 (patrimonio creciendo ≥1× el gasto esencial mensual) → bono
   pleno (+40); normalizado ≤ −1 → penalización plena (−40); lineal entre ambos. Reutiliza
   `essential_expense` (ya calculado en FIN-003) como escala, igual que hace el pilar
   Liquidez con el runway.
2. **Renormalización parcial del pilar Ahorro:** si falta **una sola** de las dos
   sub-métricas (`savings_rate` o `emergency_fund_months`), el pilar usa **únicamente la
   sub-métrica disponible** (no se promedia con un valor faltante) y se marca
   `partial: true` en la respuesta. El pilar solo se marca `unavailable` por completo si
   **ambas** sub-métricas faltan.
3. **Mecanismo técnico obligatorio para el gate de producción** (eleva Rec. 4 de AUD-0004
   de "antes de producción" a obligatorio de este ciclo): variable de entorno
   `HEALTH_SCORE_PRODUCTION_ENABLED` (default `false`). Un guard en `health.controller.ts`
   devuelve 503 si la variable es `false` y `NODE_ENV=production`; en desarrollo/staging
   no aplica. Debe incluirse en `IMP-0004`, no diferirse.

## 11. Plan técnico oficial

Se autoriza al agente Desarrollador a iniciar la implementación de FIN-004 siguiendo el
plan de la sección 14 de `ARQ-0004`, incorporando los 3 cambios obligatorios de la
sección 10 de este DEC:

1. Migración: `UserSettings.plan` (enum `Plan { free premium }`, default `free`).
2. `score.util.ts`: función pura de los 4 pilares, con `norm(tendencia)` definido (cambio
   obligatorio #1) y renormalización parcial del pilar Ahorro (cambio obligatorio #2).
   Tests por tramo/ancla para cada pilar, incluyendo los casos borde de renormalización.
3. Integración aditiva en `EngineService.recompute` (upsert de `score` + 4 `score.*`).
4. `health/` (service + controller + gate de plan) con el **guard técnico del gate de
   producción** (cambio obligatorio #3) + tests.
5. Frontend: pestaña Salud + detalle de indicador + gate/CTA de histórico + disclaimer.
6. Verificación end-to-end (evento → score actualizado → UI) + bundle Android.
7. Cierre con `docs/implementaciones/IMP-0004-Salud-Financiera.md`, **con SHA de commit**
   (regla de `GOBERNANZA.md`), actualizando `docs/roadmap/BACKLOG.md`.

No se autoriza ninguna funcionalidad fuera de este plan (12 indicadores restantes,
Copiloto/IA, memoria, simulador, gamificación, billing real) dentro del ciclo de FIN-004.

## 12. Prioridad

**Alta.** Primera superficie visible del conocimiento del Motor; dependencia directa de
FIN-005 (Copiloto).

## 13. Estado final

**APROBADO CON AJUSTES.** Se autoriza iniciar la implementación de FIN-004 bajo el plan
de la sección 11 y los 3 cambios obligatorios de la sección 10. **Exposición a
producción bloqueada** hasta validación legal formal (DEC-0001 §10.7), reforzada ahora
con el flag técnico obligatorio. El cierre de FIN-004 requiere `IMP-0004` con SHA de
commit verificable, que validaré en checkout aislado antes de autorizar el cierre.

---
*Documento oficial — no modificar. Corresponde al ciclo de gobernanza de `docs/GOBERNANZA.md`.*
