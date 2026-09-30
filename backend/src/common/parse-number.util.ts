import { Transform } from 'class-transformer';

/**
 * BT-001 (Beta Técnica) · Normalización regional de números.
 *
 * El usuario escribe según su configuración regional: `15,35` (coma decimal,
 * es-CO), `15.35` (punto decimal) o `1535` (entero). El backend normaliza
 * ANTES de validar y de que el Motor Financiero procese, para que ningún
 * usuario reciba un error (p. ej. 500) por diferencias de formato regional.
 *
 * Reglas de desambiguación:
 *  - Si el valor ya es `number`, se devuelve tal cual.
 *  - Se descartan símbolos de moneda, espacios y letras.
 *  - Si aparecen coma y punto, el ÚLTIMO en la cadena es el separador decimal
 *    y el otro es de miles (`1.234,56` → 1234.56 · `1,234.56` → 1234.56).
 *  - Si solo aparece coma, es separador decimal (`15,35` → 15.35).
 *  - Si solo aparece punto, `parseFloat` lo trata como decimal (`15.35` → 15.35).
 *
 * Devuelve `NaN` si la cadena no contiene un número — que class-validator
 * (`@IsNumber()`) convertirá en un 400 claro, nunca un 500.
 */
export function normalizeNumberInput(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const cleaned = value.trim().replace(/[^\d.,-]/g, '');
  if (cleaned === '' || cleaned === '-') return value; // deja que la validación decida
  let s = cleaned;
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.'); // punto = miles, coma = decimal
    } else {
      s = s.replace(/,/g, ''); // coma = miles, punto = decimal
    }
  } else if (hasComma) {
    s = s.replace(/,/g, '.'); // coma decimal
  }
  const n = Number(s);
  return Number.isNaN(n) ? value : n;
}

/**
 * Decorador de DTO: normaliza un campo numérico regional antes de la
 * validación. Úsalo junto a `@IsNumber()` en todo campo numérico expuesto al
 * usuario. Ejemplo:
 *   `@NormalizeNumber() @IsNumber() @Min(0) interestRate!: number;`
 */
export function NormalizeNumber(): PropertyDecorator {
  return Transform(({ value }) => normalizeNumberInput(value));
}
