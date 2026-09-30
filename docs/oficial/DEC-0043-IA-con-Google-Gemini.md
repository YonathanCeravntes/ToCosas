# DEC-0043 · La IA de Millo pasa de Anthropic a Google Gemini

- **Fecha:** 2026-09-30 · **Decide:** Fundador ("Solo Gemini"; "Creo que por economía deberíamos migrar a Gemini") · **Propone y ejecuta:** Arquitecto
- **Contexto:** la organización de Anthropic quedó desactivada y sin créditos (caso abierto sin respuesta). El Copiloto, el bot y la lectura de extractos/facturas (FIN-042, FIN-054) quedaron en modo básico: "Ahora mismo no puedo usar la IA" (BT-026).

## Decisión
1. **Un solo proveedor: Google Gemini API**, modelo `gemini-3.5-flash` (chat, herramientas y lectura de documentos). Sin respaldo en otro proveedor.
2. **Costo:** la decisión se tomó con los precios de Gemini 2.5 Flash (USD 0,30 por millón de tokens de entrada y USD 2,50 de salida, frente a USD 1 y USD 5 de Claude Haiku 4.5). Google ya no da 2.5 Flash a cuentas nuevas, así que el modelo en uso es `gemini-3.5-flash` (Fundador, 2026-09-30: "3.5 está bien"). En las pruebas respondió bien con herramientas y respetó el pensamiento apagado; `gemini-3.8-flash` devolvía "demanda alta". Sus precios hay que confirmarlos en AI Studio. El "pensamiento" del modelo va apagado (`thinkingBudget: 0`) porque se cobra como salida.
3. **Solo el plan de pago** (proyecto de Google AI Studio con facturación): en el gratuito Google puede usar los datos para mejorar sus productos, y eso contradice el permiso que firma el usuario.
4. **Privacidad (Ley 1581):** cambia el encargado, así que cambia el permiso.
   - `AI_CONSENT_VERSION = 2` nombra a Google LLC (EE. UU., país con nivel adecuado según la Circular Externa 005 de 2017 de la SIC). Cada persona vuelve a aceptar.
   - Los permisos para leer documentos anteriores al 2026-09-30 15:00 UTC (`DOCS_AI_CONSENT_SINCE`) ya no valen: el bot vuelve a pedir "autorizo".
   - El archivo de documentos (Cloudflare R2) no cambia.
5. **Gate legal:** el DPA pendiente pasa de Anthropic a Google (Términos adicionales de la API de Gemini + adenda de tratamiento de datos de Google Cloud). La PIA y la revisión de abogado siguen pendientes.

## Ejecución
- `copilot/llm.client.ts`: contrato común sin proveedor (herramientas, historial, extracción estructurada).
- `copilot/gemini.client.ts`: cliente por `fetch`, sin dependencias. Mismas reglas §4.8: timeout de 30 s, 1 reintento solo por red o 5xx, 429 sin reintento, freno de 5 minutos tras 5 fallos. Las vistas siguen minimizadas (`assertMinimized`).
- Se borró `anthropic.client.ts`. El módulo del Copiloto inyecta `LlmClient → GeminiClient`.
- Variables de entorno:
  - `GEMINI_API_KEY` (secreta).
  - `GEMINI_MODEL`, por defecto `gemini-3.5-flash`.
  - `GEMINI_EXTRACT_MODEL`, opcional.
  - Se retiran `ANTHROPIC_API_KEY`, `LLM_API_KEY`, `LLM_MODEL` y `LLM_EXTRACT_MODEL`.
- Pruebas: 452 unitarias y 124 de extremo a extremo en verde, incluido el nuevo `gemini.client.spec.ts`.

## Supersede
El proveedor fijado en `ARQ-0005` §4.5/§9 (Anthropic `claude-haiku-4-5`) y la mención "Claude" de `FIN-046` §1. La arquitectura del Copiloto (plantillas, herramientas de solo lectura, contexto minimizado y límites) no cambia.

## Estado de la clave (2026-09-30)
Clave propia del proyecto *Millo* en Render (`GEMINI_API_KEY`). Por ahora está en **nivel gratuito**: Google Pagos rechazó la tarjeta (error OR-CBAT-20). El Fundador autorizó usarla **solo para pruebas con sus propios datos** hasta activar la facturación. **No invitar a otras personas** antes de pasarla al plan de pago.
