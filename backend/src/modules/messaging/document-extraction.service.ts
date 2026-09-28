import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AnthropicClient } from '../copilot/anthropic.client';
import { DocumentExtraction, DocumentKind } from './document-proposal';

/** Tipos que la IA puede leer (imágenes de foto/captura y PDF). */
export const SUPPORTED_MEDIA = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']);

const TOOL = 'emitir_extraccion';

/** Esquema de la tool: la IA solo puede responder con este objeto. */
const SCHEMA = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: ['extracto_tarjeta', 'extracto_credito', 'comprobante', 'desconocido'], description: 'Tipo de documento.' },
    entityName: { type: ['string', 'null'], description: 'Banco, cooperativa o comercio emisor (solo el nombre comercial).' },
    productLabel: { type: ['string', 'null'], description: 'Producto: "Tarjeta Visa", "Crédito de libre inversión", etc.' },
    statementDate: { type: ['string', 'null'], description: 'Fecha de corte o del documento, YYYY-MM-DD.' },
    dueDate: { type: ['string', 'null'], description: 'Fecha límite de pago, YYYY-MM-DD.' },
    balance: { type: ['number', 'null'], description: 'Saldo total adeudado a la fecha, en pesos, sin separadores.' },
    creditLimit: { type: ['number', 'null'], description: 'Cupo total de la tarjeta.' },
    availableCredit: { type: ['number', 'null'], description: 'Cupo disponible.' },
    minimumPayment: { type: ['number', 'null'], description: 'Pago mínimo del periodo.' },
    totalPayment: { type: ['number', 'null'], description: 'Pago total del periodo (tarjeta) o cuota del mes (crédito).' },
    monthlyRate: { type: ['number', 'null'], description: 'Tasa de interés mensual en porcentaje (p. ej. 2.1).' },
    annualEffectiveRate: { type: ['number', 'null'], description: 'Tasa efectiva anual en porcentaje (p. ej. 28.3).' },
    remainingInstallments: { type: ['number', 'null'], description: 'Cuotas restantes (crédito).' },
    merchant: { type: ['string', 'null'], description: 'Comercio (solo comprobantes).' },
    amount: { type: ['number', 'null'], description: 'Valor pagado (solo comprobantes).' },
    occurredAt: { type: ['string', 'null'], description: 'Fecha del comprobante, YYYY-MM-DD.' },
    confidence: { type: 'number', description: 'Confianza global 0..1.' },
    notes: { type: ['string', 'null'], description: 'Aclaración breve si algo no se pudo leer.' },
  },
  required: ['kind', 'confidence'],
};

const INSTRUCTIONS = `Eres un lector de documentos financieros colombianos para Millo, una app de finanzas personales.
Lee el documento adjunto y devuelve SOLO los campos del esquema mediante la herramienta "${TOOL}".
Reglas:
1. Clasifica: extracto de tarjeta de crédito, extracto/plan de pagos de un crédito, comprobante/recibo/factura de una compra, o desconocido.
2. Montos en pesos colombianos como números sin separadores (2.350.000 → 2350000). Si un valor no aparece, deja null. NUNCA inventes.
3. Tasas en porcentaje: "2,1% M.V." → monthlyRate 2.1; "28,3% E.A." → annualEffectiveRate 28.3.
4. Fechas en formato YYYY-MM-DD.
5. NO transcribas números de tarjeta, cédulas, direcciones, correos ni nombres de personas: no forman parte del esquema y no deben aparecer en "notes".
6. "confidence" baja (< 0.5) si la imagen es borrosa o faltan los campos principales.`;

/**
 * FIN-042 · Extracción de datos de un documento con la IA (Claude, visión/PDF).
 * El archivo va en memoria a la API y no se conserva; el log de auditoría registra
 * tokens y propósito, NUNCA el contenido (misma política que el Copiloto, §4.4).
 */
@Injectable()
export class DocumentExtractionService {
  private readonly logger = new Logger(DocumentExtractionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: AnthropicClient,
  ) {}

  isAvailable(): boolean {
    return this.llm.isConfigured() && !this.llm.circuitOpen();
  }

  async extract(userId: string, file: { data: Buffer; mimeType: string }): Promise<DocumentExtraction> {
    if (!SUPPORTED_MEDIA.has(file.mimeType)) throw new Error('unsupported_media');
    await this.prisma.aiInteractionLog.create({
      data: { userId, direction: 'request', purpose: 'extract_document', contextFieldGroups: ['document'] },
    });
    const res = await this.llm.extractStructured({
      document: { mediaType: file.mimeType, base64: file.data.toString('base64') },
      instructions: INSTRUCTIONS,
      toolName: TOOL,
      schema: SCHEMA,
    });
    await this.prisma.aiInteractionLog.create({
      data: {
        userId,
        direction: 'response',
        model: res.model,
        purpose: 'extract_document',
        contextFieldGroups: ['document'],
        inputTokens: res.inputTokens,
        outputTokens: res.outputTokens,
      },
    });
    return normalize(res.data);
  }
}

const KINDS: DocumentKind[] = ['extracto_tarjeta', 'extracto_credito', 'comprobante', 'desconocido'];

/** Defensa contra salidas mal formadas del modelo: tipos y rangos saneados. */
export function normalize(raw: Record<string, unknown>): DocumentExtraction {
  // Números como texto con formato regional ("2.350.000", "28,5"): mismo criterio §39.
  const num = (v: unknown): number | null => {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    let t = String(v).replace(/[^\d.,-]/g, '');
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    else if (/\.\d{3}(\.|$)/.test(t)) t = t.replace(/\./g, '');
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };
  const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 120) : null);
  const date = (v: unknown): string | null => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const kind = KINDS.includes(raw.kind as DocumentKind) ? (raw.kind as DocumentKind) : 'desconocido';
  const conf = num(raw.confidence);
  return {
    kind,
    entityName: str(raw.entityName),
    productLabel: str(raw.productLabel),
    statementDate: date(raw.statementDate),
    dueDate: date(raw.dueDate),
    balance: num(raw.balance),
    creditLimit: num(raw.creditLimit),
    availableCredit: num(raw.availableCredit),
    minimumPayment: num(raw.minimumPayment),
    totalPayment: num(raw.totalPayment),
    monthlyRate: num(raw.monthlyRate),
    annualEffectiveRate: num(raw.annualEffectiveRate),
    remainingInstallments: num(raw.remainingInstallments),
    merchant: str(raw.merchant),
    amount: num(raw.amount),
    occurredAt: date(raw.occurredAt),
    confidence: conf == null ? null : Math.max(0, Math.min(1, conf)),
    notes: str(raw.notes),
  };
}
