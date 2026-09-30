# ARQ-0004 · Salud Financiera + Score Millo (primer hito acotado)

- **Módulo/Feature:** FIN-004
- **Autor:** Agente de Arquitectura
- **Fecha:** 2026-07-05
- **Estado:** Propuesto — en espera de auditoría (AUD-0004) y decisión oficial (DEC-0004)
- **Documentos base:** `ARQ-0001` · `DEC-0001` · `DEC-0002` · `DEC-0003` · `IMP-0003` (FIN-003 cerrado contra commit `bbf9654`)
- **Producto:** Millo

> Autorizado por la validación del CTO que cierra FIN-003. Alcance acotado por mandato:
> **Score + máximo 3 indicadores** (DEC-0001 §10.9; rechazo §5.3 del dashboard con 15
> indicadores + 7 pilares). Incluye la **señal de monetización** exigida por DEC-0001
> §10.8 y aborda el **encuadre legal** (§10.7). Trazabilidad completa en §16.

---

## 1. Objetivo
Construir la **primera superficie visible** del conocimiento del Motor (Capa 2): una
pestaña **Salud** con el **Score Millo v1** (0–1000, explicable, actualización automática)
y **3 indicadores accionables**, más la **señal mínima de monetización** (plan
free/premium con el histórico del Score como feature premium).

## 2. Problema que resuelve
FIN-003 produce métricas que ningún usuario ve. No existe una respuesta simple a "¿cómo
estoy financieramente?" ni una guía de qué mejorar primero. Además, DEC-0001 exige no
postergar más la señal de monetización.

## 3. Alcance

**Incluye:**
1. **Score Millo v1** — índice 0–1000 calculado desde las métricas de FIN-003, con
   descomposición por pilar (explicabilidad radical), bandas de color e histórico mensual.
2. **3 indicadores** (elegidos por accionabilidad, ver §4.3): **Endeudamiento (DTI)**,
   **Fondo de emergencia (meses)** y **Capacidad de ahorro (tasa)**.
3. Pestaña **Salud** en la app: Score grande + banda + tendencia, 3 tarjetas de indicador
   con color y una frase; tap → **detalle con explicación determinista** (plantillas, sin
   IA), diseñado para que FIN-005 lo redirija al Copiloto.
4. **Señal de monetización** (DEC-0001 §10.8): campo `plan` (`free`/`premium`) en
   `UserSettings` + gate del **histórico del Score** (free ve el Score actual; el
   histórico/evolución muestra CTA de upgrade). Sin pasarela de pago (fuera de alcance).
5. **Disclaimers de encuadre educativo** (DEC-0001 §10.7) visibles en la pestaña Salud.
6. Endpoints: `GET /health/score` (score + pilares + indicadores + explicaciones) y
   `GET /health/score/history` (gated por plan).

**No incluye:**
- Los 12 indicadores restantes y los pilares no calculables aún (llegan por iteraciones
  guiadas por uso, tras FIN-005/FIN-006).
- Copiloto/IA (FIN-005), memoria (FIN-006), simulador/recomendaciones (FIN-007), gamificación (FIN-008).
- Pasarela de pago / billing real (solo la señal; el cobro es un ciclo posterior).
- Nuevas tablas: el Score se persiste como series en `MetricReading` (reutiliza FIN-002/003).
- **Exposición a usuarios reales en producción**: bloqueada hasta validación legal (§10.7) — este desarrollo es para entorno de desarrollo/staging.

## 4. Arquitectura propuesta

### 4.1 Score Millo v1 — cálculo determinista
El Score es una **función pura de las métricas de FIN-003** (sin IA), calculada dentro del
ciclo `recompute` del Motor y persistida como lecturas en `MetricReading`:
`score` (0–1000), `score.liquidity`, `score.debt`, `score.savings`, `score.wealth` (0–100 c/u).

**Pilares v1** (subconjunto calculable hoy del modelo de ARQ-0001, pesos renormalizados y
documentados; los pilares de cumplimiento/estabilidad/hábitos se integran en fases futuras
recalibrando versión):

| Pilar v1 | Peso | Fuente (metricKey FIN-003) | Función de puntaje (0–100, lineal por tramos) |
|---|---|---|---|
| Liquidez | 28% | `liquidity_runway` | 0m→0 · 3m→60 · ≥6m→100 |
| Endeudamiento | 28% | `dti` | 0%→100 · 20%→80 · 35%→50 · ≥60%→0 |
| Ahorro | 25% | `savings_rate` y `emergency_fund_months` | promedio de: tasa (≤0→0 · 10%→50 · ≥20%→100) y fondo (0m→0 · 3m→60 · ≥6m→100) |
| Patrimonio | 19% | `net_worth` y `trend.net_worth` | nw>0→70 base · +30 si tendencia ≥0 (con cold-start: sin tendencia, solo base) · nw≤0→max(0, 40+40·norm(tendencia)) |

`Score = round(10 × Σ peso_i × pilar_i)` → 0–1000.
**Bandas** (ARQ-0001): 0–399 Crítico 🔴 · 400–599 Frágil 🟠 · 600–749 Estable 🟡 ·
750–899 Saludable 🟢 · 900–1000 Élite 🟢.

**Explicabilidad:** el endpoint devuelve la contribución de cada pilar
(`peso × valor × 10` puntos) y el **delta vs. mes anterior descompuesto por pilar**
("bajó 25: −18 endeudamiento, −7 liquidez"). Métricas ausentes (p. ej. `runway` sin gasto
esencial) → el pilar reporta `unavailable` y se renormaliza sobre los pilares presentes
(documentado en la respuesta para no ocultar el ajuste).

**Actualización automática:** al ser parte de `recompute`, cualquier evento de dominio
(transacción, deuda, saldo…) actualiza el Score con el mismo debounce del Motor.

### 4.2 Cold-start
El Score se calcula desde el día 1 (aritmética del mes, como las métricas core). El
componente de **tendencia** del pilar Patrimonio respeta el cold-start global de FIN-003
(sin ≥60 días: solo puntaje base, marcado `partial: true` en la respuesta).

### 4.3 Los 3 indicadores (mandato §10.9, criterio: accionabilidad)

| Indicador | metricKey | Rangos | Acción sugerida (plantilla) |
|---|---|---|---|
| **Endeudamiento (DTI)** | `dti` | <20%🟢 · 20–35%🟡 · >35%🔴 | priorizar deuda cara / usar simulador de abono |
| **Fondo de emergencia** | `emergency_fund_months` | ≥6m🟢 · 3–6🟡 · <3🔴 | marcar cuenta como fondo y alimentarla |
| **Capacidad de ahorro** | `savings_rate` | >20%🟢 · 10–20%🟡 · <10%🔴 | revisar gastos fijos / recorte de categoría top |

Se eligen estos 3 (y no patrimonio/liquidez) porque cada uno tiene una **acción inmediata
ejecutable dentro de la app hoy** (deudas + simulador ya existen; cuentas de fondo ya
existen; presupuesto ya existe). Cada tarjeta abre un detalle con: qué significa, cómo se
calculó **con los números del usuario**, rango/color, y 1–2 acciones. Todo por plantilla
determinista (cero IA, cero costo por consulta).

### 4.4 Señal de monetización (mandato §10.8)
- `UserSettings.plan: free | premium` (default `free`). Sin billing: el upgrade es un CTA
  informativo ("próximamente") + el flag puede activarse manualmente (admin/testing).
- **Gate:** `GET /health/score/history` responde 403 `PREMIUM_REQUIRED` para `free`; la UI
  muestra el gráfico bloqueado con CTA. El Score actual y los 3 indicadores son free
  (el valor gratuito fideliza, DEC-0001 §"monetización").
- Métrica de negocio: los taps en el CTA quedan en log estructurado (conteo de intención
  de pago) — insumo para decidir el pricing en el ciclo de billing.

### 4.5 Encuadre legal (mandato §10.7)
- Disclaimer permanente en la pestaña Salud: *"El Score Millo y sus indicadores son
  información educativa sobre tus hábitos financieros. No son asesoría financiera ni un
  puntaje crediticio, y no se comparte con entidades."*
- Escala 0–1000 (deliberadamente distinta al buró) + texto "no es tu score crediticio".
- **Condición de despliegue declarada:** la exposición a usuarios reales en producción
  queda bloqueada hasta la validación legal del CTO (este ARQ no la resuelve; la señala
  como gate de release, no de desarrollo).

## 5. Componentes involucrados
**Nuevos (backend):** `health/` → `score.util.ts` (función pura del Score),
`health.service.ts` (lee métricas, arma score+indicadores+explicaciones),
`health.controller.ts` (`/health/score`, `/health/score/history`), `health.module.ts`.
**Modificados:** `EngineService.recompute` (añade upsert de las 5 lecturas de score al
final del ciclo — cambio aditivo), `UserSettings` (campo `plan`).
**Frontend:** pestaña **Salud** (`HealthScreen`) + detalle de indicador; tipos/endpoints.

## 6. Base de datos
- **Sin tablas nuevas.** Score persistido como `MetricReading` (`score`, `score.*`),
  reutilizando particionamiento/retención de FIN-003 (serie `month`).
- Migración mínima: `UserSettings.plan` (enum `Plan { free premium }`, default `free`).

## 7. Backend
NestJS, determinista. `score.util.ts` puro con tests por tramo (anclas de cada pilar,
renormalización con pilares ausentes, bandas, delta por pilar). `HealthService` compone
la respuesta desde `MetricReading` (sin recálculo propio). Gate de plan como guard simple.
Cero dependencias nuevas.

## 8. Frontend
Expo/React Native. Nueva pestaña **Salud** (tab con ícono 🩺/❤️): tarjeta de Score
(número grande, banda de color, flecha de tendencia, "por qué cambió"), 3 tarjetas de
indicador (color + valor + frase), detalle por tap (explicación con números propios +
acciones que navegan a Deudas/Cuentas/Presupuesto), disclaimer fijo, e histórico con
lock/CTA si `plan=free`. Sin gráficas complejas (primer hito sobrio).

## 9. IA involucrada
**Ninguna.** Todas las explicaciones son plantillas deterministas (ARQ-0001: la IA
interpreta recién en FIN-005, y su gate de consentimiento/minimización sigue vigente).

## 10. Riesgos identificados
1. **Percepción de score injusto** con datos incompletos → mitigado: pilares `unavailable`
   renormalizados y explicados; onboarding sugiere completar cuentas/fijos.
2. **Confusión con score crediticio** → mitigado: escala 0–1000, naming y disclaimer (§4.5).
3. **Recalibración futura** (al añadir pilares) cambiará scores → mitigado: `scoreVersion`
   en la respuesta y en el payload de las lecturas; el histórico registra la versión.
4. **Riesgo regulatorio** → gate de release explícito (§4.5); desarrollo no bloqueado.
5. **Gate premium percibido como castigo** → solo se gatea el histórico (nice-to-have),
   nunca el Score actual ni los indicadores.

## 11. Dependencias
- **FIN-003 cerrado** (commit `bbf9654`) — métricas y series. ✅
- Ninguna dependencia nueva de paquetes/infraestructura.

## 12. Impacto esperado
Primera experiencia visible de la inteligencia de Millo: responde "¿cómo estoy?" en
segundos, guía la acción (3 indicadores accionables) y produce la primera **señal medible
de disposición a pagar** (CTA del histórico). Base directa para el Copiloto (FIN-005).

## 13. Criterios de aceptación
- Registrar un movimiento/deuda/saldo → el Score se recalcula automáticamente (evento →
  recompute) y `GET /health/score` refleja el cambio con desglose por pilar.
- Delta mensual descompuesto por pilar cuando existe mes anterior.
- Pilares con métrica ausente → `unavailable` + renormalización explícita.
- 3 indicadores con color/rango/acciones correctos según §4.3 (tests por tramo).
- `plan=free` → `/health/score/history` responde `PREMIUM_REQUIRED` y la UI muestra CTA;
  `premium` → histórico completo.
- Disclaimer visible en la pestaña Salud.
- Typecheck + suite completa verde; bundle Android sin errores; **IMP-0004 con SHA**.

## 14. Plan de implementación (tras DEC-0004)
1. Migración: `UserSettings.plan` (enum `Plan`).
2. `score.util.ts` (función pura: pilares por tramos, renormalización, bandas, delta) + tests.
3. Integración en `EngineService.recompute` (upsert de `score` y `score.*`).
4. `health/` (service + controller + gate de plan) + tests.
5. Frontend: pestaña Salud + detalle de indicador + gate/CTA + disclaimer.
6. Verificación end-to-end (evento → score actualizado → UI) + bundle Android.
7. Commit + `IMP-0004-Salud-Financiera.md` con SHA + BACKLOG.

## 15. Estimación de complejidad
**Media.** El riesgo está en la calibración de tramos (mitigado con tests de anclas) y en
la claridad de las explicaciones; técnicamente es composición sobre FIN-003.

## 16. Cumplimiento de decisiones vinculantes (para AUD-0004)

| Mandato | Origen | Cómo lo cumple este ARQ |
|---|---|---|
| Score + **máximo 3 indicadores**, priorizando accionabilidad | DEC-0001 §10.9 / §5.3 | §3.2, §4.3 (DTI, fondo de emergencia, tasa de ahorro; justificación de accionabilidad) |
| Señal de monetización en FIN-004/005 | DEC-0001 §10.8 | §4.4 (plan free/premium + gate del histórico + telemetría de intención) |
| Validación legal antes de producción | DEC-0001 §10.7 | §4.5 (disclaimers + gate de release explícito; desarrollo no bloqueado) |
| Sin IA/pgvector; consentimiento LLM pendiente | DEC-0001 §5.2/§10.6 | §9 (cero IA; plantillas deterministas) |
| Sin Redis/BullMQ; cero infra nueva | DEC-0002 §4.1 | §7, §11 |
| Contrato `metricKey` estable de FIN-003 | DEC-0003 §4.2 | §4.1/§4.3 consumen las claves aprobadas sin modificarlas |
| Cold-start (60d global) | DEC-0001 §10.4 / DEC-0003 §10.2 | §4.2 (tendencia del pilar Patrimonio respeta el umbral; score base desde día 1) |
| Referencia inmutable en IMP | GOBERNANZA | §13/§14.7 (IMP-0004 con SHA) |
| Explicabilidad radical | ARQ-0001 (aprobado DEC-0001 §4.2) | §4.1 (descomposición por pilar + delta explicado) |

---
*Documento sujeto a gobernanza — ver [../GOBERNANZA.md](../GOBERNANZA.md). En espera de
AUD-0004 y DEC-0004. **No iniciar implementación de código.***
