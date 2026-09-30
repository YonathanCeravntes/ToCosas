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
export type ToolExecutor = (
  toolName: string,
  input: Record<string, unknown>,
) => Promise<MinimizedToolView>;

const TOOLS = [
  {
    name: 'get_cashflow_plan',
    description:
      'Plan para LIBERAR FLUJO (regla de Millo): a qué deuda abonar primero (la que más cuota libera por peso), cuánto abonar al mes (la mitad de lo libre), cuánto va al colchón y en cuántos meses termina cada deuda con y sin plan. Úsala para "¿qué deuda pago primero?", "¿cómo salgo de deudas?", "me sobró plata, ¿qué hago?". Puedes pasar monthly para recalcular con otro monto.',
    input_schema: {
      type: 'object' as const,
      properties: { monthly: { type: 'number', description: 'Monto mensual para abonar (opcional).' } },
      required: [],
    },
  },
  {
    name: 'get_budget_now',
    description:
      'Cuánto le queda para gastar en el ciclo (Te queda), por día, días restantes, ingreso base y los compromisos pendientes. Úsala para "¿cuánto me queda?", "¿me alcanza?", "¿puedo gastar X?".',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_upcoming_payments',
    description: 'Cuotas de deudas y gastos fijos de los próximos 31 días, con fecha y días que faltan.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'propose_action',
    description:
      'PROPONE una acción concreta que el usuario puede confirmar con un botón en la app (nunca se ejecuta sola). Tipos: crear_gasto_fijo (name, amount, dayOfMonth opcional) cuando el usuario menciona un pago que se repite cada mes; abonar_deuda (debtRef, amount opcional) cuando recomiendas abonar; ver_plan para abrir su plan para liberar plata; ver_presupuesto. Úsala como máximo 2 veces por respuesta y menciónala en tu texto ("te dejo el botón para…").',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: { type: 'string', enum: ['crear_gasto_fijo', 'abonar_deuda', 'ver_plan', 'ver_presupuesto'] },
        name: { type: 'string', description: 'Nombre corto del gasto fijo (p. ej. "Arriendo").' },
        amount: { type: 'number' },
        dayOfMonth: { type: 'number' },
        debtRef: { type: 'string', description: 'p. ej. "deuda #2"' },
      },
      required: ['type'],
    },
  },
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
  {
    name: 'run_simulation',
    description:
      'Simula "¿qué pasa si…?" y devuelve el impacto antes/después en Score, DTI, flujo y patrimonio. Escenarios: abono_extra (debtRef+extraMonthly), nueva_deuda (amount+termMonths+ratePct), reducir_gastos (monthlyAmount), cambio_ingreso (newMonthlyIncome), estrategia_deudas (extraBudget), refinanciar (debtRef+newRatePct+newTermMonths). Las deudas se refieren como "deuda #N".',
    input_schema: {
      type: 'object' as const,
      properties: {
        scenario: {
          type: 'string',
          enum: ['abono_extra', 'nueva_deuda', 'reducir_gastos', 'cambio_ingreso', 'estrategia_deudas', 'refinanciar'],
        },
        debtRef: { type: 'string', description: 'p. ej. "deuda #1"' },
        extraMonthly: { type: 'number' },
        amount: { type: 'number' },
        termMonths: { type: 'number' },
        ratePct: { type: 'number' },
        monthlyAmount: { type: 'number' },
        newMonthlyIncome: { type: 'number' },
        extraBudget: { type: 'number' },
        newRatePct: { type: 'number' },
        newTermMonths: { type: 'number' },
      },
      required: ['scenario'],
    },
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

    const messages: Array<{ role: string; content: string | ContentBlock[] }> = normalizeHistory(history);
    if (messages.length === 0) throw new Error('empty_history');
    // El contexto minimizado viaja como primer bloque del último mensaje de usuario.
    const last = messages[messages.length - 1];
    last.content = `Contexto financiero del usuario (datos ya minimizados):\n${contextJson}\n\nMensaje del usuario: ${last.content as string}`;

    let inputTokens = 0;
    let outputTokens = 0;

    // Bucle de tool-use (máx. 4 iteraciones de seguridad).
    for (let round = 0; round < 4; round++) {
      const res = await this.request({
        model,
        max_tokens: 900,
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
        const view = assertMinimized(
          await executor(block.name, (block.input ?? {}) as Record<string, unknown>),
        );
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

  /**
   * FIN-042 · Extracción ESTRUCTURADA de un documento (imagen o PDF en base64) con
   * salida forzada por tool-use: el modelo solo puede responder llamando a la tool
   * `toolName` con un objeto que cumple `schema`. Sin historial, sin contexto del
   * usuario, sin herramientas de dominio: entra el documento y sale un JSON.
   */
  async extractStructured(input: {
    document: { mediaType: string; base64: string };
    instructions: string;
    toolName: string;
    schema: Record<string, unknown>;
    maxTokens?: number;
    /** Modelo a usar (por defecto LLM_MODEL). La extracción de documentos usa uno con mejor visión. */
    model?: string;
  }): Promise<{ data: Record<string, unknown>; inputTokens: number; outputTokens: number; model: string }> {
    if (this.circuitOpen()) throw new Error('circuit_open');
    const model = input.model ?? this.config.get<string>('LLM_MODEL', LLM_MODEL_DEFAULT);
    const isPdf = input.document.mediaType === 'application/pdf';
    const docBlock = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: input.document.base64 } }
      : { type: 'image', source: { type: 'base64', media_type: input.document.mediaType, data: input.document.base64 } };

    const res = await this.request({
      model,
      max_tokens: input.maxTokens ?? 1200,
      tools: [{ name: input.toolName, description: 'Devuelve los datos extraídos del documento.', input_schema: input.schema }],
      tool_choice: { type: 'tool', name: input.toolName },
      messages: [{ role: 'user', content: [docBlock, { type: 'text', text: input.instructions }] }],
    });
    const blocks = (res.content ?? []) as Array<{ type: string; name?: string; input?: unknown }>;
    const call = blocks.find((b) => b.type === 'tool_use' && b.name === input.toolName);
    if (!call) throw new Error('no_tool_use');
    this.consecutiveFailures = 0;
    return {
      data: (call.input ?? {}) as Record<string, unknown>,
      inputTokens: res.usage?.input_tokens ?? 0,
      outputTokens: res.usage?.output_tokens ?? 0,
      model,
    };
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
        // BT-026: el motivo exacto va al log (antes solo el código y era imposible diagnosticar).
        const detail = typeof res.text === 'function' ? await res.text().then((t) => t.slice(0, 300)).catch(() => '') : '';
        this.logger.warn(`Anthropic respondió ${res.status}: ${detail}`);
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

/**
 * BT-026 · La API exige que la conversación EMPIECE por el usuario y que los roles
 * alternen. El historial se recorta a los últimos N mensajes, y el recorte podía
 * empezar por una respuesta del Copiloto → 400 y "Ahora mismo no puedo usar la IA".
 * Aquí se descartan las respuestas iniciales y se unen mensajes seguidos del mismo rol.
 */
export function normalizeHistory(history: ChatMessage[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  const out: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const m of history) {
    const content = (m.content ?? '').trim();
    if (!content) continue;
    if (out.length === 0 && m.role !== 'user') continue;
    const prev = out[out.length - 1];
    if (prev && prev.role === m.role) prev.content = `${prev.content}\n\n${content}`;
    else out.push({ role: m.role, content });
  }
  // Debe terminar en el mensaje del usuario (el que se está respondiendo).
  while (out.length && out[out.length - 1].role !== 'user') out.pop();
  return out;
}
