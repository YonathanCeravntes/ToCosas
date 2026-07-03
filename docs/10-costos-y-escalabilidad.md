# 10 · Costos y escalabilidad

Objetivo: **arrancar prácticamente gratis** y escalar con costos predecibles. Cifras aproximadas (USD, 2026) — validar con precios vigentes de cada proveedor.

---

## 1. Etapa 0 — Prototipo / MVP temprano (0–500 usuarios)

| Servicio | Plan | Costo/mes |
|----------|------|-----------|
| WhatsApp Cloud API (Meta) | 1.000 conversaciones de servicio gratis | **$0** |
| Twilio (sandbox, si se usa para prototipo) | Sandbox gratis | **$0** |
| Backend (Render/Railway/Fly.io) | Free/Hobby (API + worker + cron) | **$0–7** |
| PostgreSQL gestionado | Free/Starter | **$0–7** |
| Redis (Upstash) | Free tier | **$0** |
| Firebase (Auth + FCM) | Spark (gratis) | **$0** |
| Object Storage (R2/GCS) | Free tier | **$0** |
| LLM API (parseo) | Pago por uso, modelo ligero | **~$1–5** |
| Sentry | Free tier | **$0** |
| Dominio | anual | ~$1/mes |
| **Total** | | **≈ $0–20/mes** |

- **Play Console:** $25 USD una sola vez. **Apple Developer:** $99 USD/año.

---

## 2. Etapa 1 — Crecimiento (500–10.000 usuarios)

| Servicio | Costo/mes aprox. |
|----------|------------------|
| Backend (contenedores con más recursos / réplicas) | $25–100 |
| PostgreSQL (plan producción + backups) | $25–100 |
| Redis (plan pago) | $10–30 |
| WhatsApp Cloud API (>1.000 conversaciones) | Variable: conversaciones *utility*/*authentication* tienen tarifa por país; estimar por volumen de recordatorios |
| LLM API | $20–150 (según mensajes; mitigado por cascada rule-first + cache) |
| OCR (si activo) | Pago por imagen |
| FCM | Gratis |
| Observabilidad (Sentry pago) | $26+ |
| **Total** | **≈ $150–600/mes** |

**Palancas de control de costo:**
- **Rule-first parser** evita el 60-70% de llamadas al LLM.
- **Cache** de parseos y de resúmenes.
- **Agrupar recordatorios** y respetar `quiet_hours` (menos conversaciones WhatsApp).
- **Freemium:** OCR y WhatsApp ilimitado solo en premium → los costos variables los cubre quien paga.

---

## 3. Etapa 2 — Escala (10.000+ usuarios)

- **Backend:** Kubernetes (GKE/EKS) o Cloud Run con autoescalado; API y worker escalan independientes.
- **DB:** Cloud SQL/RDS con réplicas de lectura, PITR, connection pooling (PgBouncer). Considerar particionado de `transactions`.
- **Colas:** Redis en HA; escalar workers por profundidad de cola.
- **WhatsApp:** solicitar tier superior de mensajería a Meta; optimizar plantillas.
- **Costos dominados por:** cómputo, DB, y mensajería WhatsApp + LLM/OCR (variables por uso).

---

## 4. Modelo de costeo del diferenciador (WhatsApp + IA)

Costo marginal por transacción registrada vía WhatsApp ≈
```
  coste_mensaje_entrante (webhook, gratis)
+ coste_parseo (rule-based: ~$0  |  LLM fallback: fracción de centavo)
+ coste_confirmación saliente (dentro de ventana 24h: gratis en muchos casos)
+ (si aplica) coste_conversación WhatsApp según categoría/país
```
- Mantener el **rule-first** y la **ventana de 24h** (responder, no iniciar) minimiza el costo por transacción.
- Los **proactivos** (recordatorios fuera de 24h) usan plantillas → tienen tarifa: presupuestarlos y ofrecerlos como valor premium.

---

## 5. Resumen de escalabilidad técnica

| Componente | Cómo escala |
|------------|-------------|
| API NestJS | Sin estado → horizontal (réplicas + LB) |
| Worker NLP | Por profundidad de cola (más consumidores) |
| Cola BullMQ/Redis | Redis HA; sharding si necesario |
| PostgreSQL | Réplicas de lectura, pooling, particionado, índices |
| Push (FCM) | Gestionado por Google, escala solo |
| WhatsApp | Límites gestionados con Meta; colas de envío + backoff |
| Storage | Object storage escala infinito |

**Conclusión:** la arquitectura (stateless + colas + Postgres gestionado) permite empezar por **~$0–20/mes** y crecer linealmente, con los costos variables (LLM, OCR, WhatsApp proactivo) alineados al modelo freemium para que el crecimiento se autofinancie.
