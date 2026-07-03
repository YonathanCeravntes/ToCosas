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

## Módulos implementados

| Módulo | Estado | Qué hace |
|--------|--------|----------|
| `finance/amortization` | ✅ | Motor de amortización (francés/alemán, tasa 0, abonos extra, simulador) |
| `auth` | ✅ | Registro/login/refresh con JWT + hashing scrypt + guard `JwtAuthGuard` |
| `entities` | ✅ | CRUD de entidades financieras (propias + catálogo global) |
| `debts` | ✅ | CRUD de deudas; calcula y persiste la amortización; simulador de abono |
| `transactions` | ✅ | CRUD de transacciones; el pago de deuda descuenta saldo (atómico); dashboard mensual |
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
│       └── transactions/        # CRUD transacciones + dashboard
└── package.json
```

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

1. `WhatsappModule` — webhook + cola BullMQ + worker NLP ([doc 04](../docs/04-integracion-whatsapp.md)).
2. `RemindersModule` + scheduler (recordatorios push/WhatsApp).
3. `SuggestionsModule` — motor de reglas (avalanche/snowball, sobregiro).
4. `SyncModule` — sincronización delta offline.
5. Auth por teléfono (OTP) y refresh-token rotatorio persistido.
