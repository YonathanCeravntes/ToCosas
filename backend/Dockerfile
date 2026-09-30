# --- Etapa 1: build ---
FROM node:20-slim AS builder
WORKDIR /app

# openssl es requerido por Prisma para generar el cliente.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# --- Etapa 2: runtime ---
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Cliente Prisma generado + esquema/migraciones + build.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Aplica migraciones pendientes y arranca. Idempotente en cada despliegue.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
