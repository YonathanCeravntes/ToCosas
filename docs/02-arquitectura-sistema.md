# 02 · Arquitectura del sistema (notación C4)

## 1. Decisiones de arquitectura y justificación

### 1.1 Backend: NestJS (Node.js + TypeScript) — no serverless puro

Se evaluaron dos caminos:

| Criterio | **NestJS en contenedor** ✅ | Firebase Functions + Firestore |
|----------|-----------------------------|-------------------------------|
| Lógica financiera compleja (amortización, motor de reglas) | Excelente: dominio bien modelado, testeable | Se vuelve difuso en funciones sueltas |
| Colas de procesamiento asíncrono (WhatsApp) | Nativo con BullMQ/Redis | Requiere Pub/Sub + Tasks, menos control |
| Transacciones ACID (contabilidad) | PostgreSQL nativo | Firestore no es ACID multi-documento cómodo |
| Consultas relacionales (deuda↔transacciones↔entidad) | SQL natural | Anti-patrón en Firestore (denormalización) |
| Costo inicial | Bajo (un contenedor + Postgres gestionado) | Muy bajo (Spark) pero se dispara con lecturas |
| Portabilidad (evitar lock-in) | Alta | Baja (lock-in Google) |

**Decisión:** **NestJS + PostgreSQL** como núcleo, usando **Firebase solo para servicios gestionados puntuales** (Auth como opción, FCM para push, Cloud Storage para adjuntos). Esto nos da un dominio financiero robusto y transaccional sin renunciar a los servicios gratuitos de Google donde aportan valor.

> Nota: el enunciado permitía Firebase Functions + Firestore como alternativa válida. Para un MVP *muy* barato y rápido es defendible, pero la naturaleza **contable y relacional** de las deudas/amortizaciones y la necesidad de **colas y NLP asíncrono** inclinan la balanza a NestJS+Postgres. El [doc 10](10-costos-y-escalabilidad.md) muestra cómo mantenerlo casi gratis al inicio.

### 1.2 Frontend: React Native (Expo)

- Una base de código → Android + iOS (requisito de descarga en ambas tiendas).
- Ecosistema maduro para offline (**WatermelonDB** sobre SQLite), notificaciones y navegación.
- Expo con *dev/prod builds* (EAS) acelera el time-to-store.
- Alternativa Flutter descartada solo por afinidad de stack (TS de punta a punta: mismo lenguaje en app y backend, tipos compartidos).

### 1.3 Base de datos: PostgreSQL

- Integridad referencial y transacciones ACID para movimientos de dinero.
- Cálculos y agregaciones (`SUM`, ventanas) para dashboards.
- `pgvector` opcional a futuro para búsquedas semánticas de categorización.

---

## 2. C4 — Nivel 1: Diagrama de contexto

```
                         ┌──────────────────────────────────────────┐
                         │                 USUARIO                    │
                         │  (persona con deudas y compromisos de pago)│
                         └───────┬───────────────────────┬───────────┘
                                 │                         │
                    usa la app   │                         │  escribe/envía fotos
                   (Android/iOS) │                         │  por WhatsApp
                                 ▼                         ▼
                    ┌────────────────────┐      ┌───────────────────────┐
                    │   App móvil        │      │  WhatsApp (cliente)    │
                    │   ToCosas          │      │  del usuario           │
                    └─────────┬──────────┘      └───────────┬───────────┘
                              │ HTTPS/REST                   │
                              │                              ▼
                              │                  ┌───────────────────────┐
                              │                  │ WhatsApp Business      │
                              │                  │ Cloud API (Meta)       │  ← sistema externo
                              │                  └───────────┬───────────┘
                              │                              │ webhook / send API
                              ▼                              ▼
              ┌───────────────────────────────────────────────────────────┐
              │                 SISTEMA ToCosas (backend)                   │
              │  API + motor financiero + parser NLP + colas + scheduler    │
              └───┬───────────────┬───────────────┬───────────────┬────────┘
                  │               │               │               │
                  ▼               ▼               ▼               ▼
          ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐
          │ Firebase   │  │  FCM       │  │  Proveedor │  │  LLM API       │
          │ Auth       │  │  (push)    │  │  OCR       │  │ (NLP/parseo)   │
          │ (externo)  │  │ (externo)  │  │ (externo)  │  │ (externo)      │
          └────────────┘  └────────────┘  └────────────┘  └────────────────┘
```

**Actores y sistemas externos:**
- **Usuario** — interactúa por la app y por WhatsApp.
- **WhatsApp Business Cloud API (Meta)** — recibe/envía mensajes.
- **Firebase Auth** — identidad (opcional; alternativa: auth propio con JWT).
- **FCM** — notificaciones push.
- **Proveedor OCR** (Google Vision / AWS Textract / Tesseract self-hosted) — extrae datos de comprobantes.
- **LLM API** (Claude / GPT / modelo self-hosted) — parseo de lenguaje natural.

---

## 3. C4 — Nivel 2: Diagrama de contenedores

```
┌───────────────────────────── APP MÓVIL (React Native / Expo) ─────────────────────────────┐
│  UI (screens)  ·  State (Redux/Zustand)  ·  API client  ·  WatermelonDB (SQLite offline)   │
│  Sync engine (delta pull/push)  ·  Push handler (FCM)                                        │
└───────────────────────────────────────────┬───────────────────────────────────────────────┘
                                             │ HTTPS (REST/JSON, JWT)
                                             ▼
┌──────────────────────────────────── BACKEND (contenedores) ────────────────────────────────┐
│                                                                                             │
│   ┌────────────────────┐   ┌───────────────────────┐   ┌─────────────────────────────┐     │
│   │  API Gateway /     │   │  Servicio de dominio  │   │  Webhook WhatsApp           │     │
│   │  REST (NestJS)     │──▶│  (deudas, tx,         │   │  (endpoint público, verifica│     │
│   │  auth, rate limit  │   │  amortización,        │   │  firma X-Hub-Signature)     │     │
│   │                    │   │  motor de reglas)     │   └──────────────┬──────────────┘     │
│   └─────────┬──────────┘   └──────────┬────────────┘                  │ encola             │
│             │                         │                               ▼                    │
│             │                         │                  ┌─────────────────────────┐       │
│             │                         │                  │  Cola (BullMQ / Redis)  │       │
│             │                         │                  │  inbound_messages       │       │
│             │                         │                  └───────────┬─────────────┘       │
│             │                         │                              │ consume             │
│             │                         │                              ▼                     │
│             │                         │              ┌───────────────────────────────┐     │
│             │                         │              │  Worker NLP / Parser          │     │
│             │                         │              │  (reglas + LLM + OCR)         │     │
│             │                         │              │  → crea Transaction           │     │
│             │                         │              └──────────────┬────────────────┘     │
│             │                         │                             │                      │
│             ▼                         ▼                             ▼                      │
│   ┌──────────────────────────────────────────────────────────────────────────────┐        │
│   │                        PostgreSQL (datos)   +   Redis (cache/colas)            │        │
│   └──────────────────────────────────────────────────────────────────────────────┘        │
│                                                                                             │
│   ┌────────────────────────┐   ┌───────────────────────┐   ┌──────────────────────────┐    │
│   │  Scheduler (cron)       │   │  Servicio Notif.      │   │  Sync API                │    │
│   │  recordatorios, resúmen │──▶│  (FCM + WhatsApp send)│   │  (delta pull/push)       │    │
│   └────────────────────────┘   └───────────────────────┘   └──────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Contenedores (responsabilidades)

| Contenedor | Responsabilidad | Tech |
|------------|-----------------|------|
| **API REST** | Endpoints CRUD, auth, rate limiting, validación | NestJS, class-validator |
| **Servicio de dominio** | Amortización, proyecciones, motor de reglas de sugerencias | NestJS módulos |
| **Webhook WhatsApp** | Recibe eventos de Meta, valida firma, encola | NestJS controller |
| **Cola** | Desacopla recepción de procesamiento (picos, reintentos) | BullMQ sobre Redis |
| **Worker NLP** | Parsea texto/imagen → transacción; llama LLM/OCR; maneja ambigüedad | NestJS worker |
| **Scheduler** | Dispara recordatorios y resúmenes programados | `@nestjs/schedule` (cron) |
| **Servicio Notificaciones** | Envía push (FCM) y mensajes salientes de WhatsApp | Firebase Admin SDK + Graph API |
| **Sync API** | Endpoints de sincronización delta para offline | NestJS |
| **PostgreSQL** | Persistencia transaccional | Postgres 15+ |
| **Redis** | Cache, colas, rate limiting, estado conversacional del bot | Redis 7 |

---

## 4. C4 — Nivel 3: Componentes del Worker NLP (el corazón del diferenciador)

```
Mensaje entrante (job en cola)
        │
        ▼
┌────────────────────┐   ¿ya vinculado el número?  ── no ──▶ ┌───────────────────────┐
│  Identity Resolver │──────────────────────────────────────▶│  Onboarding / OTP flow │
└─────────┬──────────┘                                        └───────────────────────┘
          │ sí (user_id resuelto)
          ▼
┌────────────────────┐
│  Message Router    │  ¿texto? ¿imagen? ¿comando? ¿respuesta a pregunta pendiente?
└─────────┬──────────┘
          ├── imagen ──▶ ┌──────────────┐   ┌──────────────────┐
          │              │ OCR Adapter  │──▶│ Field Extractor  │
          │              └──────────────┘   └────────┬─────────┘
          │                                          │
          ├── texto ───▶ ┌─────────────────────────┐ │
          │              │ Rule-based Parser        │ │  (regex montos, fechas,
          │              │ (rápido, barato, offline)│ │   keywords entidades)
          │              └──────────┬──────────────┘ │
          │                         │ baja confianza  │
          │                         ▼                 │
          │              ┌─────────────────────────┐  │
          │              │ LLM Parser (intent +     │  │
          │              │ slots estructurados JSON)│  │
          │              └──────────┬──────────────┘  │
          │                         │                 │
          ▼                         ▼                 ▼
        ┌──────────────────────────────────────────────────┐
        │            Transaction Assembler                  │
        │  (normaliza monto, resuelve entidad/categoría,    │
        │   calcula confianza global)                        │
        └───────────────┬───────────────────────────────────┘
                        │
          alta confianza │            baja confianza
                        ▼                     ▼
        ┌──────────────────────┐   ┌──────────────────────────┐
        │ Persiste Transaction │   │ Clarification Manager    │
        │ + responde confirmac.│   │ (pregunta categoría/     │
        └──────────────────────┘   │ entidad, guarda contexto)│
                                    └──────────────────────────┘
```

Detalle completo del flujo, prompts y fallback en el **[documento 04](04-integracion-whatsapp.md)**.

---

## 5. Vista de despliegue (infraestructura)

```
                 ┌─────────────────── Internet ───────────────────┐
                 │                                                 │
        App Stores │                             Meta Cloud API    │
      (Play/AppStore)                                              │
                 │                                                 │
        ┌────────▼─────────┐                          ┌───────────▼──────────┐
        │  App en teléfono │                          │  Webhook público     │
        └────────┬─────────┘                          │  (HTTPS + WAF)       │
                 │ HTTPS                               └───────────┬──────────┘
                 ▼                                                 │
        ┌───────────────────────── Cloud (GCP / AWS / Render / Fly.io) ───────────────────────┐
        │  Load Balancer / Ingress (TLS)                                                      │
        │      │                                                                              │
        │      ▼                                                                              │
        │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                             │
        │  │ API (N réplicas)│ │ Worker NLP   │   │ Scheduler    │   (contenedores/pods)      │
        │  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                             │
        │         └─────────┬────────┴──────────────────┘                                     │
        │                   ▼                                                                 │
        │   ┌──────────────────────┐   ┌───────────────┐   ┌─────────────────────┐            │
        │   │ PostgreSQL (gestionado)│  │ Redis (gestion)│  │ Object Storage       │           │
        │   │  + backups automáticos │  │                │  │ (adjuntos/comprob.)  │           │
        │   └──────────────────────┘   └───────────────┘   └─────────────────────┘            │
        └──────────────────────────────────────────────────────────────────────────────────────┘

        Servicios externos gestionados: Firebase Auth · FCM · LLM API · OCR API · Sentry (obs.)
```

- **MVP barato:** todo en **Render / Railway / Fly.io** (contenedores + Postgres + Redis gestionados con planes gratuitos/mínimos). Ver [doc 10](10-costos-y-escalabilidad.md).
- **Escala:** migración a GKE/EKS con autoescalado; Postgres gestionado (Cloud SQL/RDS) con réplicas de lectura.

---

## 6. Atributos de calidad (cómo la arquitectura los cumple)

| Atributo | Mecanismo |
|----------|-----------|
| **Escalabilidad** | API y Worker sin estado → escalado horizontal; colas absorben picos de WhatsApp |
| **Resiliencia** | Reintentos con backoff en la cola; DLQ (dead-letter) para mensajes irrecuperables; webhook responde 200 rápido y procesa async |
| **Disponibilidad del webhook** | El endpoint solo valida+encola (latencia mínima) para no perder eventos de Meta |
| **Consistencia** | Transacciones ACID en Postgres; `outbox pattern` para mensajes salientes |
| **Offline-first** | WatermelonDB local + sync delta idempotente |
| **Observabilidad** | Logs estructurados, tracing (OpenTelemetry), Sentry, métricas de cola |
| **Seguridad** | Ver [doc 07](07-seguridad-privacidad.md): TLS, cifrado en reposo, validación de firma del webhook, JWT, rate limiting |
