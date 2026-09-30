import { InsightsGenerator } from './insights.generator';
import { MetricKey } from './engine.constants';

const now = new Date('2026-07-15T12:00:00Z');
const CUR = new Date('2026-07-01T00:00:00.000Z').getTime();

function reading(metricKey: string, value: number, month: 'cur' | 'prev') {
  return {
    metricKey,
    value,
    capturedAt: month === 'cur' ? new Date(CUR) : new Date('2026-06-01T00:00:00.000Z'),
  };
}

function build(rows: ReturnType<typeof reading>[], debts: unknown[] = []) {
  const prisma = {
    metricReading: {
      findMany: jest.fn(({ where }) =>
        Promise.resolve(rows.filter((r) => r.capturedAt.getTime() === where.capturedAt.getTime())),
      ),
    },
    debt: { findMany: jest.fn().mockResolvedValue(debts) },
  } as never;
  const createIfNew = jest.fn().mockResolvedValue({ id: 'x' });
  const generator = new InsightsGenerator(prisma, { createIfNew } as never);
  return { generator, createIfNew };
}

const keys = (mock: jest.Mock) => mock.mock.calls.map((c) => c[0].dedupeKey as string);

describe('InsightsGenerator (FIN-006 §4.3 / DEC-0006)', () => {
  it('sobregiro: cashflow < 0 → riesgo critical con clave mensual', async () => {
    const { generator, createIfNew } = build([reading(MetricKey.Cashflow, -250_000, 'cur')]);
    await generator.generateForUser('u1', now);
    expect(keys(createIfNew)).toContain('riesgo_sobregiro:2026-07');
    const call = createIfNew.mock.calls.find((c) => c[0].dedupeKey === 'riesgo_sobregiro:2026-07')![0];
    expect(call.severity).toBe('critical');
  });

  it('dti: dispara SOLO al cruzar el umbral (0.35)', async () => {
    const cross = build([reading(MetricKey.Dti, 0.4, 'cur'), reading(MetricKey.Dti, 0.3, 'prev')]);
    await cross.generator.generateForUser('u1', now);
    expect(keys(cross.createIfNew)).toContain('riesgo_dti:2026-07');

    const stayed = build([reading(MetricKey.Dti, 0.4, 'cur'), reading(MetricKey.Dti, 0.45, 'prev')]);
    await stayed.generator.generateForUser('u1', now);
    expect(keys(stayed.createIfNew)).not.toContain('riesgo_dti:2026-07'); // ya estaba en rojo
  });

  it('score sube de banda → logro', async () => {
    const { generator, createIfNew } = build([
      reading('score', 760, 'cur'), // saludable
      reading('score', 700, 'prev'), // estable
    ]);
    await generator.generateForUser('u1', now);
    expect(keys(createIfNew)).toContain('logro_banda:2026-07');
  });

  it('score BAJA de banda → riesgo (DEC-0006 §10.2, generador simétrico)', async () => {
    const { generator, createIfNew } = build([
      reading('score', 580, 'cur'), // frágil
      reading('score', 620, 'prev'), // estable
    ]);
    await generator.generateForUser('u1', now);
    expect(keys(createIfNew)).toContain('riesgo_banda:2026-07');
    const call = createIfNew.mock.calls.find((c) => c[0].dedupeKey === 'riesgo_banda:2026-07')![0];
    expect(call.type).toBe('riesgo');
    expect(call.severity).toBe('warning');
  });

  it('cambio de tendencia: el signo se invierte', async () => {
    const { generator, createIfNew } = build([
      reading(MetricKey.TrendCashflow, 120_000, 'cur'),
      reading(MetricKey.TrendCashflow, -80_000, 'prev'),
    ]);
    await generator.generateForUser('u1', now);
    expect(keys(createIfNew)).toContain(`tendencia_${MetricKey.TrendCashflow}:2026-07`);
  });

  it('sin condiciones → no crea nada', async () => {
    const { generator, createIfNew } = build([
      reading(MetricKey.Cashflow, 500_000, 'cur'),
      reading(MetricKey.Dti, 0.1, 'cur'),
    ]);
    await generator.generateForUser('u1', now);
    expect(createIfNew).not.toHaveBeenCalled();
  });

  it('deuda saldada: clave por ENTIDAD (debtId), no por mes (DEC-0006 §10.3)', async () => {
    const { generator, createIfNew } = build([], [
      { id: 'debt-123', debtType: 'tarjeta_credito', status: 'pagada' },
    ]);
    await generator.onDebtUpdated({ userId: 'u1' });
    expect(keys(createIfNew)).toContain('logro_deuda_saldada:debt-123');
  });
});
