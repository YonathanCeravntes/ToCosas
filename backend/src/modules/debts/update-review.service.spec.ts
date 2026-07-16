import { UpdateReviewService } from './update-review.service';
import { PRODUCT_TYPE_DESCRIPTORS } from './product-type.descriptor';

/**
 * FIN-036 (DEC-0036) · El detector es DETERMINISTA y día-1: dispara por fecha de
 * corte (que el producto conoce desde su alta), jamás por patrones de uso. Calma:
 * lo revisado se congela en su ventana; tasa fija jamás pregunta. Config-sin-código:
 * una regla nueva en updatePolicy dispara sin tocar el flujo.
 */
describe('UpdateReviewService (FIN-036)', () => {
  const NOW = new Date('2026-07-16T12:00:00Z');
  const svc = (debts: unknown[]) =>
    new UpdateReviewService(
      { debt: { findMany: jest.fn().mockResolvedValue(debts) } } as never,
      {} as never,
      {} as never,
    );
  const card = (over: Record<string, unknown> = {}) => ({
    id: 'd1',
    name: 'Tarjeta Nu',
    debtType: 'fintech',
    rateKind: 'fija',
    status: 'activa',
    creditLimit: 3_000_000,
    interestRate: 32,
    monthlyPayment: null,
    nextDueDate: new Date('2026-07-10T00:00:00Z'), // corte ya pasó
    paymentDay: null,
    createdAt: new Date('2026-06-01T00:00:00Z'), // existe desde antes del corte
    fieldReviews: [],
    ...over,
  });

  it('DÍA-1: una deuda recién creada NO pregunta nada antes de su primer corte', async () => {
    // Creada HOY con corte futuro → cero confirmaciones (sin depender de uso).
    const fresh = card({
      createdAt: new Date('2026-07-16T09:00:00Z'),
      nextDueDate: new Date('2026-08-10T00:00:00Z'),
    });
    expect(await svc([fresh]).pendingReviews('u1', NOW)).toHaveLength(0);
  });

  it('al pasar el corte pregunta EXACTAMENTE lo que su modalidad declara (cupo; tasa fija NO)', async () => {
    const pending = await svc([card()]).pendingReviews('u1', NOW);
    // fintech: cupo al_corte; tasa solo si variable (esta es fija → calma).
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ field: 'creditLimit', debtName: 'Tarjeta Nu', currentValue: 3_000_000 });
  });

  it('tasa variable SÍ se revisa al corte (condición determinista sobre rateKind)', async () => {
    const pending = await svc([card({ rateKind: 'variable' })]).pendingReviews('u1', NOW);
    expect(pending.map((p) => p.field).sort()).toEqual(['creditLimit', 'interestRate']);
  });

  it('CALMA: un campo ya revisado en la ventana del corte vigente NO se repregunta', async () => {
    const reviewed = card({
      fieldReviews: [{ field: 'creditLimit', reviewedAt: new Date('2026-07-11T00:00:00Z'), changed: false }],
    });
    expect(await svc([reviewed]).pendingReviews('u1', NOW)).toHaveLength(0);
  });

  it('la revisión de un corte ANTERIOR no congela el corte nuevo (vuelve a preguntar)', async () => {
    const reviewedOld = card({
      fieldReviews: [{ field: 'creditLimit', reviewedAt: new Date('2026-06-12T00:00:00Z'), changed: false }],
    });
    const pending = await svc([reviewedOld]).pendingReviews('u1', NOW);
    expect(pending).toHaveLength(1); // el corte del 10 de julio abre ventana nueva
  });

  it('modalidad sin política (crédito personal a tasa fija) = silencio total', async () => {
    const personal = card({ debtType: 'credito_personal' });
    expect(await svc([personal]).pendingReviews('u1', NOW)).toHaveLength(0);
  });

  it('CONFIG-SIN-CÓDIGO: agregar una regla a la updatePolicy dispara sin tocar el flujo', async () => {
    const original = PRODUCT_TYPE_DESCRIPTORS.credito_personal.updatePolicy;
    try {
      // "Modalidad nueva" = una fila de config — el detector la ve sin cambios de código.
      PRODUCT_TYPE_DESCRIPTORS.credito_personal.updatePolicy = [
        { field: 'monthlyPayment', label: 'la cuota', cadence: 'al_corte' },
      ];
      const personal = card({ debtType: 'credito_personal', monthlyPayment: 250_000 });
      const pending = await svc([personal]).pendingReviews('u1', NOW);
      expect(pending).toHaveLength(1);
      expect(pending[0].field).toBe('monthlyPayment');
    } finally {
      PRODUCT_TYPE_DESCRIPTORS.credito_personal.updatePolicy = original;
    }
  });

  it('sin fecha de corte conocida (ni nextDueDate ni paymentDay) → degrada a silencio', async () => {
    const sinCorte = card({ nextDueDate: null, paymentDay: null });
    expect(await svc([sinCorte]).pendingReviews('u1', NOW)).toHaveLength(0);
  });
});
