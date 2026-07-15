/**
 * Parser de fechas en español coloquial. Devuelve una fecha ISO (YYYY-MM-DD).
 * Si no reconoce nada, devuelve la fecha de referencia (hoy).
 */

const MONTHS: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseDate(text: string, today: Date = new Date()): string {
  const lower = text.toLowerCase();
  const ref = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );

  if (/\banteayer\b|\bantier\b/.test(lower)) {
    return toISO(new Date(ref.getTime() - 2 * 86400000));
  }
  if (/\bayer\b/.test(lower)) {
    return toISO(new Date(ref.getTime() - 86400000));
  }
  if (/\bhoy\b/.test(lower)) {
    return toISO(ref);
  }

  // "el 3 de julio", "3 de julio de 2026"
  const m = lower.match(
    /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+de\s+(\d{4}))?/,
  );
  if (m) {
    const day = parseInt(m[1], 10);
    const month = MONTHS[m[2]];
    const year = m[3] ? parseInt(m[3], 10) : ref.getUTCFullYear();
    const candidate = new Date(Date.UTC(year, month, day));
    // Si la fecha (sin año explícito) cae en el futuro, se asume el año anterior.
    if (!m[3] && candidate.getTime() > ref.getTime()) {
      candidate.setUTCFullYear(year - 1);
    }
    return toISO(candidate);
  }

  // "dd/mm" o "dd/mm/yyyy"
  const slash = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slash) {
    const day = parseInt(slash[1], 10);
    const month = parseInt(slash[2], 10) - 1;
    let year = slash[3] ? parseInt(slash[3], 10) : ref.getUTCFullYear();
    if (year < 100) year += 2000;
    return toISO(new Date(Date.UTC(year, month, day)));
  }

  return toISO(ref);
}
