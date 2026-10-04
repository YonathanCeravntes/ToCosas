import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'node:stream';

/**
 * FIN-054 · Archivos de "Mis documentos" en Cloudflare R2 (API compatible con S3).
 * Bucket PRIVADO: nada es público; la descarga es un enlace firmado de 5 minutos.
 * Sin las 4 variables `R2_*` el servicio queda apagado y Millo guarda solo los datos
 * del documento (y lo dice), nunca el archivo en otro lugar.
 */
@Injectable()
export class DocumentStorageService {
  private readonly logger = new Logger(DocumentStorageService.name);
  private client: S3Client | null = null;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const account = this.config.get<string>('R2_ACCOUNT_ID');
    const key = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secret = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucket = this.config.get<string>('R2_BUCKET', 'millo-documentos');
    if (account && key && secret) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: this.config.get<string>('R2_ENDPOINT') ?? `https://${account}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: key, secretAccessKey: secret },
        forcePathStyle: !!this.config.get<string>('R2_ENDPOINT'),
      });
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  async put(key: string, data: Buffer, mimeType: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data, ContentType: mimeType }));
      return true;
    } catch (e) {
      this.logger.warn(`R2 put falló: ${(e as Error).message}`);
      return false;
    }
  }

  /** Enlace firmado de corta duración para descargar (el bucket nunca es público). */
  async signedUrl(key: string, filename: string, seconds = 300): Promise<string | null> {
    if (!this.client) return null;
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key, ResponseContentDisposition: `attachment; filename="${filename}"` }),
      { expiresIn: seconds },
    );
  }

  async stream(key: string): Promise<Readable | null> {
    if (!this.client) return null;
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      return (res.Body as Readable) ?? null;
    } catch (e) {
      this.logger.warn(`R2 get falló: ${(e as Error).message}`);
      return null;
    }
  }

  /** Borrado real del archivo (derecho de supresión, Ley 1581). */
  async remove(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (e) {
      this.logger.warn(`R2 delete falló: ${(e as Error).message}`);
    }
  }
}
