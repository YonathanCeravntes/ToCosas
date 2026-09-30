/**
 * FIN-054 · Reglas puras de "Mis documentos" (sin BD).
 */

/** UVT por año (DIAN). Año gravable 2025 → $49.799; 2026 → $52.374. */
export const UVT: Record<number, number> = { 2024: 47_065, 2025: 49_799, 2026: 52_374 };
export const uvtFor = (year: number) => UVT[year] ?? UVT[Math.max(...Object.keys(UVT).map(Number))];

/** Ley 2277 de 2022, art. 7: 1% de compras con factura electrónica pagadas con medio electrónico, tope 240 UVT. */
export const DEDUCTION_RATE = 0.01;
export const DEDUCTION_CAP_UVT = 240;

export interface InvoiceLite {
  total: number;
  hasCufe: boolean;
  paymentMethod: 'tarjeta' | 'transferencia' | 'efectivo' | 'desconocido';
}

/** Solo cuenta una factura ELECTRÓNICA (con CUFE) pagada con tarjeta o transferencia. */
export const countsForDeduction = (i: InvoiceLite) =>
  i.hasCufe && (i.paymentMethod === 'tarjeta' || i.paymentMethod === 'transferencia');

export function deductionSummary(invoices: InvoiceLite[], year: number) {
  let total = 0;
  let electronicPaid = 0;
  let cash = 0;
  let unknown = 0;
  for (const i of invoices) {
    total += i.total;
    if (countsForDeduction(i)) electronicPaid += i.total;
    else if (i.paymentMethod === 'efectivo') cash += i.total;
    else unknown += i.total;
  }
  const cap = DEDUCTION_CAP_UVT * uvtFor(year);
  const deduction = Math.min(cap, Math.round(electronicPaid * DEDUCTION_RATE));
  return { count: invoices.length, total, electronicPaid, cash, unknown, deduction, cap };
}

/** Palabras que delatan una factura de salud (dato sensible, Ley 1581 art. 5). */
const HEALTH = /\b(farmacia|drogueria|droguería|eps|ips|clinica|clínica|hospital|medic|m[eé]dic|odontolog|laboratorio|optica|óptica|prepagada|colsubsidio salud|cafam salud|cruz verde|farmatodo|locatel|la rebaja)\b/i;
export const looksHealth = (text: string | null | undefined) => !!text && HEALTH.test(text);

/** Nombre de archivo legible para descargar: "2026-09-28 Factura Éxito.pdf". */
export function downloadName(d: { kind: string; issuer: string | null; docDate: Date | null; mimeType: string | null }): string {
  const label: Record<string, string> = {
    factura: 'Factura', comprobante: 'Comprobante', certificado: 'Certificado',
    extracto_tarjeta: 'Extracto tarjeta', extracto_credito: 'Extracto crédito', extracto_cuenta: 'Extracto cuenta',
  };
  const ext = d.mimeType === 'application/pdf' ? 'pdf' : d.mimeType?.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin';
  const date = d.docDate ? d.docDate.toISOString().slice(0, 10) : 'sin-fecha';
  const who = (d.issuer ?? '').replace(/[^\p{L}\p{N} .-]/gu, '').trim().slice(0, 40).replace(/[. ]+$/, '');
  return `${date} ${label[d.kind] ?? 'Documento'}${who ? ` ${who}` : ''}.${ext}`;
}
