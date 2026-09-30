import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CIRCUIT_BREAKER_COOLDOWN_MS,
  CIRCUIT_BREAKER_THRESHOLD,
  LLM_MAX_RETRIES,
  LLM_MODEL_DEFAULT,
  LLM_RETRY_BACKOFF_MS,
  LLM_TIMEOUT_MS,
  SYSTEM_PROMPT,
} from './copilot.constants';
import { assertMinimized } from './minimized-views';
import {
  ChatMessage,
  ExtractInput,
  ExtractResult,
  LlmClient,
  LlmTurnResult,
  normalizeHistory,
  ToolExecutor,
  TOOLS,
} from './llm.client';

const API = 'https://generativelanguage.googleapis.com/v1beta/models';

type Part = {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
  inlineData?: { mimeType: string; data: string };
  thoughtSignature?: string;
};
type Content = { role: 'user' | 'model'; parts: Part[] };
type GeminiResponse = {
  candidates?: Array<{ content?: Content; finishReason?: string }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};

/**
 * JSON Schema → subconjunto OpenAPI que acepta `functionDeclarations[].parameters`:
 * un solo `type` (las uniones con null pasan a `nullable: true`), sin `null` en `enum`
 * y sin claves que Gemini rechaza (`additionalProperties`, `$schema`).
 */
export function toGeminiSchema(schema: unknown): Record<string, unknown> {
  if (!schema || typeof schema !== 'object') return {};
  const s = schema as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  let nullable = false;
  if (Array.isArray(s.type)) {
    const types = (s.type as string[]).filter((t) => t !== 'null');
    nullable = types.length < (s.type as string[]).length;
    out.type = types[0] ?? 'string';
  } else if (s.type) {
    out.type = s.type;
  }
  if (s.description) out.description = s.description;
  if (Array.isArray(s.enum)) {
    const values = (s.enum as unknown[]).filter((v) => v !== null);
    nullable = nullable || values.length < (s.enum as unknown[]).length;
    out.enum = values;
  }
  if (nullable) out.nullable = true;
  if (s.properties && typeof s.properties === 'object') {
    out.properties = Object.fromEntries(
      Object.entries(s.properties as Record<string, unknown>).map(([k, v]) => [k, toGeminiSchema(v)]),
    );
  }
  if (s.items) out.items = toGeminiSchema(s.items);
  if (Array.isArray(s.required) && (s.required as unknown[]).length) out.required = s.required;
  return out;
}

/** Declaración de función: sin `parameters` cuando no tiene propiedades (Gemini las rechaza vacías). */
function declaration(t: { name: string; description: string; parameters: Record<string, unknown> }) {
  const props = t.parameters.properties as Record<string, unknown> | undefined;
  return props && Object.keys(props).length
    ? { name: t.name, description: t.description, parameters: toGeminiSchema(t.parameters) }
    : { name: t.name, description: t.description };
}

/**
 * Cliente de Google Gemini vía fetch (cero dependencias), mismo contrato que el
 * anterior de Anthropic. Resiliencia §4.8: timeout 30 s, 1 reintento (solo red/5xx),
 * 429 sin reintento, freno tras 5 fallos seguidos durante 5 minutos.
 * El "pensamiento" del modelo va apagado: no hace falta y se cobra como salida.
 */
@Injectable()
export class GeminiClient extends LlmClient {
  private readonly logger = new Logger(GeminiClient.name);
  private consecutiveFailures = 0;
  private disabledUntil = 0;

  constructor(private readonly config: ConfigService) {
    super();
  }

  isConfigured(): boolean {
    return !!this.config.get<string>('GEMINI_API_KEY');
  }

  circuitOpen(): boolean {
    return Date.now() < this.disabledUntil;
  }

  private model(kind: 'chat' | 'extract'): string {
    const chat = this.config.get<string>('GEMINI_MODEL') || LLM_MODEL_DEFAULT;
    return kind === 'extract' ? this.config.get<string>('GEMINI_EXTRACT_MODEL') || chat : chat;
  }

  async chat(contextJson: string, history: ChatMessage[], executor: ToolExecutor): Promise<LlmTurnResult> {
    if (this.circuitOpen()) throw new Error('circuit_open');
    const model = this.model('chat');
    const turns = normalizeHistory(history);
    if (turns.length === 0) throw new Error('empty_history');
    const contents: Content[] = turns.map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }));
    // El contexto minimizado viaja al inicio del último mensaje del usuario.
    const last = contents[contents.length - 1];
    last.parts = [{ text: `Contexto financiero del usuario (datos ya minimizados):\n${contextJson}\n\nMensaje del usuario: ${last.parts[0].text}` }];

    let inputTokens = 0;
    let outputTokens = 0;
    for (let round = 0; round < 4; round++) {
      const res = await this.request(model, {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        tools: [{ functionDeclarations: TOOLS.map(declaration) }],
        generationConfig: { maxOutputTokens: 900, temperature: 0.4, thinkingConfig: { thinkingBudget: 0 } },
      });
      inputTokens += res.usageMetadata?.promptTokenCount ?? 0;
      outputTokens += res.usageMetadata?.candidatesTokenCount ?? 0;
      const content = res.candidates?.[0]?.content;
      const parts = content?.parts ?? [];
      const calls = parts.filter((p) => p.functionCall);
      if (calls.length === 0) {
        const text = parts.map((p) => p.text ?? '').join('').trim();
        if (!text) throw new Error(`empty_response:${res.candidates?.[0]?.finishReason ?? 'none'}`);
        this.consecutiveFailures = 0;
        return { text, inputTokens, outputTokens, model };
      }
      // La respuesta del modelo vuelve TAL CUAL (con sus firmas de pensamiento).
      contents.push({ role: 'model', parts });
      const results: Part[] = [];
      for (const p of calls) {
        const { name, args } = p.functionCall!;
        const view = assertMinimized(await executor(name, (args ?? {}) as Record<string, unknown>));
        results.push({ functionResponse: { name, response: { result: view as unknown as Record<string, unknown> } } });
      }
      contents.push({ role: 'user', parts: results });
    }
    throw new Error('tool_loop_exceeded');
  }

  /**
   * Extracción ESTRUCTURADA de un documento (imagen o PDF en base64) con la función
   * obligatoria (`mode: ANY`): el modelo solo puede responder llenando el esquema.
   */
  async extractStructured(input: ExtractInput): Promise<ExtractResult> {
    if (this.circuitOpen()) throw new Error('circuit_open');
    const model = this.model('extract');
    const res = await this.request(model, {
      contents: [
        {
          role: 'user',
          parts: [{ inlineData: { mimeType: input.document.mediaType, data: input.document.base64 } }, { text: input.instructions }],
        },
      ],
      tools: [
        {
          functionDeclarations: [
            { name: input.toolName, description: 'Devuelve los datos extraídos del documento.', parameters: toGeminiSchema(input.schema) },
          ],
        },
      ],
      toolConfig: { functionCallingConfig: { mode: 'ANY', allowedFunctionNames: [input.toolName] } },
      generationConfig: { maxOutputTokens: input.maxTokens ?? 2000, temperature: 0, thinkingConfig: { thinkingBudget: 0 } },
    });
    const call = (res.candidates?.[0]?.content?.parts ?? []).find((p) => p.functionCall?.name === input.toolName);
    if (!call) throw new Error('no_tool_use');
    this.consecutiveFailures = 0;
    return {
      data: (call.functionCall!.args ?? {}) as Record<string, unknown>,
      inputTokens: res.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: res.usageMetadata?.candidatesTokenCount ?? 0,
      model,
    };
  }

  /** POST con timeout + 1 reintento (red/5xx) + registro del freno. */
  private async request(model: string, body: unknown): Promise<GeminiResponse> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY', '');
    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
      try {
        const res = await fetch(`${API}/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (res.ok) return (await res.json()) as GeminiResponse;
        if (res.status >= 500 && attempt < LLM_MAX_RETRIES) {
          await this.backoff();
          continue;
        }
        // El motivo exacto va al log (BT-026); nunca el contenido enviado.
        const detail = typeof res.text === 'function' ? await res.text().then((t) => t.slice(0, 300)).catch(() => '') : '';
        this.logger.warn(`Gemini respondió ${res.status}: ${detail}`);
        throw new Error(`gemini_http_${res.status}`);
      } catch (e) {
        const msg = (e as Error).message;
        const isNetwork = !msg.startsWith('gemini_http_');
        if (isNetwork && attempt < LLM_MAX_RETRIES) {
          await this.backoff();
          continue;
        }
        this.registerFailure();
        throw e;
      } finally {
        clearTimeout(timer);
      }
    }
  }

  private registerFailure(): void {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.disabledUntil = Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS;
      this.consecutiveFailures = 0;
      this.logger.warn(`Freno de IA abierto ${CIRCUIT_BREAKER_COOLDOWN_MS / 60000} min: el Copiloto responde en modo básico.`);
    }
  }

  private backoff(): Promise<void> {
    return new Promise((r) => setTimeout(r, LLM_RETRY_BACKOFF_MS));
  }
}
