# 06 · Plan de desarrollo por fases

Roadmap incremental: cada fase entrega valor usable y de-riesga lo siguiente. Estimaciones asumen un equipo pequeño (2 devs backend, 2 mobile, 1 diseño/PM part-time, 1 QA part-time). Ajustar según capacidad real.

---

## Stack recomendado por capa (referencia rápida)

| Capa | Tecnología | Notas |
|------|-----------|-------|
| App móvil | **React Native + Expo (EAS)**, TypeScript | Android + iOS con una base de código |
| Estado app | Zustand o Redux Toolkit | Simplicidad + persistencia |
| Offline local | **WatermelonDB (SQLite)** | Alto rendimiento + sync delta |
| Navegación | React Navigation | Estándar de facto |
| UI | Tamagui / React Native Paper | Componentes accesibles |
| Gráficas | Victory Native / react-native-svg-charts | Amortización, snowball/avalanche |
| Backend | **NestJS (Node + TypeScript)** | Modular, testeable |
| API | REST + OpenAPI (`@nestjs/swagger`) | GraphQL opcional a futuro |
| ORM | Prisma o TypeORM | Prisma recomendado (DX + migraciones) |
| Base de datos | **PostgreSQL 15+** | Fuente de verdad |
| Cache/colas | **Redis + BullMQ** | Colas de WhatsApp, cache, estado bot |
| Auth | Firebase Auth **o** Auth propio (JWT + refresh) | Ver doc 07 |
| Push | **Firebase Cloud Messaging (FCM)** | Android + iOS (APNs vía FCM) |
| WhatsApp | **WhatsApp Cloud API (Meta)**; Twilio para prototipo | Interfaz `WhatsAppProvider` |
| NLP | LLM ligero vía API (Claude Haiku / equiv.) + reglas | Cascada rule-first |
| OCR | Google Vision / Textract / Tesseract | Fase 3, tras interfaz |
| Storage adjuntos | Cloud Storage (GCS/S3) cifrado | Comprobantes |
| Observabilidad | Sentry + OpenTelemetry + logs estructurados | Errores y trazas |
| CI/CD | GitHub Actions + EAS Build/Submit | Ver doc 09 |
| Infra | Render / Railway / Fly.io (MVP) → GKE/EKS (escala) | Contenedores |

---

## FASE 1 — MVP (≈ 10-12 semanas)

**Meta:** un usuario registra deudas, transacciones (app + WhatsApp texto), ve dashboard y recibe recordatorios push. Funciona offline.

### Épicas y entregables

1. **Fundaciones (semana 1-2)**
   - Monorepo (app + api) o dos repos; TypeScript config compartido.
   - CI básico, entornos (dev/stage/prod), Postgres + Redis en Render.
   - Auth (email + teléfono OTP), modelo `users`, `user_settings`.

2. **Entidades, categorías, deudas (semana 3-5)**
   - CRUD entidades (+ catálogo global sembrado).
   - CRUD categorías (globales + custom).
   - CRUD deudas + **motor de amortización (sistema francés / cuota fija)**.
   - Endpoint `/debts/summary`.

3. **Transacciones + offline (semana 5-7)**
   - CRUD transacciones; pago de deuda descuenta saldo.
   - WatermelonDB local + **sync delta** (`/sync/pull`, `/sync/push`).
   - Dashboard (`/dashboard`).

4. **WhatsApp captura texto (semana 6-10)** ⭐
   - Webhook (verificación + firma + dedup + cola).
   - `WhatsAppProvider` (Twilio sandbox → Meta Cloud).
   - Flujo de vinculación (OTP).
   - Rule-based parser + LLM fallback + Assembler.
   - Clarification Manager (estado en Redis).
   - Confirmaciones y resumen on-demand.

5. **Recordatorios push (semana 9-11)**
   - `reminders` CRUD; scheduler (cron); FCM push local.

6. **Hardening y beta (semana 11-12)**
   - Seguridad (doc 07), tests (doc 08), pulido UX, TestFlight/Internal testing.

**Definición de "listo" del MVP:** los criterios de aceptación de cada Must-have del [doc 01](01-funcionalidades-moscow.md) pasan sus tests E2E.

---

## FASE 2 — Inteligencia y bidireccionalidad (≈ 8-10 semanas)

**Meta:** ToCosas deja de ser un registro y se vuelve un *copiloto*.

- **Motor de sugerencias (reglas):**
  - Priorización de deudas por tasa (avalanche) y por saldo (snowball).
  - Alerta de sobregiro / falta de liquidez (gastos > ingresos proyectados).
  - Detección de sobregasto por categoría.
  - Persistencia en `suggestions` + endpoints accept/dismiss.
- **Simulador de abonos** (`/simulator/extra-payment`, `/simulator/strategy`).
- **Recordatorios y resúmenes por WhatsApp** (plantillas Meta aprobadas, outbox).
- **Sincronización bidireccional mejorada** (push FCM cuando entra algo por WhatsApp; eco opcional configurable).
- **Tasas variables y abonos extraordinarios** con recálculo de amortización.
- **Categorías personalizables** completas y multi-dispositivo.

---

## FASE 3 — Diferenciación avanzada (≈ 8-12 semanas)

**Meta:** features premium y "wow".

- **OCR de comprobantes** (foto por WhatsApp/app → transacción).
- **Visualización avalanche vs snowball** interactiva + gráfica de progreso de pago.
- **IA conversacional avanzada** (preguntas abiertas: "¿puedo darme un gusto este mes?").
- **Sincronización en tiempo real** (WebSockets).
- **Exportación** CSV/Excel/PDF, reportes mensuales.
- **Metas y presupuestos** por categoría.
- **Registro de acreencias** (donde el usuario presta), widgets de home screen, multi-moneda.
- **Monetización:** paywall premium, gestión de suscripciones (RevenueCat).

---

## Dependencias y riesgos por fase

| Riesgo | Fase | Mitigación |
|--------|------|-----------|
| Aprobación de negocio/WABA en Meta tarda | 1 | Prototipar con Twilio sandbox en paralelo |
| Calidad del parser NLP en español coloquial | 1 | Rule-first + set de pruebas amplio + logging de fallos para mejorar |
| Costos LLM/OCR crecen | 2-3 | Cascada, cache, límites por plan freemium |
| Complejidad de sync offline (conflictos) | 1 | Last-write-wins + idempotencia; tests de concurrencia |
| Aprobación de plantillas de WhatsApp | 2 | Enviar temprano; textos utility claros |
| Publicación en App Store (revisión estricta) | 1 | Cumplir guidelines desde el diseño (doc 09) |

---

## Organización de trabajo sugerida

- **Sprints de 2 semanas**, demo al final de cada uno.
- **Feature flags** para liberar gradualmente (WhatsApp, sugerencias).
- **Trunk-based** con PRs pequeños + CI verde obligatorio.
- Backlog priorizado según MoSCoW; el diferenciador WhatsApp nunca se despriorioriza por debajo de lo cosmético.
