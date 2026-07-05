import { MinimizedContext } from './minimized-views';

/**
 * Plantillas deterministas del Copiloto (FIN-005 §4.5: plantilla-primero).
 * Responden lo estándar con costo 0 y son la base del modo sin IA.
 * DEC-0005 §14.2: ninguna plantilla nombra entidades financieras ni marcas
 * (cubierto por el test de genericidad).
 */

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');
const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

export type TemplateIntent =
  | 'greeting'
  | 'score_why'
  | 'month_summary'
  | 'debt_priority'
  | 'glossary'
  | 'help';

const GLOSSARY: Record<string, string> = {
  dti: 'El DTI (endeudamiento) mide qué parte de tu ingreso mensual se va en cuotas de deuda. Por debajo de 20% está sano; por encima de 35% es señal de alerta.',
  score:
    'El Score Millo (0 a 1000) resume tu salud financiera en un solo número, combinando liquidez, endeudamiento, ahorro y patrimonio. No es un puntaje crediticio y no se comparte con nadie.',
  'fondo de emergencia':
    'El fondo de emergencia es el dinero apartado para imprevistos. La meta típica es cubrir 6 meses de tus gastos esenciales.',
  liquidez:
    'La liquidez (runway) indica cuántos meses podrías cubrir tus gastos esenciales solo con tu dinero disponible.',
  ahorro:
    'La capacidad de ahorro es el porcentaje de tu ingreso que te queda libre cada mes después de gastos y cuotas. Más de 20% es excelente.',
  patrimonio:
    'Tu patrimonio es todo lo que tienes (cuentas y activos) menos todo lo que debes. Que crezca mes a mes importa más que su valor puntual.',
};

/** Router de intención: detecta si hay plantilla (sin IA) para el mensaje. */
export function detectIntent(text: string): TemplateIntent | null {
  const t = text.toLowerCase().trim();
  if (/^(hola|buenas|hey|hi|buenos dias|buenos días|buenas tardes|buenas noches)\b/.test(t)) return 'greeting';
  if (/(por ?qu[eé].*(score|puntaje)|score.*(baj|sub|cambi)|puntaje.*(baj|sub|cambi))/.test(t)) return 'score_why';
  if (/(resumen|c[oó]mo va|como va|panorama|mi mes)/.test(t)) return 'month_summary';
  if (/(qu[eé] deuda|cu[aá]l deuda|deuda.*(primero|priorizar|pagar antes))/.test(t)) return 'debt_priority';
  if (/(qu[eé] es|que significa|qu[eé] significa|explica(me)?)\s+(el |la |un |una )?(dti|score|fondo de emergencia|liquidez|ahorro|patrimonio)/.test(t)) return 'glossary';
  if (/(ayuda|qu[eé] puedes hacer|que puedes hacer|men[uú])/.test(t)) return 'help';
  return null;
}

export function renderTemplate(intent: TemplateIntent, ctx: MinimizedContext, userText: string): string {
  switch (intent) {
    case 'greeting':
      return '👋 ¡Hola! Soy tu Copiloto Financiero. Puedo explicarte tu Score, resumir tu mes o ayudarte a decidir qué deuda atacar primero. ¿Por dónde empezamos?';
    case 'help':
      return [
        'Puedo ayudarte con:',
        '• "¿Por qué está así mi Score?"',
        '• "Resumen de mi mes"',
        '• "¿Qué deuda pago primero?"',
        '• "¿Qué es el DTI?" (o liquidez, ahorro, patrimonio…)',
      ].join('\n');
    case 'score_why':
      return scoreWhy(ctx);
    case 'month_summary':
      return monthSummary(ctx);
    case 'debt_priority':
      return debtPriority(ctx);
    case 'glossary': {
      const term = Object.keys(GLOSSARY).find((k) => userText.toLowerCase().includes(k));
      return term
        ? GLOSSARY[term]
        : 'Puedo explicarte: DTI, Score, fondo de emergencia, liquidez, ahorro o patrimonio. ¿Cuál te interesa?';
    }
  }
}

function scoreWhy(ctx: MinimizedContext): string {
  if (ctx.score.value === null) {
    return 'Aún no tengo suficiente información para calcular tu Score. Registra tus ingresos, gastos y cuentas y lo verás aparecer en la pestaña Salud.';
  }
  const labels: Record<string, string> = {
    liquidity: 'Liquidez',
    debt: 'Endeudamiento',
    savings: 'Ahorro',
    wealth: 'Patrimonio',
  };
  const worst = ctx.score.pillars
    .filter((p) => p.value !== null)
    .sort((a, b) => (a.value as number) - (b.value as number))[0];
  const best = ctx.score.pillars
    .filter((p) => p.value !== null)
    .sort((a, b) => (b.value as number) - (a.value as number))[0];
  const lines = [
    `Tu Score es ${ctx.score.value} (${ctx.score.band}). Se compone de 4 pilares:`,
    ...ctx.score.pillars.map(
      (p) => `• ${labels[p.key] ?? p.key}: ${p.value === null ? 'sin datos aún' : `${p.value}/100`}`,
    ),
  ];
  if (worst && best && worst.key !== best.key) {
    lines.push(
      `Tu punto más fuerte es ${labels[best.key]} y tu mayor oportunidad está en ${labels[worst.key]} — mejorarlo es lo que más subiría tu Score.`,
    );
  }
  return lines.join('\n');
}

function monthSummary(ctx: MinimizedContext): string {
  const get = (k: string) => ctx.metrics.find((m) => m.key === k)?.value;
  const cashflow = get('cashflow');
  const savings = get('savings_rate');
  const lines = [`📊 Tu ${ctx.period}:`];
  if (cashflow !== undefined) lines.push(`• Flujo del mes: ${fmt(cashflow)} ${cashflow >= 0 ? '👍' : '⚠️'}`);
  if (savings !== undefined) lines.push(`• Capacidad de ahorro: ${pct(savings)}`);
  lines.push(`• Patrimonio: ${fmt(ctx.netWorth.net)}`);
  if (ctx.debts.length > 0) {
    const totalDebt = ctx.debts.reduce((a, d) => a + d.balance, 0);
    lines.push(`• Deudas: ${ctx.debts.length} por ${fmt(totalDebt)} en total`);
  }
  if (ctx.categorySpend.length > 0) {
    const top = [...ctx.categorySpend].sort((a, b) => b.amount - a.amount)[0];
    lines.push(`• Donde más gastaste: ${top.category} (${fmt(top.amount)})`);
  }
  return lines.join('\n');
}

function debtPriority(ctx: MinimizedContext): string {
  if (ctx.debts.length === 0) {
    return '🎉 No tienes deudas activas registradas. Si adquieres una, regístrala y te ayudaré a planear cómo pagarla.';
  }
  const byRate = [...ctx.debts].sort((a, b) => b.ratePct - a.ratePct);
  const worst = byRate[0];
  const lines = [
    `Con el método avalancha (menos intereses), atacaría primero tu ${worst.ref}: es la de mayor tasa (${worst.ratePct}% ${worst.rateBasis}) con saldo de ${fmt(worst.balance)}.`,
  ];
  if (ctx.debts.length > 1) {
    lines.push(`Orden sugerido: ${byRate.map((d) => d.ref).join(' → ')}.`);
  }
  lines.push('En el detalle de la deuda puedes simular cuánto ahorras con un abono extra mensual.');
  return lines.join('\n');
}
