import { SpendableService } from './spendable.service';

/**
 * FIN-020 · Caso a mano de la definición oficial de "Te queda" (ARQ-0020 §13):
 *
 *   Ciclo jul 2026 (corte día 1), hoy 12 jul.
 *   Ingresos REALES recibidos:        $500.000
 *   Salidas REALES (gasto+cuotas):    $750.000
 *   Pendiente — Arriendo (fijo, día 5, YA pasó):  $1.200.000  ← §4.1-bis: cuenta igual
 *   Pendiente — Internet (fijo, sin día):           $300.000
 *   Pendiente — Tarjeta (cuota, vence 28 jul):       $97.000
 *   NO pendiente — Moto (cuota, vence 15 ago, fuera del ciclo)
 *   ⇒ teQueda = 500.000 − 750.000 − 1.597.000 = −1.847.000
 */
describe('SpendableService (FIN-020, GOBERNANZA §32)', () => {
  const NOW = new Date('2026-07-12T15:00:00.000Z');

  // FIN-023: fuente única de desembolso — el caso base no tiene cargos aparte,
  // así que el fallback a la cuota reproduce las MISMAS cifras (regresión).
  const noCharges = { outlaysByUser: jest.fn().mockResolvedValue({ byDebt: new Map(), totalOutlay: 0 }) } as never;

  const groupBy = (sums: Record<string, number>) =>
    Object.entries(sums).map(([kind, amount]) => ({ kind, _sum: { amount } }));

  const prismaWith = (opts: {
    cycleStartDay?: number;
    sums: Record<string, number>;
    fixedItems: unknown[];
    debts: unknown[];
  }) => ({
    userSettings: {
      findUnique: jest.fn().mockResolvedValue({ cycleStartDay: opts.cycleStartDay ?? 1 }),
    },
    transaction: { groupBy: jest.fn().mockResolvedValue(groupBy(opts.sums)) },
    fixedItem: { findMany: jest.fn().mockResolvedValue(opts.fixedItems) },
    debt: { findMany: jest.fn().mockResolvedValue(opts.debts) },
  });

  const baseScenario = () =>
    prismaWith({
      sums: { ingreso: 500_000, gasto: 300_000, pago_deuda: 450_000 },
      fixedItems: [
        { name: 'Arriendo', amount: 1_200_000, dayOfMonth: 5 },
        { name: 'Internet', amount: 300_000, dayOfMonth: null },
      ],
      debts: [
        { name: 'Tarjeta', monthlyPayment: 97_000, nextDueDate: new Date('2026-07-28T00:00:00.000Z') },
        { name: 'Moto', monthlyPayment: 500_000, nextDueDate: new Date('2026-08-15T00:00:00.000Z') },
      ],
    });

  it('caso a mano: Alt A con fijo vencido-sin-transacción contando como pendiente (§4.1-bis)', async () => {
    const prisma = baseScenario();
    const r = await new SpendableService(prisma as never, noCharges).compute('u1', NOW);

    expect(r.receivedIncome).toBe(500_000);
    expect(r.protectedTotal).toBe(1_597_000); // arriendo + internet + tarjeta (moto NO)
    expect(r.amount).toBe(-1_847_000);
    expect(r.perDay).toBeNull(); // sin margen no hay "por día"
    expect(r.daysLeft).toBe(20); // 12 jul → 1 ago
    expect(r.until).toBe('2026-07-31T00:00:00.000Z'); // último día visible

    // Línea de tiempo (P4): orden por fecha, sin-fecha al final; el fijo cuya
    // fecha ya pasó se marca con etiqueta NEUTRA (datePassed), nunca "pagado".
    expect(r.pendingCommitments.map((c) => c.name)).toEqual(['Arriendo', 'Tarjeta', 'Internet']);
    expect(r.pendingCommitments[0]).toMatchObject({ kind: 'fijo', datePassed: true });
    expect(r.pendingCommitments[1]).toMatchObject({ kind: 'cuota', datePassed: false });
    expect(r.pendingCommitments[2]).toMatchObject({ date: null, datePassed: false });
  });

  it('los ingresos futuros NO cuentan: solo se consultan fijos de GASTO (Alt A)', async () => {
    const prisma = baseScenario();
    await new SpendableService(prisma as never, noCharges).compute('u1', NOW);
    expect(prisma.fixedItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ kind: 'gasto' }) }),
    );
  });

  it('con margen positivo calcula el "por día" sobre los días restantes', async () => {
    const prisma = prismaWith({
      sums: { ingreso: 5_000_000, gasto: 300_000, pago_deuda: 450_000 },
      fixedItems: [
        { name: 'Arriendo', amount: 1_200_000, dayOfMonth: 5 },
        { name: 'Internet', amount: 300_000, dayOfMonth: null },
      ],
      debts: [
        { name: 'Tarjeta', monthlyPayment: 97_000, nextDueDate: new Date('2026-07-28T00:00:00.000Z') },
      ],
    });
    const r = await new SpendableService(prisma as never, noCharges).compute('u1', NOW);
    expect(r.amount).toBe(2_653_000);
    expect(r.perDay).toBe(132_650); // 2.653.000 / 20 días
  });

  it('ciclo con corte 15: el fijo de día 5 cae en el MES SIGUIENTE dentro del ciclo', async () => {
    const prisma = prismaWith({
      cycleStartDay: 15,
      sums: { ingreso: 1_000_000 },
      fixedItems: [{ name: 'Gimnasio', amount: 200_000, dayOfMonth: 5 }],
      debts: [],
    });
    const r = await new SpendableService(prisma as never, noCharges).compute('u1', new Date('2026-07-20T12:00:00.000Z'));
    // Periodo 15 jul – 15 ago; su ocurrencia es el 5 AGO (no el 5 jul, ya fuera).
    expect(r.pendingCommitments[0].date).toBe('2026-08-05T00:00:00.000Z');
    expect(r.pendingCommitments[0].datePassed).toBe(false);
    expect(r.amount).toBe(800_000);
  });
});
