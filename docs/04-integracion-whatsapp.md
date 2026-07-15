# 04 · Integración con WhatsApp (deep dive) — el diferenciador clave

> Este es el corazón de ToCosas. Aquí se detalla la arquitectura, el flujo de mensajes, la vinculación de cuentas, el parser NLP, el manejo de ambigüedad, la sincronización bidireccional, el OCR y las consideraciones de cumplimiento con Meta.

---

## 1. Elección de proveedor: WhatsApp Business Cloud API (Meta) vs. Twilio

| Criterio | **WhatsApp Cloud API (Meta)** ✅ MVP | Twilio API for WhatsApp |
|----------|-------------------------------------|-------------------------|
| Costo base | **Gratis** el uso de la API + 1.000 conversaciones de servicio/mes gratis | Fee de Twilio por mensaje **encima** del de Meta |
| Time-to-market | Directo con Meta; requiere verificación de negocio | Más rápido de prototipar (sandbox instantáneo) |
| Control | Total sobre webhook y plantillas | Abstracción cómoda pero menos control |
| Lock-in | Bajo | Medio |
| Recomendación | **Producción**: Cloud API | **Prototipo/sandbox** inicial: Twilio |

**Estrategia recomendada:** prototipar el flujo conversacional con el **sandbox de Twilio** (activación en minutos, sin esperar verificación de negocio), y en paralelo tramitar la verificación de Meta para migrar a **Cloud API** en producción. El código debe abstraer el proveedor detrás de una interfaz `WhatsAppProvider` (patrón adaptador) para cambiar sin tocar el dominio.

```typescript
interface WhatsAppProvider {
  verifyWebhook(query, body, signature): boolean;
  parseInbound(rawBody): InboundMessage[];
  sendText(to: string, body: string): Promise<void>;
  sendTemplate(to: string, template: string, params: any[]): Promise<void>;
  downloadMedia(mediaId: string): Promise<Buffer>;
}
// Implementaciones: MetaCloudProvider, TwilioProvider
```

---

## 2. Conceptos de la Cloud API que condicionan el diseño

- **Ventana de servicio de 24 h:** tras un mensaje del usuario, el negocio puede responder **texto libre** durante 24 h. Fuera de esa ventana, para *iniciar* conversación (p. ej. un recordatorio proactivo) hay que usar una **plantilla (template) pre-aprobada** por Meta.
- **Categorías de conversación:** *service*, *utility*, *marketing*, *authentication*. Los recordatorios de pago encajan en **utility**; el OTP en **authentication**.
- **Opt-in obligatorio:** el usuario debe consentir explícitamente recibir mensajes (lo capturamos en `whatsapp_links.opt_in`).
- **Firma del webhook:** cada POST de Meta llega firmado con `X-Hub-Signature-256` (HMAC-SHA256 con el *App Secret*). **Hay que validarlo** antes de procesar.
- **Verificación del webhook (GET):** Meta hace un GET con `hub.mode`, `hub.verify_token`, `hub.challenge`; respondemos el `challenge` si el token coincide.

### Plantillas que necesitaremos aprobadas

| Plantilla | Categoría | Ejemplo |
|-----------|-----------|---------|
| `otp_vinculacion` | authentication | "Tu código para vincular ToCosas es {{1}}. Vence en 10 min." |
| `recordatorio_pago` | utility | "🔔 Mañana vence tu cuota de {{1}} por {{2}} en {{3}}." |
| `resumen_semanal` | utility | "📊 Tu deuda total es {{1}}. Este mes debes {{2}}." |
| `alerta_liquidez` | utility | "⚠️ Tus gastos superan tus ingresos proyectados este mes." |

---

## 3. Arquitectura de la integración

```
 Usuario (WhatsApp)                         Meta Cloud API
        │  "Pagué $250.000 a Bancolombia"        │
        └───────────────────────────────────────▶│
                                                  │ POST webhook (firmado)
                                                  ▼
                            ┌───────────────────────────────────────┐
                            │  Webhook Controller (NestJS)          │
                            │  1. valida X-Hub-Signature-256        │
                            │  2. dedup por message_id              │
                            │  3. persiste en webhook_events        │
                            │  4. ENCOLA job y responde 200 (<1s)   │
                            └───────────────────┬───────────────────┘
                                                │  enqueue
                                                ▼
                            ┌───────────────────────────────────────┐
                            │  Cola BullMQ (Redis): inbound_messages│
                            │  reintentos exponenciales + DLQ       │
                            └───────────────────┬───────────────────┘
                                                │  consume
                                                ▼
                            ┌───────────────────────────────────────┐
                            │  Worker de procesamiento              │
                            │  Identity → Router → Parser (NLP/OCR) │
                            │  → Assembler → Persistencia/Aclaración │
                            └───────────────────┬───────────────────┘
                                                │  respuesta
                                                ▼
                            ┌───────────────────────────────────────┐
                            │  WhatsApp Provider .sendText/Template  │
                            │  "✅ Registré tu pago de $250.000..."  │
                            └───────────────────────────────────────┘
```

**Por qué cola + respuesta 200 inmediata:** Meta reintenta si el webhook tarda o falla, lo que causaría **duplicados** y timeouts. La regla de oro: **el webhook solo valida, deduplica, persiste el evento crudo y encola; todo el trabajo pesado (LLM, OCR, DB) ocurre en el worker.**

---

## 4. Flujo de vinculación (onboarding del número)

Primer contacto de un número desconocido:

```
Usuario: "Hola" (desde +57 300 111 2222, número no vinculado)
   │
   ▼
Worker: no existe whatsapp_link verificado para ese número
   │
   ▼
Bot: "👋 ¡Hola! Soy ToCosas. Para registrar tus movimientos aquí,
      vincula este número a tu cuenta.
      Opción A: responde con el código que ves en la app (Ajustes → WhatsApp).
      Opción B: toca este enlace: https://app.tocosas.co/link?token=abc123"
```

### 4.1 Método A — OTP generado en la app

```
App (usuario logueado) → POST /whatsapp/link/start
   backend: crea whatsapp_link(status=pending, otp_code_hash, expires=+10min)
   backend → muestra OTP en la app: "834192"
Usuario escribe "834192" por WhatsApp
   Worker: matchea OTP por número+código, verifica no expirado
   → whatsapp_link.status = verified, opt_in = true, verified_at = now()
Bot: "✅ ¡Listo! Tu WhatsApp quedó vinculado a tu cuenta (juan@mail.com).
      Ya puedes registrar gastos, ingresos y pagos escribiéndome."
```

### 4.2 Método B — enlace mágico (deep link)

```
App → POST /whatsapp/link/magic → genera token firmado (JWT corto)
El enlace abre la app o una web que llama POST /whatsapp/link/confirm
   con el token + el wa_id capturado del primer mensaje.
```

> **Seguridad:** OTP hasheado (nunca en claro), expira en 10 min, máximo 5 intentos, rate-limit por número. El opt-in queda registrado con timestamp para cumplimiento de Meta.

### 4.3 Diagrama de secuencia (vinculación)

```
Usuario        WhatsApp/Meta        Webhook         Worker          DB           App
  │  "Hola"          │                 │              │              │             │
  │─────────────────▶│                 │              │              │             │
  │                  │──POST webhook──▶│              │              │             │
  │                  │                 │──enqueue────▶│              │             │
  │                  │                 │              │──lookup link▶│             │
  │                  │                 │              │◀─none────────│             │
  │                  │◀────sendText────│◀─────────────│ (pide vincular)            │
  │◀─"vincula..."────│                 │              │              │             │
  │                  │                 │              │              │  usuario abre app
  │                  │                 │              │              │◀──POST link/start
  │                  │                 │              │              │──OTP 834192─▶│ (visible)
  │  "834192"        │                 │              │              │             │
  │─────────────────▶│──POST webhook──▶│──enqueue────▶│──verify OTP─▶│             │
  │                  │◀────sendText────│◀─────────────│ (verified)   │             │
  │◀─"✅ vinculado"──│                 │              │              │             │
```

---

## 5. El parser NLP (motor de comprensión)

Estrategia **híbrida en cascada** (barato→caro, rápido→preciso):

```
Texto entrante
   │
   ├─(1) Normalización: minúsculas, limpiar, detectar montos/fechas con regex
   │
   ├─(2) Rule-based parser (regex + diccionarios)  ── confianza alta ──▶ listo
   │        montos: \$?\s?[\d.,]+(?:\s?(mil|k|millones|m))?
   │        keywords ingreso: "me llegó","ingreso","me pagaron","cobré"
   │        keywords gasto:   "gasté","pagué","compré","me costó"
   │        keywords deuda:   "cuota","crédito","tarjeta","abono","préstamo"
   │        entidades: match contra financial_entities del usuario + catálogo global
   │        categorías: match contra categories.keywords
   │
   └─(3) LLM parser (solo si confianza < umbral) ──▶ intent + slots JSON
```

### 5.1 Parser basado en reglas (cubre el 60-70% de casos comunes, gratis)

Extrae de forma determinista:
- **Monto:** `$250.000`, `250k`, `1.2 millones`, `45mil` → `250000`, `250000`, `1200000`, `45000`.
- **Tipo (kind):** por verbos clave.
- **Entidad:** fuzzy-match ("bancolombia", "bbva", "nequi") contra entidades.
- **Categoría:** por keywords ("almuerzo"→comida, "uber"→transporte).
- **Fecha:** "ayer", "hoy", "el 3 de julio", "el lunes" → fecha ISO.

### 5.2 LLM parser (cuando las reglas no bastan)

Prompt de extracción estructurada (function calling / JSON mode):

```
SYSTEM: Eres un extractor de transacciones financieras. Devuelve SOLO JSON.
Fecha de referencia (hoy): {today}. Moneda por defecto: COP.
Categorías disponibles: [comida, transporte, servicios, entretenimiento,
salud, arriendo, deuda, freelance, salario, otros].
Entidades conocidas del usuario: [Bancolombia, BBVA, Nequi, Davivienda].

Esquema de salida:
{
  "intent": "registrar_transaccion | consulta_resumen | saludo | ayuda | desconocido",
  "kind": "ingreso | gasto | pago_deuda | null",
  "amount": number | null,
  "currency": "COP",
  "category": string | null,
  "entity": string | null,
  "debt_hint": string | null,      // "crédito casa" → para matchear una deuda
  "occurred_at": "YYYY-MM-DD" | null,
  "note": string | null,
  "confidence": 0.0-1.0,
  "missing": [ "category" | "entity" | "amount" ... ]  // campos que faltan
}

USER: "Pagué $250.000 a Bancolombia cuota crédito casa"
ASSISTANT:
{
  "intent": "registrar_transaccion",
  "kind": "pago_deuda",
  "amount": 250000,
  "currency": "COP",
  "category": "deuda",
  "entity": "Bancolombia",
  "debt_hint": "crédito casa",
  "occurred_at": "2026-07-03",
  "note": "cuota crédito casa",
  "confidence": 0.95,
  "missing": []
}
```

**Ejemplos objetivo (deben funcionar):**

| Mensaje | kind | amount | entity | category | notas |
|---------|------|--------|--------|----------|-------|
| "Pagué $250.000 a Bancolombia cuota crédito casa" | pago_deuda | 250000 | Bancolombia | deuda | matchea deuda "casa" |
| "Gasté $45.000 en almuerzo" | gasto | 45000 | — | comida | |
| "Me llegó ingreso de $1.200.000 por freelance" | ingreso | 1200000 | — | freelance | |
| "abone 100k a la tarjeta" | pago_deuda | 100000 | — | deuda | pide entidad si hay varias tarjetas |
| "cuanto debo?" | consulta_resumen | — | — | — | responde resumen |

### 5.3 Selección de modelo LLM

- **MVP:** LLM ligero vía API (p. ej. **Claude Haiku** o equivalente) — barato, baja latencia, buen español. Coste ~fracciones de centavo por mensaje.
- **Alternativa gestionada:** **Dialogflow CX** para intents/entities si se prefiere no-código, aunque es menos flexible con texto libre monetario en español coloquial.
- **Optimización:** cachear parseos de mensajes idénticos; el rule-based evita el 60-70% de llamadas al LLM.

---

## 6. Ensamblado y resolución (`Transaction Assembler`)

1. **Normaliza monto** a `NUMERIC` y moneda del usuario.
2. **Resuelve entidad:** fuzzy-match contra `financial_entities`; si no existe y el usuario la nombró, la crea (tipo `otro`) o pregunta.
3. **Resuelve deuda:** si `kind=pago_deuda`, matchea `debt_hint` contra `debts.name`/tipo. Si hay ambigüedad (varias tarjetas), pregunta.
4. **Resuelve categoría** por keyword/LLM; default por tipo.
5. **Confianza global** = combinación de confianzas de slots. Si ≥ umbral (p.ej. 0.75) → persiste `status=confirmada`. Si < umbral → `pendiente_confirmacion` + flujo de aclaración.

---

## 7. Manejo de ambigüedad (Clarification Manager)

Cuando falta un dato o hay baja confianza, el bot **pregunta amablemente** y guarda el contexto en `wa_conversations` (o Redis, TTL 15 min).

```
Usuario: "abone 100k a la tarjeta"
Bot: "Tienes 2 tarjetas registradas 💳 ¿A cuál abonaste?
      1️⃣ Visa Bancolombia
      2️⃣ Mastercard BBVA"
Usuario: "1"
Bot: "✅ Registré tu abono de $100.000 a la Visa Bancolombia hoy.
      Nuevo saldo de esa tarjeta: $1.900.000."
```

**Máquina de estados conversacional:**

```
idle ──(mensaje parseado, falta dato)──▶ clarifying
clarifying ──(respuesta válida)──▶ idle (persiste tx)
clarifying ──(respuesta inválida x2)──▶ idle (guarda como pendiente en app)
idle ──(primer contacto)──▶ awaiting_link
awaiting_link ──(OTP correcto)──▶ idle
```

Reglas:
- El contexto pendiente **expira** (TTL) para no confundir mensajes futuros.
- Si el usuario ignora la pregunta y manda otra cosa, se descarta el contexto viejo y se procesa lo nuevo.
- Siempre se puede escribir **"cancelar"** para abortar.

---

## 8. Respuestas del bot (confirmaciones, resúmenes, comandos)

### Confirmaciones
```
"✅ Registré tu gasto de $45.000 en almuerzo el 3 de julio."
"✅ Pago de $250.000 a tu crédito casa (Bancolombia). Saldo: $48.750.000."
```

### Resúmenes on-demand (comandos naturales)
```
Usuario: "resumen" / "cuánto debo" / "cómo voy este mes"
Bot: "📊 Tu deuda total es $5.200.000.
      Este mes debes pagar $890.000 en 3 cuotas.
      Gastos del mes: $1.340.000 · Ingresos: $2.100.000.
      Flujo disponible: $760.000. 👍"
```

### Comandos soportados (intents utilitarios)
| Frase del usuario | Acción |
|-------------------|--------|
| "resumen", "cómo voy" | Enviar resumen financiero |
| "mis deudas" | Listar deudas y saldos |
| "próximos pagos" | Listar vencimientos próximos |
| "ayuda" | Explicar qué puede hacer |
| "cancelar" | Abortar flujo de aclaración |
| "deshacer" / "borra el último" | Descartar la última transacción registrada |

---

## 9. OCR de comprobantes (Fase 3)

```
Usuario envía FOTO de un recibo/factura
   │
   ▼
Worker: descarga media (provider.downloadMedia) → Object Storage (cifrado)
   │
   ▼
OCR Adapter (Google Vision / Textract / Tesseract)
   → texto crudo
   │
   ▼
Field Extractor (regex + LLM sobre el texto OCR):
   monto total, fecha, comercio/entidad, posible categoría
   │
   ▼
Assembler → si confianza alta: confirma; si no: muestra lo extraído y pide confirmar
Bot: "📸 Leí tu comprobante:
      Comercio: Éxito · Total: $87.300 · Fecha: 03/07
      ¿Lo registro como gasto en 'mercado'? (sí/no)"
```

- Guardar `attachment_url` en la transacción para auditoría.
- Manejar imágenes borrosas: si OCR falla, pedir reenvío o registro manual.

---

## 10. Sincronización bidireccional (app ↔ WhatsApp)

**Requisito:** lo que se registra en la app aparece en el historial de WhatsApp y viceversa.

### 10.1 WhatsApp → App
- El worker crea la `transaction` con `source='whatsapp'`.
- La app la obtiene en el próximo **sync delta** (pull) o vía **push FCM** ("Nuevo movimiento registrado por WhatsApp") para reflejarlo en tiempo casi real.

### 10.2 App → WhatsApp
- Como WhatsApp no es un almacén de datos, "aparecer en el historial de WhatsApp" se implementa como:
  - **Eco de confirmación:** al registrar en la app un movimiento relevante, opcionalmente el bot envía un mensaje de confirmación al chat (si el usuario está en ventana de 24 h o vía plantilla) → así el chat funciona como *timeline*.
  - **Resumen bajo demanda:** el usuario siempre puede escribir "resumen" y ver el estado consolidado, sin importar dónde registró.
- Recomendación MVP: **no** enviar eco automático de cada registro de app (costo/ruido). En su lugar, el chat es fuente de *entrada* y de *consulta*; la app es la fuente de *verdad visual*. La bidireccionalidad plena (eco configurable) es **Should have** (Fase 2).

### 10.3 Consistencia e idempotencia
- `wa_message_id` UNIQUE evita duplicar por reenvíos de Meta.
- `client_uuid` evita duplicar por sync offline de la app.
- Estado único en Postgres; ambas interfaces lo leen/escriben.

---

## 11. Recordatorios proactivos por WhatsApp

```
Scheduler (cron diario) → busca reminders con due_date - offset == hoy
   │
   ▼
Para cada uno: ¿usuario en ventana 24h?
   ├─ sí → sendText libre
   └─ no → sendTemplate('recordatorio_pago', [entidad, monto, deuda])
   │
   ▼
outbox_messages (garantiza entrega + reintentos) → Provider.send
   │
   ▼
Bot: "🔔 Mañana tienes que pagar tu crédito de $320.000 al BBVA.
      Responde 'pagué' cuando lo hagas y lo registro. 😉"
```

- Respeta `quiet_hours` y `notif_whatsapp` de `user_settings`.
- Si el usuario responde "pagué", se registra el pago automáticamente (flujo del parser).

---

## 12. Resiliencia, límites y cumplimiento

| Tema | Medida |
|------|--------|
| **Reintentos de Meta** | Webhook idempotente por `message_id`; responder 200 en <1s |
| **Fallo del worker** | Cola con reintentos exponenciales + DLQ; alertas si DLQ crece |
| **Rate limits de Meta** | Backoff y colas de envío; agrupar recordatorios |
| **Costo LLM/OCR** | Cascada rule-first; cache; premium para uso intensivo |
| **Ventana 24h** | Plantillas pre-aprobadas para proactivos |
| **Opt-in / opt-out** | Registrar consentimiento; "STOP"/"baja" revoca `opt_in` |
| **Privacidad** | Cifrar adjuntos; no loguear PII en claro; retención configurable (ver [doc 07](07-seguridad-privacidad.md)) |
| **Spam / abuso** | Rate-limit por número; validación de firma; bloquear números no vinculados tras N intentos |

---

## 13. Checklist de implementación WhatsApp (para el equipo)

- [ ] Crear app en Meta for Developers + WhatsApp Business Account (WABA).
- [ ] Configurar número de prueba (Cloud API) o sandbox de Twilio.
- [ ] Implementar `GET /webhooks/whatsapp` (verificación challenge).
- [ ] Implementar `POST /webhooks/whatsapp` (validar firma, dedup, encolar).
- [ ] Implementar `WhatsAppProvider` (Meta + Twilio) tras interfaz común.
- [ ] Cola `inbound_messages` (BullMQ) + worker.
- [ ] Rule-based parser + tests con los ejemplos de §5.
- [ ] Integración LLM (JSON mode) con fallback y timeout.
- [ ] Assembler + resolución de entidad/deuda/categoría.
- [ ] Clarification Manager + estado en Redis (TTL).
- [ ] Flujo de vinculación (OTP + enlace mágico).
- [ ] Envío de confirmaciones y resúmenes.
- [ ] Plantillas enviadas a aprobación de Meta.
- [ ] Scheduler de recordatorios proactivos + outbox.
- [ ] OCR (Fase 3) tras interfaz `OcrAdapter`.
- [ ] Manejo de opt-out ("STOP").
- [ ] Observabilidad: métricas de cola, tasa de parseo exitoso, latencia.
