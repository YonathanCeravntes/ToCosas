# FIN-042 · Extractos y comprobantes por foto o PDF vía bot (Telegram)

- **Versión:** 1.0 · **Fecha:** 2026-09-28 · **Autor:** Arquitecto (ciclo compacto `DEC-ORG-002` §44.3)
- **Estado:** **Implementado — pendiente de validación del Fundador con un extracto real.**
- **Origen (§27):** pregunta del Fundador (2026-09-28): "¿en ese chat podríamos compartir un desprendible de extracto de una tarjeta y que tome los datos para crear la deuda, cuota mensual, tasa, disponible…?" → `DEC-0041` §4 (autorizado a diseñar y construir tras encender la IA).
- **Documentos base:** `FIN-029` (motor conversacional único, DEC-0029: nunca fingir "ya lo anoté"), `FIN-005`/`DEC-0005` (IA con consentimiento, log sin contenido), `FIN-031` (tarjeta: saldo derivado de compras), `FIN-032` (catálogo de tipos), `DEC-0041`, `GOBERNANZA.md` §31, §32, §39, §42, §44.

---

## 0. Frontera
Backend (bot + IA + dominio). **No toca** `SpendableService` ni definiciones §32: la deuda y el gasto nacen por los mismos servicios que usa la app (`DebtsService.create`, `CardService.registerPurchase`, `TransactionsService.create`). Sin cambios en la app móvil (OTA no requerida).

## 1. Problema (§31)
Cargar una tarjeta o un crédito a mano exige leer el extracto y copiar 6 u 8 cifras en un formulario. Es el paso donde más gente abandona la carga inicial y donde más errores de dedo entran (BT-008 fue por eso). Con la foto, Millo lee y el usuario solo confirma.

## 2. Qué hace
1. El usuario envía al bot una **foto** (JPG/PNG/WebP) o un **PDF** (≤ 8 MB).
2. **Consentimiento específico** la primera vez (`user_settings.docs_ai_consent_at`): el documento contiene datos personales que el consentimiento de chat excluye; el bot lo explica y pide responder **"autorizo"**. Revocable con **"revocar documentos"**.
3. Descarga en memoria (`TelegramProvider.downloadFile`: `getFile` → binario) y envío a **Claude** (`AnthropicClient.extractStructured`: salida forzada por tool-use con esquema JSON; PDF como `document`, imagen como `image`). El archivo **no se guarda** (ni disco ni BD). El log de auditoría (`ai_interaction_logs`, purpose `extract_document`) registra tokens y propósito, nunca contenido.
4. `normalize` sanea la salida del modelo (tipos, formatos regionales, rangos). `toProposal` convierte la lectura en una **propuesta explicable**:
   - **Extracto de tarjeta** → nombre (entidad · producto), saldo, cupo/disponible, pago mensual, tasa E.A. (o mensual → E.A.), día de pago. El saldo inicial se representa como una **compra sin interés en N cuotas** (`N = saldo / pago del mes`, acotado a 1–36) para que el **compromiso mensual §32 coincida con lo que pide el extracto**; se dice explícitamente en el acuse. Sin pago conocido: 12 cuotas.
   - **Extracto de crédito** → saldo, cuota, cuotas restantes (o derivadas), tasa, día de pago → `credito_personal` amortizado.
   - **Comprobante** → gasto con monto, comercio y fecha.
5. La propuesta queda **pendiente** (`bot_pending_actions`, una por usuario y canal, 30 min). El usuario responde **sí** / **no** / **corrección** (`saldo 2.350.000`, `cuota 180.000`, `cupo …`, `tasa 28.5`, `dia 15`, `nombre …`; comprobantes: `monto`, `fecha AAAA-MM-DD`, `comercio`). Cualquier otro texto sigue el flujo normal del bot (resumen, gastos…) sin perder la propuesta.
6. Con **sí**, el alta va por el dominio; el acuse dice qué se creó y dónde ajustarlo. **Nunca se registra nada sin confirmación** (DEC-0029).
7. Honestidad: si la IA no está disponible, si el archivo no se puede leer, si es ilegible (`confidence < 0.35`) o no es un documento financiero, el bot lo dice y ofrece el camino en texto.

## 3. Modelo
- `user_settings.docs_ai_consent_at` (nuevo).
- `bot_pending_actions` (nueva): `user_id`, `source`, `kind`, `payload` (JSONB con la propuesta), `expires_at`; única por `(user_id, source)`; cascade al borrar usuario (FIN-039 purga).
- Migración `20260928160000_fin042_bot_pending_docs_consent` escrita a mano (M11).

## 4. Componentes
- `copilot/anthropic.client.ts` → `extractStructured` (nuevo método; el chat no cambia).
- `telegram/telegram.provider.ts` → `parseInbound` reconoce `photo`/`document`; `downloadFile`.
- `messaging/document-extraction.service.ts` (nuevo): esquema, instrucciones (sin PII), llamada, log, `normalize`.
- `messaging/document-proposal.ts` (nuevo, puro): `toProposal`, `describeProposal`, `parseReply`, `applyFix`, `installmentsFor`, `monthlyToEA`.
- `messaging/conversation.service.ts`: `handleDocument`, `handlePendingReply`, `applyProposal`, consentimiento/revocación, ayuda actualizada.
- `telegram/telegram.controller.ts`: pasa el adjunto como descarga perezosa.
- Módulos: `CopilotModule` exporta `ConsentService` y `AnthropicClient`; `MessagingModule` los importa. **`DebtsModule` no se importa** (ciclo Debts → Reminders → Telegram → Messaging): `DebtsService`/`CardService` se resuelven con `ModuleRef` en runtime (documentado en código).

## 5. Verificación (§44.5)
- `tsc` 0.
- Unit: `document-proposal.spec.ts` (7 casos: propuesta de tarjeta y cuotas, comprobante, nulos honestos, sí/no/correcciones con tildes y formato regional, recálculo, saneado) y `document-flow.spec.ts` (10 casos: consentimiento, autorización, IA no disponible, propuesta sin crear, no, corrección, sí → dominio, comprobante → gasto, ilegible, texto ajeno).
- Suites completas: ver historial de `BACKLOG.md`.
- **Pendiente en real (Fundador):** foto de un extracto de tarjeta real → revisar cifras propuestas → "sí" → verificar la deuda en la app (saldo, cupo, cuotas, próximo vencimiento, compromiso en "Te queda").

## 6. Riesgos
- **Precisión de lectura** (tasas, extractos con varias tarjetas): mitigada por la propuesta explícita, las correcciones y la confianza mínima.
- **Costo:** ≈ 1 mensaje de IA por documento (Haiku 4.5; imagen ≈ 1.500 tokens). No consume la cuota diaria del Copiloto (decisión: documento ≠ chat); registrado en el log de costos.
- **Privacidad:** el documento viaja a Anthropic bajo consentimiento específico; no se persiste. El gate DPA+PIA sigue obligatorio para terceros (`DEC-0041`).
- **Tarjeta con saldo inicial como compra sin interés:** simplificación honesta y declarada; el usuario puede ajustar en la app. Si el uso muestra que estorba, FIN futura: "saldo inicial de tarjeta" como concepto propio.

## 7. Decisiones del Fundador
- **7.1 ✅ (2026-09-28):** construir FIN-042 (`DEC-0041` §4).
- **7.2 (en curso, 2026-09-28):** primera prueba real con un extracto de Banco Serfinanza: la lectura funcionó (entidad, producto, saldo, cupo) pero destapó BT-017 ("pago total" = saldo → 1 cuota) y BT-016 (Inicio no sumaba tarjetas). Ambos corregidos el mismo día. Pendiente repetir la prueba.
- **7.3 (2026-09-28, 2ª prueba real, extracto de crédito Davivienda):** la lectura confundió "Total abonado" con el saldo, "Valor pagado por anticipado" con la cuota, "cuotas que se cancela" con las restantes y una fecha de 2023. Corrección v1.1: (a) **glosario de extractos colombianos** en las instrucciones (qué etiqueta es saldo, cuota, cuotas pendientes vs canceladas, fecha límite, plazo) con campo `evidence` (etiquetas usadas); (b) **modelo con mejor visión** para la lectura (`LLM_EXTRACT_MODEL`, por defecto `claude-sonnet-5`, con caída automática al modelo de chat si la cuenta no lo tiene); (c) **coherencia** antes de proponer (cuota ≪ saldo, plazo − pagadas ≈ restantes, fecha de pago dentro de ±1 año) con avisos "⚠️ Revisa" y correcciones nuevas (`restantes`, `plazo`, `vence AAAA-MM-DD`; "Cuota restante: 109" ya no se confunde con la cuota). Caso real reproducido en `document-proposal.spec.ts`.
- **7.4 (pendiente):** validar con un extracto real y decidir si el reparto del saldo en N cuotas es la representación correcta para su caso.
