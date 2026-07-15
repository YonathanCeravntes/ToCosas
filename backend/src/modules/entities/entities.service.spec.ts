import { EntitiesService } from './entities.service';
import { GlobalEntitySeed } from './global-entities.catalog';

/**
 * FIN-034 (DEC-0034) · La siembra del catálogo global es idempotente y dirigida
 * por config (config-sin-código); la búsqueda ordena por pertenencia/relevancia
 * SIN rankear "la mejor" (Independencia). Tests con un Prisma de mano.
 */
describe('EntitiesService (FIN-034)', () => {
  const makePrisma = (overrides: Record<string, unknown> = {}) => {
    const store: Array<Record<string, unknown>> = [];
    return {
      _store: store,
      financialEntity: {
        findFirst: jest.fn(async ({ where }: any) =>
          store.find((e) => e.name === where.name && e.isGlobal === where.isGlobal) ?? null),
        create: jest.fn(async ({ data }: any) => {
          const row = { id: 'id-' + store.length, ...data };
          store.push(row);
          return row;
        }),
        update: jest.fn(async () => ({})),
        findMany: jest.fn(async () => []),
      },
      debt: { findMany: jest.fn(async () => []) },
      ...overrides,
    } as never;
  };

  it('siembra idempotente: crea la 1ª vez, no duplica la 2ª (config-sin-código)', async () => {
    const prisma = makePrisma();
    const svc = new EntitiesService(prisma);
    const catalog: GlobalEntitySeed[] = [{ name: 'Banco Demo', type: 'banco', typicalRate: 20 }];

    const created1 = await svc.seedGlobalEntities(catalog);
    expect(created1).toBe(1);
    const created2 = await svc.seedGlobalEntities(catalog);
    expect(created2).toBe(0); // ya existe → update, no create
    expect((prisma as any).financialEntity.create).toHaveBeenCalledTimes(1);
  });

  it('config-sin-código: agregar una fila al catálogo la publica sin tocar más código', async () => {
    const prisma = makePrisma();
    const svc = new EntitiesService(prisma);
    // "Modalidad nueva" = una fila; el seeder la crea, sin cambios de interfaz.
    await svc.seedGlobalEntities([{ name: 'Neobanco 2099', type: 'fintech', typicalRate: 40 }]);
    expect((prisma as any)._store.map((e: any) => e.name)).toContain('Neobanco 2099');
    expect((prisma as any)._store[0].isGlobal).toBe(true);
  });

  it('búsqueda: lo del usuario va primero; sin campo de ranking/score (Independencia)', async () => {
    const rows = [
      { id: 'g1', name: 'Banco Global', type: 'banco', userId: null, isGlobal: true },
      { id: 'u1', name: 'Banco Mío', type: 'banco', userId: 'u', isGlobal: false },
    ];
    const prisma = makePrisma();
    (prisma as any).financialEntity.findMany = jest.fn(async () => rows);
    const svc = new EntitiesService(prisma);

    const res = await svc.search('u', 'Banco');
    expect(res[0].name).toBe('Banco Mío'); // pertenencia primero, no "la mejor"
    // Reconocimiento, no recomendación: solo el tipo sugerido, cero score/rank.
    expect(res[0]).toHaveProperty('suggestedDebtType');
    expect(res[0]).not.toHaveProperty('score');
    expect(res[0]).not.toHaveProperty('rank');
    expect(res[0]).not.toHaveProperty('recommended');
  });

  it('búsqueda: prefijo antes que "contiene" (relevancia, no calidad)', async () => {
    const rows = [
      { id: '1', name: 'Mi Banco Nacional', type: 'banco', userId: null, isGlobal: true },
      { id: '2', name: 'Nación Créditos', type: 'fintech', userId: null, isGlobal: true },
    ];
    const prisma = makePrisma();
    (prisma as any).financialEntity.findMany = jest.fn(async () => rows);
    const svc = new EntitiesService(prisma);

    const res = await svc.search('u', 'Na');
    expect(res[0].name).toBe('Nación Créditos'); // empieza por "Na"
  });

  it('la entidad sugiere un tipo (pista): fintech → fintech; banco → sin default', async () => {
    const rows = [
      { id: 'f', name: 'Nu', type: 'fintech', userId: null, isGlobal: true },
      { id: 'b', name: 'Bancolombia', type: 'banco', userId: null, isGlobal: true },
    ];
    const prisma = makePrisma();
    (prisma as any).financialEntity.findMany = jest.fn(async () => rows);
    const svc = new EntitiesService(prisma);
    const res = await svc.search('u');
    expect(res.find((e) => e.name === 'Nu')!.suggestedDebtType).toBe('fintech');
    expect(res.find((e) => e.name === 'Bancolombia')!.suggestedDebtType).toBeNull();
  });
});
