# Checklist de salida a producción — Millo

> Generado en FIN-009 (DEC-0009 §11.5). **Ningún despliegue a producción con usuarios
> reales debe ocurrir sin repasar cada sección.** Los gates marcados 🔒 son bloqueantes.

## 1. Gates legales (bloqueantes)

| Gate | Estado | Quién lo resuelve |
|---|---|---|
| 🔒 **DPA con Anthropic** (DEC-0005 §14.3) — precondición para `ANTHROPIC_API_KEY` con datos reales EN CUALQUIER AMBIENTE | ⏳ Pendiente | Fundador (contractual) |
| 🔒 **PIA** (evaluación de impacto en privacidad, DEC-0005 §14.4) | ⏳ Pendiente | CTO |
| 🔒 **Revisión legal final** de la documentación completa (consentimiento, términos, DPA) | ⏳ Pendiente | Fundador + abogado |
| 🔒 **Políticas de tienda** (Apple/Google) para apps financieras con IAP (DEC-0009 §9) | ⏳ Pendiente de validación antes del review de tienda | Fundador/CTO |
| 🔒 **Validación legal formal del Score Millo** (DEC-0004 §10.3 / DEC-0001 §10.7) — el Score está activado en Beta cerrada por decisión ejecutiva (BT-006), pero esta validación es **obligatoria antes del lanzamiento PÚBLICO** | ⏳ Pendiente | Fundador + abogado |

## 2. Flags técnicos de producción (default: apagados)

| Variable | Default | Se enciende cuando |
|---|---|---|
| `HEALTH_SCORE_PRODUCTION_ENABLED` | ~~`false`~~ → **`true` en Beta Técnica cerrada** (decisión ejecutiva del Fundador, 2026-07-14, BT-006) | **Encendido para la Beta cerrada** porque el Score es 100% determinista (cero IA) y ya trae disclaimers ("no es puntaje crediticio", encuadre educativo) + guardarraíl Ley 1266. **⚠️ La revisión legal formal del Score (DEC-0004 §10.3 / DEC-0001 §10.7) SIGUE siendo OBLIGATORIA y bloqueante antes del lanzamiento PÚBLICO.** |
| `COPILOT_PRODUCTION_ENABLED` | `false` | Revisión legal final aprobada (DEC-0005 §15) |
| `ANTHROPIC_API_KEY` | vacía | DPA + PIA resueltos (DEC-0005 §14.3/§14.4) |
| `MILLOPLUS_PRICE_COP` | `0` (placeholder) | El fundador fija precio con la telemetría de costo (`GET /billing/admin/cost-report`, DEC-0009 §10.5) |
| `REVENUECAT_WEBHOOK_SECRET` | vacía | Cuenta RevenueCat creada y webhook configurado |

## 3. Secretos y configuración
- [ ] Rotar `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` (los de dev NUNCA a producción).
- [ ] `WHATSAPP_APP_SECRET`/`VERIFY_TOKEN`/`ACCESS_TOKEN` reales (Meta).
- [ ] `TELEGRAM_BOT_TOKEN` + `TELEGRAM_WEBHOOK_SECRET` + `setWebhook` al dominio real.
- [ ] `enableCors()` → restringir a los orígenes reales (hoy abierto para dev).
- [ ] Ningún secreto en el repo (verificar `.env` fuera de git — ya en `.gitignore`).

## 4. Base de datos e infraestructura
Estado real de la infraestructura (proveedores, arquitectura objetivo, pendientes de
Fase 0): ver `docs/INFRAESTRUCTURA.md` — este checklist no duplica esa fuente, solo
exige sobre ella:
- [ ] PostgreSQL gestionado con **cifrado en reposo** y **backups automáticos** (plan pago
  de Render/Neon — el free tier no da backups).
- [ ] `prisma migrate deploy` en el pipeline (nunca `migrate dev` en producción).
- [ ] Particiones de `metric_readings`: `RetentionJob` crea la del mes siguiente; la
  DEFAULT absorbe huecos (verificar tras el primer despliegue).
- [ ] **Cifrado a nivel de campo: NO implementado por decisión formal** (DEC-0009 §4.9,
  aceptación de riesgo razonada — los derivados almacenan los mismos valores por
  necesidad de cómputo). Controles compensatorios: cifrado de volumen, TLS, ownership
  por JWT en cada query, rate limiting, helmet.

## 5. Seguridad de aplicación (implementado en FIN-009)
- ✅ `helmet` (cabeceras estándar) en `main.ts`.
- ✅ Throttling: global 120 req/min + **auth 5/min** (login/register) y 10/min (refresh).
- ✅ `User.isAdmin` sin ruta de auto-escalación (solo operación manual en BD) +
  `AdminGuard` + `AdminActionLog` inmutable (solo inserción).
- ✅ Canje de promos **atómico** (`UPDATE … RETURNING` condicionado).
- ✅ Webhooks firmados (Meta HMAC, Telegram secret, RevenueCat Bearer).

## 6. ⚖️ Guardarraíl Ley 1266 (permanente)
**El Score Millo NUNCA se comparte con terceros** (bancos, fintechs, burós) — hacerlo
activaría la Ley 1266 (Habeas Data Financiero) y el registro ante la SIC (adenda legal
DEC-0005 §3). Control técnico: `src/modules/health/no-third-party-sharing.spec.ts`
(falla ante cualquier ruta que consulte el Score de otro usuario o lo exporte).
**Modificar ese test requiere ciclo de gobernanza completo (ARQ→AUD→DEC).**

## 7. Post-deploy (smoke)
- [ ] `GET /v1/health` → 200.
- [ ] Registro + login + registro de movimiento end-to-end.
- [ ] `GET /v1/health/score` → 503 si el flag sigue apagado (comportamiento esperado).
- [ ] Webhooks de WhatsApp/Telegram reciben y responden.
- [ ] Jobs nocturnos corren (revisar logs 1:00–5:30 AM Bogotá).

## 8. Monetización — antes de activar cobros reales
1. Revisar `GET /billing/admin/cost-report` con ≥1 mes de datos reales.
2. Fijar `MILLOPLUS_PRICE_COP` (fundador) considerando comisión de tienda (~30%).
3. Configurar productos IAP + RevenueCat y `REVENUECAT_WEBHOOK_SECRET`.
4. Validar políticas de tienda para apps financieras (gate §1).

---
*Documento operativo de FIN-009. Actualizarlo cuando un gate cambie de estado.*
