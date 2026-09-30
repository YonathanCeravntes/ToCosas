import { GeminiClient, toGeminiSchema } from './gemini.client';
import { brand, MinimizedToolView } from './minimized-views';
import { CIRCUIT_BREAKER_THRESHOLD } from './copilot.constants';

function buildClient(env: Record<string, string> = { GEMINI_API_KEY: 'g-test' }) {
  const config = { get: jest.fn((key: string, def?: string) => env[key] ?? def) } as never;
  return new GeminiClient(config);
}

const textResponse = (text = 'Respuesta de prueba') => ({
  ok: true,
  json: async () => ({
    candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason: 'STOP' }],
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
  }),
});

const view: MinimizedToolView = brand({ kind: 'debts' as const, debts: [] });

describe('GeminiClient (§4.8, migración 2026-09-30)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('turno simple: request bien formada (modelo, clave, herramientas, sin "pensamiento") y texto devuelto', async () => {
    const fetchMock = jest.fn().mockResolvedValue(textResponse());
    global.fetch = fetchMock as never;
    const r = await buildClient().chat('{"ctx":1}', [{ role: 'user', content: 'hola' }], async () => view);
    expect(r).toMatchObject({ text: 'Respuesta de prueba', inputTokens: 100, outputTokens: 50, model: 'gemini-2.5-flash' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
    expect(init.headers['x-goog-api-key']).toBe('g-test');
    const body = JSON.parse(init.body);
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
    expect(body.systemInstruction.parts[0].text).toContain('RECOMENDACIÓN GENÉRICA');
    expect(body.tools[0].functionDeclarations.map((t: { name: string }) => t.name)).toEqual([
      'get_cashflow_plan', 'get_budget_now', 'get_upcoming_payments', 'propose_action',
      'get_financial_snapshot', 'get_debts', 'get_score_breakdown', 'get_memory_and_insights', 'run_simulation',
    ]);
    // Herramientas sin parámetros van sin `parameters` (Gemini rechaza objetos vacíos).
    const budget = body.tools[0].functionDeclarations.find((t: { name: string }) => t.name === 'get_budget_now');
    expect(budget.parameters).toBeUndefined();
    expect(body.contents[0].parts[0].text).toContain('Contexto financiero del usuario');
  });

  it('herramientas: ejecuta, exige vista minimizada, devuelve la respuesta del modelo tal cual (firma) y continúa', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { role: 'model', parts: [{ functionCall: { name: 'get_debts', args: {} }, thoughtSignature: 'sig-1' }] } }],
          usageMetadata: { promptTokenCount: 80, candidatesTokenCount: 20 },
        }),
      })
      .mockResolvedValueOnce(textResponse('Con tus deudas…'));
    global.fetch = fetchMock as never;
    const executor = jest.fn().mockResolvedValue(view);
    const r = await buildClient().chat('{}', [{ role: 'user', content: '¿mis deudas?' }], executor);
    expect(executor).toHaveBeenCalledWith('get_debts', {});
    expect(r).toMatchObject({ text: 'Con tus deudas…', inputTokens: 180, outputTokens: 70 });
    const second = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(second.contents[1]).toEqual({ role: 'model', parts: [{ functionCall: { name: 'get_debts', args: {} }, thoughtSignature: 'sig-1' }] });
    expect(second.contents[2].role).toBe('user');
    expect(second.contents[2].parts[0].functionResponse.name).toBe('get_debts');
  });

  it('una vista sin marca de minimizada se rechaza (nunca sale un dato crudo)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { role: 'model', parts: [{ functionCall: { name: 'get_debts', args: {} } }] } }] }),
    }) as never;
    await expect(buildClient().chat('{}', [{ role: 'user', content: 'x' }], async () => ({ kind: 'debts', debts: [] }) as never)).rejects.toThrow();
  });

  it('historial: empieza por el usuario y alterna (el recorte no rompe la llamada)', async () => {
    const fetchMock = jest.fn().mockResolvedValue(textResponse());
    global.fetch = fetchMock as never;
    await buildClient().chat('{}', [
      { role: 'assistant', content: 'vieja' },
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
      { role: 'user', content: 'c' },
    ], async () => view);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.contents.map((c: { role: string }) => c.role)).toEqual(['user', 'model', 'user']);
  });

  it('extracción de documento: PDF en línea, función obligatoria y esquema convertido', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { role: 'model', parts: [{ functionCall: { name: 'emitir_extraccion', args: { kind: 'factura_electronica', amount: 186400 } } }] } }],
        usageMetadata: { promptTokenCount: 1500, candidatesTokenCount: 120 },
      }),
    });
    global.fetch = fetchMock as never;
    const r = await buildClient({ GEMINI_API_KEY: 'g', GEMINI_EXTRACT_MODEL: 'gemini-2.5-pro' }).extractStructured({
      document: { mediaType: 'application/pdf', base64: 'JVBERi0=' },
      instructions: 'Lee',
      toolName: 'emitir_extraccion',
      schema: { type: 'object', properties: { kind: { type: 'string' }, amount: { type: ['number', 'null'] } }, required: ['kind'] },
    });
    expect(r).toMatchObject({ data: { kind: 'factura_electronica', amount: 186400 }, model: 'gemini-2.5-pro' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/gemini-2.5-pro:generateContent');
    const body = JSON.parse(init.body);
    expect(body.contents[0].parts[0].inlineData).toEqual({ mimeType: 'application/pdf', data: 'JVBERi0=' });
    expect(body.toolConfig.functionCallingConfig).toEqual({ mode: 'ANY', allowedFunctionNames: ['emitir_extraccion'] });
    expect(body.tools[0].functionDeclarations[0].parameters.properties.amount).toEqual({ type: 'number', nullable: true });
  });

  it('429 → no reintenta; 5xx → reintenta una vez', async () => {
    const f429 = jest.fn().mockResolvedValue({ ok: false, status: 429, text: async () => 'quota' });
    global.fetch = f429 as never;
    await expect(buildClient().chat('{}', [{ role: 'user', content: 'x' }], async () => view)).rejects.toThrow('gemini_http_429');
    expect(f429).toHaveBeenCalledTimes(1);
    const f5xx = jest.fn().mockResolvedValueOnce({ ok: false, status: 503, text: async () => '' }).mockResolvedValueOnce(textResponse('ok'));
    global.fetch = f5xx as never;
    expect((await buildClient().chat('{}', [{ role: 'user', content: 'x' }], async () => view)).text).toBe('ok');
    expect(f5xx).toHaveBeenCalledTimes(2);
  });

  it('freno: tras 5 fallos seguidos la IA se pausa', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'bad' }) as never;
    const client = buildClient();
    for (let i = 0; i < CIRCUIT_BREAKER_THRESHOLD; i++) {
      await expect(client.chat('{}', [{ role: 'user', content: 'x' }], async () => view)).rejects.toThrow();
    }
    expect(client.circuitOpen()).toBe(true);
    await expect(client.chat('{}', [{ role: 'user', content: 'x' }], async () => view)).rejects.toThrow('circuit_open');
  });

  it('sin clave no está configurado', () => {
    expect(buildClient({}).isConfigured()).toBe(false);
  });
});

describe('toGeminiSchema', () => {
  it('uniones con null → nullable; null fuera del enum; quita claves no soportadas', () => {
    expect(
      toGeminiSchema({
        type: 'object',
        additionalProperties: false,
        properties: {
          pay: { type: ['string', 'null'], enum: ['tarjeta', 'efectivo', null], description: 'medio' },
          list: { type: 'array', items: { type: ['number', 'null'] } },
        },
        required: [],
      }),
    ).toEqual({
      type: 'object',
      properties: {
        pay: { type: 'string', description: 'medio', enum: ['tarjeta', 'efectivo'], nullable: true },
        list: { type: 'array', items: { type: 'number', nullable: true } },
      },
    });
  });
});
