# Infraestructura — Millo

- **Estado:** Vigente — Fase 0 (construcción de infraestructura de producción)
- **Última actualización:** 2026-07-13, por instrucción directa del Fundador
- **Naturaleza:** documento operativo del estado real de la infraestructura — se actualiza cuando cambie un componente. No sustituye `docs/PRODUCCION.md` (checklist de gates de salida a producción); lo complementa: aquí vive el "qué hay y dónde", allá el "qué falta para poder lanzar".

---

## 1. Entornos — desarrollo vs. producción

Dos entornos completamente independientes:

- **Desarrollo local:** backend NestJS + Postgres/Redis vía Docker Compose (ver `docs/oficial/PROCEDIMIENTO-ARRANQUE-EN-FRIO.md` y `NOTAS-OPERATIVAS-ARQUITECTO.md` para el detalle de arranque). Sin cambios por esta actualización — sigue siendo el entorno de trabajo diario de Arquitectura.
- **Producción (en construcción, Fase 0):** infraestructura cloud descrita abajo. Ningún dato real de usuario debe tocar este entorno hasta cerrar los gates de `docs/PRODUCCION.md`.

## 2. Infraestructura actual

| Componente | Proveedor | Estado |
|---|---|---|
| Repositorio | GitHub | ✅ Oficial, en uso |
| Backend (hosting) | Render | ✅ **Desplegado y en producción** — servicio `milla-backend`, runtime Node nativo (`render.yaml` actualizado para reflejarlo), disponible en `https://milla-backend.onrender.com` |
| Base de datos | Neon PostgreSQL | ✅ **Conectada** — `DATABASE_URL` (connection string directo, sin `-pooler`) configurado en Render, 17 migraciones Prisma aplicadas |
| DNS / seguridad / CDN | Cloudflare | ✅ Creado — pendiente configuración definitiva |
| Dominio comercial | — | ⏳ No adquirido (decisión consciente, ver §4) |

**Verificación externa (2026-07-13):**
```
curl https://milla-backend.onrender.com/v1/health → 200 OK, {"status":"ok","service":"tocosas-backend",...}
curl https://milla-backend.onrender.com/v1/ready  → {"status":"ready","db":"up"}
```

## 3. Arquitectura objetivo (aprobada)

```
GitHub
  │
  ▼
Render (Backend NestJS)
  │
  ▼
Neon PostgreSQL
  │
  ▼
API Millo
  │
  ├── Android
  └── iPhone
```

**Se incorporarán después, sin modificar esta base:** Cloudflare (activación completa), Telegram, WhatsApp Business, Motor IA (Anthropic — bloqueado por el gate DPA/PIA de `PRODUCCION.md` §1), RevenueCat, Google AdMob, Firebase Analytics, Sentry.

## 4. Decisión arquitectónica oficial

**El proyecto prioriza una infraestructura funcional y escalable antes de adquirir el dominio comercial.** El dominio se compra únicamente cuando backend, base de datos y flujo de despliegue estén completamente operativos — decisión consciente del Fundador (2026-07-13), no un olvido ni una omisión de presupuesto.

## 5. Objetivo inmediato de producción

Backend disponible 24/7 (Render + Neon), dejando la aplicación lista para pruebas con usuarios reales — precondición técnica del Programa Alpha (`docs/producto/alpha/`), que sigue bloqueado por sus propios gates legales (DPA, PIA, consentimiento) independientemente de que la infraestructura esté lista.

## 6. Pendientes técnicos (Fase 0)

- [x] Configurar el servicio Node.js en Render — configurado manualmente en el dashboard (runtime Node nativo, no Docker: `rootDir=backend`, build/start commands propios) y `render.yaml` corregido para reflejar esa configuración real como Infraestructura-as-Code.
- [x] Configurar variables de entorno de producción — cargadas en Render (secretos JWT autogenerados; gates de `PRODUCCION.md` §2 apagados por defecto; integraciones opcionales en blanco).
- [x] **Conectar Render con Neon mediante `DATABASE_URL`** — connection string directo de Neon (sin `-pooler`) pegado en Render. Confirmado funcionando (`/v1/ready` → `db: up`).
- [x] Ejecutar migraciones Prisma — 17 migraciones aplicadas contra Neon en el primer arranque (`npx prisma migrate deploy` en el start command).
- [x] Validar el despliegue del backend (smoke test) — verificado externamente vía `curl`: `/v1/health` 200 OK, `/v1/ready` confirma `db: up`. **Backend en producción, funcionando.**
- [x] Conectar la aplicación móvil (Expo/React Native) con la API pública `https://milla-backend.onrender.com/v1` — `eas.json` perfil `preview` apunta al backend real; APK en validación por el Fundador.
- [x] Habilitar el flujo de actualización OTA del frontend (EAS Update) — `expo-updates` instalado, `app.json`/`eas.json` configurados con `runtimeVersion` y canales `development`/`preview`/`production`; compatibilidad validada (`expo-doctor` 18/18). Procedimiento oficial: `docs/tecnico/EAS-UPDATE.md`. Pendiente: primer build OTA-capaz + prueba OTA controlada sobre él.

**Nota de limpieza (no bloqueante):** `.env.example` declara `REDIS_URL`, pero el backend no usa Redis/BullMQ en ningún módulo (`git grep` sin resultados) — es config muerta de un plan anterior. No se incluyó en `render.yaml`; no hace falta provisionar Redis en Render para esta fase.

## Historial

- 2026-07-13 — Creación del documento. Fase 0 iniciada: GitHub, Render, Neon y Cloudflare creados; ningún componente configurado aún de punta a punta. Instrucción directa del Fundador, ejecutada por el CTO.
- 2026-07-13 — `render.yaml` corregido y completado: ya existía un borrador del 2026-07-04 que asumía la Postgres propia de Render (`databases:` + `fromDatabase`) — corregido para usar Neon (`DATABASE_URL: sync: false`, se pega a mano) y completado con los env vars reales de `.env.example` que faltaban (gates de producción, Telegram, Firebase, RevenueCat). Confirmado que el backend no depende de Redis pese a que `.env.example` lo declara. Verificado `/v1/health` (liveness) y `/v1/ready` (valida conexión a Postgres) ya existen en `src/health/health.controller.ts`.
- 2026-07-13 — **Backend desplegado en producción.** Configuración manual en Render vía dashboard (con el Fundador, en tiempo real): intento 1 falló por rama `chat` (histórico abandonado, sin `backend/`) y Root Directory vacío; corregido a rama `claude/finance-app-design-pr8qd5` + `rootDir=backend`. Intento 2 falló en build (`nest: not found`) porque `NODE_ENV=production` hace que `npm ci` omita devDependencies (donde vive `@nestjs/cli`) — corregido el Build Command a `npm ci --include=dev && npx prisma generate && npm run build`. Intento 3: éxito — 17 migraciones Prisma aplicadas contra Neon, todos los módulos cargados, servidor escuchando. Verificado externamente por el CTO vía `curl`: `/v1/health` → 200 OK, `/v1/ready` → `{"status":"ready","db":"up"}`. `render.yaml` corregido en el mismo acto para reflejar la configuración real (runtime Node, no Docker) — evita que el archivo mienta sobre cómo se desplegó.
