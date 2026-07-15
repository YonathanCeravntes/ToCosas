import {
  computeScore,
  debtPillar,
  emergencyFundSub,
  liquidityPillar,
  normTrend,
  savingsRateSub,
  scoreBand,
  wealthPillar,
} from './score.util';

describe('pilares — anclas (ARQ-0004 §4.1)', () => {
  it('liquidez: 0m=0 · 3m=60 · 6m=100 · interpola', () => {
    expect(liquidityPillar(0)).toBe(0);
    expect(liquidityPillar(3)).toBe(60);
    expect(liquidityPillar(6)).toBe(100);
    expect(liquidityPillar(10)).toBe(100); // cap
    expect(liquidityPillar(1.5)).toBe(30);
    expect(liquidityPillar(4.5)).toBe(80);
  });

  it('endeudamiento: 0=100 · 20%=80 · 35%=50 · 60%=0', () => {
    expect(debtPillar(0)).toBe(100);
    expect(debtPillar(0.2)).toBe(80);
    expect(debtPillar(0.35)).toBe(50);
    expect(debtPillar(0.6)).toBe(0);
    expect(debtPillar(0.9)).toBe(0); // cap
    expect(debtPillar(0.275)).toBe(65); // interpolación
  });

  it('ahorro: tasa ≤0=0 · 10%=50 · ≥20%=100 | fondo 0=0 · 3m=60 · 6m=100', () => {
    expect(savingsRateSub(-0.5)).toBe(0);
    expect(savingsRateSub(0.1)).toBe(50);
    expect(savingsRateSub(0.2)).toBe(100);
    expect(savingsRateSub(0.15)).toBe(75);
    expect(emergencyFundSub(3)).toBe(60);
    expect(emergencyFundSub(6)).toBe(100);
  });
});

describe('normTrend (DEC-0004 §10.1)', () => {
  it('clamp(pendiente ÷ max(esencial, 1), −1, +1)', () => {
    expect(normTrend(2_000_000, 2_000_000)).toBe(1); // crece 1× esencial → +1
    expect(normTrend(-4_000_000, 2_000_000)).toBe(-1); // clamp inferior
    expect(normTrend(1_000_000, 2_000_000)).toBe(0.5);
    expect(normTrend(0, 2_000_000)).toBe(0);
    expect(normTrend(5, 0)).toBe(1); // esencial 0 → divisor 1, clamp
  });
});

describe('pilar patrimonio (ARQ-0004 + DEC-0004 §10.1)', () => {
  it('nw>0: base 70; +30 con tendencia ≥0', () => {
    expect(wealthPillar(1_000_000, 100, 2_000_000)).toBe(100);
    expect(wealthPillar(1_000_000, -100, 2_000_000)).toBe(70);
    expect(wealthPillar(1_000_000, null, 2_000_000)).toBe(70); // cold-start: solo base
  });
  it('nw≤0: max(0, 40+40·norm); sin tendencia norm=0 → 40', () => {
    expect(wealthPillar(-500_000, null, 2_000_000)).toBe(40);
    expect(wealthPillar(-500_000, 2_000_000, 2_000_000)).toBe(80); // norm=+1
    expect(wealthPillar(-500_000, -2_000_000, 2_000_000)).toBe(0); // norm=−1
    expect(wealthPillar(-500_000, -1_000_000, 2_000_000)).toBe(20); // norm=−0.5
  });
});

describe('computeScore — composición y renormalización', () => {
  const full = {
    liquidityRunway: 6,
    dti: 0,
    savingsRate: 0.2,
    emergencyFundMonths: 6,
    netWorth: 10_000_000,
    netWorthTrend: 100_000,
    essentialExpense: 2_000_000,
  };

  it('usuario perfecto → 1000, banda élite', () => {
    const r = computeScore(full);
    expect(r.score).toBe(1000);
    expect(r.band).toBe('elite');
    expect(r.renormalized).toBe(false);
    expect(r.version).toBe(1);
  });

  it('ponderación nominal: pilares en anclas conocidas', () => {
    // liquidez 60 (3m), deuda 80 (20%), ahorro 80 (avg 100 y 60), patrimonio 100
    const r = computeScore({ ...full, liquidityRunway: 3, dti: 0.2, emergencyFundMonths: 3 });
    // 0.28·60 + 0.28·80 + 0.25·80 + 0.19·100 = 16.8+22.4+20+19 = 78.2 → 782
    expect(r.score).toBe(782);
    expect(r.band).toBe('saludable');
  });

  it('pilar ausente → renormaliza sobre los presentes (explícito)', () => {
    const r = computeScore({ ...full, liquidityRunway: null });
    const liquidity = r.pillars.find((p) => p.key === 'liquidity')!;
    expect(liquidity.status).toBe('unavailable');
    expect(liquidity.effectiveWeight).toBe(0);
    expect(r.renormalized).toBe(true);
    // Los demás en 100 → score sigue siendo 1000 con pesos renormalizados.
    expect(r.score).toBe(1000);
    const sumEff = r.pillars.reduce((a, p) => a + p.effectiveWeight, 0);
    expect(sumEff).toBeCloseTo(1, 10);
  });

  it('ahorro parcial (DEC-0004 §10.2): usa solo la sub-métrica disponible', () => {
    const r = computeScore({ ...full, emergencyFundMonths: null, savingsRate: 0.1 });
    const savings = r.pillars.find((p) => p.key === 'savings')!;
    expect(savings.status).toBe('partial');
    expect(savings.value).toBe(50); // solo tasa (50), NO promediado con faltante
  });

  it('ahorro unavailable solo si faltan AMBAS sub-métricas', () => {
    const r = computeScore({ ...full, emergencyFundMonths: null, savingsRate: null });
    expect(r.pillars.find((p) => p.key === 'savings')!.status).toBe('unavailable');
  });

  it('bandas', () => {
    expect(scoreBand(0)).toBe('critico');
    expect(scoreBand(399)).toBe('critico');
    expect(scoreBand(400)).toBe('fragil');
    expect(scoreBand(600)).toBe('estable');
    expect(scoreBand(750)).toBe('saludable');
    expect(scoreBand(900)).toBe('elite');
    expect(scoreBand(1000)).toBe('elite');
  });
});
