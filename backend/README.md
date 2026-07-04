# ToCosas — Backend (NestJS)

Backend de la app de finanzas personales **ToCosas**. Ver el diseño completo en [`../docs`](../docs).

Este primer scaffold incluye el **motor de amortización** (núcleo de dominio) con pruebas, el esqueleto NestJS, el esquema Prisma derivado del [doc 03](../docs/03-esquema-base-datos.md) y el entorno de desarrollo (Postgres + Redis).

## Requisitos

- Node.js 20+
- Docker (para Postgres y Redis en local)

## Puesta en marcha

```bash
cd backend
cp .env.example .env          # ajusta valores
npm install
docker compose up -d          # Postgres + Redis
npm run prisma:generate       # genera el cliente Prisma
npm run prisma:migrate        # crea las tablas (primera migración)
npm run start:dev             # API en http://localhost:3000/v1
```

- Swagger: `http://localhost:3000/v1/docs`
- Health: `GET http://localhost:3000/v1/health`

## Tests

```bash
npm test          # todas las pruebas
npm run test:cov  # con cobertura
```

El foco de cobertura está en el **motor financiero** (`src/modules/finance/amortization`), donde un error cuesta dinero real:

- `interest.util.spec.ts` — conversión de tasas (EA / MV / NMV / NAMV).
- `amortization.service.spec.ts` — sistema francés y alemán, tasa 0, abonos extra, reconstrucción exacta del principal, encadenamiento de saldos, fechas de vencimiento y simulación de ahorro.

## Despliegue en la nube

El backend está dockerizado y listo para desplegar. Hay un blueprint de Render
en la raíz del repo ([`render.yaml`](../render.yaml)):

1. Entra a **https://dashboard.render.com/blueprints** → *New Blueprint Instance*.
2. Conecta este repositorio. Render lee `render.yaml` y crea el **servicio web**
   (Docker) + la **base de datos PostgreSQL** gestionada, e inyecta `DATABASE_URL`
   y los secretos JWT automáticamente.
3. El contenedor aplica las migraciones (`prisma migrate deploy`) y arranca.
   Health check en `/v1/health`.
4. Tu API quedará en `https://tocosas-api.onrender.com/v1`. Apunta
   `EXPO_PUBLIC_API_URL` de la app a esa URL.

Build local de la imagen (si tienes Docker):

```bash
cd backend
docker build -t tocosas-api .
docker run -p 3000:3000 -e DATABASE_URL=... -e JWT_ACCESS_SECRET=... tocosas-api
```

> **Railway/Fly.io** también sirven: usan el mismo `Dockerfile`. Solo define las
> variables de entorno de `.env.example` y provee un Postgres gestionado.

## Módulos implementados

| Módulo | Estado | Qué hace |
|--------|--------|----------|
| `finance/amortization` | ✅ | Motor de amortización (francés/alemán, tasa 0, abonos extra, simulador) |
| `auth` | ✅ | Registro/login/refresh con JWT + hashing scrypt + guard `JwtAuthGuard` |
| `entities` | ✅ | CRUD de entidades financieras (propias + catálogo global) |
| `debts` | ✅ | CRUD de deudas; calcula y persiste la amortización; simulador de abono |
| `transactions` | ✅ | CRUD de transacciones; el pago de deuda descuenta saldo (atómico); dashboard mensual |
| `whatsapp` | ✅ | ⭐ Webhook (verificación + firma HMAC + dedup), parser NLP en español, vinculación por OTP, procesador que registra movimientos y responde |
| `suggestions` | ✅ | Motor de reglas (priorizar deuda cara, alerta sobregiro, recorte gasto, abono extra) + comparador avalanche/snowball |
| `reminders` | ✅ | CRUD de recordatorios + scheduler diario (cron) que dispara avisos por push/WhatsApp |
| `finance/portfolio` | ✅ | Simulador de estrategias avalanche vs snowball (bola de nieve) |
| `sync` | ✅ | Sincronización offline: `GET /sync/pull` (delta) y `POST /sync/push` (idempotente, last-write-wins) |
| `prisma` | ✅ | Cliente Prisma compartido |

Todos los endpoints de negocio requieren `Authorization: Bearer <accessToken>`.

## Estructura

```
backend/
├── prisma/
│   ├── schema.prisma            # modelo de datos (fuente de verdad)
│   └── migrations/              # migración inicial aplicada
├── docker-compose.yml           # Postgres + Redis para dev
├── src/
│   ├── main.ts                  # bootstrap, prefijo /v1, Swagger, validación
│   ├── app.module.ts            # módulo raíz
│   ├── common/money.util.ts     # utilidades monetarias (round2, tolerancia)
│   ├── prisma/                  # PrismaService/Module (global)
│   ├── health/                  # /health y /ready
│   └── modules/
│       ├── finance/amortization # ⭐ motor de amortización + tests
│       ├── auth/                # JWT + scrypt + guard + tests
│       ├── entities/            # CRUD entidades
│       ├── debts/               # CRUD deudas (usa el motor) + tests del mapper
│       ├── transactions/        # CRUD transacciones + dashboard
│       └── whatsapp/            # ⭐ webhook + NLP + vinculación OTP + procesador
│           ├── nlp/             # amount/date/rule parsers (con tests)
│           ├── signature.util.ts   # validación HMAC del webhook
│           ├── whatsapp.provider.ts # interfaz + Meta Cloud API
│           ├── whatsapp-link.service.ts
│           └── message-processor.service.ts
└── package.json
```

## Integración WhatsApp (verificada end-to-end)

El pipeline `webhook → dedup → parser → transacción → respuesta` se probó
simulando el payload de Meta contra una base real:

- Número no vinculado → el bot pide vincular.
- OTP generado en la app + enviado por WhatsApp → vinculación.
- `"Gasté 45.000 en almuerzo"` → gasto/comida registrado.
- `"Pagué 250.000 a Bancolombia cuota crédito casa"` → pago asociado a la deuda,
  saldo descontado atómicamente.
- `"resumen"` → panorama financiero.
- Reenvío del mismo `message_id` → **no duplica** (idempotencia por `webhook_events`).

Ver el diseño en [doc 04](../docs/04-integracion-whatsapp.md). Para conectar Meta
real, configurar `WHATSAPP_*` en `.env` (sin credenciales, el provider loguea
las respuestas y omite la validación de firma para desarrollo).

## Smoke test manual (verificado)

```bash
# 1) registro → devuelve accessToken
curl -X POST localhost:3000/v1/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"juan@mail.com","password":"secreto123"}'

# 2) crear deuda (usa el token) → calcula cuota y amortización
curl -X POST localhost:3000/v1/debts -H "Authorization: Bearer <TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Credito casa","debtType":"hipotecario","originalAmount":60000000,
       "currentBalance":49000000,"startDate":"2026-07-15","termMonths":180,
       "interestRate":12.5,"rateBasis":"EA","paymentDay":5}'

# 3) simular abono extra / 4) registrar pago (descuenta saldo) / 5) dashboard
```

## Próximos módulos (siguientes PRs)

Según [doc 06 (plan por fases)](../docs/06-plan-desarrollo-fases.md):

1. Cola **BullMQ/Redis** para el procesamiento asíncrono del webhook (hoy es
   síncrono dentro del handler; ver [doc 04](../docs/04-integracion-whatsapp.md)).
2. Escalado del parser NLP con **LLM** de fallback (hoy: solo reglas) + OCR.
3. Capa offline en la app (SQLite/WatermelonDB) consumiendo `/sync/pull|push`.
4. Push real con **FCM** (hoy el canal push del scheduler solo loguea).
5. Auth por teléfono (OTP) y refresh-token rotatorio persistido.
