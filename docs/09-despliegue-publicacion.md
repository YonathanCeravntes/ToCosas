# 09 · Guía de despliegue y publicación

Cubre: infraestructura backend, CI/CD, y publicación en **Google Play** y **App Store**.

---

## 1. Entornos

| Entorno | Uso | Datos |
|---------|-----|-------|
| **dev** | Desarrollo local + PRs | Sintéticos |
| **staging** | QA, pruebas de integración, aprobación de plantillas WhatsApp | Sintéticos |
| **production** | Usuarios reales | Reales (cifrados, backups) |

Cada entorno: su propia app de Meta/WABA (o número de prueba), su Postgres/Redis, sus claves.

---

## 2. Infraestructura backend

### MVP (bajo costo)
- **Render / Railway / Fly.io:**
  - Servicio web (API NestJS) — contenedor Docker.
  - Worker (proceso separado consumidor de la cola).
  - Cron (scheduler de recordatorios).
  - **Postgres gestionado** (plan free/starter) con backups automáticos.
  - **Redis gestionado** (Upstash / plan del proveedor).
- **Object Storage:** Cloudflare R2 / GCS / S3 (adjuntos).
- **Secretos:** variables de entorno del proveedor + Doppler/Secret Manager.
- **CDN/WAF:** Cloudflare delante del dominio (TLS, rate-limit, protección DDoS básica).

### Escala
- Migrar a **Kubernetes (GKE/EKS)** o Cloud Run/ECS:
  - API con **HPA** (autoescalado por CPU/latencia).
  - Worker escalable por profundidad de la cola.
  - **Cloud SQL / RDS** con réplica de lectura y PITR.
  - Redis gestionado (Memorystore/ElastiCode) con réplica.

### Dockerización (ejemplo de servicios)
```
docker-compose (dev):
  api        → NestJS (:3000)
  worker     → NestJS worker (misma imagen, comando distinto)
  scheduler  → NestJS cron (misma imagen)
  postgres   → 15
  redis      → 7
```

---

## 3. CI/CD

### Backend — GitHub Actions
```
on: [pull_request, push a main]
jobs:
  test:    lint + type-check + unit + integración (Testcontainers)
  build:   docker build + push a registry (GHCR/GCR)
  deploy:  staging (auto en main) → production (manual/aprobación)
  migrate: prisma migrate deploy antes de arrancar la nueva versión
```
- **Migraciones** versionadas (Prisma/TypeORM), aplicadas en deploy con rollback plan.
- **Blue-green / rolling** para cero downtime.
- **Health checks** (`/health`, `/ready`) para el orquestador.
- **Observabilidad:** Sentry (releases), logs, métricas de cola y latencia.

### App móvil — EAS (Expo Application Services)
```
- eas build --platform android --profile production  → .aab
- eas build --platform ios --profile production      → .ipa
- eas submit                                         → sube a las tiendas
- Canales OTA (expo-updates) para hotfixes de JS sin pasar por revisión
  (solo cambios permitidos por las políticas de las tiendas)
```
- Perfiles `development` / `preview` / `production` en `eas.json`.
- Versionado semántico + `buildNumber`/`versionCode` autoincremental.

---

## 4. Configuración de WhatsApp para producción

1. **Meta Business Manager:** verificar el negocio (documentos legales) — iniciar temprano, tarda días.
2. **WhatsApp Business Account (WABA):** crear y asociar número de producción (no reutilizable si ya está en WhatsApp normal).
3. **Número de teléfono** dedicado (comprar/portar). Display name y perfil aprobados.
4. **Webhook de producción** configurado (URL HTTPS pública + verify token).
5. **Plantillas** (`otp_vinculacion`, `recordatorio_pago`, `resumen_semanal`, `alerta_liquidez`) enviadas a aprobación de Meta.
6. **Tokens de acceso** permanentes (System User token) guardados en el gestor de secretos.
7. **Escalado de mensajería:** empezar en tier gratuito (1.000 conversaciones de servicio/mes) y solicitar incremento de límites según crecimiento.

---

## 5. Publicación en Google Play Store

- Cuenta de **Google Play Console** (pago único ~$25 USD).
- **Ficha de la tienda:** nombre, descripción (ES), capturas, ícono, gráfico destacado.
- **Data Safety form:** declarar datos recogidos (finanzas, contacto) y su uso.
- **Política de Privacidad** enlazada (URL pública).
- **Content rating** (cuestionario IARC).
- **App Bundle (.aab)** firmado (Play App Signing).
- **Testing tracks:** Internal → Closed (beta) → Production (rollout escalonado %).
- Cumplir política de **apps financieras** (declarar que no se conecta a bancos ni ejecuta pagos, si aplica).

---

## 6. Publicación en Apple App Store

- **Apple Developer Program** (~$99 USD/año).
- **App Store Connect:** crear la app, bundle ID, capturas por tamaño de dispositivo.
- **Privacy Nutrition Labels:** declarar datos recogidos (veraz y completo).
- **Sign in / cuenta:** si hay login social, puede exigirse **"Sign in with Apple"**.
- **Eliminación de cuenta in-app OBLIGATORIA** (`DELETE /me` accesible desde la app) — Apple rechaza si falta.
- **Revisión:** TestFlight (beta) → App Review (más estricta que Google; preparar cuenta demo para el revisor, incluida vinculación de WhatsApp con instrucciones).
- **Justificar permisos** (notificaciones, cámara para OCR) en `Info.plist` con textos claros de uso.
- **Guideline 4.2 (mínima funcionalidad):** asegurar que la app aporta valor nativo, no solo un "wrapper" del bot.

---

## 7. Notas de revisión (evitar rechazos)

| Riesgo de rechazo | Prevención |
|-------------------|-----------|
| Falta eliminación de cuenta (Apple) | `DELETE /me` visible en Ajustes |
| Privacy labels incompletas | Declarar todo lo recogido, incluido WhatsApp |
| App "incompleta" para el revisor | Cuenta demo + datos sembrados + guía de cómo probar WhatsApp |
| Permisos sin justificación | Textos claros en `Info.plist`/manifest |
| Categorización errónea de mensajes WhatsApp | Usar categorías utility/authentication correctas |

---

## 8. Post-lanzamiento (operación)

- **Monitoreo:** Sentry (errores), dashboards de métricas (latencia API, profundidad de cola, tasa de parseo exitoso, entregas de WhatsApp/FCM).
- **Alertas:** DLQ creciendo, errores 5xx, fallos de webhook, caída de DB.
- **Backups:** verificados con restore periódico.
- **Runbook** de incidentes y rotación de secretos.
- **Release cadence:** hotfix JS vía OTA; cambios nativos por ciclo de tienda.
- **Feature flags** para activar WhatsApp/sugerencias por cohortes.
