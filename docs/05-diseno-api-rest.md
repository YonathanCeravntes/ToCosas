# 05 · Diseño de la API REST

- **Base URL:** `https://api.tocosas.co/v1`
- **Formato:** JSON. `Content-Type: application/json`.
- **Auth:** `Authorization: Bearer <JWT>` (salvo endpoints públicos: auth y webhooks).
- **Versionado:** por path (`/v1`).
- **Errores:** formato uniforme.

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "El monto es requerido", "details": [ ... ] } }
```

- **Paginación:** `?limit=20&cursor=<opaque>` → `{ "data": [...], "next_cursor": "..." }`.
- **Idempotencia:** operaciones de escritura aceptan header `Idempotency-Key` y/o `client_uuid` en el body.

---

## 1. Autenticación y cuenta

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/register` | Registro con email/contraseña |
| POST | `/auth/login` | Login → access + refresh token |
| POST | `/auth/refresh` | Renovar access token |
| POST | `/auth/phone/start` | Iniciar login por teléfono (envía OTP por SMS/WhatsApp) |
| POST | `/auth/phone/verify` | Verificar OTP → tokens |
| POST | `/auth/password/forgot` | Solicitar reset |
| POST | `/auth/password/reset` | Confirmar reset |
| POST | `/auth/logout` | Revocar refresh token |
| GET | `/me` | Perfil del usuario |
| PATCH | `/me` | Actualizar perfil (nombre, moneda, tz, locale) |
| DELETE | `/me` | **Eliminar cuenta** (borrado de datos, ver doc 07) |
| GET | `/me/settings` | Obtener configuración |
| PATCH | `/me/settings` | Actualizar settings (recordatorios, notif, estrategia) |

```jsonc
// POST /auth/register
{ "email": "juan@mail.com", "password": "••••••", "full_name": "Juan P", "currency": "COP" }
// 201 →
{ "user": { "id": "uuid", "email": "juan@mail.com" },
  "tokens": { "access_token": "jwt", "refresh_token": "jwt", "expires_in": 3600 } }
```

---

## 2. Entidades financieras

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/entities` | Listar entidades del usuario + globales (`?type=banco&q=banco`) |
| POST | `/entities` | Crear entidad personalizada |
| GET | `/entities/{id}` | Detalle |
| PATCH | `/entities/{id}` | Editar |
| DELETE | `/entities/{id}` | Eliminar (soft) |
| GET | `/entities/catalog` | Catálogo global precargado (para autocompletar) |

```jsonc
// POST /entities
{ "name": "Prestamista Don José", "type": "prestamista_particular",
  "contact_phone": "+573001112233", "typical_rate": 5.0, "rate_type": "MV" }
```

---

## 3. Deudas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/debts` | Listar (`?status=activa&type=tarjeta_credito&sort=next_due_date`) |
| POST | `/debts` | Crear deuda (calcula cuota/amortización) |
| GET | `/debts/{id}` | Detalle + saldo actual |
| PATCH | `/debts/{id}` | Editar (recalcula amortización si cambia tasa/plazo) |
| DELETE | `/debts/{id}` | Eliminar (soft) |
| GET | `/debts/{id}/amortization` | Tabla de amortización proyectada |
| POST | `/debts/{id}/recalculate` | Forzar recálculo (cambio de tasa variable) |
| POST | `/debts/{id}/extra-payment` | Simular/registrar abono extra a capital |
| GET | `/debts/summary` | Totales: deuda total, cuota del mes, próximos vencimientos |

```jsonc
// POST /debts
{
  "name": "Crédito casa",
  "entity_id": "uuid-bancolombia",
  "debt_type": "hipotecario",
  "original_amount": 60000000,
  "current_balance": 49000000,
  "start_date": "2023-01-15",
  "term_months": 180,
  "interest_rate": 12.5,
  "rate_kind": "fija",
  "rate_basis": "EA",
  "amort_system": "frances",
  "payment_day": 5
}
// 201 → deuda + monthly_payment calculada + next_due_date + primeras cuotas
```

```jsonc
// GET /debts/{id}/amortization → 
{ "debt_id": "uuid",
  "monthly_payment": 739000,
  "total_interest": 73020000,
  "payoff_date": "2038-01-05",
  "entries": [
    { "period_no": 1, "due_date": "2026-08-05", "payment": 739000,
      "interest_part": 481000, "principal_part": 258000, "closing_bal": 48742000 }
  ] }
```

---

## 4. Transacciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/transactions` | Listar (`?kind=gasto&from=2026-07-01&to=2026-07-31&category_id=&debt_id=&cursor=`) |
| POST | `/transactions` | Crear (manual o desde app offline con `client_uuid`) |
| GET | `/transactions/{id}` | Detalle |
| PATCH | `/transactions/{id}` | Editar |
| DELETE | `/transactions/{id}` | Eliminar (soft) |
| POST | `/transactions/{id}/confirm` | Confirmar una transacción `pendiente_confirmacion` (venida de WhatsApp) |
| GET | `/transactions/pending` | Transacciones ambiguas que esperan aclaración del usuario |

```jsonc
// POST /transactions
{
  "kind": "gasto",
  "amount": 45000,
  "occurred_at": "2026-07-03T13:00:00-05:00",
  "category_id": "uuid-comida",
  "note": "almuerzo",
  "tags": ["trabajo"],
  "client_uuid": "generado-en-el-cliente"   // idempotencia offline
}
// 201 → transaction (status: confirmada)
```

```jsonc
// POST /transactions  (pago de deuda → descuenta saldo)
{ "kind": "pago_deuda", "amount": 250000, "debt_id": "uuid-casa",
  "entity_id": "uuid-bancolombia", "occurred_at": "2026-07-03" }
```

---

## 5. Categorías

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/categories` | Listar (globales + del usuario, `?kind=gasto`) |
| POST | `/categories` | Crear categoría personalizada |
| PATCH | `/categories/{id}` | Editar |
| DELETE | `/categories/{id}` | Eliminar |

---

## 6. Recordatorios

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/reminders` | Listar (`?active=true&from=&to=`) |
| POST | `/reminders` | Crear (asociado o no a una deuda) |
| PATCH | `/reminders/{id}` | Editar (offsets, canales) |
| DELETE | `/reminders/{id}` | Eliminar |

```jsonc
// POST /reminders
{ "debt_id": "uuid-casa", "title": "Cuota crédito casa", "due_date": "2026-08-05",
  "amount": 739000, "offsets_days": [3,1,0], "channels": ["push","whatsapp"] }
```

---

## 7. Dashboard, sugerencias y simulador

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/dashboard` | Resumen: deuda total, pagos del mes, ingresos, gastos, flujo estimado |
| GET | `/suggestions` | Sugerencias del motor (`?status=new`) |
| POST | `/suggestions/{id}/accept` | Marcar aceptada |
| POST | `/suggestions/{id}/dismiss` | Descartar |
| POST | `/simulator/extra-payment` | Simular abono extra: ahorro de intereses y meses ganados |
| POST | `/simulator/strategy` | Comparar avalanche vs snowball |

```jsonc
// GET /dashboard →
{
  "period": "2026-07",
  "total_debt": 5200000,
  "month_debt_payments_due": 890000,
  "income_month": 2100000,
  "expense_month": 1340000,
  "estimated_cashflow": 760000,
  "debts_count": 3,
  "upcoming_payments": [ { "debt_id": "uuid", "name": "Crédito casa", "due_date": "2026-07-05", "amount": 739000 } ]
}
```

```jsonc
// POST /simulator/extra-payment
{ "debt_id": "uuid-tarjeta", "extra_monthly": 100000 }
// →
{ "interest_saved": 420000, "months_saved": 7, "new_payoff_date": "2027-11-05" }
```

```jsonc
// POST /simulator/strategy   → compara estrategias con el flujo extra disponible
{ "extra_budget": 200000 }
// →
{ "avalanche": { "order": ["Tarjeta BBVA","Tarjeta Visa","Crédito casa"],
                 "total_interest": 1800000, "debt_free_date": "2029-03-01" },
  "snowball":  { "order": ["Tarjeta Visa","Tarjeta BBVA","Crédito casa"],
                 "total_interest": 2050000, "debt_free_date": "2029-05-01" },
  "recommended": "avalanche" }
```

---

## 8. Sincronización (offline-first)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/sync/pull?since=<timestamp>` | Cambios (creados/actualizados/borrados) desde una marca temporal |
| POST | `/sync/push` | Enviar cambios locales pendientes (batch, idempotente) |

```jsonc
// GET /sync/pull?since=2026-07-03T10:00:00Z →
{ "server_time": "2026-07-03T12:00:00Z",
  "changes": {
    "transactions": { "created": [...], "updated": [...], "deleted": ["uuid1"] },
    "debts": { "created": [], "updated": [...], "deleted": [] },
    "entities": { ... }, "reminders": { ... }, "categories": { ... }
  } }

// POST /sync/push
{ "transactions": { "created": [ { "client_uuid": "...", ... } ], "updated": [...], "deleted": [...] },
  "debts": { ... } }
// → resuelve conflictos (last-write-wins por updated_at) y devuelve ids del servidor
```

---

## 9. WhatsApp (vinculación y webhooks)

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/whatsapp/link/start` | Bearer | Genera OTP para vincular número |
| POST | `/whatsapp/link/verify` | Bearer | Verifica OTP (si el usuario lo ingresa en la app) |
| POST | `/whatsapp/link/magic` | Bearer | Genera enlace mágico de vinculación |
| DELETE | `/whatsapp/link` | Bearer | Desvincular número (opt-out) |
| GET | `/webhooks/whatsapp` | Público | Verificación de Meta (challenge) |
| POST | `/webhooks/whatsapp` | Firma HMAC | Recepción de mensajes (valida `X-Hub-Signature-256`) |

```jsonc
// POST /whatsapp/link/start →
{ "otp": "834192", "expires_at": "2026-07-03T12:10:00Z",
  "instructions": "Escribe este código por WhatsApp al número +57..." }
```

---

## 10. Dispositivos y notificaciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/devices` | Registrar token FCM del dispositivo |
| DELETE | `/devices/{id}` | Eliminar dispositivo (logout) |

---

## 11. Convenciones transversales

- **Rate limiting:** por IP y por usuario (headers `X-RateLimit-*`).
- **Validación:** `class-validator` (NestJS DTOs). Montos > 0, fechas ISO, enums válidos.
- **Zonas horarias:** el backend guarda `timestamptz`; el cliente envía con offset.
- **HATEOAS ligero:** no obligatorio; se prioriza simplicidad.
- **GraphQL:** considerado, pero REST elegido por simplicidad, cacheabilidad y menor curva para el equipo. Se puede exponer un gateway GraphQL a futuro si el frontend lo requiere.
- **Documentación:** OpenAPI/Swagger autogenerado (`@nestjs/swagger`) en `/v1/docs`.
