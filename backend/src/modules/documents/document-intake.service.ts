import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentExtractionService, SUPPORTED_MEDIA } from '../messaging/document-extraction.service';
import { DocumentExtraction, toProposal } from '../messaging/document-proposal';
import { DocumentsService } from './documents.service';
import { looksHealth } from './documents.util';

/** Lo que la app recibe al subir un documento (FIN-056, boceto 6). */
export type IntakeResult =
  | { status: 'sin_permiso' | 'salud_sin_permiso' | 'ia_no_disponible' | 'formato_no_soportado' }
  | { status: 'no_reconocido'; notes: string | null }
  | {
      status: 'guardado';
      duplicate: boolean;
      fileStored: boolean;
      document: { id: string; kind: string; issuer: string | null; total: number | null; docDate: string | null; paymentMethod: string; isHealth: boolean };
      /** Gasto que Millo propone registrar (facturas y comprobantes). Nada se registra sin confirmar. */
      proposal: { amount: number; merchant: string | null; occurredAt: string; paymentMethod: string; alreadyRegistered: boolean } | null;
      summary: string;
    };

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

/**
 * FIN-056 · Subir un documento desde la app: la MISMA lectura con IA y la MISMA
 * bóveda que el bot (FIN-042/054), sin pasar por Telegram. La lectura la hace
 * `DocumentExtractionService` (módulo de mensajería), resuelto por el contenedor
 * para no crear un ciclo de módulos.
 */
@Injectable()
export class DocumentIntakeService {
  private readonly logger = new Logger(DocumentIntakeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly docs: DocumentsService,
    private readonly moduleRef: ModuleRef,
  ) {}

  private extractor(): DocumentExtractionService | null {
    try {
      return this.moduleRef.get(DocumentExtractionService, { strict: false }) ?? null;
    } catch {
      return null;
    }
  }

  async intake(userId: string, file: { data: Buffer; mimeType: string }): Promise<IntakeResult> {
    const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    if (!settings?.docsStorageConsentAt) return { status: 'sin_permiso' };
    if (!SUPPORTED_MEDIA.has(file.mimeType)) return { status: 'formato_no_soportado' };
    const extractor = this.extractor();
    if (!extractor || !extractor.isAvailable()) return { status: 'ia_no_disponible' };
    // El permiso de Mis documentos ya informa que una IA los lee: vale también para la lectura.
    if (!settings.docsAiConsentAt) {
      await this.prisma.userSettings.update({ where: { userId }, data: { docsAiConsentAt: new Date() } });
    }

    const x = await extractor.extract(userId, file);
    if (x.kind === 'desconocido' || (x.confidence ?? 0) < 0.35) return { status: 'no_reconocido', notes: x.notes ?? null };

    const kind = x.kind === 'factura_electronica' ? (x.cufe ? 'factura' : 'comprobante') : x.kind;
    const isInvoice = kind === 'factura' || kind === 'comprobante';
    const isHealth = x.isHealth ?? looksHealth(x.merchant ?? x.entityName);
    const res = await this.docs.save(
      userId,
      {
        kind,
        issuer: isInvoice ? x.merchant ?? x.entityName : x.entityName ?? x.merchant,
        issuerNit: x.issuerNit,
        number: x.invoiceNumber,
        cufe: x.cufe,
        docDate: isInvoice ? x.occurredAt : x.statementDate ?? x.occurredAt,
        subtotal: x.subtotal,
        tax: x.tax,
        total: isInvoice || kind === 'certificado' ? x.amount : x.balance,
        paymentMethod: x.paymentMethod ?? 'desconocido',
        isHealth,
        certificateType: x.certificateType,
        year: kind === 'certificado' ? x.taxYear : null,
        source: 'app',
      },
      file,
    );
    if (!res.saved) return { status: res.reason };

    const proposal = await this.proposalFor(userId, x, res.document.id);
    const document = {
      id: res.document.id,
      kind,
      issuer: (isInvoice ? x.merchant ?? x.entityName : x.entityName ?? x.merchant) ?? null,
      total: (isInvoice || kind === 'certificado' ? x.amount : x.balance) ?? null,
      docDate: (isInvoice ? x.occurredAt : x.statementDate ?? x.occurredAt) ?? null,
      paymentMethod: x.paymentMethod ?? 'desconocido',
      isHealth,
    };
    return { status: 'guardado', duplicate: res.duplicate, fileStored: res.fileStored, document, proposal, summary: this.summary(kind, document, proposal, res.duplicate) };
  }

  /** Facturas y comprobantes: el gasto a registrar, o el ya registrado (se enlaza, no se cuenta doble). */
  private async proposalFor(userId: string, x: DocumentExtraction, documentId: string) {
    const p = toProposal(x);
    if (!p || p.kind !== 'comprobante') return null;
    const match = await this.docs.findMatchingExpense(userId, p.amount, p.occurredAt, p.merchant).catch(() => null);
    if (match) await this.docs.linkTransaction(userId, documentId, match.id).catch(() => undefined);
    return { amount: p.amount, merchant: p.merchant, occurredAt: p.occurredAt, paymentMethod: x.paymentMethod ?? 'desconocido', alreadyRegistered: !!match };
  }

  private summary(kind: string, d: { issuer: string | null; total: number | null; docDate: string | null }, proposal: { amount: number; alreadyRegistered: boolean } | null, duplicate: boolean): string {
    const who = d.issuer ? ` de ${d.issuer}` : '';
    if (duplicate) return `Este documento ya estaba en Mis documentos${who}.`;
    if (kind === 'factura' || kind === 'comprobante') {
      const base = `Guardé tu ${kind === 'factura' ? 'factura electrónica' : 'comprobante'}${who}${d.total != null ? ` por ${fmt(d.total)}` : ''}.`;
      if (proposal?.alreadyRegistered) return `${base} Ese gasto ya estaba registrado: quedó enlazado.`;
      return base;
    }
    if (kind === 'certificado') return `Guardé tu certificado${who}. Lo usaré en el borrador de tu renta.`;
    return `Guardé tu extracto${who}${d.docDate ? ` con corte ${d.docDate}` : ''}.`;
  }

  /** Enlaza un documento con el gasto que la app registró tras la propuesta. */
  async link(userId: string, documentId: string, transactionId: string): Promise<{ linked: boolean }> {
    const tx = await this.prisma.transaction.findFirst({ where: { id: transactionId, userId, deletedAt: null } });
    if (!tx) return { linked: false };
    await this.docs.linkTransaction(userId, documentId, transactionId);
    return { linked: true };
  }
}
