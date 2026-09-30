# 03 · Esquema de base de datos

Modelo **relacional (PostgreSQL)** como fuente de verdad. Al final se incluye la **variante Firestore** por si el equipo optase por el camino serverless.

## 1. Diagrama entidad-relación (texto)

```
users ──1:N── financial_entities        (entidades propias del usuario)
users ──1:N── debts ──N:1── financial_entities
users ──1:N── transactions ──N:1── financial_entities
                     └──N:1── categories
                     └──N:1── debts            (si es un pago de deuda)
debts ──1:N── amortization_entries          (tabla de amortización proyectada)
debts ──1:N── reminders
users ──1:N── categories                    (categorías propias + globales)
users ──1:1── whatsapp_links                (número vinculado)
users ──1:N── devices                       (para FCM y sync)
users ──1:N── suggestions                   (generadas por el motor)
whatsapp_links ──1:N── wa_conversations     (estado conversacional/contexto)
users ──1:N── sync_log / outbox             (sincronización e idempotencia)
```

## 2. Convenciones

- PK: `id UUID DEFAULT gen_random_uuid()` (extensión `pgcrypto`).
- Timestamps: `created_at`, `updated_at` (`timestamptz`), `deleted_at` (soft delete para sync).
- Dinero: `NUMERIC(18,2)` (nunca `float`). Moneda: `currency CHAR(3)` ISO-4217, default `'COP'`.
- Todo registro sincronizable lleva `updated_at` y `deleted_at` para el motor de sync delta.
- Enums vía tipos `ENUM` de Postgres o tablas de catálogo (se usa ENUM por simplicidad).

## 3. Tablas (DDL)

### 3.1 `users`

```sql
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          CITEXT UNIQUE,                 -- puede ser null si solo usa teléfono
  phone_e164     VARCHAR(20) UNIQUE,            -- formato +57300..., para login por teléfono
  password_hash  TEXT,                          -- null si usa auth federada
  full_name      TEXT,
  auth_provider  TEXT NOT NULL DEFAULT 'local', -- local | firebase | google | apple
  external_uid   TEXT,                          -- uid de Firebase Auth si aplica
  currency       CHAR(3) NOT NULL DEFAULT 'COP',
  locale         TEXT NOT NULL DEFAULT 'es-CO',
  timezone       TEXT NOT NULL DEFAULT 'America/Bogota',
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);
```

### 3.2 `financial_entities` (bancos, cooperativas, fintechs, prestamistas)

```sql
CREATE TYPE entity_type AS ENUM
  ('banco','cooperativa','fintech','prestamista_particular','tarjeta','otro');

CREATE TABLE financial_entities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL = entidad global precargada
  name            TEXT NOT NULL,
  type            entity_type NOT NULL DEFAULT 'otro',
  contact_phone   VARCHAR(20),
  website         TEXT,
  typical_rate    NUMERIC(6,3),          -- tasa típica (%), informativa
  rate_type       TEXT,                  -- 'EA' | 'NMV' | 'NAMV' ...
  logo_url        TEXT,
  is_global       BOOLEAN NOT NULL DEFAULT FALSE, -- catálogo precargado
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_entities_user ON financial_entities(user_id);
```

> El catálogo global se siembra con `user_id = NULL, is_global = true`. Cuando el usuario "personaliza" una global, se clona a una fila con su `user_id`.

### 3.3 `categories`

```sql
CREATE TYPE tx_kind AS ENUM ('ingreso','gasto','pago_deuda','transferencia');

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL = categoría global
  name        TEXT NOT NULL,
  kind        tx_kind NOT NULL,          -- a qué tipo de transacción aplica
  icon        TEXT,
  color       TEXT,
  is_global   BOOLEAN NOT NULL DEFAULT FALSE,
  keywords    TEXT[],                    -- para el parser NLP ('almuerzo','comida'...)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);
CREATE INDEX idx_categories_user ON categories(user_id);
```

### 3.4 `debts`

```sql
CREATE TYPE debt_type AS ENUM
  ('tarjeta_credito','credito_personal','hipotecario','libre_inversion',
   'vehiculo','educativo','gota_a_gota','prestamo_familiar','otro');

CREATE TYPE rate_kind   AS ENUM ('fija','variable');
CREATE TYPE rate_basis  AS ENUM ('EA','NMV','NAMV','MV');  -- efectiva anual, nominal mes vencido, etc.
CREATE TYPE debt_status AS ENUM ('activa','en_mora','pagada','refinanciada','cancelada');
CREATE TYPE amort_system AS ENUM ('frances','aleman','americano','cuota_fija','tarjeta_rotativo');

CREATE TABLE debts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_id          UUID REFERENCES financial_entities(id) ON DELETE SET NULL,
  name               TEXT NOT NULL,                 -- "Crédito casa", "Tarjeta Visa"
  debt_type          debt_type NOT NULL DEFAULT 'otro',
  currency           CHAR(3) NOT NULL DEFAULT 'COP',
  original_amount    NUMERIC(18,2) NOT NULL,
  current_balance    NUMERIC(18,2) NOT NULL,        -- saldo pendiente actual
  start_date         DATE NOT NULL,
  term_months        INTEGER,                       -- plazo total (null en rotativo)
  interest_rate      NUMERIC(7,4) NOT NULL,         -- valor de la tasa (%)
  rate_kind          rate_kind NOT NULL DEFAULT 'fija',
  rate_basis         rate_basis NOT NULL DEFAULT 'EA',
  amort_system       amort_system NOT NULL DEFAULT 'frances',
  monthly_payment    NUMERIC(18,2),                 -- cuota (calculada o informada)
  payment_day        SMALLINT,                      -- día del mes de vencimiento (1-31)
  next_due_date      DATE,                          -- próxima fecha de pago
  status             debt_status NOT NULL DEFAULT 'activa',
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ
);
CREATE INDEX idx_debts_user ON debts(user_id);
CREATE INDEX idx_debts_due  ON debts(next_due_date) WHERE status = 'activa';
```

### 3.5 `amortization_entries` (tabla de amortización proyectada/recalculable)

```sql
CREATE TABLE amortization_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id       UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  period_no     INTEGER NOT NULL,          -- número de cuota (1..n)
  due_date      DATE NOT NULL,
  opening_bal   NUMERIC(18,2) NOT NULL,    -- saldo al inicio del periodo
  payment       NUMERIC(18,2) NOT NULL,    -- cuota del periodo
  interest_part NUMERIC(18,2) NOT NULL,    -- porción interés
  principal_part NUMERIC(18,2) NOT NULL,   -- porción capital
  extra_payment NUMERIC(18,2) NOT NULL DEFAULT 0, -- abono extra aplicado a este periodo
  closing_bal   NUMERIC(18,2) NOT NULL,    -- saldo al final
  is_projected  BOOLEAN NOT NULL DEFAULT TRUE, -- proyección vs. realmente pagado
  paid_at       TIMESTAMPTZ,
  UNIQUE(debt_id, period_no)
);
CREATE INDEX idx_amort_debt ON amortization_entries(debt_id);
```

> Se puede **recalcular** al vuelo (no persistir) para ahorrar espacio, o persistir para historial y comparativas *snowball/avalanche*. Recomendación: persistir la proyección vigente y recalcular ante cambios de tasa/abonos.

### 3.6 `transactions` (compromisos de pago / movimientos)

```sql
CREATE TYPE tx_source AS ENUM ('app','whatsapp','ocr','import','system');
CREATE TYPE tx_status AS ENUM ('confirmada','pendiente_confirmacion','descartada');

CREATE TABLE transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind           tx_kind NOT NULL,                 -- ingreso | gasto | pago_deuda | transferencia
  amount         NUMERIC(18,2) NOT NULL,
  currency       CHAR(3) NOT NULL DEFAULT 'COP',
  occurred_at    TIMESTAMPTZ NOT NULL,             -- fecha del movimiento (no de registro)
  category_id    UUID REFERENCES categories(id) ON DELETE SET NULL,
  entity_id      UUID REFERENCES financial_entities(id) ON DELETE SET NULL,
  debt_id        UUID REFERENCES debts(id) ON DELETE SET NULL, -- si es pago de deuda
  note           TEXT,
  tags           TEXT[],
  source         tx_source NOT NULL DEFAULT 'app',
  status         tx_status NOT NULL DEFAULT 'confirmada',
  raw_message    TEXT,                             -- texto original de WhatsApp
  attachment_url TEXT,                             -- comprobante/foto (object storage)
  parse_confidence NUMERIC(4,3),                   -- 0..1 confianza del parser
  wa_message_id  TEXT,                             -- id del mensaje de WhatsApp (idempotencia)
  client_uuid    UUID,                             -- id generado en el cliente (offline, dedup)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ,
  UNIQUE(wa_message_id),
  UNIQUE(user_id, client_uuid)
);
CREATE INDEX idx_tx_user_date ON transactions(user_id, occurred_at DESC);
CREATE INDEX idx_tx_debt ON transactions(debt_id);
```

> **Idempotencia:** `wa_message_id` evita duplicar si Meta reenvía el webhook; `client_uuid` evita duplicar en sync offline.
> **Efecto en deuda:** al confirmar una `transaction` de `kind='pago_deuda'` con `debt_id`, un *trigger* o servicio de dominio decrementa `debts.current_balance` y recalcula amortización.

### 3.7 `reminders`

```sql
CREATE TYPE reminder_channel AS ENUM ('push','whatsapp','email');

CREATE TABLE reminders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  debt_id       UUID REFERENCES debts(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  due_date      DATE NOT NULL,               -- fecha del evento (pago)
  offsets_days  INTEGER[] NOT NULL DEFAULT '{3,1,0}', -- avisar 3d, 1d, mismo día
  channels      reminder_channel[] NOT NULL DEFAULT '{push}',
  amount        NUMERIC(18,2),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_sent_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);
CREATE INDEX idx_reminders_due ON reminders(due_date) WHERE is_active;
```

### 3.8 `whatsapp_links` (vinculación número ↔ cuenta)

```sql
CREATE TYPE wa_link_status AS ENUM ('pending','verified','revoked');

CREATE TABLE whatsapp_links (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_e164     VARCHAR(20) NOT NULL UNIQUE,
  wa_id          TEXT,                        -- id de WhatsApp del usuario (de Meta)
  status         wa_link_status NOT NULL DEFAULT 'pending',
  otp_code_hash  TEXT,                        -- OTP hasheado para verificación
  otp_expires_at TIMESTAMPTZ,
  verified_at    TIMESTAMPTZ,
  opt_in         BOOLEAN NOT NULL DEFAULT FALSE, -- consentimiento para recibir mensajes
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.9 `wa_conversations` (estado conversacional / contexto del bot)

```sql
CREATE TABLE wa_conversations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164     VARCHAR(20) NOT NULL,
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  state          TEXT NOT NULL DEFAULT 'idle', -- idle | awaiting_otp | clarifying_category ...
  context        JSONB NOT NULL DEFAULT '{}',  -- transacción parcial pendiente de aclarar
  expires_at     TIMESTAMPTZ,                  -- TTL del contexto (p.ej. 15 min)
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wa_conv_phone ON wa_conversations(phone_e164);
```

> En producción este estado efímero vive mejor en **Redis** (con TTL). La tabla se muestra para el modelo lógico; el equipo puede optar por Redis-only para `wa_conversations`.

### 3.10 `devices` (para FCM y sync)

```sql
CREATE TABLE devices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL,               -- ios | android
  fcm_token     TEXT,
  app_version   TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, fcm_token)
);
```

### 3.11 `suggestions` (salida del motor de análisis)

```sql
CREATE TYPE suggestion_type AS ENUM
  ('priorizar_deuda','recorte_gasto','alerta_sobregiro','abono_extra','felicitacion','otro');

CREATE TABLE suggestions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          suggestion_type NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,               -- texto mostrado al usuario
  payload       JSONB,                       -- datos (debt_id, ahorro estimado, etc.)
  score         NUMERIC(5,2),                -- relevancia/impacto para ordenar
  status        TEXT NOT NULL DEFAULT 'new', -- new | seen | accepted | dismissed
  valid_until   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_suggestions_user ON suggestions(user_id, status);
```

### 3.12 `user_settings`

```sql
CREATE TABLE user_settings (
  user_id            UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  reminder_defaults  INTEGER[] NOT NULL DEFAULT '{3,1,0}',
  notif_push         BOOLEAN NOT NULL DEFAULT TRUE,
  notif_whatsapp     BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_hours        JSONB,                  -- {"from":"22:00","to":"07:00"}
  suggestion_strategy TEXT NOT NULL DEFAULT 'avalanche', -- avalanche | snowball
  data_consent_at    TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.13 `sync_outbox` / `webhook_events` (idempotencia y auditoría)

```sql
-- Registro de eventos crudos del webhook (auditoría + reproceso)
CREATE TABLE webhook_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      TEXT NOT NULL DEFAULT 'whatsapp',
  external_id   TEXT UNIQUE,                 -- id del mensaje/evento (dedup)
  payload       JSONB NOT NULL,
  status        TEXT NOT NULL DEFAULT 'received', -- received | processed | failed
  error         TEXT,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at  TIMESTAMPTZ
);

-- Outbox para mensajes salientes (WhatsApp/push) con entrega garantizada
CREATE TABLE outbox_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  channel       reminder_channel NOT NULL,
  payload       JSONB NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | sent | failed
  attempts      INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at       TIMESTAMPTZ
);
```

## 4. Índices y rendimiento clave

- `transactions(user_id, occurred_at DESC)` → listados e historial.
- `debts(next_due_date) WHERE status='activa'` → job de recordatorios.
- `reminders(due_date) WHERE is_active` → scheduler.
- `transactions(wa_message_id)` UNIQUE → idempotencia webhook.
- Particionado por rango de fecha en `transactions` cuando el volumen crezca.

## 5. Reglas de negocio a nivel de datos

- Un **pago de deuda** (`kind='pago_deuda'`) confirmado ⇒ actualizar `debts.current_balance` y marcar la cuota correspondiente en `amortization_entries` (`paid_at`, `is_projected=false`).
- Soft-delete en todo lo sincronizable (`deleted_at`) para propagar borrados al cliente offline.
- Al **eliminar cuenta**: purga en cascada + registro de la solicitud (ver [doc 07](07-seguridad-privacidad.md)).

---

## 6. Variante Firestore (si se elige serverless)

Colecciones (documentos denormalizados):

```
users/{uid}
users/{uid}/entities/{entityId}
users/{uid}/debts/{debtId}
users/{uid}/debts/{debtId}/amortization/{periodNo}
users/{uid}/transactions/{txId}         // index compuesto: (kind, occurredAt)
users/{uid}/categories/{catId}
users/{uid}/reminders/{reminderId}
users/{uid}/suggestions/{sugId}
whatsappLinks/{phoneE164}               // top-level para lookup rápido por número → uid
waConversations/{phoneE164}             // estado efímero (o Realtime DB)
globalEntities/{entityId}               // catálogo precargado
globalCategories/{catId}
```

Consideraciones Firestore:
- Denormalizar totales (deuda total, gasto del mes) en `users/{uid}/summary` para evitar agregaciones caras.
- Usar **Cloud Functions** para triggers `onWrite` que actualicen summaries y saldos.
- Reglas de seguridad Firestore por `request.auth.uid == uid`.
- Contras: sin JOINs, sin transacciones ACID cómodas para amortización; agregaciones costosas ⇒ por eso el diseño principal es PostgreSQL.
