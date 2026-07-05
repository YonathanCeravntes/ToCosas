# IMP-0009 · Monetización (Millo+) y Hardening de producción

- **Módulo/Feature:** FIN-009
- **Documentos base:** `ARQ-0009-Monetizacion-y-Hardening.md` · `AUD-0009-Monetizacion-y-Hardening.md` · `DEC-0009-Monetizacion-y-Hardening.md`
- **Autor:** Agente Desarrollador
- **Fecha:** 2026-07-05
- **Referencia inmutable (regla GOBERNANZA):** commit **`827c3e9c7aa4f2bdb45c2349ba15abef2e7cab08`** (rama `claude/finance-app-design-pr8qd5`)
  - Código en 2 commits: `8fe8287` (backend) y `827c3e9` (frontend, HEAD de la entrega).
- **Estado:** Entregado — a la espera de validación del CTO contra DEC-0009

---

## 1. Resumen de implementación
Ciclo final del roadmap: **modelo freemium Millo+** (trial 7 días una sola vez al
registro, canje de códigos promo, activación admin, webhook RevenueCat como única
pasarela real) y **hardening** (helmet, throttle de auth, retención auxiliar, guardrail
técnico Ley 1266). La fuente de verdad de entitlements es la tabla `Subscription`
validada por fechas **en código** — la caché `UserSettings.plan` queda como caché de
presentación, nunca se lee para decidir acceso (§10.4). Los **6 cambios obligatorios de
DEC-0009 §10** están aplicados y probados (unitario + E2E contra BD real).

## 2. Archivos modificados/creados

**Backend — nuevos** (`src/modules/billing/`):
- `entitlements.service.ts` — catálogo de features y límites (`score_history` 0/∞,
  `ai_daily_messages` 10/100, `simulations_per_month` 5/∞); `hasPremium` consulta
  `Subscription` directamente (trial→`trialEndsAt>now`, active→`currentPeriodEnd` nulo o
  futuro); `simulationQuota` cuenta simulaciones del mes calendario.
- `subscription.service.ts` — `TRIAL_DAYS=7`, `grantTrialOnce`, `activate`,
  `syncFromRevenueCat` (EXPIRATION→expired, CANCELLATION→canceled, resto→active),
  `statusFor`, `expireDue` + `syncPlanCache` (caché solo display).
- `promo.service.ts` — hash SHA-256 del código normalizado; **canje atómico** con
  `UPDATE promo_codes SET used_count = used_count + 1 WHERE code_hash=? AND
  used_count < max_uses AND (expires_at IS NULL OR expires_at > now()) RETURNING`
  (§10.1); `createCode` exige `maxUses` entero positivo (§10.6); `adminActivate` exige
  `reason` y escribe `AdminActionLog` (§10.2).
- `cost-report.service.ts` — telemetría de costo variable por usuario/mes: llamadas y
  tokens Anthropic (`AiInteractionLog`) + mensajes WhatsApp salientes (§10.5).
- `billing.controller.ts` — `AdminGuard` (isAdmin desde BD, sin auto-escalación);
  endpoints `GET /billing/me`, `POST /billing/redeem`, `POST /billing/funnel`,
  `POST /billing/webhook/revenuecat` (verificación de secreto Bearer),
  `POST /billing/admin/activate`, `POST /billing/admin/promo-codes`,
  `GET /billing/admin/cost-report`.
- `billing.module.ts` — providers + `BillingExpirationJob` (cron 5:30 AM Bogotá).
- `billing.spec.ts` — 16 tests (entitlements/promo/expiración/AdminGuard).

**Backend — modificados:**
- `prisma/schema.prisma` + migración `20260705070000_fin009_monetizacion` —
  `Subscription`, `PromoCode`, `AdminActionLog` (insert-only), `User.isAdmin`.
- `auth/auth.service.ts` — trial al registro (import de constante, sin ciclo de DI);
  `auth.controller.ts` — `@Throttle` 5/min en register/login, 10/min en refresh.
- `health/health.service.ts`, `copilot/copilot.service.ts`,
  `simulations/simulations.service.ts` — gates vía `EntitlementsService`
  (403 `PREMIUM_REQUIRED` + log de funnel `upgrade_intent`).
- `main.ts` — `helmet()`; `financial-engine/jobs/retention.job.ts` — `purgeAux`
  (simulaciones 12 m, `NotificationLog` 90 d, recomendaciones descartadas 6 m).
- `health/no-third-party-sharing.spec.ts` — **guardrail técnico Ley 1266** (§10.3):
  verifica por metadatos de rutas que el Score no se expone a terceros; el encabezado
  declara que modificarlo exige pasar por gobernanza.
- `.env.example` — `MILLOPLUS_PRICE_COP` (placeholder, §10.5) y
  `REVENUECAT_WEBHOOK_SECRET`.

**Frontend:**
- `screens/MilloPlusScreen.tsx` (nuevo) — paywall: beneficios, precio placeholder o
  "próximamente en tiendas", canje de código, badge premium/trial con vencimiento,
  funnel `paywall_view`/`upgrade_intent`.
- `api/types.ts` (`BillingStatus`) y `api/endpoints.ts` (`billingApi` me/redeem/funnel).
- Navegación: ruta `MilloPlus`; CTAs con `source`: `HealthScreen` (histórico bloqueado →
  `score_history`), `SimulatorScreen` (403 → `simulations_limit`), `SettingsScreen`
  (tarjeta de plan/estado → `settings`).
- `docs/PRODUCCION.md` — checklist de despliegue (creado en este ciclo).

## 3. Funcionalidades implementadas
1. **Trial 7 días una sola vez** al registro (`hadTrial` impide repetirlo).
2. **Gates free/premium**: histórico Score (premium), 10/100 mensajes IA/día,
   5 simulaciones/mes free sin grandfathering (§ negocio DEC-0009).
3. **Canje de códigos promo** atómico y a prueba de carreras; default 30 días.
4. **Administración**: activación manual con razón obligatoria y log inmutable;
   creación de códigos; reporte de costos por usuario/mes.
5. **RevenueCat** como única pasarela (webhook firmado); sin Wompi/Stripe.
6. **Job de expiración** diario que degrada suscripciones vencidas y la caché de plan.
7. **Funnel medible por logs**: `paywall_view`, `upgrade_intent` (con `source`),
   `code_redeemed`.
8. **Hardening**: helmet, throttle de auth, retención de datos auxiliares, guardrail
   técnico de no-compartición del Score.

## 4. Cumplimiento de los 6 cambios obligatorios (DEC-0009 §10)

| # | Cambio obligatorio | Cumplimiento | Evidencia |
|---|--------------------|--------------|-----------|
| 1 | Canje atómico + prueba de concurrencia en `used_count = maxUses−1` | `UPDATE` condicional con `RETURNING` (una sola sentencia) | E2E #3: 2 canjes paralelos contra BD real → statuses `201,400`, `used_count=2` (exactamente uno gana) |
| 2 | `isAdmin` sin auto-escalación + AdminGuard + log inmutable + test de rechazo | Flag solo modificable por BD; guard consulta BD en cada request; `AdminActionLog` sin update/delete en la API | E2E #4a (no-admin → 403), #4b (flag por SQL → 201 + fila `activate_premium_30d\|compensacion e2e`); unit tests AdminGuard ×3 |
| 3 | Ley 1266 como test técnico cuyo cambio exige gobernanza | `no-third-party-sharing.spec.ts` con encabezado vinculante | Suite verde; el spec valida metadatos reales del controller |
| 4 | `hasPremium` lee `Subscription`, nunca la caché | `EntitlementsService` sin dependencia de `UserSettings` para decidir | Unit test sin mock de `userSettings` (si tocara la caché, falla); E2E #2a: trial vencido por fecha → `plan=free` al instante |
| 5 | Precio placeholder + telemetría de costo por usuario/mes | `MILLOPLUS_PRICE_COP` en env; `cost-report.service.ts` | E2E #4c: `GET /billing/admin/cost-report` → 200 con `users[]` y `totals` |
| 6 | `maxUses` obligatorio a nivel de servicio | `createCode` rechaza ausente/0/negativo/no-entero | Unit tests (0, −3, 2.5 → `BadRequestException`) |

## 5. Pruebas realizadas
- **Typecheck** backend y frontend: limpios. **Bundle Android** (Metro): 200, 6.5 MB.
- **Suite unitaria completa: 272/272 en 34 suites** (incluye la regresión íntegra de
  FIN-001…FIN-008 exigida por §11: minimización, presupuesto de notificaciones,
  genericidad, PII, score, gamificación).
- **E2E contra backend + Postgres reales (DEC-0009 §11.7): 10/10**
  1. Registro → `/billing/me` = premium (trial), `until` +7 días. ✅
  2. Trial vencido por fecha (SQL) → free inmediato; 5 simulaciones OK y la 6ª →
     `403 PREMIUM_REQUIRED`. ✅
  3. **Concurrencia de canje** (obligatorio #1): código `maxUses=2`, `used_count=1`,
     2 canjes en paralelo → exactamente 1 gana, `used_count=2`. ✅
  4. Admin: 403 sin flag; con flag por SQL → 201 + `AdminActionLog`; cost-report 200. ✅
  5. Webhook RevenueCat: firma inválida → 403; firma válida → suscripción
     `revenuecat/active` y `/billing/me` premium. ✅
  6. Burst de 8 logins → 429 a partir del 6º (throttle 5/min). ✅
- **Funnel verificado en logs**: `code_redeemed` y `upgrade_intent source=simulations_limit`.

## 6. Incidencias
- **Bug cazado por el E2E** (corregido antes del commit de entrega): `AdminGuard` leía
  `req.user.sub`, pero `JwtAuthGuard` adjunta `{ id, email }` → el guard rechazaba
  SIEMPRE, incluso a administradores reales. El rechazo a no-admins "pasaba" por la
  razón equivocada. Corregido a `req.user.id` + 3 tests unitarios de regresión
  (incluido uno que fija la forma real del request). Evidencia del valor de la batería
  E2E contra sistema real exigida por el DEC.

## 7. Limitaciones y gates pendientes (DEC-0009 §11.8)
- **DPA con Anthropic:** ⏳ pendiente — `ANTHROPIC_API_KEY` sigue sin datos reales.
- **PIA (Ley 1581):** ⏳ pendiente — `COPILOT_PRODUCTION_ENABLED=false`.
- **Producción:** 🔒 bloqueada hasta cerrar gates legales
  (`HEALTH_SCORE_PRODUCTION_ENABLED=false`); checklist en `docs/PRODUCCION.md`.
- **Política de tiendas (IAP/RevenueCat):** ⏳ pendiente de cuenta y revisión de
  precios; `MILLOPLUS_PRICE_COP` es placeholder hasta tener telemetría de costo real.
- Cifrado a nivel de campo: riesgo formalmente aceptado por DEC-0009 (sin cambio).
- `REVENUECAT_WEBHOOK_SECRET` local es valor de desarrollo; en producción va en el
  gestor de secretos.

## 8. Resultado
FIN-009 entregado completo conforme a DEC-0009: 6/6 cambios obligatorios aplicados y
probados, backend y frontend verificados, batería E2E 10/10 contra sistema real con la
prueba de concurrencia obligatoria. Con la validación del CTO, el roadmap queda **9/9**.
