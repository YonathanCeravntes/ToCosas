import { isoWeekKey, isoWeeksOfMonth, previousIsoWeekKey } from './week.util';
import { GamificationService } from './gamification.service';
import {
  ACHIEVEMENT_CATALOG,
  CHALLENGE_DEFS,
  LEVELS,
} from './gamification.constants';
import { FORBIDDEN_BRAND_TERMS } from '../copilot/copilot.constants';

describe('week.util — regla del jueves ISO (DEC-0008 §10.1)', () => {
  it('claves ISO correctas (casos de borde de año)', () => {
    expect(isoWeekKey(new Date('2026-07-15T12:00:00Z'))).toBe('2026-W29');
    expect(isoWeekKey(new Date('2026-01-01T00:00:00Z'))).toBe('2026-W01'); // jue 1 ene
    expect(isoWeekKey(new Date('2027-01-01T00:00:00Z'))).toBe('2026-W53'); // vie → semana del año previo
  });

  it('previousIsoWeekKey retrocede una semana', () => {
    expect(previousIsoWeekKey(new Date('2026-07-15T12:00:00Z'))).toBe('2026-W28');
  });

  it('las semanas del mes son 4 o 5 según dónde caen los jueves', () => {
    // Julio 2026: jueves 2, 9, 16, 23, 30 → 5 semanas pertenecen a julio.
    expect(isoWeeksOfMonth('2026-07')).toHaveLength(5);
    // Febrero 2026: jueves 5, 12, 19, 26 → 4 semanas.
    expect(isoWeeksOfMonth('2026-02')).toHaveLength(4);
  });

  it('una semana pertenece a UN solo mes (partición sin solapamiento)', () => {
    const june = isoWeeksOfMonth('2026-06');
    const july = isoWeeksOfMonth('2026-07');
    for (const w of june) expect(july).not.toContain(w);
  });
});

describe('racha semanal (§4.1)', () => {
  function build(existing: { current: number; best: number; lastPeriod: string } | null) {
    const ops: Record<string, unknown[]> = { create: [], update: [] };
    const prisma = {
      streak: {
        findUnique: jest.fn().mockResolvedValue(existing ? { id: 's1', ...existing } : null),
        create: jest.fn((a) => { ops.create.push(a.data); return Promise.resolve({}); }),
        update: jest.fn((a) => { ops.update.push(a.data); return Promise.resolve({}); }),
      },
      achievement: { create: jest.fn().mockRejectedValue({ code: 'P2002' }) }, // ya tiene los logros
    } as never;
    const insights = { createIfNew: jest.fn() } as never;
    return { service: new GamificationService(prisma, insights), ops };
  }
  const wed = new Date('2026-07-15T12:00:00Z'); // 2026-W29

  it('primera actividad crea racha en 1', async () => {
    const { service, ops } = build(null);
    await service.registerActivity('u1', wed);
    expect(ops.create[0]).toMatchObject({ current: 1, best: 1, lastPeriod: '2026-W29' });
  });

  it('misma semana: no-op', async () => {
    const { service, ops } = build({ current: 3, best: 5, lastPeriod: '2026-W29' });
    await service.registerActivity('u1', wed);
    expect(ops.update).toHaveLength(0);
  });

  it('semana consecutiva: +1 y actualiza best si supera', async () => {
    const { service, ops } = build({ current: 5, best: 5, lastPeriod: '2026-W28' });
    await service.registerActivity('u1', wed);
    expect(ops.update[0]).toMatchObject({ current: 6, best: 6, lastPeriod: '2026-W29' });
  });

  it('hueco: resetea a 1 conservando best', async () => {
    const { service, ops } = build({ current: 7, best: 9, lastPeriod: '2026-W25' });
    await service.registerActivity('u1', wed);
    expect(ops.update[0]).toMatchObject({ current: 1, best: 9 });
  });
});

describe('elegibilidad de retos (DEC-0008 §10.2 — 3 escenarios)', () => {
  function build(opts: { discretionaryTxs: number; flows: number[]; essential: number }) {
    const created: Array<{ code: string }> = [];
    const monthReadings = (capturedAt: Date) => {
      const rows: Array<{ metricKey: string; value: number }> = [
        { metricKey: 'essential_expense', value: opts.essential },
      ];
      // Meses previos con cashflow según opts.flows (índice por distancia).
      const now = new Date('2026-07-15T12:00:00Z');
      const diff = (now.getUTCFullYear() - capturedAt.getUTCFullYear()) * 12 + (now.getUTCMonth() - capturedAt.getUTCMonth());
      if (diff >= 1 && diff <= opts.flows.length) rows.push({ metricKey: 'cashflow', value: opts.flows[diff - 1] });
      return rows;
    };
    const prisma = {
      challenge: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn((a) => { created.push(a.data); return Promise.resolve(a.data); }),
      },
      transaction: {
        count: jest.fn().mockResolvedValue(opts.discretionaryTxs),
        findMany: jest.fn().mockResolvedValue([]),
      },
      metricReading: {
        findMany: jest.fn(({ where }) => Promise.resolve(monthReadings(where.capturedAt))),
      },
    } as never;
    return { service: new GamificationService(prisma, { createIfNew: jest.fn() } as never), created };
  }
  const now = new Date('2026-07-15T12:00:00Z');

  it('con gasto discrecional → bajo_promedio (primera prioridad)', async () => {
    const { service } = build({ discretionaryTxs: 5, flows: [500_000], essential: 2_000_000 });
    expect(await service.assignChallenge('u1', now)).toBe('bajo_promedio');
  });

  it('sin discrecional y flujo sano → flujo_positivo', async () => {
    const { service } = build({ discretionaryTxs: 0, flows: [300_000, 100_000], essential: 2_000_000 });
    expect(await service.assignChallenge('u1', now)).toBe('flujo_positivo');
  });

  it('flujo estructuralmente negativo (peor que −20% ref) → registro_constante (default)', async () => {
    const { service, created } = build({ discretionaryTxs: 0, flows: [-900_000, -800_000], essential: 2_000_000 });
    expect(await service.assignChallenge('u1', now)).toBe('registro_constante');
    // El target trae TODAS las semanas del mes (4 o 5), no un 4 fijo (§10.1).
    const target = (created[0] as unknown as { target: { weeks: string[] } }).target;
    expect(target.weeks).toHaveLength(5); // julio 2026
  });
});

describe('XP y niveles (§4.3, on-read)', () => {
  it('los umbrales de nivel son estrictamente crecientes y arrancan en 0', () => {
    expect(LEVELS[0].minXp).toBe(0);
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].minXp).toBeGreaterThan(LEVELS[i - 1].minXp);
    }
  });

  it('el catálogo tiene 12 logros con XP positivo y códigos únicos', () => {
    expect(ACHIEVEMENT_CATALOG).toHaveLength(12);
    const codes = new Set(ACHIEVEMENT_CATALOG.map((a) => a.code));
    expect(codes.size).toBe(12);
    for (const a of ACHIEVEMENT_CATALOG) expect(a.xp).toBeGreaterThan(0);
  });
});

describe('genericidad y celebración (cero senders)', () => {
  it('ningún texto del catálogo/retos nombra marcas (DEC-0005 §14.2)', () => {
    const all = JSON.stringify({ ACHIEVEMENT_CATALOG, CHALLENGE_DEFS }).toLowerCase();
    for (const term of FORBIDDEN_BRAND_TERMS) {
      expect(all.includes(term)).toBe(false);
    }
  });

  it('unlock celebra SOLO vía InsightsService (ningún sender involucrado)', async () => {
    const createIfNew = jest.fn().mockResolvedValue({ id: 'i1' });
    const prisma = { achievement: { create: jest.fn().mockResolvedValue({}) } } as never;
    const service = new GamificationService(prisma, { createIfNew } as never);
    // El constructor NO recibe PushSender/WhatsAppSender/TelegramSender: la
    // ausencia de esas dependencias es la garantía de "cero rutas nuevas".
    expect(await service.unlock('u1', 'fondo_6m')).toBe(true);
    expect(createIfNew).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'logro', dedupeKey: 'gami_fondo_6m' }),
    );
  });

  it('unlock es idempotente (P2002 → false, sin insight duplicado)', async () => {
    const createIfNew = jest.fn();
    const prisma = { achievement: { create: jest.fn().mockRejectedValue({ code: 'P2002' }) } } as never;
    const service = new GamificationService(prisma, { createIfNew } as never);
    expect(await service.unlock('u1', 'fondo_6m')).toBe(false);
    expect(createIfNew).not.toHaveBeenCalled();
  });
});
