import { createHash, randomInt } from 'crypto';

/** Genera un OTP numérico de 6 dígitos. */
export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** Hash del OTP (ligado al teléfono) para no almacenarlo en claro. */
export function hashOtp(code: string, phoneE164: string): string {
  return createHash('sha256').update(`${phoneE164}:${code}`).digest('hex');
}

/** ¿El texto es plausiblemente un OTP de 6 dígitos? */
export function looksLikeOtp(text: string): boolean {
  return /^\s*\d{6}\s*$/.test(text);
}
