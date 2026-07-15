# IMP-0008 · Gamificación (rachas, logros, niveles y retos sobre hitos reales)

- **Módulo/Feature:** FIN-008
- **Documentos base:** `ARQ-0008-Gamificacion.md` · `AUD-0008-Gamificacion.md` · `DEC-0008-Gamificacion.md`
- **Autor:** Agente Desarrollador
- **Fecha:** 2026-07-05
- **Referencia inmutable (regla GOBERNANZA):** commit **`c2db461b2e1fc3ce95ea4940571081d3e09d8bce`** (rama `claude/finance-app-design-pr8qd5`)
- **Estado:** Entregado — a la espera de validación del CTO contra DEC-0008

---

## 1. Resumen de implementación
Gamificación sobria sobre hitos financieros reales: **racha semanal ISO** idempotente,
**catálogo curado de 12 logros**, **XP/nivel computados on-read** (sin tabla de estado),
**retos mensuales** con la **regla del jueves ISO** (§10.1) y la **elegibilidad ordenada
con default universal** (§10.2), y **celebración exclusivamente vía `InsightsService`**
(cero senders en el módulo — el logro compite por el único cupo proactivo diario
existente). Los **2 cambios obligatorios de DEC-0008 §10** están aplicados.

## 2. Archivos modificados/creados
**Backend — nuevos** (`src/modules/gamification/`):
- `gamification.constants.ts` — catálogo de 12 logros (título/cuerpo/condición/XP, tono
  sobrio), 7 niveles, bonos (racha ×5 cap 26; reto +30), textos de retos.
- `week.util.ts` — `isoWeekKey`, `previousIsoWeekKey`, **`isoWeeksOfMonth` (regla del
  jueves, §10.1)**.
- `gamification.service.ts` — racha (no-op misma semana / +1 consecutiva / reset con
  best conservado), `unlock` idempotente (P2002) + celebración por insight `gami_<code>`,
  evaluación nightly de logros, **asignación de retos con elegibilidad documentada en
  código (§10.2)**, evaluación/cierre de retos, perfil con XP/nivel on-read, `markSeen`.
- `gamification.support.ts` — listener (transaction/debt/account/fixed → racha + logros
  inmediatos), job nightly 3:15 AM Bogotá, controller (`GET /gamification/profile`,
  `POST /gamification/achievements/seen`).
- `gamification.spec.ts` — 16 tests.
- Migración `20260705060000_fin008_gamificacion` (`Streak`, `Achievement` con `seenAt`,
  `Challenge` + 2 enums, índices únicos de idempotencia).

**Frontend:** `AchievementsScreen.tsx` (nivel/XP/racha + grid del catálogo con
condiciones visibles), `DashboardScreen.tsx` (bloque de progreso: racha+nivel+barra+reto
del mes; **modal de celebración sobrio** para logros no vistos), navegación y API.

## 3. Cumplimiento de cambios obligatorios (DEC-0008 §10)
1. ✅ **Regla del jueves ISO**: `isoWeeksOfMonth` asigna cada semana al mes de su jueves;
   el reto exige **todas** las semanas del mes (el target guarda la lista real, 4 o 5) y
   el texto visible dice "todas las semanas del mes" (sin prometer 4). Tests: julio
   2026 → 5 semanas; febrero 2026 → 4; partición sin solapamiento junio/julio; bordes de
   año (1-ene-2026 → W01; 1-ene-2027 → 2026-W53).
2. ✅ **Elegibilidad ordenada**: comentario en código junto a `assignChallenge` +
   **tests de los 3 escenarios del DEC** (con discrecional → `bajo_promedio`; sin
   discrecional y flujo sano → `flujo_positivo`; flujo estructuralmente negativo
   (peor que −20% ref) → `registro_constante` como default universal).

## 4. Pruebas realizadas
- **Unitarias: 256/256 verdes** (32 suites; 16 nuevas): semanas ISO (bordes de año, 4 vs
  5, partición), racha (4 transiciones), elegibilidad (3 escenarios §10.2), umbrales de
  nivel crecientes, catálogo (12 códigos únicos, XP>0), **genericidad** (0 marcas en
  todos los textos), celebración **solo** vía `InsightsService` (el constructor no
  recibe ningún sender — garantía por ausencia de dependencia) e idempotencia de
  `unlock` (P2002 → sin insight duplicado).
- **Typecheck:** backend y frontend exit 0. **Bundle Android:** sin errores (6.54 MB).
- **End-to-end real:** usuario nuevo → 1 transacción + 1 deuda → listener desbloqueó
  `primer_movimiento` + `primera_deuda` y racha=1 (XP 30 = 10+15+5 de bono, verificado a
  mano); job nightly (script efímero, eliminado) asignó reto **`flujo_positivo`** por la
  cadena de elegibilidad correcta y desbloqueó 32 logros retroactivos en 15 usuarios;
  celebraciones `gami_*` presentes como Insights en BD (cero senders nuevos).

**Cómo reproducir la validación:**
```bash
git checkout c2db461b2e1fc3ce95ea4940571081d3e09d8bce
cd backend && npx tsc --noEmit && npx jest   # exit 0 · 256/256
cd ../frontend && npx tsc --noEmit           # exit 0
```

## 5. Incidencias encontradas
- Ninguna significativa (un cast de test ajustado por TS2352).

## 6. Limitaciones
- `primera_simulacion` solo se desbloquea en el ciclo nightly (las simulaciones no
  emiten evento de dominio; añadirlo estaba fuera del plan autorizado).
- La racha se computa con semana ISO en UTC (consistente con todo el Motor); usuarios
  que registren en la ventana nocturna del domingo podrían caer en la semana siguiente
  UTC — impacto marginal, documentado.
- La revisión de tono de los 12 textos fue del propio desarrollador + test automatizado;
  el DEC §8 ya anticipa recalibración editorial post-lanzamiento como riesgo aceptado.
- Gates heredados sin cambios y **no aplican** a este módulo (cero IA, cero datos al
  LLM): DPA ⏳ · PIA ⏳ · producción 🔒.

## 7. Resultado final
**FIN-008 entregado y verificado** contra `c2db461b2e1fc3ce95ea4940571081d3e09d8bce`,
cumpliendo el plan de DEC-0008 §11 y los 2 cambios obligatorios §10. El bucle de
retención está cerrado: registrar alimenta la racha, los hitos reales celebran, y todo
viaja por los canales ya presupuestados. Pendiente de validación del CTO.

---
*Informe de implementación — proceso de gobernanza `docs/GOBERNANZA.md`.*
