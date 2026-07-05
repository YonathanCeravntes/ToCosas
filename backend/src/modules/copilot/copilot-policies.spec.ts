import {
  AI_CONSENT_TEXT,
  FORBIDDEN_BRAND_TERMS,
  SYSTEM_PROMPT,
} from './copilot.constants';
import { detectIntent, renderTemplate } from './templates';
import { brand, MinimizedContext } from './minimized-views';

/**
 * Tests de política del Copiloto:
 *  - §14.1 (adenda legal): el texto de consentimiento contiene los elementos
 *    exigidos por el memorando (Ley 1581/2012).
 *  - §14.2: restricción de "recomendación genérica" verificable — ni el system
 *    prompt como instrucción ausente, ni las plantillas, nombran marcas.
 */

const ctx: MinimizedContext = brand({
  period: '2026-07',
  score: {
    value: 700,
    band: 'estable',
    pillars: [
      { key: 'liquidity', value: 60, status: 'ok' },
      { key: 'debt', value: 90, status: 'ok' },
      { key: 'savings', value: 70, status: 'ok' },
      { key: 'wealth', value: 40, status: 'ok' },
    ],
  },
  metrics: [
    { key: 'cashflow', value: 1_000_000 },
    { key: 'savings_rate', value: 0.2 },
  ],
  debts: [
    {
      ref: 'deuda #1 (tarjeta_credito)',
      type: 'tarjeta_credito',
      balance: 2_000_000,
      ratePct: 32,
      rateBasis: 'EA',
      monthlyPayment: 150_000,
      projectedPayoffDate: '2027-06-01',
    },
    {
      ref: 'deuda #2 (hipotecario)',
      type: 'hipotecario',
      balance: 80_000_000,
      ratePct: 12,
      rateBasis: 'EA',
      monthlyPayment: 900_000,
      projectedPayoffDate: '2036-07-01',
    },
  ],
  budget: {
    fixedIncomeTotal: 5_000_000,
    fixedExpenseTotal: 1_500_000,
    topFixedExpenses: [{ ref: 'gasto fijo #1', amount: 1_200_000 }],
    available: 2_450_000,
  },
  netWorth: { totalAssets: 100_000_000, totalLiquid: 3_000_000, emergencyFund: 2_000_000, totalLiabilities: 82_000_000, net: 18_000_000 },
  categorySpend: [{ category: 'Mercado', amount: 800_000 }],
});

describe('consentimiento — elementos legales (DEC-0005 §14.1)', () => {
  const t = AI_CONSENT_TEXT.toLowerCase();
  it.each([
    ['responsable del tratamiento', 'responsable del tratamiento'],
    ['finalidad con IA', 'inteligencia artificial'],
    ['proveedor Anthropic', 'anthropic'],
    ['transferencia internacional a EE.UU.', 'estados unidos'],
    ['advertencia de nivel de protección (criterio SIC)', 'nivel adecuado de protección'],
    ['derechos ARCO', 'arco'],
    ['revocación', 'revocar'],
    ['no asesoría regulada', 'no es asesoría financiera regulada'],
  ])('incluye: %s', (_label, needle) => {
    expect(t).toContain(needle);
  });
});

describe('recomendación genérica (DEC-0005 §14.2)', () => {
  it('el system prompt contiene la restricción explícita', () => {
    expect(SYSTEM_PROMPT).toContain('RECOMENDACIÓN GENÉRICA');
    expect(SYSTEM_PROMPT.toLowerCase()).toContain('nunca nombres entidades financieras');
  });

  it('ninguna plantilla emite marcas/entidades financieras', () => {
    const intents = ['greeting', 'help', 'score_why', 'month_summary', 'debt_priority', 'glossary'] as const;
    const outputs = intents
      .map((i) => renderTemplate(i, ctx, '¿qué es el dti?'))
      .join('\n')
      .toLowerCase();
    for (const term of FORBIDDEN_BRAND_TERMS) {
      expect(`${term}:${outputs.includes(term)}`).toBe(`${term}:false`);
    }
  });

  it('el propio texto de consentimiento tampoco nombra marcas de terceros', () => {
    const t = AI_CONSENT_TEXT.toLowerCase();
    for (const term of FORBIDDEN_BRAND_TERMS) {
      expect(t.includes(term)).toBe(false);
    }
  });
});

describe('router plantilla-primero (§4.5)', () => {
  it.each([
    ['hola', 'greeting'],
    ['¿por qué bajó mi score?', 'score_why'],
    ['dame el resumen de mi mes', 'month_summary'],
    ['¿qué deuda pago primero?', 'debt_priority'],
    ['¿qué es el dti?', 'glossary'],
    ['ayuda', 'help'],
  ])('"%s" → %s (sin LLM)', (text, intent) => {
    expect(detectIntent(text)).toBe(intent);
  });

  it('pregunta abierta → null (requiere LLM)', () => {
    expect(detectIntent('¿me conviene vender mi carro para pagar la tarjeta?')).toBeNull();
  });

  it('debt_priority recomienda por tasa usando el identificador no libre', () => {
    const out = renderTemplate('debt_priority', ctx, '');
    expect(out).toContain('deuda #1 (tarjeta_credito)'); // 32% > 12%
    expect(out).toContain('32%');
  });
});
