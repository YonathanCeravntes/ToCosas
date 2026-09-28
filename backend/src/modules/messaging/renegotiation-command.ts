/**
 * FIN-044 · Comando del bot: "renegociar <nombre de la deuda> [cuotas N] [tasa X] [fija|variable]
 * [cuota N] [saldo N] [dia N] [desde AAAA-MM-DD]". Puro: solo interpreta el texto.
 */
export interface RenegotiationCommand {
  debtQuery: string;
  dto: {
    remainingInstallments?: number;
    interestRate?: number;
    rateKind?: 'fija' | 'variable';
    monthlyPayment?: number;
    currentBalance?: number;
    keepCycle?: boolean;
    paymentDay?: number;
    effectiveFrom?: string;
  };
}

const KEYWORDS = /\s(cuotas|restantes|plazo|tasa|fija|variable|cuota|saldo|d[ií]a|desde)\b/i;

/** "1.200.000" / "1200000" / "13,5" → número (formato regional §39). */
function num(raw: string): number | null {
  let t = raw.replace(/[^\d.,]/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/\.\d{3}(\.|$)/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function parseRenegotiation(text: string): RenegotiationCommand | { error: string } | null {
  const m = /^renegociar\s+(.+)$/i.exec(text.trim());
  if (!m) return null;
  const body = ` ${m[1].trim()}`;
  const k = KEYWORDS.exec(body);
  const debtQuery = (k ? body.slice(0, k.index) : body).trim();
  const rest = k ? body.slice(k.index) : '';
  if (!debtQuery) return { error: 'Dime qué deuda: "renegociar crédito carro cuotas 60 tasa 13,5 variable".' };

  const dto: RenegotiationCommand['dto'] = {};
  const grab = (re: RegExp) => re.exec(rest)?.[1];
  const cuotas = grab(/\s(?:cuotas|restantes|plazo)\s+(\d+)/i);
  if (cuotas) dto.remainingInstallments = Number(cuotas);
  const tasa = grab(/\stasa\s+([\d.,]+)/i);
  if (tasa) dto.interestRate = num(tasa) ?? undefined;
  if (/\svariable\b/i.test(rest)) dto.rateKind = 'variable';
  else if (/\sfija\b/i.test(rest)) dto.rateKind = 'fija';
  const cuota = grab(/\scuota\s+\$?([\d.,]+)/i);
  if (cuota) dto.monthlyPayment = num(cuota) ?? undefined;
  const saldo = grab(/\ssaldo\s+\$?([\d.,]+)/i);
  if (saldo) dto.currentBalance = num(saldo) ?? undefined;
  const dia = grab(/\sd[ií]a\s+(\d{1,2})/i);
  if (dia) {
    dto.paymentDay = Number(dia);
    dto.keepCycle = false;
  }
  const desde = grab(/\sdesde\s+(\d{4}-\d{2}-\d{2})/i);
  if (desde) dto.effectiveFrom = desde;

  if (Object.keys(dto).length === 0) {
    return { error: 'Dime qué cambió, ej: "renegociar crédito carro cuotas 60 tasa 13,5 variable dia 15 desde 2026-11-01".' };
  }
  return { debtQuery, dto };
}
