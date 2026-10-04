/**
 * FIN-059 · Millo en pareja — cálculos puros (sin BD), probados aparte.
 *
 * Aporte justo (decisión del Fundador 2026-10-03): proporcional al ingreso cuando los dos
 * comparten su proporción; si no, mitad y mitad. Investigación de respaldo: el aporte
 * proporcional reduce el desbalance de poder frente al 50/50 (Vogler y Pahl).
 */
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface MemberMoney {
  userId: string;
  /** Ingreso mensual de la persona (solo para la proporción; nunca se muestra al otro). */
  income: number | null;
  shareIncome: boolean;
  /** Lo que ha pagado de la casa en el ciclo. */
  paid: number;
}

export interface FairShareRow {
  userId: string;
  /** Proporción 0..1 que le toca. */
  ratio: number;
  /** Lo que le tocaba poner del total de la casa del ciclo. */
  due: number;
  paid: number;
  /** paid − due: positivo = puso de más; negativo = le falta. */
  balance: number;
}

export interface FairShare {
  mode: 'proporcional' | 'mitad';
  /** Por qué se usó mitad y mitad cuando se pidió proporcional (para decirlo en pantalla). */
  fallbackReason: 'sin_ingreso_compartido' | null;
  total: number;
  rows: FairShareRow[];
  /** Quién le pasa a quién para quedar parejos (null si ya están parejos o hay un solo miembro). */
  settlement: { fromUserId: string; toUserId: string; amount: number } | null;
}

export function fairShare(members: MemberMoney[], requested: 'proporcional' | 'mitad'): FairShare {
  const total = round2(members.reduce((a, m) => a + m.paid, 0));
  const canProportional =
    requested === 'proporcional' && members.length > 1 && members.every((m) => m.shareIncome && (m.income ?? 0) > 0);
  const incomeTotal = canProportional ? members.reduce((a, m) => a + (m.income ?? 0), 0) : 0;
  const rows = members.map((m) => {
    const ratio = members.length === 0 ? 0 : canProportional ? (m.income ?? 0) / incomeTotal : 1 / members.length;
    const due = round2(total * ratio);
    return { userId: m.userId, ratio: Math.round(ratio * 1000) / 1000, due, paid: round2(m.paid), balance: round2(m.paid - due) };
  });
  let settlement: FairShare['settlement'] = null;
  if (rows.length === 2) {
    const [a, b] = rows;
    const amount = round2(Math.abs(a.balance));
    // Menos de $1.000 de diferencia no merece un "pásale": se considera parejo.
    if (amount >= 1000) settlement = a.balance < 0 ? { fromUserId: a.userId, toUserId: b.userId, amount } : { fromUserId: b.userId, toUserId: a.userId, amount };
  }
  return {
    mode: canProportional ? 'proporcional' : 'mitad',
    fallbackReason: requested === 'proporcional' && !canProportional && members.length > 1 ? 'sin_ingreso_compartido' : null,
    total,
    rows,
    settlement,
  };
}

/** Código de invitación: 6 caracteres sin ambiguos (0/O, 1/I/L). */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function inviteCode(random: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 6; i += 1) s += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return s;
}

/** "casa" o "de la casa" en un mensaje del bot marca el gasto como del hogar. */
export function mentionsHouse(text: string): boolean {
  return /(^|\s)(de\s+la\s+)?casa(\s|$|[.,!])/i.test(` ${text} `) || /(^|\s)hogar(\s|$|[.,!])/i.test(` ${text} `);
}
