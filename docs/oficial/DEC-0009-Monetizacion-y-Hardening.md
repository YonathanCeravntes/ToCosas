# DEC-0009 · Monetización Millo+ (Free/Premium) + Hardening de producción

- **Documentos base:** `docs/arquitectura/ARQ-0009-Monetizacion-y-Hardening.md` · `docs/auditoria/AUD-0009-Monetizacion-y-Hardening.md`
- **Módulo/Feature:** FIN-009 — último ciclo del roadmap original de ARQ-0001
- **Decide:** CTO/CPO/Principal Architect de Millo
- **Fecha:** 2026-07-05

---

## 1. Resumen ejecutivo

ARQ-0009 consolida con disciplina genuina las señales de monetización ya sembradas (`EntitlementsService` como autoridad única, `Subscription` agnóstica de pasarela, puerto de pago intercambiable) y aborda de frente el hardening disperso en cinco DEC anteriores. Verifiqué de forma independiente, contra el código real, los dos hallazgos que el auditor eleva a crítica: confirmé que **no existe ningún rol de administrador** en `backend/src/modules/auth/` ni en `schema.prisma` (solo `MessageRole`, sin relación con autorización), y confirmé que el patrón de actualización atómica (`FOR UPDATE SKIP LOCKED ... RETURNING`) ya existe y está probado en `outbox.dispatcher.ts` — el ARQ tenía el patrón correcto disponible en el propio código y no lo reutilizó para el canje de `PromoCode`.

AUD-0009: **APROBADO CON OBSERVACIONES**, con 2 observaciones críticas (atomicidad del canje de códigos promocionales; ausencia de mecanismo de autorización administrativa) y 2 menores (guardarraíl de Ley 1266 solo documental; ambigüedad de fuente de verdad de `hasPremium`). Es el primer ciclo que maneja dinero real y el último del roadmap original — aplico aquí el mismo estándar de escrutinio que en FIN-005, no el reducido de FIN-008. Las 2 observaciones críticas se resuelven en este DEC como **condición de entrada obligatoria** para `IMP-0009` (no basta con documentarlas como pendientes menores, tal como recomienda el auditor): no se autoriza cerrar el módulo sin que ambas estén implementadas y testeadas.

Las decisiones de negocio solicitadas en el ARQ §17 fueron trasladadas al fundador (no son decisiones técnicas que me correspondan). Sus respuestas quedan incorporadas en la sección 4.

## 2. Arquitecturas revisadas

- `docs/arquitectura/ARQ-0009-Monetizacion-y-Hardening.md` — v. 2026-07-05.

## 3. Auditorías revisadas

- `docs/auditoria/AUD-0009-Monetizacion-y-Hardening.md` — veredicto: **APROBADO CON OBSERVACIONES** (2 críticas, 2 menores).

## 4. Decisiones aprobadas

1. **`EntitlementsService` como autoridad única** con catálogo tipado (`score_history`, `ai_daily_messages`, `simulations_per_month`): aprobado. Resuelve el problema real diagnosticado (gates dispersos en `HealthService`/`CopilotService`).
2. **Modelo `Subscription` + puerto `PaymentProvider` agnóstico** con `ManualPromoProvider` v1: aprobado, con el canal de cobro decidido por el fundador (punto 6).
3. **Paywall unificado + funnel medible** (eventos `paywall_view`/`upgrade_intent`/`code_redeemed` como log estructurado, sin tabla nueva de analytics en v1): aprobado.
4. **Regresión obligatoria sobre los gates existentes de FIN-004/FIN-005** como criterio de aceptación: ratificado — es la protección correcta contra el riesgo más probable de este refactor.
5. **Decisión de negocio — Canal de cobro**: el fundador elige **solo tiendas (IAP vía RevenueCat)**. Se retira de este ciclo la implementación de `Wompi`/`Stripe` (queda fuera de alcance, no solo diferida); el puerto `PaymentProvider` se mantiene agnóstico en el código para no cerrar la puerta a un canal web futuro, pero **no se implementa ninguna integración además de RevenueCat y `ManualPromoProvider`** en FIN-009. Nota de riesgo heredada del propio ARQ (§10.5): la integración con tiendas está sujeta a revisión de políticas de Apple/Google para apps financieras — el desarrollador debe validar esto explícitamente antes de someter la app a review de las tiendas.
6. **Decisión de negocio — Precio de Millo+**: **no se fija un precio de producción en este ciclo.** El fundador señaló correctamente que el precio no puede fijarse sin considerar los **costos variables por usuario activo** (WhatsApp Business API, consumo de Anthropic Haiku, y cualquier otro servicio de terceros contratado) — es una observación de unit economics válida que este documento no había considerado. Se resuelve como cambio obligatorio de bajo costo (sección 10, punto 5): el `IMP-0009` debe entregar `MILLOPLUS_PRICE_COP` como placeholder de configuración (sin activar cobros reales de producción) y, además, telemetría mínima de costo variable por usuario activo (conteo de llamadas a Anthropic + mensajes WhatsApp salientes por usuario/mes) para que el precio se decida con datos reales antes de activar cobros en producción.
7. **Decisión de negocio — Límite free de simulaciones**: el fundador elige **5/mes para todos los usuarios, sin grandfathering** (recomendación del propio ARQ). Se acepta la regresión para usuarios existentes tal como está declarada.
8. **Decisión de negocio — Trial**: el fundador confirma **7 días de Millo+ al registrarse, una única vez por usuario**, como propone el ARQ.
9. **Decisión técnica — Cifrado a nivel de campo**: **se ratifica la aceptación de riesgo** propuesta en ARQ-0009 §4.5.1 (no implementar cifrado de `Account.currentBalance`/`Asset.currentValue`). El argumento técnico es sólido: los agregados derivados (`FinancialSnapshot`, `MetricReading`, resultados de simulación) ya almacenan los mismos valores en claro por necesidad de cómputo, así que cifrar solo esos dos campos sería, como bien dice el ARQ, teatro de seguridad con costo real. Los controles compensatorios (cifrado en reposo del proveedor gestionado, TLS, secretos fuera del repo, rate limiting, ownership por JWT en cada query) ya están auditados en ciclos anteriores. Esta es una decisión técnica de mi competencia como CTO, no de negocio.
10. **Helmet como dependencia nueva**: ratificado — es estándar de industria, bajo riesgo, sin alternativa razonable de "no hacerlo".
11. **Parámetros de `PromoCode`**: duración por defecto 30 días desde el canje (salvo que el código especifique otra), `maxUses` **obligatorio por código** (nunca ilimitado — un código sin tope es una vía de fraude sin límite), activación registrada en log auditable con `codeHash`, `userId`, `timestamp`.

## 5. Decisiones rechazadas

- **Integración de Wompi/Stripe (canal web)**: no aprobada para este ciclo — el fundador eligió solo tiendas. Si en el futuro se requiere, es un ciclo de gobernanza nuevo (activación de una implementación adicional del puerto, no un rediseño).
- **Fijar un precio de producción para `MILLOPLUS_PRICE_COP`**: no aprobado en este ciclo — condicionado a la telemetría de costo variable del cambio obligatorio #5.

## 6. Observaciones aceptadas

- Hallazgo 1 (canje de `PromoCode` sin atomicidad) — aceptado, **crítico**, se resuelve como condición de entrada obligatoria (sección 10).
- Hallazgo 2 (activación administrativa sin mecanismo de autorización) — aceptado, **crítico**, se resuelve como condición de entrada obligatoria (sección 10).
- Hallazgo 3 (guardarraíl Ley 1266 solo documental) — aceptado, se resuelve en este DEC.
- Hallazgo 4 (ambigüedad de fuente de verdad de `hasPremium`) — aceptado, se resuelve en este DEC.

## 7. Observaciones descartadas

- Ninguna.

## 8. Riesgos aceptados

- **Cifrado a nivel de campo diferido** (decisión aprobada en §4.9): riesgo aceptado formalmente con controles compensatorios, no silencio.
- **Solo IAP como canal de cobro**: sujeta el negocio a la comisión de plataforma (~30%) y a las políticas de revisión de Apple/Google para apps financieras — riesgo de negocio aceptado explícitamente por el fundador, con el entendimiento de que el puerto agnóstico permite añadir un canal web más adelante sin rediseño si la economía de la comisión lo justifica.
- **Grandfathering no aplicado al límite de simulaciones**: usuarios existentes verán una regresión real de "ilimitadas" a "5/mes" — riesgo de producto aceptado explícitamente por el fundador.

## 9. Riesgos pendientes

- Precio de producción de Millo+ sigue sin definir — condicionado a la telemetría de costo variable (cambio obligatorio #5). No se activan cobros reales de producción hasta que el fundador fije el precio con esos datos.
- Gates legales heredados de FIN-005 (DPA/PIA/revisión legal final) siguen sin cambios y siguen bloqueando producción con datos reales del Copiloto.
- Revisión de políticas de Apple/Google para apps financieras (RevenueCat/IAP): pendiente de validación explícita antes de someter la app a review de tienda — no es un pendiente técnico de este ciclo, pero debe quedar registrado en `docs/PRODUCCION.md`.

## 10. Cambios obligatorios

1. **Atomicidad obligatoria en el canje de `PromoCode`** (condición de entrada — Hallazgo 1 crítico): el canje debe usar una actualización atómica equivalente al patrón ya validado del outbox (`UPDATE promo_codes SET used_count = used_count + 1 WHERE code_hash = $1 AND used_count < max_uses AND (expires_at IS NULL OR expires_at > now()) RETURNING *`, o transacción con `SELECT ... FOR UPDATE`). Debe existir un test que sembre dos canjes concurrentes cerca del límite (`usedCount = maxUses - 1`) y verifique que **exactamente uno** tenga éxito.
2. **Mecanismo mínimo de autorización administrativa** (condición de entrada — Hallazgo 2 crítico), antes de implementar cualquier ruta de "activación administrativa" de `ManualPromoProvider`: campo `User.isAdmin` (boolean, default `false`, sin ruta de auto-escalación — solo modificable por acceso directo a BD/operación manual del fundador, nunca por un endpoint de la API) + guard dedicado sobre cualquier endpoint administrativo + **log auditable obligatorio** de cada activación administrativa (`adminUserId`, `targetUserId`, `reason`, `timestamp`), inmutable (solo inserción, sin update/delete desde la API). Test que verifique que el endpoint administrativo rechaza a cualquier usuario sin `isAdmin=true`.
3. **Guardarraíl de Ley 1266 como control técnico, no solo documentación** (Hallazgo 3, mismo estándar ya exigido en DEC-0004 §10.3 para HEALTH_SCORE_PRODUCTION_ENABLED): agregar un test de regresión dedicado (p. ej. `health/no-third-party-sharing.spec.ts`) que enumere las rutas de `HealthController` y falle si aparece cualquier endpoint que permita consultar el Score de un `userId` distinto del usuario autenticado, o cualquier endpoint de "compartir"/"exportar a tercero". Este test actúa como control técnico verificable; su modificación requiere pasar de nuevo por gobernanza (ARQ/AUD/DEC), documentado como comentario en el propio archivo del test.
4. **`EntitlementsService.hasPremium()` (y toda verificación de acceso premium) debe leer `Subscription` directamente, nunca la caché `UserSettings.plan`** (Hallazgo 4): la caché `plan` es solo para lecturas baratas de visualización (mostrar el plan en Ajustes, por ejemplo), nunca para decisiones de autorización. Debe existir un test que verifique explícitamente que una `Subscription` expirada (con `plan` cacheado desactualizado a `premium`) resulta en `hasPremium() === false`.
5. **Telemetría de costo variable por usuario + precio como placeholder no productivo** (decisión de negocio §4.6): `MILLOPLUS_PRICE_COP` se entrega como configuración placeholder (sin activar cobros reales); se añade conteo mensual por usuario de (a) llamadas reales a Anthropic Haiku y (b) mensajes salientes de WhatsApp Business API, expuesto en un reporte simple (tabla o log agregado) que el fundador pueda revisar para fijar el precio con datos reales antes de activar cobros de producción.
6. **`maxUses` obligatorio (no nulo) en todo `PromoCode`** creado — un código sin tope de usos es una vía de fraude sin límite; validación a nivel de servicio (rechazar creación de código sin `maxUses`), no solo de tipo de dato.

## 11. Plan técnico oficial

Se autoriza al agente Desarrollador a iniciar la implementación de FIN-009 siguiendo el plan de la sección 14 de `ARQ-0009`, con estos ajustes de alcance y los 6 cambios obligatorios de la sección 10 de este DEC:

1. Migración: `Subscription`, `PromoCode` (+enums), **más el campo `User.isAdmin`** (cambio obligatorio #2).
2. `billing/`: `EntitlementsService` (leyendo `Subscription` directamente, cambio obligatorio #4) + `SubscriptionService` + `ManualPromoProvider` (con canje atómico, cambio obligatorio #1, y mecanismo de autorización administrativa, cambio obligatorio #2) + **implementación RevenueCat/IAP** (única pasarela real de este ciclo, decisión de negocio §4.5) + webhook + job de expiración + tests.
3. Refactor de gates (`HealthService`, `CopilotService`, `SimulationsService`) hacia entitlements + **regresión obligatoria**: los tests existentes de FIN-004/FIN-005 deben seguir en verde sin cambios de semántica.
4. Hardening: throttle fino de auth, purgas pendientes de IMP-0007 en `RetentionJob`, helmet, **guardarraíl técnico de Ley 1266** (cambio obligatorio #3), **telemetría de costo variable** (cambio obligatorio #5).
5. `docs/PRODUCCION.md` (checklist completo: flags, gates legales, secretos, BD, guardarraíl 1266, nota de revisión de políticas de tienda pendiente).
6. Frontend: pantalla Millo+ (con precio como placeholder, sin cobro real activo hasta que el fundador lo decida), canje de código, CTAs con `source`, Ajustes muestra plan/estado/vencimiento.
7. E2E: canje concurrente de promo (verificar tope respetado) → premium → expiración → free; cuota de simulaciones (5/mes, sin grandfathering); 429 de auth; endpoint administrativo rechazado sin `isAdmin`; test de guardarraíl 1266.
8. Bundle + commit + `IMP-0009` con SHA + BACKLOG, declarando explícitamente el estado de cada gate heredado (DPA/PIA/producción/revisión de políticas de tienda).

No se autoriza ninguna funcionalidad fuera de este plan (integración Wompi/Stripe, precio de producción activo, cualquier vía de compartir el Score con terceros) dentro del ciclo de FIN-009.

## 12. Prioridad

**Alta.** Es el último ciclo del roadmap original de ARQ-0001 y el primero que maneja dinero real — cierra la conversión de Millo de "producto con señales de pago" a negocio operable, con el mismo nivel de escrutinio que se aplicó a la primera integración de riesgo equivalente (FIN-005).

## 13. Estado final

**APROBADO CON AJUSTES.** Se autoriza iniciar la implementación de FIN-009 bajo el plan de la sección 11, los 6 cambios obligatorios de la sección 10, y las decisiones de negocio del fundador incorporadas en la sección 4 (solo IAP, precio no productivo pendiente de telemetría, 5 simulaciones/mes sin grandfathering, trial de 7 días). Los cambios obligatorios #1 y #2 (atomicidad del canje, autorización administrativa) son **condición de entrada**: no se autoriza el cierre de **FIN-009** sin que ambos estén implementados y testeados con evidencia reproducible, dado que son la superficie de fraude más directa del primer ciclo que maneja dinero real. Los gates heredados de FIN-005 (DPA, PIA, producción bloqueada) siguen vigentes sin cambios. El cierre de FIN-009 requiere `IMP-0009` con SHA de commit verificable, que validaré en checkout aislado antes de autorizar el cierre.

---
*Documento oficial — no modificar. Corresponde al ciclo de gobernanza de `docs/GOBERNANZA.md`.*
