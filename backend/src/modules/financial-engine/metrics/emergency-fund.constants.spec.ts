import { EMERGENCY_FUND_MILESTONES, nextMilestone } from './emergency-fund.constants';

/** FIN-021 · Caso a mano de la selección de hito (ARQ-0021 §13.3). */
describe('nextMilestone (FIN-021, DEC-0021 Alt C)', () => {
  it('por debajo del colchón inicial (incluye 0): apunta al colchón (3)', () => {
    expect(nextMilestone(0)).toEqual({ months: 3, label: 'colchón inicial' });
    expect(nextMilestone(2.9)).toEqual({ months: 3, label: 'colchón inicial' });
  });

  it('entre colchón y fondo completo: apunta al fondo completo (6)', () => {
    expect(nextMilestone(3)).toEqual({ months: 6, label: 'fondo completo' });
    expect(nextMilestone(5.9)).toEqual({ months: 6, label: 'fondo completo' });
  });

  it('fondo completo logrado: no hay próximo hito (null — nada que recomendar)', () => {
    expect(nextMilestone(6)).toBeNull();
    expect(nextMilestone(12)).toBeNull();
  });

  it('la escala oficial coincide con la ya auditada (logros fondo_3m/fondo_6m, cortes de Salud)', () => {
    expect(EMERGENCY_FUND_MILESTONES.colchonInicial.months).toBe(3);
    expect(EMERGENCY_FUND_MILESTONES.fondoCompleto.months).toBe(6);
  });
});
