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
| Backend (hosting) | Render | ✅ Creado · `render.yaml` (raíz del repo) listo como Blueprint — pendiente que el Fundador lo despliegue desde el dashboard |
| Base de datos | Neon PostgreSQL | ✅ Creado — pendiente que el Fundador pegue el connection string (**directo, no el `-pooler`** — ver §6) en Render |
| DNS / seguridad / CDN | Cloudflare | ✅ Creado — pendiente configuración definitiva |
| Dominio comercial | — | ⏳ No adquirido (decisión consciente, ver §4) |

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

- [x] Configurar el servicio Node.js en Render — resuelto como código: `render.yaml` (raíz del repo, `runtime: docker`, usa el `backend/Dockerfile` ya existente y probado, healthcheck en `/v1/health`).
- [x] Configurar variables de entorno de producción — declaradas en `render.yaml` (secretos JWT autogenerados por Render; gates de `PRODUCCION.md` §2 apagados por defecto; integraciones opcionales en blanco).
- [ ] **Conectar Render con Neon mediante `DATABASE_URL`** — acción manual del Fundador: copiar el connection string **directo** de Neon (el que NO dice `-pooler` en el host) y pegarlo cuando Render lo pida al desplegar el Blueprint. Prisma corre `migrate deploy` en cada arranque (`Dockerfile` `CMD`) y eso necesita conexión directa, no el pooler de PgBouncer — usar el pooled string aquí podría romper las migraciones.
- [ ] Ejecutar migraciones Prisma — ya automatizado en el arranque del contenedor (`Dockerfile`); no requiere paso manual aparte una vez conectado a Neon.
- [ ] Validar el despliegue del backend (smoke test, `PRODUCCION.md` §7) — pendiente del primer deploy real.
- [ ] Conectar la aplicación móvil con la API pública.

**Nota de limpieza (no bloqueante):** `.env.example` declara `REDIS_URL`, pero el backend no usa Redis/BullMQ en ningún módulo (`git grep` sin resultados) — es config muerta de un plan anterior. No se incluyó en `render.yaml`; no hace falta provisionar Redis en Render para esta fase.

## Historial

- 2026-07-13 — Creación del documento. Fase 0 iniciada: GitHub, Render, Neon y Cloudflare creados; ningún componente configurado aún de punta a punta. Instrucción directa del Fundador, ejecutada por el CTO.
- 2026-07-13 — `render.yaml` corregido y completado: ya existía un borrador del 2026-07-04 que asumía la Postgres propia de Render (`databases:` + `fromDatabase`) — corregido para usar Neon (`DATABASE_URL: sync: false`, se pega a mano) y completado con los env vars reales de `.env.example` que faltaban (gates de producción, Telegram, Firebase, RevenueCat). Confirmado que el backend no depende de Redis pese a que `.env.example` lo declara. Verificado `/v1/health` (liveness) y `/v1/ready` (valida conexión a Postgres) ya existen en `src/health/health.controller.ts`.
