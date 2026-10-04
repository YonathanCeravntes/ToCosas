# INFRA-001 · Infraestructura para salir a tiendas

- **Fecha:** 2026-10-03 · **Pide:** Fundador ("Listo, matemos, ¿qué falta en infraestructura?").
- **Ejecuta:** Arquitecto. Parte del análisis de preparación para tiendas (≈58 % al 2026-10-03).

## 1. Estado verificado
| Pieza | Estado | Fuente |
| --- | --- | --- |
| Servidor (Render `milla-backend`) | Plan **Starter, pago**, no se duerme; región Oregon; despliegue automático desde la rama | API de Render, 2026-10-03 |
| Base de datos | **Neon** (no Render); plan sin confirmar | `render.yaml` (`DATABASE_URL` de Neon) |
| Archivos de Mis documentos | Cloudflare R2 | FIN-054 |
| IA | Google Gemini, clave en **capa gratuita** | DEC-0043 |

## 2. Hecho en código (este commit)
- **Arranque seguro en producción** (`src/bootstrap.util.ts`): con `NODE_ENV=production` el servidor no arranca si `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` faltan, son valores de desarrollo, tienen menos de 32 caracteres o son iguales, o si falta `DATABASE_URL`. Antes, sin ellos, firmaba sesiones con `dev-access-secret` (cualquiera podía abrir cualquier cuenta). Render deja vivo el despliegue anterior si uno nuevo no arranca, así que no hay riesgo de caída.
- **IP real detrás del proxy de Render** (`trust proxy`): el límite de 5 intentos de login por minuto se aplicaba a la IP del proxy, es decir, a **todos los usuarios juntos**. Ahora es por persona.
- **CORS restringido:** navegadores solo desde la web de Millo (`https://yonathanceravntes.github.io`) y desarrollo local; ampliable con `CORS_ORIGINS` (lista separada por comas). La app instalada y los webhooks no mandan `Origin` y siguen pasando.
- **Documentación de la API oculta en producción** (`/v1/docs`), salvo `ENABLE_API_DOCS=true`.
- **Cierre ordenado** en cada despliegue (`enableShutdownHooks`).
- Pruebas: `bootstrap.util.spec.ts`. Unitarias 487/487, e2e 124/124.

## 3. Pendiente del Fundador (no se puede hacer desde el código)
| # | Tarea | Por qué | Dónde |
| --- | --- | --- | --- |
| 1 | **Neon en plan pago** con copias automáticas (restauración a un punto en el tiempo) | El plan gratis no guarda historial suficiente para recuperar datos de usuarios reales | Consola de Neon → Billing |
| 2 | **Gemini con facturación** (resolver OR-CBAT-20) y clave nueva de ese proyecto | En la capa gratis Google puede usar los datos para mejorar sus modelos; la política de Millo dice lo contrario | Google AI Studio / Cloud Billing → Render `GEMINI_API_KEY` |
| 3 | **Health check en Render:** poner `/v1/health` | Hoy está vacío: Render no sabe si el servidor quedó sano tras un despliegue | Render → milla-backend → Settings → Health Check Path |
| 4 | **Rotar claves que circularon por chat:** clave Gemini del gimnasio, token de R2, contraseña de aplicación de Gmail (SMTP) | Quedaron expuestas en capturas y mensajes | Cada proveedor → Render |
| 5 | **Cuenta de Sentry** (gratis para empezar) y pasarme el DSN | Hoy un fallo en el teléfono de un usuario no se ve | sentry.io; la app lo trae en la próxima APK (módulo nativo), el servidor puede tenerlo antes |
| 6 | **Alertas de Render** a tu correo para despliegues fallidos | Enterarte antes que el usuario | Render → Account → Notifications |

## 4. Pendiente técnico menor
- Deriva de migraciones (M11): alinear `schema.prisma` con una migración de solo-esquema en una ventana de mantenimiento.
- `REDIS_URL` en `.env.example` es configuración muerta.
