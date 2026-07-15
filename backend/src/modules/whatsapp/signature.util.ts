import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Valida la firma `X-Hub-Signature-256` que envía Meta en cada webhook.
 * Es HMAC-SHA256 del cuerpo crudo usando el App Secret, con prefijo "sha256=".
 *
 * IMPORTANTE: debe usarse sobre el BODY CRUDO (raw), no sobre el JSON re-serializado.
 */
export function verifyMetaSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (!signatureHeader || !appSecret) return false;
  const expected =
    'sha256=' +
    createHmac('sha256', appSecret)
      .update(typeof rawBody === 'string' ? Buffer.from(rawBody) : rawBody)
      .digest('hex');

  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
