/**
 * Genera un UUID v4 RFC-4122 válido (versión 4, variante correcta) para usar
 * como `clientUuid` de idempotencia. El backend valida el formato con @IsUUID,
 * por lo que la versión/variante deben ser correctas.
 */
export function uuidv4(): string {
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      out += '-';
    } else if (i === 14) {
      out += '4'; // versión 4
    } else if (i === 19) {
      out += hex[(Math.floor(Math.random() * 16) & 0x3) | 0x8]; // variante 8..b
    } else {
      out += hex[Math.floor(Math.random() * 16)];
    }
  }
  return out;
}
