import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AnthropicClient } from '../copilot/anthropic.client';
import { LLM_MODEL_DEFAULT } from '../copilot/copilot.constants';
import { DocumentExtraction, DocumentKind } from './document-proposal';

/** Tipos que la IA puede leer (imágenes de foto/captura y PDF). */
export const SUPPORTED_MEDIA = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']);

const TOOL = 'emitir_extraccion';

/** Modelo para leer documentos: la visión de Sonnet lee extractos densos con mucha más precisión. */
export const LLM_EXTRACT_MODEL_DEFAULT = 'claude-sonnet-5';

/** Esquema de la tool: la IA solo puede responder con este objeto. */
const SCHEMA = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: ['extracto_tarjeta', 'extracto_credito', 'comprobante', 'desconocido'], description: 'Tipo de documento.' },
    entityName: { type: ['string', 'null'], description: 'Banco, cooperativa, fintech o comercio emisor (solo el nombre comercial).' },
    productLabel: { type: ['string', 'null'], description: 'Producto: "Tarjeta Visa", "Crédito de libre inversión", "Crédito de vivienda", etc.' },
    statementDate: { type: ['string', 'null'], description: 'Fecha de corte / "Saldo a" / fin del periodo liquidado, YYYY-MM-DD.' },
    dueDate: { type: ['string', 'null'], description: 'Fecha límite de pago ("Páguese antes del", "Pagar hasta", "Fecha límite de pago"), YYYY-MM-DD.' },
    balance: { type: ['number', 'null'], description: 'SALDO TOTAL ADEUDADO a la fecha ("Saldo a", "Nuevo saldo", "Saldo total", "Saldo capital"). NUNCA el total abonado ni el total aplicado del periodo.' },
    creditLimit: { type: ['number', 'null'], description: 'Cupo total (solo tarjetas).' },
    availableCredit: { type: ['number', 'null'], description: 'Cupo disponible (solo tarjetas).' },
    minimumPayment: { type: ['number', 'null'], description: 'Pago mínimo del periodo (tarjetas).' },
    totalPayment: { type: ['number', 'null'], description: 'Lo que hay que pagar este mes: "Valor cuota mes", "Total valor a pagar", "Cuota", "Pago total". En un crédito es la CUOTA del mes.' },
    monthlyRate: { type: ['number', 'null'], description: 'Tasa mensual en porcentaje ("2,1% M.V." → 2.1).' },
    annualEffectiveRate: { type: ['number', 'null'], description: 'Tasa efectiva anual en porcentaje ("15,39% E.A." → 15.39).' },
    termMonths: { type: ['number', 'null'], description: 'Plazo total del crédito en meses ("Plazo").' },
    paidInstallments: { type: ['number', 'null'], description: 'Cuotas ya pagadas/canceladas ("No. cuotas que se cancela", "cuotas pagadas").' },
    remainingInstallments: { type: ['number', 'null'], description: 'Cuotas PENDIENTES ("No. cuotas pendientes", "Cuotas Pdtes", "cuotas restantes"). NO confundir con las canceladas.' },
    periodInterest: { type: ['number', 'null'], description: 'Intereses corrientes cobrados en el periodo.' },
    periodPrincipal: { type: ['number', 'null'], description: 'Abono a capital aplicado en el periodo.' },
    periodPaid: { type: ['number', 'null'], description: 'Total abonado/pagado por el cliente en el periodo ("Total abonado", "Total aplicado").' },
    merchant: { type: ['string', 'null'], description: 'Comercio (solo comprobantes).' },
    amount: { type: ['number', 'null'], description: 'Valor pagado (solo comprobantes).' },
    occurredAt: { type: ['string', 'null'], description: 'Fecha del comprobante, YYYY-MM-DD.' },
    evidence: { type: ['string', 'null'], description: 'Etiquetas EXACTAS del documento de donde tomaste saldo, cuota, cuotas pendientes y fecha límite, separadas por " | ". Sin datos personales.' },
    confidence: { type: 'number', description: 'Confianza global 0..1.' },
    notes: { type: ['string', 'null'], description: 'Aclaración breve si algo no se pudo leer.' },
  },
  required: ['kind', 'confidence'],
};

const INSTRUCTIONS = `Eres un lector de documentos financieros COLOMBIANOS para Millo, una app de finanzas personales.
Lee el documento adjunto y devuelve SOLO los campos del esquema mediante la herramienta "${TOOL}".

Glosario de extractos colombianos (Davivienda, Bancolombia, BBVA, Serfinanza, Nu, etc.):
- "Saldo a <fecha>", "Nuevo saldo", "Saldo total", "Saldo capital", "Saldo actual" → balance (lo que se DEBE). En un crédito suele ser un número grande (millones).
- "Total abonado", "Total aplicado en el periodo", "Valor pagado por anticipado", "Movimientos del periodo" → periodPaid / periodPrincipal / periodInterest. NUNCA son el balance ni la cuota.
- "Valor cuota mes", "Total valor a pagar", "Cuota", "Pago total", "Valor a pagar" → totalPayment (la cuota del mes en créditos).
- "Pago mínimo" → minimumPayment (tarjetas).
- "Páguese antes del", "Pagar hasta", "Fecha límite de pago", "Fecha de pago" → dueDate.
- "No. cuotas pendientes", "Cuotas Pdtes", "Cuotas restantes", "Cuotas por pagar" → remainingInstallments.
- "No. cuotas que se cancela", "Cuotas pagadas", "Cuotas canceladas" → paidInstallments.
- "Plazo" (en meses) → termMonths.
- "Cupo", "Cupo total" → creditLimit; "Cupo disponible" → availableCredit.
- Tasas: "15,39% E.A." → annualEffectiveRate 15.39; "2,1% M.V." → monthlyRate 2.1.

Reglas:
1. Clasifica: extracto de tarjeta de crédito, extracto/plan de pagos de un crédito, comprobante/recibo/factura de compra, o desconocido.
2. Montos en pesos colombianos como números sin separadores ("$63.253.743,76" → 63253743.76). Si un valor no aparece, deja null. NUNCA inventes ni copies un valor de otra etiqueta.
3. Fechas colombianas como "Oct. 02/2026", "02/10/2026", "2 de octubre de 2026" → "2026-10-02". El año debe ser el que dice el documento (no adivines uno antiguo).
4. Coherencia antes de responder: balance debe ser mucho mayor que totalPayment en un crédito; remainingInstallments + paidInstallments ≈ termMonths; si algo no cuadra, revisa las etiquetas y baja "confidence".
5. En "evidence" escribe las etiquetas exactas que usaste (p. ej. "Saldo a Sep. 02/2026 | Valor Cuota Mes | No. Cuotas Pdtes. Pago Total | Páguese antes del").
6. NO transcribas números de crédito o tarjeta, cédulas, direcciones, correos ni nombres de personas: no están en el esquema y no deben aparecer en "notes" ni en "evidence".
7. "confidence" baja (< 0.5) si la imagen es borrosa o faltan los campos principales.`;

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
    private readonly config: ConfigService,
  ) {}

  isAvailable(): boolean {
    return this.llm.isConfigured() && !this.llm.circuitOpen();
  }

  async extract(userId: string, file: { data: Buffer; mimeType: string }): Promise<DocumentExtraction> {
    if (!SUPPORTED_MEDIA.has(file.mimeType)) throw new Error('unsupported_media');
    await this.prisma.aiInteractionLog.create({
      data: { userId, direction: 'request', purpose: 'extract_document', contextFieldGroups: ['document'] },
    });
    const primary = this.config.get<string>('LLM_EXTRACT_MODEL', LLM_EXTRACT_MODEL_DEFAULT);
    const fallback = this.config.get<string>('LLM_MODEL', LLM_MODEL_DEFAULT);
    const call = (model: string) =>
      this.llm.extractStructured({
        document: { mediaType: file.mimeType, base64: file.data.toString('base64') },
        instructions: INSTRUCTIONS,
        toolName: TOOL,
        schema: SCHEMA,
        model,
      });
    let res;
    try {
      res = await call(primary);
    } catch (e) {
      // Modelo no disponible para esta cuenta/región (400/404) → el de chat, que sí existe.
      const msg = (e as Error).message;
      if (primary !== fallback && /anthropic_http_(400|404)/.test(msg)) {
        this.logger.warn(`Modelo de extracción ${primary} no disponible (${msg}); uso ${fallback}`);
        res = await call(fallback);
      } else throw e;
    }
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
    termMonths: num(raw.termMonths),
    paidInstallments: num(raw.paidInstallments),
    periodInterest: num(raw.periodInterest),
    periodPrincipal: num(raw.periodPrincipal),
    periodPaid: num(raw.periodPaid),
    evidence: str(raw.evidence),
    merchant: str(raw.merchant),
    amount: num(raw.amount),
    occurredAt: date(raw.occurredAt),
    confidence: conf == null ? null : Math.max(0, Math.min(1, conf)),
    notes: str(raw.notes),
  };
}
