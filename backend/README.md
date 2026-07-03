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

## Estructura

```
backend/
├── prisma/schema.prisma         # modelo de datos (fuente de verdad)
├── docker-compose.yml           # Postgres + Redis para dev
├── src/
│   ├── main.ts                  # bootstrap, prefijo /v1, Swagger, validación
│   ├── app.module.ts            # módulo raíz
│   ├── common/money.util.ts     # utilidades monetarias (round2, tolerancia)
│   ├── health/                  # /health y /ready
│   └── modules/
│       └── finance/
│           ├── finance.module.ts
│           └── amortization/    # ⭐ motor de amortización + tests
└── package.json
```

## Próximos módulos (siguientes PRs)

Según [doc 06 (plan por fases)](../docs/06-plan-desarrollo-fases.md):

1. `AuthModule` — email + OTP por teléfono (JWT + refresh).
2. `EntitiesModule`, `DebtsModule` (usa este motor), `TransactionsModule`.
3. `WhatsappModule` — webhook + cola BullMQ + worker NLP ([doc 04](../docs/04-integracion-whatsapp.md)).
4. `RemindersModule` + scheduler.
5. `SyncModule` — sincronización delta offline.
