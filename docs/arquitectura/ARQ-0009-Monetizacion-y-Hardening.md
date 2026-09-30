# ARQ-0009 · Monetización Millo+ (Free/Premium) + Hardening de producción

- **Módulo/Feature:** FIN-009 — **último ciclo del roadmap de ARQ-0001**
- **Autor:** Agente de Arquitectura
- **Fecha:** 2026-07-05
- **Estado:** Propuesto — en espera de AUD-0009 y DEC-0009
- **Documentos base:** `ARQ-0001` §9 · `DEC-0002` §4.7 · `DEC-0004` §4.4 · `DEC-0005` (§14 + adenda legal §3) · `IMP-0007` §6 · `IMP-0008` (FIN-008 cerrado contra `c2db461`)
- **Producto:** Millo

> Autorizado por la validación del CTO que cierra FIN-008. Este ciclo tiene dos mitades:
> (A) convertir las **señales de monetización ya sembradas** (plan, gates, límites,
> telemetría de intención) en un sistema de **entitlements coherente y cobrable**, con la
> pasarela como **puerto intercambiable** (la elección tienda-vs-web es decisión de
> negocio del DEC, §17.1); (B) el **checklist de hardening** que consolida todos los
> pendientes de producción acumulados con disciplina en los DEC anteriores. Trazabilidad §16.

---

## 1. Objetivo
(A) **Millo+**: matriz Free/Premium oficial, `EntitlementsService` como autoridad única
de acceso, modelo `Subscription` agnóstico de pasarela, paywall y funnel medible.
(B) **Hardening**: cerrar o decidir formalmente cada pendiente de producción (cifrado,
rate limiting fino, purgas, flags/gates, checklist de despliegue).

## 2. Problema que resuelve
1. Los gates premium existen pero **dispersos** (HealthService consulta `plan` directo;
   CopilotService calcula límites propio): agregar features premium hoy = tocar N sitios.
2. No hay forma de **activar/cobrar** Millo+ (el flag se pone por SQL); no hay modelo de
   suscripción, ni expiración, ni trial, ni webhook para una pasarela.
3. Pendientes de producción regados en 5 DECs (cifrado diferido "hasta producción
   ampliada", purgas de FIN-007 sin programar, flags legales sin checklist único).

## 3. Alcance

**Incluye:**
1. **Matriz oficial Free/Millo+** (§4.1) + **`EntitlementsService`** central (§4.2).
2. **Modelo `Subscription`** + puerto `PaymentProvider` con implementación v1
   `manual/promo` y **webhook listo** para la pasarela que decida el DEC (§4.3).
3. Refactor de los gates existentes (histórico Score, límites IA) hacia entitlements +
   **nuevo límite free de simulaciones** (§4.1, a ratificar).
4. **Paywall** unificado (pantalla Millo+ + CTAs coherentes) + funnel medible (§4.4).
5. **Hardening** (§4.5): decisión formal de cifrado a nivel de campo, throttling fino de
   auth, purgas pendientes de IMP-0007, checklist único de salida a producción,
   guardarraíl Ley 1266.

**No incluye:**
- **Integración concreta de pasarela/tienda** (RevenueCat/IAP vs Wompi/web): se
  implementa el puerto + webhook; el proveedor concreto requiere cuentas/contratos del
  fundador (igual que el DPA) — queda como activación post-DEC sin nuevo ciclo de diseño.
- Precios definitivos (parámetro de negocio, §17.2), facturación electrónica DIAN,
  impuestos (asesoría contable externa).
- Cambios a los gates legales de FIN-005 (DPA/PIA/revisión final siguen siendo
  precondición de producción; este ciclo los INVENTARÍA, no los resuelve).
- **Compartir el Score con terceros**: excluido permanentemente de cualquier plan
  (activaría Ley 1266/registro SIC — adenda legal DEC-0005 §3). Guardarraíl en §4.5.6.

## 4. Arquitectura propuesta

### 4.1 Matriz oficial Free / Millo+ (consolida lo ya aprobado)

| Capacidad | Free | Millo+ |
|---|---|---|
| Registro (app/WhatsApp/Telegram), deudas+amortización, presupuesto, patrimonio | ✅ ilimitado | ✅ |
| Score actual + 3 indicadores + insights + gamificación | ✅ | ✅ |
| Histórico/evolución del Score (gate de FIN-004) | 🔒 | ✅ |
| Copiloto plantillas | ✅ ilimitado | ✅ |
| Mensajes IA/día (límites de FIN-005) | 10 | 100 |
| Simulaciones/mes (**nuevo**, a ratificar §17.3) | 5 | ilimitadas |
| Recomendaciones activas | 3 | 3 (calidad, no cantidad) |
| Trial Millo+ (a ratificar §17.4) | 7 días al registrarse una vez | — |

Principio (ARQ-0001 §9, ratificado en DEC-0004): el free fideliza con valor real; nunca
se gatea el Score actual, los indicadores ni el registro.

### 4.2 `EntitlementsService` — autoridad única
```
EntitlementsService
  ├─ hasPremium(userId) → boolean            (Subscription activa || trial vigente)
  ├─ limit(userId, feature) → number|null    (catálogo tipado de features)
  └─ consume/checkQuota(userId, feature)     (p. ej. simulaciones/mes vía conteo existente)
```
- **Catálogo tipado**: `score_history`, `ai_daily_messages`, `simulations_per_month`.
- Refactor: `HealthService.scoreHistory` y `CopilotService.dailyUsage` delegan aquí
  (mismo comportamiento actual, un solo punto de verdad); `SimulationsService.run`
  adquiere el check de cuota. `UserSettings.plan` pasa a ser **caché derivada** de
  `Subscription` (se mantiene por compatibilidad y para lecturas baratas).

### 4.3 `Subscription` + puerto de pago (agnóstico)
- **Modelo**: `{id, userId, plan (premium), status (trial|active|canceled|expired),
  provider (manual|promo|revenuecat|wompi|stripe), providerRef?, currentPeriodEnd?,
  trialEndsAt?, createdAt, updatedAt}` — índice por `(userId, status)`.
- **Puerto** `PaymentProvider` (mismo patrón de DI de WhatsAppSender/PushSender):
  v1 implementa `ManualPromoProvider` (activación por código promocional firmado +
  activación administrativa auditada) — permite vender Millo+ manualmente desde el día 1
  (early adopters, prensa) sin esperar la pasarela.
- **Webhook** `POST /billing/webhook/:provider` (firma verificada por provider; patrón
  del webhook de Meta/Telegram ya existente): traduce eventos externos →
  `SubscriptionService.sync()` → actualiza `Subscription` + caché `plan`. Cuando el DEC
  elija proveedor, la integración es una implementación más del puerto, no un rediseño.
- **Expiración**: job diario (patrón cron aprobado) marca `expired` al pasar
  `currentPeriodEnd`/`trialEndsAt` y degrada la caché `plan` a `free`.

### 4.4 Paywall y funnel
- Pantalla **Millo+** (beneficios de la matriz con los números del usuario cuando
  existan: "tu histórico tiene N meses esperándote"), precio desde config
  (`MILLOPLUS_PRICE_COP`, placeholder hasta §17.2), botón según provider disponible
  (v1: "Canjear código" + "Avísame cuando esté disponible").
- CTAs unificados (histórico, límite IA, límite simulaciones) → misma pantalla, con
  `source` para el funnel.
- **Funnel medible**: eventos `paywall_view`/`upgrade_intent`/`code_redeemed` como log
  estructurado + conteo en el purpose ya existente (`premium_intent`) — sin tabla nueva
  de analytics en v1 (decisión declarada; una herramienta de producto llegará después).

### 4.5 Hardening — cierre formal de pendientes
1. **Cifrado a nivel de campo** (pendiente DEC-0002 §4.7/DEC-0004 §8): **propuesta =
   aceptar el riesgo formalmente y NO implementarlo**, con este argumento técnico: los
   agregados derivados (`FinancialSnapshot.netWorth`, `MetricReading`, resultados de
   simulación) almacenan los mismos valores en claro por necesidad de cómputo; cifrar
   solo `Account.currentBalance`/`Asset.currentValue` sería teatro de seguridad con
   costo real (complejidad de claves + pérdida de agregación). Controles compensatorios:
   cifrado en reposo del proveedor gestionado (Render PG), TLS, secretos fuera del repo,
   rate limiting, access-control por JWT + ownership en cada query (ya auditado en cada
   ciclo). **Decisión final del CTO en el DEC** (§17.5).
2. **Throttling fino de auth**: `@Throttle` estricto en `/auth/login|register|refresh`
   (p. ej. 5/min por IP) sobre el throttler global existente — anti fuerza bruta.
3. **Purgas pendientes de IMP-0007**: `Simulation` >12m, `NotificationLog` >90d,
   `Recommendation` dismissed >6m — se añaden al `RetentionJob` existente (4 AM).
4. **Checklist único de producción** (`docs/PRODUCCION.md`, generado en este ciclo):
   inventario de flags (`HEALTH_SCORE_PRODUCTION_ENABLED`, `COPILOT_PRODUCTION_ENABLED`,
   `ANTHROPIC_API_KEY`+DPA+PIA), secretos a rotar (JWT), plan de BD con backups,
   `render.yaml` revisado, CORS restrictivo, smoke tests post-deploy.
5. **Helmet** (cabeceras de seguridad HTTP estándar): única dependencia nueva propuesta
   en todo el ciclo (`helmet`, estándar de industria) — a ratificar (§17.6).
6. **Guardarraíl Ley 1266**: constante/documentación que prohíbe cualquier feature de
   "compartir Score con entidades" sin ciclo de gobernanza + registro SIC previo
   (adenda legal DEC-0005 §3). Queda en `docs/PRODUCCION.md` y en comentario en
   `health.service.ts`.

## 5. Componentes involucrados
**Nuevos:** `billing/` (`SubscriptionService`, `EntitlementsService`,
`ManualPromoProvider` + puerto, webhook controller, job de expiración), pantalla Millo+,
`docs/PRODUCCION.md`.
**Modificados:** `HealthService` (gate→entitlements), `CopilotService` (límites→
entitlements), `SimulationsService` (cuota nueva), `RetentionJob` (purgas), `auth`
(throttle fino), `main.ts` (helmet, si se ratifica), CTAs en UI.
**Reutiliza:** patrón de puertos DI, webhooks firmados, cron/TZ, telemetría de intención,
throttler global, `plan` existente.

## 6. Base de datos
- `Subscription` (nueva) + enums (`SubscriptionStatus`, `PaymentProviderKind`).
- `PromoCode` (nueva, v1): `{code (hash), plan, durationDays, maxUses, usedCount,
  expiresAt}` — códigos canjeables auditables.
- Sin cambios en tablas existentes (la caché `plan` ya existe). Cero pgvector, cero IA.

## 7. Backend
NestJS, **una** dependencia nueva propuesta (helmet, §17.6). Tests: entitlements (matriz
free/premium/trial/expirado), cuota de simulaciones (límite mensual, reset por mes),
canje de promo (válido/agotado/expirado/reuso), expiración (job degrada plan), webhook
(firma inválida → 403; evento válido → sync), throttle de auth (config presente),
purgas (cutoffs), y regresión de los gates refactorizados (mismos comportamientos que
FIN-004/005 — sus tests existentes deben seguir en verde sin cambios de semántica).

## 8. Frontend
Pantalla **Millo+** (beneficios + canje de código + "avísame"), CTAs unificados con
`source`, Ajustes muestra plan/estado/vencimiento, badge sutil Millo+ en el perfil.
Sin dark patterns: cancelar/degradar siempre visible.

## 9. IA involucrada
**Ninguna nueva.** Los límites de IA existentes pasan a leerse de entitlements (misma
semántica). Gates DPA/PIA/producción intactos e inventariados en el checklist.

## 10. Riesgos identificados
1. **Refactor de gates rompe comportamiento** → los tests existentes de FIN-004/005
   actúan de regresión obligatoria (criterio §13).
2. **Códigos promo abusables** → hash + maxUses + expiración + log de canje + throttle.
3. **Elección de pasarela se demora** → v1 manual/promo ya monetiza; el puerto evita
   rediseño.
4. **Cifrado diferido malinterpretado** → decisión formal escrita con argumento técnico
   y controles compensatorios (§4.5.1), no silencio.
5. **Store policies** (si el DEC elige tiendas): IAP obligatorio para digital → el
   puerto lo absorbe (RevenueCat), documentado en §17.1.

## 11. Dependencias
Todos los ciclos previos cerrados ✅. Externas (post-DEC, del fundador): cuenta de
pasarela elegida, precio, DPA/PIA (para activar IA real), revisión legal final.

## 12. Impacto esperado
Millo pasa de "producto con señales de pago" a **negocio operable**: puede vender Millo+
desde el día 1 (promo/manual), enchufar la pasarela sin rediseño, y tiene por primera vez
un **checklist único y auditado de salida a producción** — la culminación operativa del
roadmap de ARQ-0001.

## 13. Criterios de aceptación
- Matriz aplicada vía `EntitlementsService`; **tests existentes de FIN-004/FIN-005 en
  verde sin cambios de semántica** (regresión del refactor).
- Free: 6ª simulación del mes → CTA (y log de funnel); premium: ilimitadas.
- Canje de promo activa Millo+ (trial/duración), expira por job y degrada a free.
- Webhook: firma inválida rechazada; evento válido sincroniza `Subscription`.
- Throttle de auth activo (verificable con ráfaga → 429).
- Purgas de IMP-0007 programadas y testeadas.
- `docs/PRODUCCION.md` con el checklist completo (flags, gates legales, secretos, BD,
  guardarraíl 1266).
- Typecheck + suite verde; bundle Android OK; **IMP-0009 con SHA** + estado de cada gate.

## 14. Plan de implementación (tras DEC-0009)
1. Migración: `Subscription`, `PromoCode` (+enums).
2. `billing/`: EntitlementsService + SubscriptionService + ManualPromoProvider + webhook
   + job de expiración + tests.
3. Refactor de gates (Health/Copilot/Simulations) + regresión.
4. Hardening: throttle auth, purgas en RetentionJob, helmet (si se ratifica), CORS.
5. `docs/PRODUCCION.md` (checklist + guardarraíl 1266).
6. Frontend: pantalla Millo+, canje, CTAs con source, Ajustes.
7. E2E (canje → premium → expiración → free; cuota de simulaciones; 429 de auth).
8. Bundle + commit + `IMP-0009` con SHA + BACKLOG.

## 15. Estimación de complejidad
**Media-Alta.** El riesgo está en el refactor de gates (mitigado por regresión) y en la
corrección del ciclo de vida de suscripciones (mitigado por tests de estados).

## 16. Cumplimiento de decisiones vinculantes (para AUD-0009)

| Mandato | Origen | Cumplimiento |
|---|---|---|
| Free con valor real; Premium como inversión evidente | ARQ-0001 §9 (DEC-0001) | §4.1 (matriz; Score/indicadores/registro nunca gateados) |
| Señal de monetización → sistema completo | DEC-0001 §10.8 · DEC-0004 §4.4 | §4.2–§4.4 (entitlements + suscripción + paywall + funnel) |
| Cifrado a nivel de campo: decidir antes de producción ampliada | DEC-0002 §4.7 · DEC-0004 §8 | **§4.5.1 (decisión formal propuesta con argumento técnico)** |
| Purgas pendientes | IMP-0007 §6 | §4.5.3 (RetentionJob) |
| Gates legales DPA/PIA/producción | DEC-0005 §14/§15 | §4.5.4 (inventario en checklist; sin cambios) |
| **No compartir Score con terceros** (Ley 1266/SIC) | Adenda legal DEC-0005 §3 | §3 (exclusión permanente) + §4.5.6 (guardarraíl) |
| Presupuesto de notificaciones | DEC-0007 §10.3 | Sin nuevas notificaciones en este ciclo (paywall es in-app) |
| Genericidad / sin marcas | DEC-0005 §14.2 | §7 (textos del paywall al test existente) |
| Cero infra nueva salvo ratificación | DEC-0002 §4.1 | §7 (solo helmet, §17.6) |
| Referencia inmutable en IMP | GOBERNANZA | §13/§14.8 |

## 17. Decisiones de negocio solicitadas al DEC
1. **Canal de cobro**: tiendas (Play/App Store → IAP/RevenueCat) vs web (Wompi/Stripe)
   vs híbrido — define qué implementación del puerto se activa después.
2. **Precio de Millo+** (`MILLOPLUS_PRICE_COP`, mensual/anual) — placeholder hasta decidir.
3. **Límite free de simulaciones**: propuesto 5/mes (hoy ilimitadas — es una reducción
   para usuarios existentes; alternativa: grandfathering de cuentas previas).
4. **Trial**: 7 días de Millo+ al registrarse (una vez) — ¿sí/no/duración?
5. **Cifrado a nivel de campo**: ratificar la aceptación de riesgo razonada de §4.5.1
   (o rechazarla y ordenar implementación, asumiendo el costo descrito).
6. **Helmet** como dependencia nueva (estándar de cabeceras HTTP).
7. Parámetros de promo codes (duración por defecto, maxUses).

---
*Documento sujeto a gobernanza — ver [../GOBERNANZA.md](../GOBERNANZA.md). En espera de
AUD-0009 y DEC-0009. **No iniciar implementación de código.***
