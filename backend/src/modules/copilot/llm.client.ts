import { MinimizedToolView } from './minimized-views';

/**
 * Contrato del cliente de IA del Copiloto y de la lectura de documentos.
 * Proveedor: Google Gemini (`gemini.client.ts`), decisión del Fundador 2026-09-30
 * (antes Anthropic: cuenta suspendida y costo ~3x). Lo que no depende del proveedor
 * vive aquí: herramientas, historial y tipos. Cambiar de proveedor = otra clase.
 */

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

export interface ExtractInput {
  document: { mediaType: string; base64: string };
  instructions: string;
  toolName: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
}

export interface ExtractResult {
  data: Record<string, unknown>;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

/** Token de inyección: el resto de Millo depende de esto, no del proveedor. */
export abstract class LlmClient {
  abstract isConfigured(): boolean;
  abstract circuitOpen(): boolean;
  /** Un turno del Copiloto con herramientas (solo vistas minimizadas). */
  abstract chat(contextJson: string, history: ChatMessage[], executor: ToolExecutor): Promise<LlmTurnResult>;
  /** Extracción estructurada de un documento (foto o PDF) con salida forzada al esquema. */
  abstract extractStructured(input: ExtractInput): Promise<ExtractResult>;
}

/** Herramientas del Copiloto (esquema JSON neutral; cada cliente lo adapta). */
export const TOOLS = [
  {
    name: 'get_cashflow_plan',
    description:
      'Plan para LIBERAR FLUJO (regla de Millo): a qué deuda abonar primero (la que más cuota libera por peso), cuánto abonar al mes (la mitad de lo libre), cuánto va al colchón y en cuántos meses termina cada deuda con y sin plan. Úsala para "¿qué deuda pago primero?", "¿cómo salgo de deudas?", "me sobró plata, ¿qué hago?". Puedes pasar monthly para recalcular con otro monto.',
    parameters: {
      type: 'object',
      properties: { monthly: { type: 'number', description: 'Monto mensual para abonar (opcional).' } },
      required: [],
    },
  },
  {
    name: 'get_budget_now',
    description:
      'Cuánto le queda para gastar en el ciclo (Te queda), por día, días restantes, ingreso base y los compromisos pendientes. Úsala para "¿cuánto me queda?", "¿me alcanza?", "¿puedo gastar X?".',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_upcoming_payments',
    description: 'Cuotas de deudas y gastos fijos de los próximos 31 días, con fecha y días que faltan.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'propose_action',
    description:
      'PROPONE una acción concreta que el usuario puede confirmar con un botón en la app (nunca se ejecuta sola). Tipos: crear_gasto_fijo (name, amount, dayOfMonth opcional) cuando el usuario menciona un pago que se repite cada mes; abonar_deuda (debtRef, amount opcional) cuando recomiendas abonar; ver_plan para abrir su plan para liberar plata; ver_presupuesto. Úsala como máximo 2 veces por respuesta y menciónala en tu texto ("te dejo el botón para…").',
    parameters: {
      type: 'object',
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
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_debts',
    description:
      'Deudas activas del usuario (tipo, saldo, tasa, cuota, fecha fin proyectada). Úsala para preguntas sobre deudas.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_score_breakdown',
    description:
      'Score Millo con pilares y variación por pilar. Úsala para preguntas sobre el Score.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_memory_and_insights',
    description:
      'Hábitos y patrones detectados del usuario (recurrencias, fechas clave) y alertas/logros recientes. Úsala para dar contexto longitudinal ("suele gastar X", "su cuota vence el día D").',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'run_simulation',
    description:
      'Simula "¿qué pasa si…?" y devuelve el impacto antes/después en Score, DTI, flujo y patrimonio. Escenarios: abono_extra (debtRef+extraMonthly), nueva_deuda (amount+termMonths+ratePct), reducir_gastos (monthlyAmount), cambio_ingreso (newMonthlyIncome), estrategia_deudas (extraBudget), refinanciar (debtRef+newRatePct+newTermMonths). Las deudas se refieren como "deuda #N".',
    parameters: {
      type: 'object',
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
 * BT-026 · Las APIs de IA exigen que la conversación EMPIECE por el usuario y que los roles
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
