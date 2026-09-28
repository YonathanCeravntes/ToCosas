/**
 * FIN-042 · Propuestas a partir de un documento (extracto de tarjeta/crédito o
 * comprobante de compra). Funciones PURAS: construyen el texto que ve el usuario,
 * interpretan su respuesta (sí / no / corrección) y derivan los datos de alta.
 * Nada aquí toca la base de datos ni la IA: es la capa "explicable" (§42).
 */

export type DocumentKind = 'extracto_tarjeta' | 'extracto_credito' | 'comprobante' | 'desconocido';

/** Lo que la IA extrae del documento (todo opcional: el modelo solo llena lo que ve). */
export interface DocumentExtraction {
  kind: DocumentKind;
  entityName?: string | null;
  productLabel?: string | null;
  statementDate?: string | null; // YYYY-MM-DD
  dueDate?: string | null; // YYYY-MM-DD
  balance?: number | null; // saldo total / deuda a la fecha
  creditLimit?: number | null;
  availableCredit?: number | null;
  minimumPayment?: number | null;
  totalPayment?: number | null; // pago total del mes (tarjeta) o cuota (crédito)
  monthlyRate?: number | null; // % mensual
  annualEffectiveRate?: number | null; // % E.A.
  remainingInstallments?: number | null;
  termMonths?: number | null;
  paidInstallments?: number | null;
  periodInterest?: number | null;
  periodPrincipal?: number | null;
  periodPaid?: number | null;
  evidence?: string | null;
  merchant?: string | null; // comprobante
  amount?: number | null; // comprobante
  occurredAt?: string | null; // comprobante, YYYY-MM-DD
  confidence?: number | null; // 0..1
  notes?: string | null;
}

export interface CardProposal {
  kind: 'extracto_tarjeta';
  name: string;
  entityName: string | null;
  balance: number;
  creditLimit: number | null;
  availableCredit: number | null;
  monthlyPayment: number; // lo que se compromete al mes (pago total si existe, si no el mínimo)
  installments: number; // en cuántas cuotas se reparte el saldo inicial
  annualEffectiveRate: number | null;
  paymentDay: number | null;
  dueDate: string | null;
}

export interface LoanProposal {
  kind: 'extracto_credito';
  name: string;
  entityName: string | null;
  balance: number;
  monthlyPayment: number | null;
  remainingInstallments: number | null;
  termMonths: number | null;
  paidInstallments: number | null;
  annualEffectiveRate: number | null;
  paymentDay: number | null;
  dueDate: string | null;
  /** Avisos de coherencia para el usuario (no bloquean, pero se muestran). */
  warnings: string[];
}

export interface ReceiptProposal {
  kind: 'comprobante';
  amount: number;
  merchant: string | null;
  occurredAt: string; // YYYY-MM-DD
}

export type DocumentProposal = CardProposal | LoanProposal | ReceiptProposal;

/** Vigencia de una propuesta pendiente (después el bot pide reenviar el documento). */
export const PROPOSAL_TTL_MINUTES = 30;

const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;
const pct = (n: number) => `${n.toFixed(2).replace(/\.?0+$/, '')}%`;

/** % mensual → % efectivo anual (fórmula estándar; una sola vez, aquí). */
export function monthlyToEA(monthlyPct: number): number {
  return (Math.pow(1 + monthlyPct / 100, 12) - 1) * 100;
}

function dayOf(iso?: string | null): number | null {
  if (!iso) return null;
  const d = Number(iso.slice(8, 10));
  return Number.isInteger(d) && d >= 1 && d <= 31 ? d : null;
}

/** Una fecha límite de pago solo tiene sentido cerca de hoy (±1 año); lo demás es una lectura errada. */
function plausibleDue(iso: string | null | undefined, today: Date): string | null {
  if (!iso) return null;
  const y = Number(iso.slice(0, 4));
  const ty = today.getFullYear();
  return y >= ty - 1 && y <= ty + 1 ? iso : null;
}

/**
 * BT-017: en los extractos colombianos "pago total" suele ser TODO el saldo (pagar para no
 * causar intereses), no un compromiso mensual. Lo mensual es el pago mínimo; el total solo
 * se usa si claramente es parcial (< 90 % del saldo). Sin ninguno → null (12 cuotas).
 */
export function cardMonthlyPayment(balance: number, minimum?: number | null, total?: number | null): number | null {
  if (minimum && minimum > 0 && minimum < balance) return Math.round(minimum);
  if (total && total > 0 && total < balance * 0.9) return Math.round(total);
  return null;
}

/**
 * Saldo de tarjeta → N cuotas para que el compromiso mensual (§32) coincida con lo que el
 * extracto pide pagar. Acotado a [1, 36]; sin pago conocido, 12 (se dice en el acuse).
 */
export function installmentsFor(balance: number, payment: number | null | undefined): number {
  if (!payment || payment <= 0) return 12;
  return Math.min(36, Math.max(1, Math.round(balance / payment)));
}

/** Convierte la extracción en una propuesta concreta, o null si no hay con qué. */
export function toProposal(x: DocumentExtraction, today = new Date()): DocumentProposal | null {
  const ea = x.annualEffectiveRate ?? (x.monthlyRate ? monthlyToEA(x.monthlyRate) : null);
  const entity = x.entityName?.trim() || null;
  if (x.kind === 'extracto_tarjeta' && x.balance != null && x.balance >= 0) {
    const balance = Math.round(x.balance);
    const payment = cardMonthlyPayment(balance, x.minimumPayment, x.totalPayment);
    const name = [entity, x.productLabel?.trim() || 'Tarjeta de crédito'].filter(Boolean).join(' · ');
    return {
      kind: 'extracto_tarjeta',
      name,
      entityName: entity,
      balance,
      creditLimit: x.creditLimit ?? null,
      availableCredit: x.availableCredit ?? null,
      monthlyPayment: payment ? Math.round(payment) : Math.round(balance / 12),
      installments: installmentsFor(balance, payment),
      annualEffectiveRate: ea,
      paymentDay: dayOf(x.dueDate),
      dueDate: x.dueDate ?? null,
    };
  }
  if (x.kind === 'extracto_credito' && x.balance != null && x.balance > 0) {
    const name = [entity, x.productLabel?.trim() || 'Crédito'].filter(Boolean).join(' · ');
    const balance = Math.round(x.balance);
    const payment = x.totalPayment ?? x.minimumPayment ?? null;
    // Cuotas restantes: lo leído; si falta, plazo − pagadas.
    const remaining =
      x.remainingInstallments ??
      (x.termMonths != null && x.paidInstallments != null ? Math.max(0, x.termMonths - x.paidInstallments) : null);
    const due = plausibleDue(x.dueDate, today);
    const warnings: string[] = [];
    if (payment != null && payment * 3 > balance) warnings.push('la cuota parece muy alta frente al saldo: revisa "saldo" y "cuota"');
    if (x.termMonths != null && x.paidInstallments != null && x.remainingInstallments != null && Math.abs(x.termMonths - x.paidInstallments - x.remainingInstallments) > 1) {
      warnings.push(`plazo ${x.termMonths} − pagadas ${x.paidInstallments} ≠ restantes ${x.remainingInstallments}: revisa "cuotas"`);
    }
    if (x.dueDate && !due) warnings.push('la fecha de pago leída no es de este año: corrígela con "vence AAAA-MM-DD"');
    return {
      kind: 'extracto_credito',
      name,
      entityName: entity,
      balance,
      monthlyPayment: payment != null ? Math.round(payment) : null,
      remainingInstallments: remaining,
      termMonths: x.termMonths ?? null,
      paidInstallments: x.paidInstallments ?? null,
      annualEffectiveRate: ea,
      paymentDay: dayOf(due),
      dueDate: due,
      warnings,
    };
  }
  if (x.kind === 'comprobante' && x.amount != null && x.amount > 0) {
    return {
      kind: 'comprobante',
      amount: Math.round(x.amount),
      merchant: x.merchant?.trim() || null,
      occurredAt: x.occurredAt ?? today.toISOString().slice(0, 10),
    };
  }
  return null;
}

/** Texto de la propuesta: qué leyó Millo y qué haría, y cómo confirmar o corregir. */
export function describeProposal(p: DocumentProposal): string {
  if (p.kind === 'comprobante') {
    return (
      `🧾 Leí tu comprobante:\n` +
      `• Gasto de ${fmt(p.amount)}${p.merchant ? ` en ${p.merchant}` : ''}\n` +
      `• Fecha: ${p.occurredAt}\n\n` +
      `¿Lo registro? Responde *sí* o *no*. Para corregir: "monto 45.000", "fecha 2026-09-27".`
    );
  }
  const lines: string[] = [];
  lines.push(p.kind === 'extracto_tarjeta' ? `💳 Leí tu extracto de tarjeta:` : `🏦 Leí tu extracto de crédito:`);
  lines.push(`• Nombre: ${p.name}`);
  lines.push(`• Saldo: ${fmt(p.balance)}`);
  if (p.kind === 'extracto_tarjeta') {
    if (p.creditLimit != null) lines.push(`• Cupo: ${fmt(p.creditLimit)}${p.availableCredit != null ? ` (disponible ${fmt(p.availableCredit)})` : ''}`);
    lines.push(`• Pago mensual (mínimo): ${fmt(p.monthlyPayment)} → repartiré el saldo en ${p.installments} cuota${p.installments === 1 ? '' : 's'} para que tu compromiso del mes coincida`);
  } else {
    if (p.monthlyPayment != null) lines.push(`• Cuota del mes: ${fmt(p.monthlyPayment)}`);
    const parts: string[] = [];
    if (p.paidInstallments != null) parts.push(`${p.paidInstallments} pagadas`);
    if (p.remainingInstallments != null) parts.push(`${p.remainingInstallments} restantes`);
    if (p.termMonths != null) parts.push(`plazo ${p.termMonths}`);
    if (parts.length) lines.push(`• Cuotas: ${parts.join(' · ')}`);
  }
  if (p.annualEffectiveRate != null) lines.push(`• Tasa: ${pct(p.annualEffectiveRate)} E.A.`);
  if (p.dueDate) lines.push(`• Próximo pago: ${p.dueDate}${p.paymentDay ? ` (día ${p.paymentDay} de cada mes)` : ''}`);
  if (p.kind === 'extracto_credito' && p.warnings.length) {
    lines.push('');
    lines.push(`⚠️ Revisa: ${p.warnings.join('; ')}.`);
  }
  lines.push('');
  lines.push(`¿Creo esta deuda en Millo? Responde *sí* o *no*.`);
  lines.push(
    p.kind === 'extracto_tarjeta'
      ? `Para corregir antes: "saldo 2.350.000", "cuota 180.000", "cupo 5.000.000", "tasa 28.5", "dia 15", "nombre Tarjeta principal".`
      : `Para corregir antes: "saldo 63.253.744", "cuota 932.000", "restantes 109", "plazo 120", "tasa 15.39", "vence 2026-10-02", "nombre Crédito libre inversión".`,
  );
  return lines.join('\n');
}

export type Reply = { type: 'yes' } | { type: 'no' } | { type: 'fix'; field: string; value: string | number } | { type: 'other' };

// `\b` no funciona con tildes (\w es ASCII): se usa un fin de palabra explícito.
const END = '(?=$|[\\s.,!¡?¿])';
const YES = new RegExp('^(s[ií]|ok|okay|dale|listo|confirmo|confirmar|de una|correcto|va|hazlo|crea|creala|créala)' + END, 'i');
const NO = new RegExp('^(no|nop|cancelar|cancela|olv[ií]dalo|d[ée]jalo|nada)' + END, 'i');
const FIX = /^(saldo|cuotas?\s+restantes?|restantes?|cuotas?\s+pendientes?|pendientes?|plazo|cuota|pago|cupo|tasa|d[ií]a|vence|nombre|monto|fecha|comercio)\s*[:=]?\s*(.+)$/i;

/** Interpreta la respuesta del usuario a una propuesta pendiente. */
export function parseReply(text: string): Reply {
  const t = text.trim();
  if (YES.test(t)) return { type: 'yes' };
  if (NO.test(t)) return { type: 'no' };
  const m = FIX.exec(t);
  if (m) {
    let field = m[1].toLowerCase().replace('í', 'i').replace(/\s+/g, ' ');
    if (/^(cuotas? restantes?|restantes?|cuotas? pendientes?|pendientes?)$/.test(field)) field = 'restantes';
    const raw = m[2].trim();
    if (field === 'nombre' || field === 'comercio' || field === 'fecha' || field === 'vence') return { type: 'fix', field, value: raw };
    const num = Number(raw.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
    if (!Number.isFinite(num)) return { type: 'other' };
    return { type: 'fix', field, value: num };
  }
  return { type: 'other' };
}

/** Aplica una corrección; devuelve la propuesta nueva o un mensaje de por qué no aplica. */
export function applyFix(p: DocumentProposal, field: string, value: string | number): { proposal: DocumentProposal } | { error: string } {
  const n = typeof value === 'number' ? value : NaN;
  if (p.kind === 'comprobante') {
    if (field === 'monto' && n > 0) return { proposal: { ...p, amount: Math.round(n) } };
    if (field === 'fecha' && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return { proposal: { ...p, occurredAt: value } };
    if (field === 'comercio' && typeof value === 'string') return { proposal: { ...p, merchant: value } };
    return { error: 'Para un comprobante puedo corregir "monto", "fecha AAAA-MM-DD" o "comercio".' };
  }
  if (field === 'nombre' && typeof value === 'string') return { proposal: { ...p, name: value } };
  if (field === 'saldo' && n >= 0) {
    const next = { ...p, balance: Math.round(n) };
    if (next.kind === 'extracto_tarjeta') next.installments = installmentsFor(next.balance, next.monthlyPayment);
    return { proposal: next };
  }
  if ((field === 'cuota' || field === 'pago') && n > 0) {
    if (p.kind === 'extracto_tarjeta') return { proposal: { ...p, monthlyPayment: Math.round(n), installments: installmentsFor(p.balance, n) } };
    return { proposal: { ...p, monthlyPayment: Math.round(n) } };
  }
  if (field === 'cupo' && n > 0 && p.kind === 'extracto_tarjeta') return { proposal: { ...p, creditLimit: Math.round(n) } };
  if (field === 'tasa' && n >= 0 && n < 200) return { proposal: { ...p, annualEffectiveRate: n } };
  if (field === 'dia' && n >= 1 && n <= 31) return { proposal: { ...p, paymentDay: Math.round(n) } };
  if (field === 'vence' && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { proposal: { ...p, dueDate: value, paymentDay: Number(value.slice(8, 10)) } };
  }
  if (p.kind === 'extracto_credito') {
    if (field === 'restantes' && n >= 0 && n <= 600) return { proposal: { ...p, remainingInstallments: Math.round(n), warnings: [] } };
    if (field === 'plazo' && n >= 1 && n <= 600) return { proposal: { ...p, termMonths: Math.round(n), warnings: [] } };
  }
  return { error: 'No entendí la corrección. Ejemplos: "saldo 2.350.000", "cuota 180.000", "restantes 109", "plazo 120", "tasa 28.5", "dia 15", "vence 2026-10-02", "nombre Tarjeta principal".' };
}
