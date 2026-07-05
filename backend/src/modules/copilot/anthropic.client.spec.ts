import { AnthropicClient } from './anthropic.client';
import { brand, MinimizedToolView } from './minimized-views';
import { CIRCUIT_BREAKER_THRESHOLD } from './copilot.constants';

function buildClient(env: Record<string, string> = { ANTHROPIC_API_KEY: 'sk-test' }) {
  const config = {
    get: jest.fn((key: string, def?: string) => env[key] ?? def),
  } as never;
  return new AnthropicClient(config);
}

const okResponse = (text = 'Respuesta de prueba') => ({
  ok: true,
  json: async () => ({
    stop_reason: 'end_turn',
    content: [{ type: 'text', text }],
    usage: { input_tokens: 100, output_tokens: 50 },
  }),
});

const view: MinimizedToolView = brand({ kind: 'debts' as const, debts: [] });

describe('AnthropicClient (§4.8)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('turno simple: request bien formada y texto devuelto', async () => {
    const fetchMock = jest.fn().mockResolvedValue(okResponse());
    global.fetch = fetchMock as never;
    const client = buildClient();
    const result = await client.chat('{"ctx":1}', [{ role: 'user', content: 'hola' }], async () => view);

    expect(result.text).toBe('Respuesta de prueba');
    expect(result.inputTokens).toBe(100);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    const body = JSON.parse(init.body);
    expect(body.system[0].cache_control).toEqual({ type: 'ephemeral' }); // prompt caching
    expect(body.tools).toHaveLength(4); // snapshot, debts, score, memoria (FIN-006)
    expect(init.headers['x-api-key']).toBe('sk-test');
  });

  it('tool-use: ejecuta la tool, exige vista minimizada y continúa el turno', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stop_reason: 'tool_use',
          content: [{ type: 'tool_use', id: 't1', name: 'get_debts', input: {} }],
          usage: { input_tokens: 80, output_tokens: 20 },
        }),
      })
      .mockResolvedValueOnce(okResponse('Con tus deudas…'));
    global.fetch = fetchMock as never;
    const executor = jest.fn().mockResolvedValue(view);
    const client = buildClient();
    const result = await client.chat('{}', [{ role: 'user', content: 'deudas' }], executor);

    expect(executor).toHaveBeenCalledWith('get_debts');
    expect(result.text).toBe('Con tus deudas…');
    expect(result.inputTokens).toBe(180); // suma de ambas rondas
  });

  it('tool que devuelve objeto NO minimizado → bloqueada (runtime, §4.3-A)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        stop_reason: 'tool_use',
        content: [{ type: 'tool_use', id: 't1', name: 'get_debts', input: {} }],
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
    }) as never;
    const rawObject = { name: 'Préstamo de Andrés cel 300123' }; // dominio crudo
    const client = buildClient();
    await expect(
      client.chat('{}', [{ role: 'user', content: 'x' }], async () => rawObject as never),
    ).rejects.toThrow(/Bloqueado/);
  });

  it('5xx → reintenta una vez y triunfa', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'boom' })
      .mockResolvedValueOnce(okResponse());
    global.fetch = fetchMock as never;
    const client = buildClient();
    const result = await client.chat('{}', [{ role: 'user', content: 'x' }], async () => view);
    expect(result.text).toBe('Respuesta de prueba');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('429 → NO reintenta', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 429 });
    global.fetch = fetchMock as never;
    const client = buildClient();
    await expect(
      client.chat('{}', [{ role: 'user', content: 'x' }], async () => view),
    ).rejects.toThrow('anthropic_http_429');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('circuit breaker: tras 5 fallos consecutivos la vía LLM se pausa', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400 }) as never;
    const client = buildClient();
    for (let i = 0; i < CIRCUIT_BREAKER_THRESHOLD; i++) {
      await expect(
        client.chat('{}', [{ role: 'user', content: 'x' }], async () => view),
      ).rejects.toThrow();
    }
    expect(client.circuitOpen()).toBe(true);
    await expect(
      client.chat('{}', [{ role: 'user', content: 'x' }], async () => view),
    ).rejects.toThrow('circuit_open');
  });

  it('isConfigured refleja la ausencia de API key (modo plantillas, §14.3)', () => {
    expect(buildClient({}).isConfigured()).toBe(false);
    expect(buildClient({ ANTHROPIC_API_KEY: 'sk-x' }).isConfigured()).toBe(true);
  });
});
