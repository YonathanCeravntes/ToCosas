import { DebtOutlayService } from './debt-outlay.service';
import { DebtInsuranceService } from './debt-insurance.service';

/**
 * FIN-023 · Caso a mano del ARQ-0023 §13.2: cuota 500.000 + seguro APARTE
 * 45.000 + cuota de manejo APARTE 30.000 ⇒ comprometido 575.000 (el seguro
 * financiado NO se doble-cuenta). Regresión §13.3: sin cargos aparte,
 * outlay === cuota.
 */
describe('DebtOutlayService (FIN-023, GOBERNANZA §32)', () => {
  const charge = (monthlyPremium: number, financed: boolean, kind = 'otro') => ({
    kind,
    monthlyPremium,
    financed,
    active: true,
    deletedAt: null,
  });

  // FIN-031: los debts ahora incluyen debtType + cardPurchases; los del caso
  // FIN-023 son deudas normales sin compras (comportamiento idéntico).
  const prismaWith = (debts: Array<Record<string, unknown>>) =>
    ({
      debt: {
        findMany: jest.fn().mockResolvedValue(
          debts.map((d) => ({ debtType: 'libre_inversion', cardPurchases: [], ...d })),
        ),
      },
    }) as never;

  it('caso a mano: 500k + seguro aparte 45k + cuota de manejo aparte 30k = 575k', async () => {
    const svc = new DebtOutlayService(
      prismaWith([
        {
          id: 'd1',
          monthlyPayment: 500_000,
          insurances: [
            charge(45_000, false, 'vida_deudor'),
            charge(30_000, false, 'cuota_manejo'),
            charge(60_000, true), // financiado: YA está en la cuota — no suma
            { ...charge(99_000, false), active: false }, // inactivo: no cuenta
          ],
        },
      ]),
    );
    const r = await svc.outlaysByUser('u1');
    expect(r.byDebt.get('d1')).toEqual({ basePayment: 500_000, separate: 75_000, outlay: 575_000 });
    expect(r.totalOutlay).toBe(575_000);
  });

  it('regresión: sin cargos aparte, el desembolso ES la cuota (cifras idénticas a antes de FIN-023)', async () => {
    const svc = new DebtOutlayService(
      prismaWith([
        { id: 'd1', monthlyPayment: 97_199, insurances: [] },
        { id: 'd2', monthlyPayment: 354_035, insurances: [charge(20_000, true)] },
      ]),
    );
    const r = await svc.outlaysByUser('u1');
    expect(r.byDebt.get('d1')!.outlay).toBe(97_199);
    expect(r.byDebt.get('d2')!.outlay).toBe(354_035);
    expect(r.totalOutlay).toBe(451_234);
  });
});

/** DEC-0023 §5.1: la cuota de manejo no es una póliza — endoso/aseguradora se rechazan. */
describe('validación de semántica de cargos (DEC-0023 §5.1)', () => {
  const tx = { debtInsurance: { create: jest.fn((args) => Promise.resolve(args.data)) } };
  const prisma = {
    debt: { findFirst: jest.fn().mockResolvedValue({ id: 'd1' }) },
  } as never;
  // El outbox real ejecuta el callback en transacción y devuelve `result`.
  const outbox = {
    withEvent: jest.fn(async (cb: (t: unknown) => Promise<{ result: unknown }>) => (await cb(tx)).result),
  } as never;
  const svc = new DebtInsuranceService(prisma, outbox);

  it('cuota_manejo con endorsed=true → 400', async () => {
    await expect(
      svc.create('u1', 'd1', {
        kind: 'cuota_manejo' as never,
        name: 'Cuota de manejo',
        monthlyPremium: 30_000,
        endorsed: true,
      }),
    ).rejects.toThrow('no es endosable');
  });

  it('cuota_manejo con aseguradora → 400', async () => {
    await expect(
      svc.create('u1', 'd1', {
        kind: 'cuota_manejo' as never,
        name: 'Cuota de manejo',
        monthlyPremium: 30_000,
        insurer: 'Banco X',
      }),
    ).rejects.toThrow('no tiene aseguradora');
  });

  it('cuota_manejo válida (aparte, sin endoso) se crea; un seguro endosado sigue permitido', async () => {
    await expect(
      svc.create('u1', 'd1', {
        kind: 'cuota_manejo' as never,
        name: 'Cuota de manejo',
        monthlyPremium: 30_000,
        financed: false,
      }),
    ).resolves.toMatchObject({ kind: 'cuota_manejo', financed: false });
    await expect(
      svc.create('u1', 'd1', {
        kind: 'vida_deudor' as never,
        name: 'Póliza propia',
        monthlyPremium: 40_000,
        endorsed: true,
      }),
    ).resolves.toMatchObject({ endorsed: true });
  });
});

/** FIN-031 (DEC-0031 §3.1) · la tarjeta con compras: compromiso = próxima cuota. */
describe('DebtOutlayService — cuotas de tarjeta como única autoridad (FIN-031)', () => {
  const build = (debts: unknown[]) =>
    new DebtOutlayService({ debt: { findMany: jest.fn().mockResolvedValue(debts) } } as never);

  it('tarjeta con compras → suma la PRÓXIMA cuota de cada compra, no monthlyPayment', async () => {
    const card = {
      id: 'card1',
      debtType: 'tarjeta_credito',
      monthlyPayment: 50_000, // "cuota mínima" — NO debe usarse
      insurances: [],
      cardPurchases: [
        { deletedAt: null, installments: [{ periodNo: 1, amount: 200_000, paidAt: null }, { periodNo: 2, amount: 200_000, paidAt: null }] },
        { deletedAt: null, installments: [{ periodNo: 1, amount: 97_000, paidAt: null }] },
      ],
    };
    const r = await build([card]).outlaysByUser('u1');
    expect(r.byDebt.get('card1')!.outlay).toBe(297_000); // 200k + 97k, no 50k
  });

  it('tarjeta SIN compras → cae a monthlyPayment (regresión)', async () => {
    const card = { id: 'card1', debtType: 'tarjeta_credito', monthlyPayment: 120_000, insurances: [], cardPurchases: [] };
    const r = await build([card]).outlaysByUser('u1');
    expect(r.byDebt.get('card1')!.outlay).toBe(120_000);
  });
});
