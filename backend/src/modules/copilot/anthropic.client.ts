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
import { assertMinimized, MinimizedToolView } from './minimized-views';

export interface LlmTurnResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Ejecutor de tools: SOLO puede devolver vistas minimizadas (§4.3-A). */
export type ToolExecutor = (toolName: string) => Promise<MinimizedToolView>;

const TOOLS = [
  {
    name: 'get_financial_snapshot',
    description:
      'Métricas del mes, presupuesto (totales) y patrimonio del usuario. Úsala para preguntas de flujo, ahorro, liquidez o patrimonio.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_debts',
    description:
      'Deudas activas del usuario (tipo, saldo, tasa, cuota, fecha fin proyectada). Úsala para preguntas sobre deudas.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_score_breakdown',
    description:
      'Score Millo con pilares y variación por pilar. Úsala para preguntas sobre el Score.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_memory_and_insights',
    description:
      'Hábitos y patrones detectados del usuario (recurrencias, fechas clave) y alertas/logros recientes. Úsala para dar contexto longitudinal ("suele gastar X", "su cuota vence el día D").',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
];

/**
 * Cliente de la Messages API de Anthropic vía fetch (cero dependencias).
 * Resiliencia §4.8: timeout 30s, 1 reintento (solo red/5xx), 429 sin reintento,
 * circuit breaker de 5 fallos consecutivos / 5 minutos.
 */
@Injectable()
export class AnthropicClient {
  private readonly logger = new Logger(AnthropicClient.name);
  private consecutiveFailures = 0;
  private disabledUntil = 0;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return !!this.config.get<string>('ANTHROPIC_API_KEY');
  }

  circuitOpen(): boolean {
    return Date.now() < this.disabledUntil;
  }

  /**
   * Ejecuta un turno con tool-use. `context` ya debe ser una vista minimizada
   * serializada; las tools solo pueden resolver vía `executor` (validado).
   */
  async chat(
    contextJson: string,
    history: ChatMessage[],
    executor: ToolExecutor,
  ): Promise<LlmTurnResult> {
    if (this.circuitOpen()) throw new Error('circuit_open');

    const model = this.config.get<string>('LLM_MODEL', LLM_MODEL_DEFAULT);
    type ContentBlock =
      | { type: 'text'; text: string }
      | { type: 'tool_use'; id: string; name: string; input: unknown }
      | { type: 'tool_result'; tool_use_id: string; content: string };

    const messages: Array<{ role: string; content: string | ContentBlock[] }> = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ];
    // El contexto minimizado viaja como primer bloque del último mensaje de usuario.
    const last = messages[messages.length - 1];
    last.content = `Contexto financiero del usuario (datos ya minimizados):\n${contextJson}\n\nMensaje del usuario: ${last.content as string}`;

    let inputTokens = 0;
    let outputTokens = 0;

    // Bucle de tool-use (máx. 4 iteraciones de seguridad).
    for (let round = 0; round < 4; round++) {
      const res = await this.request({
        model,
        max_tokens: 700,
        system: [
          { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        ],
        tools: TOOLS,
        messages,
      });

      inputTokens += res.usage?.input_tokens ?? 0;
      outputTokens += res.usage?.output_tokens ?? 0;

      if (res.stop_reason !== 'tool_use') {
        const text = (res.content ?? [])
          .filter((b: ContentBlock) => b.type === 'text')
          .map((b: { text: string }) => b.text)
          .join('\n')
          .trim();
        this.consecutiveFailures = 0;
        return { text, inputTokens, outputTokens, model };
      }

      // Resolver tools — SOLO vistas minimizadas (validación en runtime).
      messages.push({ role: 'assistant', content: res.content });
      const results: ContentBlock[] = [];
      for (const block of res.content as ContentBlock[]) {
        if (block.type !== 'tool_use') continue;
        const view = assertMinimized(await executor(block.name));
        results.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(view),
        });
      }
      messages.push({ role: 'user', content: results });
    }
    throw new Error('tool_loop_exceeded');
  }

  /** POST con timeout + 1 reintento (red/5xx) + registro del circuit breaker. */
  private async request(body: unknown): Promise<{
    stop_reason: string;
    content: never[];
    usage?: { input_tokens: number; output_tokens: number };
  }> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY', '');
    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (res.ok) {
          return (await res.json()) as never;
        }
        // 429 nunca se reintenta (§4.8); 5xx se reintenta una vez.
        if (res.status >= 500 && attempt < LLM_MAX_RETRIES) {
          await this.backoff();
          continue;
        }
        throw new Error(`anthropic_http_${res.status}`);
      } catch (e) {
        const msg = (e as Error).message;
        const isNetwork = !msg.startsWith('anthropic_http_');
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
      this.logger.warn(
        `Circuit breaker abierto ${CIRCUIT_BREAKER_COOLDOWN_MS / 60000} min: la vía LLM se pausa (modo plantillas).`,
      );
    }
  }

  private backoff(): Promise<void> {
    return new Promise((r) => setTimeout(r, LLM_RETRY_BACKOFF_MS));
  }
}
