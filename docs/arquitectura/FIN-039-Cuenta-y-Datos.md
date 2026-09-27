# FIN-039 · Cuenta y datos — recuperar contraseña, consentimiento, exportar y borrar

- **Versión:** 1.0
- **Fecha:** 2026-09-27
- **Autor:** Arquitecto (ciclo compacto `DEC-ORG-002` §44.3)
- **Estado:** **Implementado — pendiente de validación del Fundador y de configurar `SMTP_URL` en Render.**
- **Origen (§27):** `BLUEPRINT-0001` BP-20 (legal, bloquea el lanzamiento público) + M1/M7 del modelo. Autorizado por el Fundador el 2026-09-27.
- **Documentos base:** `BLUEPRINT-0001` §4.1, §6.2 (M1, M7, M8) · `PRODUCT_VISION.md` §8 (protección de datos) · `ALPHA-004`/`PIA-ALPHA` · `PRODUCCION.md` §1–§2 · `GOBERNANZA.md` §32, §39, §44.

---

## 0. Frontera
No toca Motor, Registrar ni definiciones §32. Toca autenticación, esquema (una tabla nueva, una tabla muerta menos) y Ajustes/Login/Registro en la app.

## 1. Objetivo
Cubrir los derechos básicos del usuario sobre su cuenta y sus datos (Ley 1581: consentimiento, acceso/portabilidad, supresión) y el flujo que más churn evita en apps con login propio: recuperar la contraseña.

## 2. Alcance implementado

### 2.1 Recuperar contraseña
- `POST /auth/password/forgot {email}` → **202 siempre** (no revela si el correo existe). Genera un código de 6 dígitos, guarda **solo el hash** (`sha256(userId:code)`) con vencimiento a 15 min, invalida códigos anteriores.
- Entrega por el mejor canal disponible: **correo** vía `SMTP_URL` (nodemailer; Resend/Brevo/Gmail App Password) y/o **Telegram** si el usuario tiene el bot vinculado y verificado. Sin canal: en producción se registra en el log y la app le dice al usuario con honestidad que el canal no está configurado.
- `POST /auth/password/reset {email, code, newPassword}` → valida hash, ≤5 intentos por código, un solo uso, cambia la clave.
- App: `ForgotPasswordScreen` (correo → código + nueva clave, en una pantalla) + enlace en Login.

### 2.2 Consentimiento de datos
- `RegisterDto.acceptsDataPolicy` (opcional en el DTO para no romper clientes/pruebas; **obligatorio en la app**) → `UserSettings.dataConsentAt`.
- `POST /auth/data-policy/accept` para cuentas anteriores; Ajustes muestra la fecha o el botón de aceptar.
- Texto v1 de la política (`DATA_POLICY_SHORT`) derivado de `PRODUCT_VISION.md` §8.

### 2.3 Portabilidad
- `GET /auth/me/export` → JSON `millo-export-v1` con usuario, deudas (con entidad), seguros, compras con cuotas, movimientos (con categoría/deuda), cuentas, activos, fuentes de ingreso y deducciones, gastos fijos.
- Ajustes → "Exportar mis datos (JSON)" comparte el archivo con `Share`.

### 2.4 Supresión
- `DELETE /auth/me {password}` → verifica la clave, marca `deletedAt`, **anonimiza** (`email → deleted+<id>@deleted.millo.local`, teléfono/nombre/clave a null), revoca WhatsApp/Telegram, borra dispositivos push y conversaciones del Copiloto, invalida códigos. Login y refresh fallan; `/auth/me` responde 404.
- Resuelve **M7**: el mismo correo puede registrarse de nuevo (probado en e2e).
- Ajustes → "Eliminar mi cuenta" con confirmación por contraseña y aviso para exportar antes.
- Los datos financieros quedan bajo `deletedAt` (período de gracia). La **purga física** es tarea operativa del Fundador (no automática en esta fase).

### 2.5 Modelo
- Nueva tabla `password_reset_tokens` (id, user_id, code_hash, expires_at, used_at, attempts).
- Eliminada la tabla `suggestions` y el enum `SuggestionType` (cero referencias en código, **M1**). El endpoint `/suggestions` no la usaba (calcula en vivo).
- La migración `20260927171918_fin039_password_reset_drop_suggestions` se escribió **a mano**: el diff automático de Prisma arrastraba deriva ajena (DROP DEFAULT `gen_random_uuid()` y re-creación de FKs de FIN-027/031/036 con `ON UPDATE CASCADE`). Esa deriva existe (migraciones anteriores hechas a mano) y se registra como deuda técnica **M11**, no se toca en producción sin decisión.

## 3. No entra
- Verificación de correo al registrarse (`emailVerified` sigue huérfano) — requiere SMTP obligatorio; candidata.
- Purga física programada.
- Login con teléfono/WhatsApp (visión original) — candidata H3.

## 4. Componentes
Backend: `auth/password-recovery.service.ts` (nuevo), `auth/account.service.ts` (nuevo), `auth/dto/auth.dto.ts`, `auth.controller.ts`, `auth.module.ts`, `auth.service.ts` (consentimiento, login rechaza borrados), `prisma/schema.prisma`, migración, `render.yaml` (`SMTP_URL`, `MAIL_FROM`, `WHATSAPP_DISPLAY_NUMBER`), dependencia `nodemailer`.
Frontend: `ForgotPasswordScreen` (nuevo), `LoginScreen`, `RegisterScreen`, `SettingsScreen`, `api/endpoints.ts`, `store/auth.store.ts`.

## 5. Base de datos
Ver §2.5. Índice `(user_id, expires_at)` en la tabla nueva.

## 6. Backend
Endpoints nuevos: 6 (forgot, reset, onboarding/done, data-policy/accept, me/export, DELETE me). Throttle: forgot 3/min, reset 5/min por IP.

## 7. Uso de IA
Ninguno.

## 8. Riesgos
- **SMTP no configurado en Render:** el código no llega por correo; la app lo dice. **Acción del Fundador:** crear cuenta en Resend/Brevo (gratis) y pegar `SMTP_URL`.
- **Enumeración de correos:** mitigada con 202 constante y throttle.
- **Datos residuales tras borrado:** quedan bajo `deletedAt` para gracia; documentar plazo de purga en la política pública antes del lanzamiento.

## 9. Dependencias
`nodemailer ^10`, `@types/nodemailer` (dev).

## 10. Criterios de aceptación
e2e `fin039-cuenta-y-datos.e2e-spec.ts` (5 casos: consentimiento+onboarding, historial con q/before/limit, forgot/reset con hash forzado y un solo uso, export, borrado + re-registro) ✅ · suites previas sin regresión ✅ · validación del Fundador en la APK: registro con casilla, "Olvidé mi contraseña" (con Telegram vinculado o SMTP), exportar, borrar cuenta de prueba.

## 11. Plan de despliegue
Backend por auto-deploy (migración en `startCommand`). Configurar `SMTP_URL`, `MAIL_FROM`. Frontend por OTA junto con FIN-038.

## 12. Respuesta al filtro §31
Sin esta FIN, quien olvida su clave pierde su historia financiera, y Millo no podría publicarse en tiendas ni sostener su principio de protección de datos.

## 13–14. Métricas / Plan
Tasa de recuperaciones completadas; exportaciones; borrados. Ejecutado en una entrega.

---

## 15. Implementado
SHA y suites: ver Historial de `BACKLOG.md` (mismo commit que FIN-038). No verificado aquí: entrega real de correo (sin SMTP en sandbox) y render en dispositivo.

## 16. Decisiones del Fundador
- **16.1** Autorización general 2026-09-27 (`DEC-ORG-002` §6).
- **16.2 (pendiente):** proveedor SMTP y remitente (`MAIL_FROM`).
- **16.3 (pendiente):** plazo de purga física tras borrado (propuesta: 30 días) para publicarlo en la política.
