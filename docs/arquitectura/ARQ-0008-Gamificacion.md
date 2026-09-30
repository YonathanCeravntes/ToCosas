# ARQ-0008 · Gamificación (rachas, logros, niveles y retos sobre hitos reales)

- **Módulo/Feature:** FIN-008
- **Autor:** Agente de Arquitectura
- **Fecha:** 2026-07-05
- **Estado:** Propuesto — en espera de AUD-0008 y DEC-0008
- **Documentos base:** `ARQ-0001` · `DEC-0006` · `DEC-0007` · `IMP-0007` (FIN-007 cerrado contra `a56f11e`)
- **Producto:** Millo

> Autorizado por la validación del CTO que cierra FIN-007. Principio rector del mandato
> original (ARQ-0001): gamificación que **recompensa comportamiento financiero real, sin
> infantilizar**. Restricción estructural clave: **cero notificaciones nuevas** — las
> celebraciones viajan por el camino de insights `logro` ya existente, dentro del
> presupuesto global recién instaurado (FIN-007 §4.5). Trazabilidad en §16.

---

## 1. Objetivo
Aumentar la **retención** convirtiendo la constancia y los hitos financieros reales en
progreso visible: **racha semanal de registro**, **logros** (hitos verificables),
**nivel** (progreso acumulado) y **retos mensuales** personales — todo determinista,
sobrio y anclado a datos que ya calcula el Motor.

## 2. Problema que resuelve
El valor de Millo depende de que el usuario registre con constancia (el Motor, el Score
y el Copiloto se degradan con datos incompletos). Hoy no existe ningún refuerzo positivo
por volver, registrar o alcanzar hitos: los insights de logro (FIN-006) se muestran una
vez y se pierden; no hay memoria de progreso personal visible.

## 3. Alcance

**Incluye:**
1. **Racha semanal de registro** (`Streak`): semanas consecutivas con ≥1 movimiento
   registrado (semana ISO). Actual + mejor histórica — §4.1.
2. **Logros** (`Achievement`): catálogo curado en código (12 logros v1) desbloqueados por
   señales existentes (transacciones, insights `logro`, banda del Score, racha) — §4.2.
3. **Nivel y XP computados** (sin tabla): XP = suma de puntos de logros + bono de racha;
   nivel por umbrales — §4.3.
4. **Retos mensuales** (`Challenge`): 3 tipos v1 auto-asignados, evaluados nightly — §4.4.
5. **Celebración sin notificaciones nuevas**: cada logro crea un **Insight `logro`** que
   entra al flujo existente (tarjeta en Copiloto + elegible para el único cupo proactivo
   diario del presupuesto de FIN-007) — §4.5.
6. UI: bloque de progreso en **Inicio** (racha + nivel + últimos logros) + pantalla
   **Logros** + celebración in-app al abrir (modal sobrio para logros no vistos).
7. Endpoint `GET /gamification/profile` (racha, XP, nivel, logros, reto del mes).

**No incluye:**
- Notificaciones/canales nuevos, leaderboards/comparación social (contra el enfoque
  privado del producto), recompensas monetarias, marketplace de retos.
- IA/LLM (todo determinista; los textos entran al test de genericidad).
- Monetización de la gamificación (FIN-009 decidirá si algo es premium).
- Cambios a gates heredados (DPA/PIA/producción: sin cambios).

## 4. Arquitectura propuesta

### 4.1 Racha semanal (`Streak`)
- `{userId, kind ('registro_semanal'), current, best, lastPeriod (YYYY-Www ISO), updatedAt}`
  — única por `(userId, kind)`.
- **Actualización por evento** (listener de `transaction.created`, ya emitido por el
  outbox): semana actual == lastPeriod → no-op; semana consecutiva → `current+1`;
  hueco → `current=1`. `best = max(best, current)`. Idempotente por diseño (la semana
  actual solo cuenta una vez).
- Semanal y no diaria: registrar finanzas a diario no es un hábito razonable de exigir;
  semanal es alcanzable y protege el tono profesional (evita presión tipo juego).

### 4.2 Logros (`Achievement`) — catálogo v1 (12)

| Código | Se desbloquea cuando | XP |
|---|---|---|
| primer_movimiento | primera transacción | 10 |
| primera_deuda | primera deuda registrada (conocer la deuda ES un logro) | 15 |
| primera_cuenta | primera cuenta/patrimonio registrado | 15 |
| primer_presupuesto | primer gasto/ingreso fijo | 15 |
| primera_simulacion | primera simulación ejecutada | 10 |
| racha_4 | racha semanal ≥4 | 25 |
| racha_12 | racha semanal ≥12 | 60 |
| fondo_3m | fondo de emergencia ≥3 meses | 50 |
| fondo_6m | insight `logro_fondo` (ya existe) | 100 |
| deuda_saldada | insight `logro_deuda_saldada` (ya existe) | 80 |
| score_saludable | banda ≥ saludable | 60 |
| score_elite | banda élite | 120 |

- `{userId, code, unlockedAt}` única por `(userId, code)` — un logro se gana una vez.
- **Evaluación**: listener de eventos para los inmediatos (primer_*, racha) + job nightly
  (3:15 AM Bogotá) para los derivados de métricas/insights. Ambos idempotentes (única).
- Nombres/textos sobrios ("Fondo de emergencia completo", no "¡Super Ahorrador!ⓘ🎖️").

### 4.3 Nivel y XP — computados, sin tabla
`XP = Σ puntos de logros + min(racha_best, 26) × 5`. Niveles v1 (7):
`1:0 · 2:50 · 3:120 · 4:220 · 5:350 · 6:520 · 7:750+` con nombres sobrios
("Nivel 3 · Constante"). **Decisión de diseño**: se computa on-read desde `Achievement`/
`Streak` (misma filosofía del patrimonio on-read de FIN-002) — cero tablas de estado
duplicado, imposible desincronizar. (ARQ-0001 listaba `UserLevel` como entidad; se
propone esta simplificación con esta justificación — a ratificar en el DEC.)

### 4.4 Retos mensuales (`Challenge`) — 3 tipos v1
- `{userId, code, month (YYYY-MM), target Json, progress Json, status (active|completed|
  failed), createdAt}` única por `(userId, code, month)`.
- Asignación: job nightly del día 1 asigna **1 reto** por usuario activo (rotación según
  su situación); evaluación nightly actualiza progreso; cierre al fin de mes.

| Código | Reto | Completado si |
|---|---|---|
| registro_constante | "Registra movimientos las 4 semanas del mes" | 4 semanas ISO con ≥1 tx |
| flujo_positivo | "Termina el mes con flujo positivo" | cashflow del mes > 0 |
| bajo_promedio | "Mantén [categoría curada] por debajo de tu promedio" | gasto mes < promedio 3m (solo `DISCRETIONARY_GLOBAL_CATEGORIES`, FIN-007 §10.1) |

- Reto completado → +30 XP (vía logro efímero… no: se suma como bono en el cómputo de XP
  leyendo `Challenge.status=completed` — sin inflar el catálogo de logros).

### 4.5 Celebración — cero rutas nuevas de notificación
- Logro desbloqueado → `InsightsService.createIfNew({type: 'logro', dedupeKey:
  'gami_<code>:<userId-scope>'})` → aparece en 🔔 Novedades y **compite por el único
  cupo proactivo diario** del presupuesto (FIN-007 §4.5) como cualquier otro insight.
- Celebración principal: **in-app al abrir** (modal sobrio si hay logros no vistos,
  marcados leídos al cerrarlo). El refuerzo llega cuando el usuario ya está en la app —
  cero fatiga adicional.

## 5. Componentes involucrados
**Nuevos:** módulo `gamification/` (`streak.service`, `achievements.service` + catálogo,
`challenges.service`, `gamification.listener` (transaction.created), `gamification.job`
(nightly 3:15), `gamification.controller`), bloque de progreso en Inicio + pantalla
Logros + modal de celebración.
**Reutiliza:** outbox/eventos, `InsightsService` (celebración), presupuesto de
notificaciones (implícito), `MetricReading`/banda (score_*), criterio usuario activo,
lista curada de FIN-007, patrón cron/TZ.

## 6. Base de datos
`Streak`, `Achievement`, `Challenge` (3 tablas, índices únicos de idempotencia arriba).
**Sin tabla de nivel/XP** (§4.3). Cero dependencias nuevas; sin pgvector; sin IA.

## 7. Backend
NestJS. Tests: racha (misma semana no-op, consecutiva +1, hueco reset, best), catálogo
(cada condición de desbloqueo con datos sembrados, idempotencia), XP/nivel (umbrales,
bono racha cap 26), retos (asignación única mensual, 3 evaluaciones, transición
completed/failed), textos al **test de genericidad** (marcas prohibidas), celebración
(logro → insight con dedupe correcto, sin canal nuevo).

## 8. Frontend
- **Inicio**: fila de progreso (🔥 racha actual · Nivel N con barra · últimos 3 logros) +
  tarjeta del reto del mes con progreso.
- **Pantalla Logros** (desde Inicio): grid del catálogo (desbloqueados a color, pendientes
  atenuados con su condición — transparencia total de cómo ganarlos).
- **Modal de celebración** al abrir con logros nuevos (uno a la vez, sobrio).
- Paleta/tono existentes; sin animaciones estridentes ni copy infantil.

## 9. IA involucrada
**Ninguna.** Los textos del catálogo/retos son estáticos en código y entran al test de
genericidad. (El perfil de gamificación NO se envía al LLM en este ciclo; si un ciclo
futuro quisiera que el Copiloto lo comente, deberá crear su vista minimizada — regla de
GOBERNANZA ya vigente.)

## 10. Riesgos identificados
1. **Tono infantil** → catálogo curado, naming sobrio, revisión en criterios de aceptación.
2. **Presión ansiógena por rachas** → semanal (no diaria); perder racha no notifica ni
   penaliza XP (best se conserva).
3. **Gaming del sistema** (tx falsas por racha/retos) → sin recompensas monetarias, el
   incentivo de trampa es nulo; los retos financieros usan métricas del Motor (difíciles
   de falsear sin dañar el propio Score del usuario).
4. **Más carga nightly** → evaluación solo para usuarios activos (criterio 90d) y
   consultas indexadas.
5. **Fatiga** → cero notificaciones nuevas (§4.5), celebración in-app.

## 11. Dependencias
FIN-006 (insights `logro`) y FIN-007 (presupuesto, lista curada) cerrados ✅
(`994b085`/`a56f11e`). Cero dependencias externas nuevas.

## 12. Impacto esperado
Refuerza el bucle de retención que alimenta todo lo demás (más registro → mejor Motor →
mejor Score/Copiloto → más valor) y prepara la conversación de FIN-009 (usuarios
retenidos son quienes pagan). Los logros dan además momentos naturales de compartir/
recomendación boca a boca.

## 13. Criterios de aceptación
- Registrar movimientos en semanas consecutivas incrementa la racha (misma semana no
  duplica; hueco resetea; best se conserva) — verificado E2E manipulando fechas.
- Los 12 logros se desbloquean con sus condiciones y son idempotentes.
- XP/nivel correctos en `GET /gamification/profile` (anclas de umbral testeadas).
- Reto asignado el día 1, progreso actualizado nightly, cierre correcto a fin de mes.
- Logro nuevo → insight `logro` (dedupe) visible en Novedades; **cero rutas nuevas de
  notificación** (verificable: ningún sender invocado por el módulo).
- Textos pasan el test de genericidad; revisión de tono en los 12 nombres/cuerpos.
- UI: progreso en Inicio, pantalla Logros, modal de celebración.
- Typecheck + suite verde; bundle Android OK; **IMP-0008 con SHA** + gates heredados declarados.

## 14. Plan de implementación (tras DEC-0008)
1. Migración: `Streak`, `Achievement`, `Challenge` (+enums).
2. Catálogo de logros + `achievements.service` (evaluación + idempotencia) + tests.
3. `streak.service` + listener `transaction.created` + tests.
4. `challenges.service` + asignación/evaluación nightly + tests.
5. `gamification.job` (3:15 AM Bogotá) + celebración vía `InsightsService` + tests.
6. `GET /gamification/profile` + XP/nivel computados + tests de umbrales.
7. Frontend: Inicio (progreso + reto), pantalla Logros, modal de celebración.
8. E2E + bundle + commit + `IMP-0008` con SHA + BACKLOG.

## 15. Estimación de complejidad
**Media.** Sin integraciones externas ni IA; el riesgo es de producto (tono/calibración),
mitigado con catálogo curado y criterios explícitos de sobriedad.

## 16. Cumplimiento de decisiones vinculantes (para AUD-0008)

| Mandato | Origen | Cumplimiento |
|---|---|---|
| Gamificación sin perder enfoque profesional | ARQ-0001 (DEC-0001 §4.2) | §4.2/§8/§10.1 (catálogo sobrio, sin leaderboards, sin presión diaria) |
| Presupuesto global de notificaciones | DEC-0007 §10.3 | **§4.5: cero rutas nuevas**; celebración por insights existentes dentro del cupo |
| Anti-fatiga (1 proactivo/día) | DEC-0006 §10.4 | §4.5 (los logros compiten por el mismo cupo, no lo amplían) |
| Lista curada de categorías (no adivinar sobre texto libre) | DEC-0007 §10.1 | §4.4 (reto `bajo_promedio` solo sobre `DISCRETIONARY_GLOBAL_CATEGORIES`) |
| Recomendación genérica / sin marcas | DEC-0005 §14.2 | §7 (textos al test de genericidad) |
| Idempotencia con dedupe documentado | DEC-0006 §10.3 (patrón) | §4.2/§4.4 (índices únicos por código/mes) |
| Sin pgvector/IA; cero infra nueva; TZ Bogotá | DEC-0001/0002/0003 | §6/§9 |
| Vistas minimizadas si el LLM tocara esto | GOBERNANZA | §9 (explícito: fuera de alcance; regla citada para el futuro) |
| Referencia inmutable en IMP | GOBERNANZA | §13/§14.8 |

## 17. Ratificaciones solicitadas al DEC (parámetros, no diseño)
1. **Nivel/XP computados sin tabla** (simplificación vs. `UserLevel` de ARQ-0001) — §4.3.
2. Valores de XP del catálogo, umbrales de nivel (7 niveles), bono de racha (×5, cap 26).
3. Racha **semanal** (no diaria) — §4.1.
4. Retos: 1 por usuario/mes, 3 tipos v1, +30 XP por completado.
5. Celebración exclusivamente in-app + vía insight existente (sin push dedicado) — §4.5.

---
*Documento sujeto a gobernanza — ver [../GOBERNANZA.md](../GOBERNANZA.md). En espera de
AUD-0008 y DEC-0008. **No iniciar implementación de código.***
