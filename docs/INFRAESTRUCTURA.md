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
| Backend (hosting) | Render | ✅ Creado — pendiente configuración del servicio Node.js |
| Base de datos | Neon PostgreSQL | ✅ Creado — pendiente conexión (`DATABASE_URL`) y migraciones |
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

- [ ] Configurar el servicio Node.js en Render.
- [ ] Configurar variables de entorno de producción.
- [ ] Conectar Render con Neon mediante `DATABASE_URL`.
- [ ] Ejecutar migraciones Prisma (`prisma migrate deploy` — nunca `migrate dev`, ya exigido en `PRODUCCION.md` §4).
- [ ] Validar el despliegue del backend (smoke test, `PRODUCCION.md` §7).
- [ ] Conectar la aplicación móvil con la API pública.

## Historial

- 2026-07-13 — Creación del documento. Fase 0 iniciada: GitHub, Render, Neon y Cloudflare creados; ningún componente configurado aún de punta a punta. Instrucción directa del Fundador, ejecutada por el CTO.
