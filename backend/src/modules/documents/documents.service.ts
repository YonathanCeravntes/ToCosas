import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import archiver from 'archiver';
import { DocumentKind, PaymentMethod, Prisma, TxSource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentStorageService } from './storage.service';
import { deductionSummary, downloadName, uvtFor } from './documents.util';
import { merchantKey } from '../transactions/merchant-key.util';

export interface SaveDocumentInput {
  kind: DocumentKind;
  issuer?: string | null;
  issuerNit?: string | null;
  number?: string | null;
  cufe?: string | null;
  docDate?: string | null; // YYYY-MM-DD
  subtotal?: number | null;
  tax?: number | null;
  total?: number | null;
  paymentMethod?: PaymentMethod | null;
  isHealth?: boolean;
  certificateType?: string | null;
  year?: number | null;
  transactionId?: string | null;
  debtId?: string | null;
  source?: TxSource;
}

export type SaveResult =
  | { saved: true; duplicate: boolean; fileStored: boolean; document: { id: string } }
  | { saved: false; reason: 'sin_permiso' | 'salud_sin_permiso' };

const EXPORT_TTL_MS = 5 * 60 * 1000;

/**
 * FIN-054 · "Mis documentos": la bóveda de facturas, extractos, comprobantes y
 * certificados. Nada se guarda sin el permiso específico (Ley 1581); las facturas de
 * salud (dato sensible) solo con su permiso aparte. Borrar = borrado real del archivo.
 */
@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: DocumentStorageService,
    private readonly config: ConfigService,
  ) {}

  // --- Permiso ---

  async consentStatus(userId: string) {
    const s = await this.prisma.userSettings.findUnique({ where: { userId } });
    return {
      accepted: !!s?.docsStorageConsentAt,
      acceptedAt: s?.docsStorageConsentAt ?? null,
      health: !!s?.docsHealthConsent,
      filesEnabled: this.storage.isConfigured(),
    };
  }

  async grantConsent(userId: string, health: boolean) {
    await this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, docsStorageConsentAt: new Date(), docsHealthConsent: health },
      update: { docsStorageConsentAt: new Date(), docsHealthConsent: health },
    });
    return this.consentStatus(userId);
  }

  /** Revocar (Ley 1581 art. 8): deja de guardar; con `deleteAll` borra además todo lo guardado. */
  async revokeConsent(userId: string, deleteAll: boolean) {
    await this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, docsStorageConsentAt: null, docsHealthConsent: false },
      update: { docsStorageConsentAt: null, docsHealthConsent: false },
    });
    let deleted = 0;
    if (deleteAll) {
      const docs = await this.prisma.document.findMany({ where: { userId, deletedAt: null } });
      for (const d of docs) await this.removeOne(d.id, d.storageKey);
      deleted = docs.length;
    }
    return { ...(await this.consentStatus(userId)), deleted };
  }

  // --- Guardar ---

  async save(userId: string, input: SaveDocumentInput, file?: { data: Buffer; mimeType: string }): Promise<SaveResult> {
    const s = await this.prisma.userSettings.findUnique({ where: { userId } });
    if (!s?.docsStorageConsentAt) return { saved: false, reason: 'sin_permiso' };
    if (input.isHealth && !s.docsHealthConsent) return { saved: false, reason: 'salud_sin_permiso' };

    const cufe = input.cufe?.trim() || null;
    if (cufe) {
      const dup = await this.prisma.document.findFirst({ where: { userId, cufe, deletedAt: null } });
      if (dup) return { saved: true, duplicate: true, fileStored: !!dup.storageKey, document: { id: dup.id } };
    }
    const docDate = input.docDate && /^\d{4}-\d{2}-\d{2}$/.test(input.docDate) ? new Date(`${input.docDate}T00:00:00Z`) : null;
    const year = input.year ?? docDate?.getUTCFullYear() ?? new Date().getUTCFullYear();
    const id = randomUUID();
    let storageKey: string | null = null;
    if (file && this.storage.isConfigured()) {
      const key = `u/${userId}/${year}/${id}`;
      if (await this.storage.put(key, file.data, file.mimeType)) storageKey = key;
    }
    const doc = await this.prisma.document.create({
      data: {
        id,
        userId,
        kind: input.kind,
        issuer: input.issuer?.trim() || null,
        issuerNit: input.issuerNit?.replace(/[^\d-]/g, '') || null,
        number: input.number?.trim() || null,
        cufe,
        docDate,
        subtotal: input.subtotal ?? null,
        tax: input.tax ?? null,
        total: input.total ?? null,
        paymentMethod: input.paymentMethod ?? 'desconocido',
        isHealth: !!input.isHealth,
        certificateType: input.certificateType ?? null,
        year,
        transactionId: input.transactionId ?? null,
        debtId: input.debtId ?? null,
        storageKey,
        mimeType: file?.mimeType ?? null,
        sizeBytes: file?.data.length ?? null,
        source: input.source ?? 'app',
      },
    });
    return { saved: true, duplicate: false, fileStored: !!storageKey, document: { id: doc.id } };
  }

  async linkTransaction(userId: string, documentId: string, transactionId: string) {
    await this.prisma.document.updateMany({ where: { id: documentId, userId }, data: { transactionId } });
  }

  /**
   * Un gasto ya registrado que ES esta factura (mismo monto ±1%, ±3 días y, si hay nota,
   * el mismo comercio): se enlaza en vez de proponer otro gasto (no se cuenta doble).
   */
  async findMatchingExpense(userId: string, amount: number, date: string, issuer: string | null) {
    const d = new Date(`${date}T12:00:00Z`);
    const txs = await this.prisma.transaction.findMany({
      where: {
        userId, deletedAt: null, kind: 'gasto',
        amount: { gte: amount * 0.99, lte: amount * 1.01 },
        occurredAt: { gte: new Date(d.getTime() - 3 * 86_400_000), lte: new Date(d.getTime() + 3 * 86_400_000) },
      },
      select: { id: true, note: true },
    });
    const key = merchantKey(issuer);
    return txs.find((t) => !key || !t.note || merchantKey(t.note).includes(key.split(' ')[0])) ?? null;
  }

  // --- Consultar ---

  async list(userId: string, year: number, kind?: string) {
    const kinds = kind === 'extractos' ? ['extracto_tarjeta', 'extracto_credito', 'extracto_cuenta']
      : kind === 'facturas' ? ['factura', 'comprobante']
      : kind === 'certificados' ? ['certificado'] : undefined;
    const docs = await this.prisma.document.findMany({
      where: { userId, year, deletedAt: null, ...(kinds ? { kind: { in: kinds as DocumentKind[] } } : {}) },
      orderBy: [{ docDate: 'desc' }, { createdAt: 'desc' }],
    });
    return docs.map((d) => ({
      id: d.id,
      kind: d.kind,
      issuer: d.issuer,
      number: d.number,
      electronic: !!d.cufe,
      docDate: d.docDate ? d.docDate.toISOString().slice(0, 10) : null,
      total: d.total != null ? Number(d.total) : null,
      tax: d.tax != null ? Number(d.tax) : null,
      paymentMethod: d.paymentMethod,
      isHealth: d.isHealth,
      certificateType: d.certificateType,
      hasFile: !!d.storageKey,
      transactionId: d.transactionId,
      debtId: d.debtId,
      source: d.source,
      createdAt: d.createdAt.toISOString(),
    }));
  }

  /** La tarjeta del año (opción 1): facturas, electrónico vs efectivo, deducción del 1%. */
  async summary(userId: string, year: number) {
    const docs = await this.prisma.document.findMany({ where: { userId, year, deletedAt: null } });
    const invoices = docs.filter((d) => d.kind === 'factura' || d.kind === 'comprobante');
    const s = deductionSummary(
      invoices.map((d) => ({ total: Number(d.total ?? 0), hasCufe: !!d.cufe, paymentMethod: d.paymentMethod })),
      year,
    );
    const electronicCount = invoices.filter((d) => !!d.cufe).length;
    return {
      year,
      uvt: uvtFor(year),
      invoices: { ...s, electronicCount },
      counts: {
        facturas: invoices.length,
        extractos: docs.filter((d) => d.kind.startsWith('extracto')).length,
        certificados: docs.filter((d) => d.kind === 'certificado').length,
      },
      filesEnabled: this.storage.isConfigured(),
    };
  }

  async downloadUrl(userId: string, id: string) {
    const d = await this.prisma.document.findFirst({ where: { id, userId, deletedAt: null } });
    if (!d) throw new NotFoundException('Documento no encontrado');
    if (!d.storageKey) throw new BadRequestException('De este documento solo guardamos los datos, no el archivo.');
    const url = await this.storage.signedUrl(d.storageKey, downloadName(d));
    if (!url) throw new BadRequestException('El almacenamiento de archivos no está disponible.');
    return { url };
  }

  async remove(userId: string, id: string) {
    const d = await this.prisma.document.findFirst({ where: { id, userId, deletedAt: null } });
    if (!d) throw new NotFoundException('Documento no encontrado');
    await this.removeOne(d.id, d.storageKey);
    return { deleted: true };
  }

  private async removeOne(id: string, storageKey: string | null) {
    if (storageKey) await this.storage.remove(storageKey);
    await this.prisma.document.update({ where: { id }, data: { deletedAt: new Date(), storageKey: null } });
  }

  // --- Descargar todo el año (.zip) ---

  /** Enlace de 5 minutos, sin sesión, para que el navegador o el teléfono descarguen el .zip. */
  exportLink(userId: string, year: number, base: string) {
    const payload = Buffer.from(JSON.stringify({ u: userId, y: year, e: Date.now() + EXPORT_TTL_MS })).toString('base64url');
    return { url: `${base}/documents/export/${payload}.${this.sign(payload)}` };
  }

  verifyExportToken(token: string): { userId: string; year: number } {
    const [payload, sig] = token.split('.');
    const good = payload && sig && sig.length === this.sign(payload).length && timingSafeEqual(Buffer.from(sig), Buffer.from(this.sign(payload)));
    if (!good) throw new NotFoundException('Enlace inválido');
    const p = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { u: string; y: number; e: number };
    if (p.e < Date.now()) throw new NotFoundException('El enlace venció; genéralo de nuevo.');
    return { userId: p.u, year: p.y };
  }

  /** Arma el .zip: los archivos guardados + un resumen.csv con todos los datos (aunque no haya archivo). */
  async buildZip(userId: string, year: number) {
    const docs = await this.prisma.document.findMany({ where: { userId, year, deletedAt: null }, orderBy: { docDate: 'asc' } });
    const zip = archiver('zip', { zlib: { level: 6 } });
    const csvRows = [
      ['fecha', 'tipo', 'emisor', 'nit', 'numero', 'factura_electronica', 'medio_de_pago', 'subtotal', 'iva', 'total', 'salud', 'archivo'].join(','),
    ];
    const used = new Set<string>();
    for (const d of docs) {
      let name = downloadName(d);
      for (let i = 2; used.has(name); i++) name = name.replace(/(\.\w+)$/, ` (${i})$1`);
      used.add(name);
      if (d.storageKey) {
        const stream = await this.storage.stream(d.storageKey);
        if (stream) zip.append(stream, { name: `${year}/${name}` });
      }
      const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      csvRows.push([
        d.docDate?.toISOString().slice(0, 10), d.kind, d.issuer, d.issuerNit, d.number, d.cufe ? 'sí' : 'no', d.paymentMethod,
        d.subtotal, d.tax, d.total, d.isHealth ? 'sí' : 'no', d.storageKey ? name : '',
      ].map(cell).join(','));
    }
    zip.append('﻿' + csvRows.join('\n'), { name: `${year}/resumen-${year}.csv` });
    void zip.finalize();
    return zip;
  }

  private sign(payload: string) {
    const secret = this.config.get<string>('JWT_ACCESS_SECRET', 'dev-access-secret');
    return createHmac('sha256', `docs-export:${secret}`).update(payload).digest('base64url');
  }
}

export type DocumentsListItem = Awaited<ReturnType<DocumentsService['list']>>[number];
export type { Prisma };
