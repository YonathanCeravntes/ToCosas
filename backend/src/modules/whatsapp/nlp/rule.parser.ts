import { parseAmount } from './amount.parser';
import { parseDate } from './date.parser';

export type Intent =
  | 'registrar_transaccion'
  | 'consulta_resumen'
  | 'consulta_simulacion'
  | 'saludo'
  | 'ayuda'
  | 'cancelar'
  | 'deshacer'
  | 'desconocido';

export type TxKind = 'ingreso' | 'gasto' | 'pago_deuda' | 'transferencia';

export interface ParseResult {
  intent: Intent;
  kind: TxKind | null;
  amount: number | null;
  currency: string;
  entityGuess: string | null;
  categoryGuess: string | null;
  dateISO: string;
  note: string;
  confidence: number; // 0..1
  missing: string[]; // 'amount' | 'entity' | 'category'
}

/** Entidades colombianas comunes (para reconocimiento sin catálogo del usuario). */
const KNOWN_ENTITIES = [
  'bancolombia',
  'bbva',
  'davivienda',
  'nequi',
  'daviplata',
  'banco de bogota',
  'banco de bogotá',
  'av villas',
  'scotiabank',
  'colpatria',
  'banco popular',
  'banco caja social',
  'lulo bank',
  'rappipay',
  'falabella',
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  comida: ['almuerzo', 'comida', 'cena', 'desayuno', 'restaurante', 'mercado', 'super', 'domicilio'],
  // FIN-057: "uber" y "didi" ya no viven aquí — son plataformas (ver PLATFORM_KW): para quien
  // conduce son plata que ENTRA; para quien viaja, transporte. Sin verbo, se pregunta una vez.
  transporte: ['taxi', 'bus', 'gasolina', 'transporte', 'peaje', 'transmilenio', 'metro'],
  servicios: ['luz', 'agua', 'internet', 'telefono', 'teléfono', 'servicios', 'gas', 'energia'],
  entretenimiento: ['cine', 'netflix', 'salida', 'fiesta', 'bar', 'trago', 'juego', 'spotify'],
  salud: ['farmacia', 'medico', 'médico', 'eps', 'droga', 'medicina', 'odontologo'],
  arriendo: ['arriendo', 'renta', 'alquiler'],
  freelance: ['freelance', 'proyecto', 'trabajo independiente'],
  salario: ['salario', 'sueldo', 'nomina', 'nómina', 'quincena'],
  deuda: ['cuota', 'credito', 'crédito', 'tarjeta', 'abono', 'prestamo', 'préstamo', 'hipoteca'],
};

/** Categorías que por sí solas indican un gasto ("mercado 86.000"). */
const EXPENSE_CATEGORIES = new Set(['comida', 'transporte', 'servicios', 'entretenimiento', 'salud', 'arriendo']);

// Nota: se evita el \b de cierre porque las vocales acentuadas (é, í, ó) no son
// "word chars" en JS y romperían el límite de palabra tras un verbo tildado.
// FIN-057: verbos del rebusque ("me gané", "me hice", "me entraron").
const INCOME_KW = /\b(me lleg|ingreso|me pagaron|me pag|cobr[eé]|recib[ií]|salario|sueldo|nomina|nómina|quincena|entr[oó]|me entr|me gan|gan[eé]\b|gané|me hice)/;
/**
 * FIN-057 · Plataformas de transporte y domicilios. Sin verbo, la palabra sola no dice si
 * la persona pagó el viaje o se ganó la carrera: el bot pregunta una vez y aprende.
 */
const PLATFORM_KW = /\b(didi|uber|indriver|in driver|picap|cabify|rappi|beat)\b/;
/** Una "carrera" sin verbo de pago es una carrera hecha (plata que entra). */
const RIDE_KW = /\bcarrer(a|as|ita|itas)\b/;

/** Palabra de plataforma mencionada en el texto (en minúsculas), o null. */
export function platformMention(text: string): string | null {
  const m = PLATFORM_KW.exec(` ${text.toLowerCase()} `);
  return m ? m[1].replace(/\s+/g, '') : null;
}
const DEBT_KW = /\b(cuota|cr[eé]dito|tarjeta|abon[eé]|abono|pr[eé]stamo|deuda|hipoteca)/;
const EXPENSE_KW = /\b(gast[eé]|compr[eé]|pagu[eé]|me cost|gasto|pago)/;
const TRANSFER_KW = /\b(transfer[ií]|env[ií]e)/;

function detectIntent(lower: string, amount: number | null): Intent {
  if (/^\s*(hola|buenas|buenos dias|buenos días|hey|holi)\b/.test(lower)) return 'saludo';
  if (/\bayuda\b|\bhelp\b|qu[eé] puedes hacer/.test(lower)) return 'ayuda';
  if (/\bcancelar\b|\bcancela\b/.test(lower)) return 'cancelar';
  if (/\bdeshacer\b|\banular\b|\banula\b|borra el [uú]ltimo|borrar [uú]ltimo|el[ií]mina el [uú]ltimo/.test(lower))
    return 'deshacer';
  // FIN-029 (DEC-0029 §5.3): "simular" — solo pregunta hipotética de escenario.
  // Debe llevar tanto el disparador ("qué pasa si"/"simula") como el verbo de
  // abono; así "pagué 200 mil" (registro real) no se confunde con simulación.
  if (
    /qu[eé] pasa si|\bsimul/.test(lower) &&
    /\babon|\baport|\bextra\b|deuda|cr[eé]dito/.test(lower)
  )
    return 'consulta_simulacion';
  if (
    /\bresumen\b|cu[aá]nto debo|c[oó]mo voy|como voy|mis deudas|cu[aá]nto tengo|pr[oó]ximos pagos|estado/.test(
      lower,
    )
  )
    return 'consulta_resumen';
  if (amount !== null) return 'registrar_transaccion';
  return 'desconocido';
}

function detectKind(lower: string): TxKind | null {
  if (INCOME_KW.test(lower)) return 'ingreso';
  if (DEBT_KW.test(lower)) return 'pago_deuda';
  if (TRANSFER_KW.test(lower)) return 'transferencia';
  if (EXPENSE_KW.test(lower)) return 'gasto';
  // "carrera 16.000" (sin "pagué") es una carrera hecha; "pagué la carrera" ya salió arriba.
  if (RIDE_KW.test(lower)) return 'ingreso';
  return null;
}

function detectEntity(lower: string, extra: string[] = []): string | null {
  const list = [...extra.map((e) => e.toLowerCase()), ...KNOWN_ENTITIES];
  for (const name of list) {
    if (lower.includes(name)) return titleCase(name);
  }
  return null;
}

function detectCategory(lower: string, kind: TxKind | null): string | null {
  // FIN-057: la plataforma depende del sentido del movimiento; sin sentido, sin categoría.
  if (PLATFORM_KW.test(lower)) {
    if (kind === 'ingreso') return 'plataformas';
    if (kind === 'gasto') return 'transporte';
    if (kind === null) return null;
  }
  // Una carrera que entra es de plataforma; "pagué la carrera" se clasifica por sus otras palabras.
  if (RIDE_KW.test(lower) && kind === 'ingreso') return 'plataformas';
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some((k) => lower.includes(k))) return cat;
  }
  return null;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Parser basado en reglas. Cubre la mayoría de los mensajes comunes sin llamar
 * a un LLM. Cuando la confianza es baja, el orquestador puede escalar al LLM.
 *
 * @param text mensaje del usuario
 * @param opts.today fecha de referencia (inyectable para tests)
 * @param opts.userEntities nombres de entidades del usuario (mejora el match)
 */
export function ruleParse(
  text: string,
  opts: { today?: Date; userEntities?: string[] } = {},
): ParseResult {
  const raw = text.trim();
  const lower = ` ${raw.toLowerCase()} `;

  const amount = parseAmount(raw);
  const intent = detectIntent(lower, amount);
  const verbKind = intent === 'registrar_transaccion' ? detectKind(lower) : null;
  const categoryGuess = intent === 'registrar_transaccion' ? detectCategory(lower, verbKind) : null;
  // FIN-055: "almuerzo 18.500" (concepto de gasto + monto, sin verbo) es un gasto.
  const kind =
    intent === 'registrar_transaccion' ? verbKind ?? (categoryGuess && EXPENSE_CATEGORIES.has(categoryGuess) ? 'gasto' : null) : null;
  const entityGuess = detectEntity(lower, opts.userEntities);
  const dateISO = parseDate(raw, opts.today);

  const missing: string[] = [];
  if (intent === 'registrar_transaccion') {
    if (amount === null) missing.push('amount');
    if (kind === null) missing.push('kind');
    if (kind === 'pago_deuda' && !entityGuess) missing.push('entity');
  }

  // Confianza: parte de 1 y penaliza por datos faltantes / ambigüedad.
  let confidence = 1;
  if (intent === 'registrar_transaccion') {
    if (amount === null) confidence -= 0.5;
    if (kind === null) confidence -= 0.3;
    if (kind === 'pago_deuda' && !entityGuess) confidence -= 0.15;
    if (!categoryGuess && kind === 'gasto') confidence -= 0.1;
  } else if (intent === 'desconocido') {
    confidence = 0.2;
  }
  confidence = Math.max(0, Math.round(confidence * 100) / 100);

  return {
    intent,
    kind,
    amount,
    currency: 'COP',
    entityGuess,
    categoryGuess,
    dateISO,
    note: raw,
    confidence,
    missing,
  };
}
