import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Hashing de contraseñas con scrypt (nativo de Node, sin dependencias externas
 * ni módulos compilados). Formato almacenado: `scrypt$<saltHex>$<hashHex>`.
 *
 * Nota: en producción se puede migrar a Argon2id; el formato con prefijo
 * permite identificar el algoritmo y hacer una migración progresiva.
 */
@Injectable()
export class PasswordService {
  private static readonly KEYLEN = 64;
  private static readonly SALT_BYTES = 16;

  async hash(plain: string): Promise<string> {
    if (!plain || plain.length < 8) {
      throw new Error('La contraseña debe tener al menos 8 caracteres');
    }
    const salt = randomBytes(PasswordService.SALT_BYTES);
    const derived = (await scryptAsync(plain, salt, PasswordService.KEYLEN)) as Buffer;
    return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
  }

  async verify(plain: string, stored: string): Promise<boolean> {
    if (!stored) return false;
    const parts = stored.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
    const salt = Buffer.from(parts[1], 'hex');
    const expected = Buffer.from(parts[2], 'hex');
    const derived = (await scryptAsync(plain, salt, expected.length)) as Buffer;
    // Comparación en tiempo constante para evitar timing attacks.
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  }
}
