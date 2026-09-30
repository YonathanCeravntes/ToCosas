# 07 · Seguridad y privacidad de datos

ToCosas maneja **datos financieros personales** (deudas, ingresos, entidades) y un **canal de mensajería (WhatsApp)**. La seguridad y la privacidad no son opcionales: son requisito de confianza y, en muchos países, requisito legal.

---

## 1. Marco legal aplicable

- **Colombia:** Ley 1581 de 2012 (Protección de Datos Personales) + Decreto 1377 de 2013 → *habeas data*, autorización previa, finalidad, derecho a supresión.
- **General/LatAm:** alinear con **GDPR** como estándar alto (portabilidad, derecho al olvido, minimización) facilita expansión.
- **Meta / WhatsApp Business Policy:** opt-in explícito, no spam, categorías de mensaje correctas, no compartir datos con terceros sin consentimiento.
- **Tiendas:** Apple App Store Privacy Nutrition Labels + Google Play Data Safety (declarar qué datos se recogen y por qué).

---

## 2. Autenticación y autorización

- **Contraseñas:** hash con **Argon2id** (o bcrypt cost≥12). Nunca en texto plano ni logs.
- **Tokens:** JWT de acceso corto (15-60 min) + **refresh token rotatorio** (revocable, almacenado hasheado). Detección de reuso → revocar familia.
- **OTP (teléfono/WhatsApp):** 6 dígitos, TTL 10 min, máximo 5 intentos, hasheado en reposo, rate-limit por número.
- **Autorización:** cada request valida `user_id` del token contra el `user_id` del recurso (aislamiento por tenant). Nunca confiar en IDs del cliente.
- **Opción Firebase Auth:** delega la gestión de credenciales/OTP a Google (menos superficie propia). Trade-off: lock-in vs. menor esfuerzo. Recomendación MVP: **Firebase Auth** para acelerar; auth propio si se requiere control total.
- **Biometría en el dispositivo:** desbloqueo con FaceID/huella para abrir la app (guardar tokens en Keychain/Keystore).

---

## 3. Cifrado

| Capa | Medida |
|------|--------|
| **En tránsito** | TLS 1.2+ obligatorio en toda la API y webhooks. HSTS. Certificate pinning opcional en la app. |
| **En reposo (DB)** | Cifrado a nivel de disco/volumen (gestionado por Postgres provider). |
| **Campos sensibles** | Cifrado a nivel de aplicación (AES-256-GCM) para datos especialmente sensibles (p. ej. `otp_code_hash` ya hasheado; adjuntos). |
| **Adjuntos/comprobantes** | Cifrados en Object Storage (SSE), URLs firmadas de corta duración. |
| **Local en el dispositivo** | SQLite cifrado (SQLCipher) o almacenar solo lo necesario; tokens en Keychain/Keystore, no en SQLite plano. |
| **Secretos/keys** | Gestor de secretos (Doppler / GCP Secret Manager / AWS Secrets Manager). Nunca en el repo. |

---

## 4. Seguridad del webhook de WhatsApp

- **Validar `X-Hub-Signature-256`** (HMAC-SHA256 con App Secret) en cada POST → rechazar si no coincide.
- **Verify token** propio para el GET de verificación de Meta.
- **Idempotencia** por `message_id` (evita reproceso y ataques de replay).
- **Rate-limit** por número; bloquear números que abusan del onboarding.
- **No confiar en el contenido del mensaje**: sanitizar antes de pasar a LLM/DB; tratar el texto como *untrusted input* (evitar prompt injection que altere el parser — el LLM solo extrae a un esquema fijo, no ejecuta acciones).

---

## 5. Privacidad y consentimiento

- **Consentimiento explícito** al registrarse (aceptar Política de Privacidad y Términos) → `user_settings.data_consent_at`.
- **Opt-in de WhatsApp** separado y explícito → `whatsapp_links.opt_in`. "STOP"/"baja" revoca inmediatamente.
- **Minimización de datos:** recoger solo lo necesario. No pedir datos bancarios de acceso; ToCosas *no* se conecta a cuentas bancarias.
- **Finalidad limitada:** los datos se usan para el servicio (registro, análisis, recordatorios), no se venden.
- **Transparencia con IA:** informar que los mensajes se procesan con un modelo para clasificarlos. Ofrecer opción de procesamiento sin enviar a terceros (roadmap: modelo self-hosted) para usuarios sensibles.

---

## 6. Eliminación de cuenta y retención (derecho al olvido)

- Endpoint `DELETE /me` → flujo de borrado:
  1. Confirmación (doble opt-in, requerido por Apple/Google).
  2. **Borrado en cascada** de todos los datos del usuario (transacciones, deudas, entidades propias, adjuntos, links de WhatsApp, dispositivos).
  3. Anonimización de registros de auditoría estrictamente necesarios (sin PII).
  4. Confirmación al usuario (email/WhatsApp) y ventana de gracia opcional (p. ej. 7 días soft-delete → purga definitiva).
- **Retención:** definir política (p. ej. purgar `webhook_events` crudos a 30-90 días; adjuntos según plan). Documentar en la Política de Privacidad.
- **Portabilidad:** exportación de datos (CSV/JSON) a solicitud (Fase 3).

---

## 7. Seguridad de la aplicación y operación

- **OWASP Top 10 / OWASP MASVS** como guía.
- **Validación y sanitización** de todas las entradas (DTOs con `class-validator`).
- **Rate limiting** global y por endpoint sensible (login, OTP, webhook).
- **Protección contra fuerza bruta** (bloqueo temporal, captcha si aplica).
- **Dependencias:** escaneo continuo (Dependabot / `npm audit` / Snyk).
- **Secret scanning** en CI (evitar filtrar claves).
- **Principio de menor privilegio** en credenciales de servicios (DB, storage, Meta).
- **Logs sin PII:** enmascarar montos/teléfonos/nombres en logs; logs estructurados con niveles.
- **Backups cifrados** de Postgres + pruebas de restauración periódicas.
- **Plan de respuesta a incidentes** y notificación de brechas según ley.
- **Pentest** antes del lanzamiento público (o al menos revisión de seguridad + escaneo automatizado).

---

## 8. Checklist de cumplimiento pre-lanzamiento

- [ ] Política de Privacidad y Términos publicados y enlazados en la app y en las tiendas.
- [ ] Consentimiento explícito registrado con timestamp.
- [ ] Opt-in/opt-out de WhatsApp funcionando ("STOP").
- [ ] `DELETE /me` funcional y visible en la app (requisito de Apple).
- [ ] Data Safety (Play) y Privacy Labels (Apple) declarados y veraces.
- [ ] TLS + HSTS + validación de firma del webhook.
- [ ] Secretos fuera del repo; rotación definida.
- [ ] Backups + restore probados.
- [ ] Escaneo de dependencias y secretos en CI.
- [ ] Enmascaramiento de PII en logs.
