import { colors } from '../theme/colors';

/**
 * FIN-060 (grupo Deudas) · Tonos de la serie de deudas: el mismo azul `colors.debt`
 * con opacidad decreciente, para que la barra "cuánto pesa cada deuda" sea una sola
 * familia azul (sin hex sueltos). Sobre la tarjeta blanca se ven como azules aclarados.
 */
const ALPHAS = [1, 0.82, 0.64, 0.48, 0.34, 0.24];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function debtShade(i: number): string {
  const [r, g, b] = hexToRgb(colors.debt);
  const a = ALPHAS[Math.min(i, ALPHAS.length - 1)];
  return `rgba(${r},${g},${b},${a})`;
}
